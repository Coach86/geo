import { Injectable, Logger } from '@nestjs/common';
import { LlmService } from '../../llm/services/llm.service';
import { LlmProvider } from '../../llm/interfaces/llm-provider.enum';
import { ProjectService } from '../../project/services/project.service';
import { RecommendationCandidate } from '../interfaces/recommendation.interfaces';

@Injectable()
export class LLMAnalysisService {
  private readonly logger = new Logger(LLMAnalysisService.name);

  constructor(
    private readonly llmService: LlmService,
    private readonly projectService: ProjectService,
  ) {}

  async enhanceRecommendations(
    candidates: RecommendationCandidate[],
    projectId: string,
  ): Promise<RecommendationCandidate[]> {
    if (candidates.length === 0) {
      return candidates;
    }

    try {
      const project = await this.projectService.findById(projectId);
      if (!project) {
        return candidates;
      }

      const batchSize = 5;
      const enhancedCandidates: RecommendationCandidate[] = [];

      for (let i = 0; i < candidates.length; i += batchSize) {
        const batch = candidates.slice(i, i + batchSize);
        const enhanced = await this.enhanceBatch(batch, project);
        enhancedCandidates.push(...enhanced);
      }

      return enhancedCandidates;
    } catch (error) {
      this.logger.error(
        `Failed to enhance recommendations: ${error.message}`,
        error.stack,
      );
      return candidates;
    }
  }

  private async enhanceBatch(
    candidates: RecommendationCandidate[],
    project: {
      name?: string;
      description?: string;
      objectives?: string | string[];
    },
  ): Promise<RecommendationCandidate[]> {
    const prompt = this.buildEnhancementPrompt(candidates, project);

    try {
      const response = await this.llmService.call(
        LlmProvider.OpenAI,
        prompt,
        { 
          temperature: 0.3,
          model: 'gpt-4o'
        },
      );

      const enhancements = this.parseEnhancements(response.text);
      
      return candidates.map((candidate, index) => {
        const enhancement = enhancements[index];
        if (!enhancement) return candidate;

        return {
          ...candidate,
          title: enhancement.title || candidate.title,
          description: enhancement.description || candidate.description,
          suggestedActions: (enhancement.actions && enhancement.actions.length > 0)
            ? enhancement.actions 
            : candidate.suggestedActions,
          methodology: enhancement.methodology || candidate.methodology,
        };
      });
    } catch (error) {
      this.logger.error(
        `Failed to enhance batch: ${error.message}`,
      );
      return candidates;
    }
  }

  private buildEnhancementPrompt(
    candidates: RecommendationCandidate[],
    project: {
      name?: string;
      description?: string;
      objectives?: string | string[];
    },
  ): string {
    const candidateDescriptions = candidates.map((c, i) => 
      `${i + 1}. Type: ${c.type}\n   Current Title: ${c.title}\n   Evidence: ${c.evidence.length} data points`
    ).join('\n\n');

    return `You are a brand strategy expert helping enhance recommendations for ${project.name}.

Project Context:
- Company: ${project.name || 'Unknown'}
- Description: ${project.description || 'Not provided'}
- Objectives: ${Array.isArray(project.objectives) ? project.objectives.join(', ') : project.objectives || 'Not specified'}

I have ${candidates.length} draft recommendations that need enhancement. For each recommendation:
1. Create a clear, actionable title (max 100 chars)
2. Write a concise description explaining the issue and opportunity (max 300 chars)
3. List 3-5 specific, actionable steps
4. Explain the methodology in 1-2 sentences

Current Recommendations:
${candidateDescriptions}

Please enhance each recommendation. Format your response as JSON:
[
  {
    "title": "Enhanced title",
    "description": "Enhanced description",
    "actions": ["Action 1", "Action 2", "Action 3"],
    "methodology": "How this recommendation was identified"
  }
]`;
  }

  private parseEnhancements(response: string): Array<{
    title?: string;
    description?: string;
    actions?: string[];
    methodology?: string;
  }> {
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return [];
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      this.logger.error(`Failed to parse LLM response: ${error.message}`);
      return [];
    }
  }

  async generateDetailedAnalysis(
    recommendation: RecommendationCandidate,
    projectContext: {
      name: string;
    },
  ): Promise<{
    deepAnalysis: string;
    industryBenchmarks: string[];
    implementationRoadmap: string[];
    expectedOutcomes: string[];
  }> {
    const prompt = `As a brand strategy expert, provide a detailed analysis for this recommendation:

Company: ${projectContext.name}
Recommendation Type: ${recommendation.type}
Issue: ${recommendation.title}

Evidence Summary:
${recommendation.evidence.map(e => 
  `- ${e.type}: ${e.dataPoints.length} data points from ${e.source}`
).join('\n')}

Please provide:
1. Deep Analysis (2-3 paragraphs explaining the strategic importance)
2. Industry Benchmarks (3-5 relevant examples or standards)
3. Implementation Roadmap (5-7 sequential steps)
4. Expected Outcomes (3-5 measurable results)

Format as JSON with keys: deepAnalysis, industryBenchmarks, implementationRoadmap, expectedOutcomes`;

    try {
      const response = await this.llmService.call(
        LlmProvider.OpenAI,
        prompt,
        { 
          temperature: 0.4,
          model: 'gpt-4o'
        },
      );

      const parsed = this.parseDetailedAnalysis(response.text);
      return parsed || {
        deepAnalysis: '',
        industryBenchmarks: [],
        implementationRoadmap: [],
        expectedOutcomes: [],
      };
    } catch (error) {
      this.logger.error(
        `Failed to generate detailed analysis: ${error.message}`,
      );
      return {
        deepAnalysis: '',
        industryBenchmarks: [],
        implementationRoadmap: [],
        expectedOutcomes: [],
      };
    }
  }

  private parseDetailedAnalysis(response: string): {
    deepAnalysis: string;
    industryBenchmarks: string[];
    implementationRoadmap: string[];
    expectedOutcomes: string[];
  } | null {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return null;
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      this.logger.error(`Failed to parse detailed analysis: ${error.message}`);
      return null;
    }
  }
}