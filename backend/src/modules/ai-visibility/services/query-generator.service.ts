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
    this.logger.log(`🎯 CONTEXT-AWARE QUERY GENERATOR - Generating ${count} REALISTIC queries for project ${projectId}`);
    this.logger.log(`📊 DISTRIBUTION: 20% brand-specific, 50% industry-relevant, 20% competitor/comparison, 10% challenging`);

    // Get project details
    const project = await this.projectService.findById(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    // Build comprehensive context from project data
    const brandAttributes = project.keyBrandAttributes?.join(', ') || '';
    const competitors = project.competitors?.join(', ') || '';
    const description = project.shortDescription || project.fullDescription || '';

    this.logger.log(`🏢 BUSINESS CONTEXT: ${project.brandName} | ${project.industry} | ${project.website}`);
    this.logger.log(`🌍 LANGUAGE: ${project.language || 'not specified'}`);
    this.logger.log(`🏷️ ATTRIBUTES: ${brandAttributes || 'none specified'}`);
    this.logger.log(`🥊 COMPETITORS: ${competitors || 'none specified'}`);
    this.logger.log(`📝 DESCRIPTION: ${description.substring(0, 100)}${description.length > 100 ? '...' : ''}`);

    const languageInstructions = project.language ?
      `IMPORTANT: Generate ALL queries in ${project.language} language to match the website content.` :
      'IMPORTANT: Generate queries in the same language as the website content. Check the website to determine the appropriate language.';

    const prompt = `Generate exactly ${count} search queries to test AI visibility for this business:

${languageInstructions}

BUSINESS CONTEXT:
- Brand: ${project.brandName}
- Website: ${project.website}
- Industry: ${project.industry}
- Language: ${project.language || 'auto-detect from website'}
- Description: ${description}
- Key Attributes: ${brandAttributes}
- Main Competitors: ${competitors}

Create a REALISTIC mix that represents how people actually search for businesses like this:

1. BRAND-SPECIFIC (${Math.round(count * 0.2)} queries - 20%):
- "${project.brandName} reviews" (or equivalent in website language)
- "${project.brandName} vs [competitor]"
- "what is ${project.brandName}" (or equivalent in website language)
- "${project.brandName} pricing" (or equivalent in website language)

2. INDUSTRY-SPECIFIC (${Math.round(count * 0.5)} queries - 50%):
Use the industry "${project.industry}" and key attributes "${brandAttributes}" to create relevant queries:
- "best ${project.industry} companies" (or equivalent in website language)
- "how to choose ${project.industry} provider" (or equivalent in website language)
- "${project.industry} comparison" (or equivalent in website language)
- "reliable ${project.industry} services" (or equivalent in website language)

3. COMPETITOR/COMPARISON (${Math.round(count * 0.2)} queries - 20%):
Based on competitors "${competitors}", create queries:
- "[competitor] alternatives"
- "[competitor] vs other options" (or equivalent in website language)
- "companies like [competitor]" (or equivalent in website language)

4. EDGE/CHALLENGING (${Math.round(count * 0.1)} queries - 10%):
Related but challenging queries:
- General industry terms without specific brand mentions
- Adjacent service categories
- Broader market searches

CRITICAL: OUTPUT THE GENERATED QUERIES IN ${project.language}.
Return ONLY the queries, one per line, no numbering, no categories.`;

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
      this.logger.log(`Using fallback queries for ${project.brandName} in ${project.industry}`);
      const fallbackQueries = this.generateFallbackQueries(project);
      this.logger.log(`Generated ${fallbackQueries.length} fallback queries`);
      return fallbackQueries;
    }
  }

  private generateFallbackQueries(project: any): string[] {
    const brandName = project.brandName;
    const industry = project.industry;
    const competitors = project.competitors || [];
    const attributes = project.keyBrandAttributes || [];

    const queries = [
      // Brand-specific queries
      `${brandName} reviews`,
      `${brandName} pricing`,
      `what is ${brandName}`,
      `${brandName} vs competitors`,
    ];

    // Add competitor-based queries if we have competitors
    if (competitors.length > 0) {
      queries.push(`${brandName} vs ${competitors[0]}`);
      queries.push(`${competitors[0]} alternatives`);
      if (competitors.length > 1) {
        queries.push(`${competitors[1]} vs ${competitors[0]}`);
      }
    }

    // Industry-specific queries
    queries.push(
      `best ${industry} companies`,
      `${industry} comparison`,
      `how to choose ${industry} service`,
      `${industry} reviews`,
      `top ${industry} providers`,
      `reliable ${industry} businesses`
    );

    // Add attribute-based queries if we have key attributes
    if (attributes.length > 0) {
      attributes.slice(0, 3).forEach((attr: string) => {
        queries.push(`${industry} with ${attr}`);
      });
    }

    // Adjacent/Related queries
    queries.push(
      `${industry} market trends`,
      `${industry} customer service`,
      `business services comparison`
    );

    return queries.slice(0, 25); // Return reasonable number for fallback
  }
}
