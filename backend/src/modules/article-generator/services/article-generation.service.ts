import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { GeneratedArticleRepository } from '../repositories/generated-article.repository';
import { GenerationJobRepository } from '../repositories/generation-job.repository';
import { ContentLibraryService } from '../../content-library/services/content-library.service';
import { ProjectService } from '../../project/services/project.service';
import { LlmService } from '../../llm/services/llm.service';
import { ContentRuleApplicatorService } from './content-rule-applicator.service';
import { GeneratedArticle } from '../entities/generated-article.entity';
import { GenerationJob, GenerationJobConfig } from '../entities/generation-job.entity';
import { ContentItem } from '../../content-library/entities/content-item.entity';
import { Project } from '../../project/entities/project.entity';
import { LlmProvider } from '../../llm/interfaces/llm-provider.enum';
import { z } from 'zod';

const ArticleGenerationSchema = z.object({
  title: z.string().describe('The article title'),
  content: z.string().describe('The full article content in markdown format'),
  summary: z.string().describe('A brief summary of the article (100-150 words)'),
  targetKeywords: z.array(z.string()).describe('Target keywords for SEO'),
  suggestedMetaDescription: z.string().describe('Suggested meta description for SEO'),
});

type ArticleGenerationResult = z.infer<typeof ArticleGenerationSchema>;

@Injectable()
export class ArticleGenerationService {
  private readonly logger = new Logger(ArticleGenerationService.name);

