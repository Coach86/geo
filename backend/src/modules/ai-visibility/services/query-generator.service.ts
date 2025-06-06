import { Injectable, Logger } from '@nestjs/common';
import { LlmService } from '../../llm/services/llm.service';
import { ProjectService } from '../../project/services/project.service';
import { LlmProvider } from '../../llm/interfaces/llm-provider.enum';

@Injectable()
export class QueryGeneratorService {
  private readonly logger = new Logger(QueryGeneratorService.name);

  constructor(
    private readonly llmService: LlmService,
    private readonly projectService: ProjectService,
  ) {}

  async generateQueries(
    projectId: string,
    count: number = 50
  ): Promise<string[]> {
    this.logger.log(`Generating ${count} queries for project ${projectId}`);
    
    // Get project details
    const project = await this.projectService.findById(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const prompt = `Generate ${count} diverse search queries that potential customers or AI systems might use to find information about ${project.brandName}.

Context:
- Brand: ${project.brandName}
- Industry: ${project.industry}
- Description: ${project.shortDescription}
- Key attributes: ${project.keyBrandAttributes?.join(', ')}

Include a mix of:
1. Informational queries (what is, how does, features of)
2. Navigational queries (brand name variations, product names)
3. Transactional queries (buy, pricing, where to get)
4. Comparison queries (vs competitors, alternatives)
5. Long-tail queries (specific use cases, problems solved)

Return only the queries, one per line. Make them realistic and varied.`;

    try {
      this.logger.log(`Calling LLM to generate queries...`);
      
      // Use the OpenAI LangChain adapter which properly handles model specification
      const response = await this.llmService.call(
        LlmProvider.OpenAILangChain,
        prompt,
        {
          model: 'gpt-3.5-turbo',
          temperature: 0.7,
          maxTokens: 1000,
        }
      );
      
      this.logger.log(`LLM response received, processing...`);
      this.logger.debug(`Raw response: ${response.text}`);
      
      const queries = response.text
        .split('\n')
        .map((q: string) => {
          // Remove numbering (e.g., "1. ", "2. ", etc.) and bullet points
          return q.trim()
            .replace(/^\d+\.\s*/, '') // Remove "1. ", "2. ", etc.
            .replace(/^[-*•]\s*/, '') // Remove bullet points
            .trim();
        })
        .filter((q: string) => q.length > 0)
        .slice(0, count);

      this.logger.log(`Generated ${queries.length} queries`);
      if (queries.length > 0) {
        this.logger.debug(`Sample queries: ${queries.slice(0, 3).join(', ')}`);
      }
      
      return queries;
    } catch (error) {
      this.logger.error(`Failed to generate queries: ${error.message}`);
      this.logger.error(`Error details: ${JSON.stringify(error)}`);
      
      // Fallback to basic queries
      this.logger.log(`Using fallback queries for ${project.brandName}`);
      const fallbackQueries = this.generateFallbackQueries(project.brandName, project.industry);
      this.logger.log(`Generated ${fallbackQueries.length} fallback queries`);
      return fallbackQueries;
    }
  }

  private generateFallbackQueries(brandName: string, industry: string): string[] {
    return [
      `what is ${brandName}`,
      `${brandName} features`,
      `${brandName} pricing`,
      `${brandName} reviews`,
      `${brandName} vs competitors`,
      `how does ${brandName} work`,
      `${brandName} ${industry}`,
      `${brandName} alternatives`,
      `buy ${brandName}`,
      `${brandName} customer support`,
    ];
  }
}