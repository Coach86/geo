import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OnEvent } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { BatchService } from '../services/batch.service';
import { BrandReportOrchestratorService } from '../services/brand-report-orchestrator.service';
import { BatchExecutionService } from '../services/batch-execution.service';
import { ProjectRecoveryService } from '../services/project-recovery.service';
import { ProjectService } from '../../project/services/project.service';

@Injectable()
export class BatchTask {
  private readonly logger = new Logger(BatchTask.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly batchService: BatchService,
    private readonly batchOrchestratorService: BrandReportOrchestratorService,
    private readonly batchExecutionService: BatchExecutionService,
    private readonly projectRecoveryService: ProjectRecoveryService,
    private readonly projectService: ProjectService,
  ) {
    this.logger.log('Batch task initialized. Batch processing enabled');
  }

  // Run every minute (for testing)
  @Cron('0 3 * * *')
  async runDailyBatch() {
    this.logger.log('Starting daily batch task');

    try {
      // First, run recovery check for projects without reports
      this.logger.log('Running recovery check for projects without reports...');
      await this.projectRecoveryService.recoverProjectsWithoutReports();

      // Then run the regular batch processing
      this.logger.log('Running regular batch processing...');
      await this.batchOrchestratorService.orchestrateAllProjectBatches('cron');

      this.logger.log('Daily batch task completed successfully');
    } catch (error) {
      this.logger.error(`Daily batch task failed: ${error.message}`, error.stack);
    }
  }

  // For manual triggering (testing/debugging)
  async triggerManualBatch() {
    this.logger.log('Manually triggering batch task');

    try {
      // First, run recovery check
      this.logger.log('Running recovery check for projects without reports...');
      await this.projectRecoveryService.recoverProjectsWithoutReports();

      // Then run the regular batch processing
      this.logger.log('Running regular batch processing...');
      const result = await this.batchOrchestratorService.orchestrateAllProjectBatches('manual');

      this.logger.log('Manual batch task completed successfully');
      return {
        success: true,
        message: `Batch task completed successfully. Processed ${result.successful} projects successfully. Failed: ${result.failed}`,
        details: result,
      };
    } catch (error) {
      this.logger.error(`Manual batch task failed: ${error.message}`, error.stack);
      return { success: false, message: `Batch task failed: ${error.message}` };
    }
  }

  // Trigger batch for a specific project
  async triggerProjectBatch(projectId: string) {
    this.logger.log(`Manually triggering batch for project ${projectId}`);

    try {
      // Use the orchestrator to process the project
      const result = await this.batchOrchestratorService.orchestrateProjectBatches(
        projectId,
        'manual',
      );
      this.logger.log(`Project batch completed successfully for ${projectId}`);
      return {
        success: true,
        message: `Project batch completed successfully`,
        details: result,
      };
    } catch (error) {
      this.logger.error(`Project batch failed: ${error.message}`, error.stack);
      return { success: false, message: `Project batch failed: ${error.message}` };
    }
  }

  // Run every 15 minutes to check for stalled batch executions
  @Cron('0 */15 * * * *')
  async checkStalledBatchExecutions() {
    this.logger.log('Checking for stalled batch executions...');

    try {
      // Get current time minus 2 hours
      const twoHoursAgo = new Date();
      twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);

      // Find batch executions that are still running but were created more than 2 hours ago
      const stalledBatches =
        await this.batchExecutionService.findStalledBatchExecutions(twoHoursAgo);

      if (stalledBatches.length === 0) {
        this.logger.log('No stalled batch executions found');
        return;
      }

      this.logger.warn(`Found ${stalledBatches.length} stalled batch executions`);

      // Mark each stalled batch as failed
      for (const batch of stalledBatches) {
        this.logger.warn(
          `Marking stalled batch ${batch.id} for project ${batch.projectId} as failed. Created at: ${batch.createdAt}`,
        );

        try {
          await this.batchExecutionService.updateBatchExecutionStatus(
            batch.id,
            'failed',
            'Automatically marked as failed after running for more than 2 hours',
          );
        } catch (error) {
          this.logger.error(
            `Failed to update stalled batch ${batch.id}: ${error.message}`,
            error.stack,
          );
        }
      }

      this.logger.log(`Processed ${stalledBatches.length} stalled batch executions`);
    } catch (error) {
      this.logger.error(
        `Failed to check for stalled batch executions: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Handle plan upgrade event - trigger batch analysis for all projects in the organization
   */
  @OnEvent('plan.upgraded')
  async handlePlanUpgraded(payload: {
    organizationId: string;
    planId: string;
    planName: string;
    userId: string;
    timestamp: Date;
  }) {
    this.logger.log(`Handling plan upgrade event for organization ${payload.organizationId}`);

    try {
      // Get all projects for the organization
      const projects = await this.projectService.findByOrganizationId(payload.organizationId);

      if (!projects || projects.length === 0) {
        this.logger.log(`No projects found for organization ${payload.organizationId}`);
        return;
      }

      this.logger.log(
        `Found ${projects.length} projects to process for organization ${payload.organizationId}`,
      );

      // Process each project
      for (const project of projects) {
        try {
          this.logger.log(
            `Starting batch analysis for project ${project.projectId} (${project.brandName}) after plan upgrade`,
          );

          await this.batchOrchestratorService.orchestrateProjectBatches(project.projectId);

          this.logger.log(`Batch analysis triggered successfully for project ${project.projectId}`);
        } catch (error) {
          this.logger.error(
            `Failed to trigger batch for project ${project.projectId}: ${error.message}`,
            error.stack,
          );
          // Continue with other projects even if one fails
        }
      }

      this.logger.log(`Completed processing ${projects.length} projects after plan upgrade`);
    } catch (error) {
      this.logger.error(`Failed to handle plan upgrade event: ${error.message}`, error.stack);
    }
  }
}
