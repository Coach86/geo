import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { OnEvent } from '@nestjs/event-emitter';
import { ArticleGenerationService } from '../services/article-generation.service';
import { GenerationJobRepository } from '../repositories/generation-job.repository';
import { ContentLibraryService } from '../../content-library/services/content-library.service';
import { ProjectService } from '../../project/services/project.service';
import { DistributedLockService } from '../../batch/services/distributed-lock.service';

@Injectable()
export class ArticleGenerationTask {
  private readonly logger = new Logger(ArticleGenerationTask.name);

  constructor(
    private readonly articleGenerationService: ArticleGenerationService,
    private readonly generationJobRepository: GenerationJobRepository,
    private readonly contentLibraryService: ContentLibraryService,
    private readonly projectService: ProjectService,
    private readonly distributedLockService: DistributedLockService,
  ) {
    this.logger.log('Article generation task initialized');
  }

  // Run every Sunday at 2 AM (1 hour before main batch at 3 AM)
  @Cron('0 2 * * 0')
  async runWeeklyArticleGeneration() {
    const lockName = 'weekly-article-generation';
    const lockTTL = 120; // 120 minutes TTL

    this.logger.log('Starting weekly article generation task - attempting to acquire lock...');
    
    // Try to acquire distributed lock
    const lockResult = await this.distributedLockService.acquireLock(lockName, lockTTL);
    
    if (!lockResult.acquired) {
      this.logger.log(`Weekly article generation task skipped - lock held by instance: ${lockResult.lockHolder}`);
      return;
    }
    
    try {
      this.logger.log(`Weekly article generation task lock acquired by instance: ${lockResult.instanceId}`);

      // Get all projects
      const projects = await this.projectService.findAll();
      
      let processedCount = 0;
      let failedCount = 0;

      for (const project of projects) {
        try {
          // Check if project has content in library
          const contentStats = await this.contentLibraryService.getContentStatistics(project.projectId);
          
          if (contentStats.processed === 0) {
            this.logger.log(`Skipping project ${project.projectId} - no processed content available`);
            continue;
          }

          // Create generation job
          this.logger.log(`Creating article generation job for project ${project.projectId}`);
          
          const job = await this.articleGenerationService.createGenerationJob(
            project.projectId,
            {
              numberOfArticles: 3, // Generate 3 articles per week by default
              articleTypes: ['blog'],
              targetLength: 'medium',
            },
          );

          // Process job
          await this.articleGenerationService.processGenerationJob(job.id);
          
          processedCount++;
          this.logger.log(`Successfully processed article generation for project ${project.projectId}`);
          
        } catch (error) {
          failedCount++;
          this.logger.error(
            `Failed to generate articles for project ${project.projectId}: ${error.message}`,
            error.stack,
          );
        }
      }

      this.logger.log(
        `Weekly article generation completed. Processed: ${processedCount}, Failed: ${failedCount}`,
      );
      
    } catch (error) {
      this.logger.error(`Weekly article generation task failed: ${error.message}`, error.stack);
    } finally {
      // Always release the lock
      await this.distributedLockService.releaseLock(lockName);
      this.logger.log('Weekly article generation task lock released');
    }
  }

  // Handle generation job created event
  @OnEvent('generation-job.created')
  async handleGenerationJobCreated(payload: { jobId: string; projectId: string }) {
    try {
      this.logger.log(`Processing generation job ${payload.jobId} for project ${payload.projectId}`);
      await this.articleGenerationService.processGenerationJob(payload.jobId);
    } catch (error) {
      this.logger.error(
        `Failed to process generation job ${payload.jobId}: ${error.message}`,
        error.stack,
      );
    }
  }

  // Check for stalled generation jobs every 30 minutes
  @Cron('0 */30 * * * *')
  async checkStalledGenerationJobs() {
    this.logger.log('Checking for stalled generation jobs...');

    try {
      // Get current time minus 1 hour
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);

      // Find stalled jobs
      const stalledJobs = await this.generationJobRepository.findStalledJobs(oneHourAgo);

      if (stalledJobs.length === 0) {
        this.logger.log('No stalled generation jobs found');
        return;
      }

      this.logger.warn(`Found ${stalledJobs.length} stalled generation jobs`);

      // Mark each stalled job as failed
      for (const job of stalledJobs) {
        this.logger.warn(
          `Marking stalled generation job ${job.id} for project ${job.projectId} as failed`,
        );

        try {
          await this.generationJobRepository.updateStatus(job.id, 'failed', {
            articlesGenerated: 0,
            errors: ['Job stalled and was automatically marked as failed'],
          });
        } catch (error) {
          this.logger.error(
            `Failed to update stalled job ${job.id}: ${error.message}`,
            error.stack,
          );
        }
      }

      this.logger.log(`Processed ${stalledJobs.length} stalled generation jobs`);
    } catch (error) {
      this.logger.error(
        `Failed to check for stalled generation jobs: ${error.message}`,
        error.stack,
      );
    }
  }

  // Manual trigger for testing
  async triggerManualGeneration(projectId: string) {
    this.logger.log(`Manually triggering article generation for project ${projectId}`);

    try {
      const job = await this.articleGenerationService.createGenerationJob(projectId, {
        numberOfArticles: 1,
        articleTypes: ['blog'],
        targetLength: 'medium',
      });

      await this.articleGenerationService.processGenerationJob(job.id);

      this.logger.log(`Manual article generation completed for project ${projectId}`);
      return {
        success: true,
        message: 'Article generation completed successfully',
        jobId: job.id,
      };
    } catch (error) {
      this.logger.error(`Manual article generation failed: ${error.message}`, error.stack);
      return {
        success: false,
        message: `Article generation failed: ${error.message}`,
      };
    }
  }
}