  constructor(
    private readonly generatedArticleRepository: GeneratedArticleRepository,
    private readonly generationJobRepository: GenerationJobRepository,
    private readonly contentLibraryService: ContentLibraryService,
    private readonly projectService: ProjectService,
    private readonly llmService: LlmService,
    private readonly contentRuleApplicatorService: ContentRuleApplicatorService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createGenerationJob(
    projectId: string,
    config: GenerationJobConfig,
  ): Promise<GenerationJob> {
    // Verify project exists
    const project = await this.projectService.findById(projectId);
    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    // Create job
    const job = await this.generationJobRepository.create({
      projectId,
      status: 'pending',
      config,
    });

    // Emit event to trigger processing
    this.eventEmitter.emit('generation-job.created', {
      jobId: job.id,
      projectId: job.projectId,
    });

    this.logger.log(`Created generation job ${job.id} for project ${projectId}`);
    return job;
  }

  async processGenerationJob(jobId: string): Promise<void> {
    const job = await this.generationJobRepository.findById(jobId);
    if (!job) {
      throw new NotFoundException(`Generation job ${jobId} not found`);
    }

    if (job.status !== 'pending') {
      this.logger.warn(`Job ${jobId} is not pending, skipping`);
      return;
    }

    try {
      // Update status to running
      await this.generationJobRepository.updateStatus(jobId, 'running');

      // Get project and content
      const project = await this.projectService.findById(job.projectId);
      if (!project) {
        throw new NotFoundException(`Project ${job.projectId} not found`);
      }

      const contentItems = await this.contentLibraryService.getProcessedContent(job.projectId);
      if (contentItems.length === 0) {
        throw new Error('No processed content available for article generation');
      }

      // Generate articles
      const generatedArticles: GeneratedArticle[] = [];
      const errors: string[] = [];

      for (let i = 0; i < job.config.numberOfArticles; i++) {
        try {
          const article = await this.generateArticle(
            project,
            contentItems,
            job.id,
            job.config,
          );
          generatedArticles.push(article);
        } catch (error) {
          this.logger.error(`Failed to generate article ${i + 1}: ${error.message}`);
          errors.push(`Article ${i + 1}: ${error.message}`);
        }
      }

      // Update job status
      await this.generationJobRepository.updateStatus(jobId, 'completed', {
        articlesGenerated: generatedArticles.length,
        errors: errors.length > 0 ? errors : undefined,
      });

      // Emit completion event
      this.eventEmitter.emit('generation-job.completed', {
        jobId,
        projectId: job.projectId,
        articlesGenerated: generatedArticles.length,
      });

      this.logger.log(`Completed generation job ${jobId} with ${generatedArticles.length} articles`);
    } catch (error) {
      this.logger.error(`Failed to process generation job ${jobId}: ${error.message}`);
      
      await this.generationJobRepository.updateStatus(jobId, 'failed', {
        articlesGenerated: 0,
        errors: [error.message],
      });

      throw error;
    }
  }

  private async generateArticle(
    project: Project,
    contentItems: ContentItem[],
    jobId: string,
    config: GenerationJobConfig,
  ): Promise<GeneratedArticle> {
    // Select content items to use (for now, use random selection)
    const selectedContent = this.selectContentForGeneration(contentItems, 3);
    
    // Generate article using LLM
    const generationResult = await this.generateArticleWithLLM(
      project,
      selectedContent,
      config,
    );

    // Apply content rules
    const { content: processedContent, appliedRules } = 
      await this.contentRuleApplicatorService.applyRules(
        generationResult.content,
        generationResult.title,
      );

    // Calculate metadata
    const wordCount = processedContent.split(/\s+/).filter(word => word.length > 0).length;
    const readingTime = Math.ceil(wordCount / 200); // Assuming 200 words per minute

    // Create article
    const article = await this.generatedArticleRepository.create({
      projectId: project.projectId,
      title: generationResult.title,
      content: processedContent,
      summary: generationResult.summary,
      sourceContentIds: selectedContent.map(c => c.id),
      generationJobId: jobId,
      metadata: {
        wordCount,
        readingTime,
        targetKeywords: generationResult.targetKeywords,
        appliedRules,
      },
      status: 'draft',
    });

    this.logger.log(`Generated article ${article.id} for project ${project.projectId}`);
    return article;
  }

  private selectContentForGeneration(
    contentItems: ContentItem[],
    count: number,
  ): ContentItem[] {
    // For now, use simple random selection
    // In the future, this could use embeddings for semantic similarity
    const shuffled = [...contentItems].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, contentItems.length));
  }

  private async generateArticleWithLLM(
    project: Project,
    contentItems: ContentItem[],
    config: GenerationJobConfig,
  ): Promise<ArticleGenerationResult> {
    // Prepare content context
    const contentContext = contentItems
      .map(item => `Title: ${item.title}\nURL: ${item.url}\nContent: ${item.content.substring(0, 500)}...`)
      .join('\n\n---\n\n');

    // Determine target length
    const lengthGuide = {
      short: '500-800 words',
      medium: '800-1500 words',
      long: '1500-2500 words',
    };

    const systemPrompt = `You are an expert content writer creating articles for ${project.brandName}.

Brand Context:
- Industry: ${project.industry}
- Description: ${project.shortDescription}
- Key Attributes: ${project.keyBrandAttributes.join(', ')}
- Market: ${project.market}
- Language: ${project.language}

Your task is to create an engaging, informative article based on the provided source content.
The article should:
1. Be original and not directly copy from sources
2. Align with the brand's voice and attributes
3. Be optimized for SEO
4. Include relevant information from the source materials
5. Be approximately ${lengthGuide[config.targetLength]}
6. Be written in ${project.language}`;

    const userPrompt = `Based on the following source content, create an article for ${project.brandName}:

${contentContext}

Generate an article that synthesizes this information into a cohesive piece that would be valuable to readers interested in ${project.industry}.`;

    try {
      // Try providers in order
      const providers = [LlmProvider.OpenAI, LlmProvider.Anthropic, LlmProvider.Perplexity];
      
      for (const provider of providers) {
        try {
          const result = await this.llmService.getStructuredOutput<ArticleGenerationResult>(
            provider,
            userPrompt,
            ArticleGenerationSchema,
            { systemPrompt },
          );
          
          this.logger.log(`Successfully generated article using ${provider}`);
          return result;
        } catch (error) {
          this.logger.warn(`Failed to generate article with ${provider}: ${error.message}`);
          
          if (provider === providers[providers.length - 1]) {
            throw new Error(`Failed to generate article with all providers. Last error: ${error.message}`);
          }
        }
      }
      
      throw new Error('Failed to generate article with all available providers');
    } catch (error) {
      this.logger.error(`Error generating article: ${error.message}`);
      throw error;
    }
  }

  async findArticlesByProjectId(projectId: string): Promise<GeneratedArticle[]> {
    // Verify project exists
    const project = await this.projectService.findById(projectId);
    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    return this.generatedArticleRepository.findByProjectId(projectId);
  }

  async findArticleById(id: string): Promise<GeneratedArticle> {
    const article = await this.generatedArticleRepository.findById(id);
    if (!article) {
      throw new NotFoundException(`Article ${id} not found`);
    }
    return article;
  }

  async updateArticle(
    id: string,
    update: Partial<GeneratedArticle>,
  ): Promise<GeneratedArticle> {
    const existing = await this.findArticleById(id);
    
    const updated = await this.generatedArticleRepository.update(id, update);
    if (!updated) {
      throw new NotFoundException(`Article ${id} not found`);
    }

    this.logger.log(`Updated article ${id}`);
    return updated;
  }

  async publishArticle(id: string): Promise<GeneratedArticle> {
    const existing = await this.findArticleById(id);
    
    const updated = await this.generatedArticleRepository.updateStatus(id, 'published');
    if (!updated) {
      throw new NotFoundException(`Article ${id} not found`);
    }

    // Emit event
    this.eventEmitter.emit('article.published', {
      articleId: id,
      projectId: existing.projectId,
    });

    this.logger.log(`Published article ${id}`);
    return updated;
  }

  async deleteArticle(id: string): Promise<void> {
    const existing = await this.findArticleById(id);
    
    const deleted = await this.generatedArticleRepository.delete(id);
    if (!deleted) {
      throw new NotFoundException(`Article ${id} not found`);
    }

    // Emit event
    this.eventEmitter.emit('article.deleted', {
      articleId: id,
      projectId: existing.projectId,
    });

    this.logger.log(`Deleted article ${id}`);
  }

  async getArticleStatistics(projectId: string): Promise<{
    total: number;
    draft: number;
    reviewed: number;
    published: number;
  }> {
    // Verify project exists
    const project = await this.projectService.findById(projectId);
    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    const [total, draft, reviewed, published] = await Promise.all([
      this.generatedArticleRepository.countByProjectId(projectId),
      this.generatedArticleRepository.countByProjectIdAndStatus(projectId, 'draft'),
      this.generatedArticleRepository.countByProjectIdAndStatus(projectId, 'reviewed'),
      this.generatedArticleRepository.countByProjectIdAndStatus(projectId, 'published'),
    ]);

    return { total, draft, reviewed, published };
  }

  async getGenerationJobs(projectId: string): Promise<GenerationJob[]> {
    // Verify project exists
    const project = await this.projectService.findById(projectId);
    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    return this.generationJobRepository.findByProjectId(projectId);
  }
}