import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { BatchService } from '../services/batch.service';
import { ProjectBatchOrchestratorService } from '../services/project-batch-orchestrator.service';
import { BatchExecutionService } from '../services/batch-execution.service';

@Injectable()
export class BatchTask {
  private readonly logger = new Logger(BatchTask.name);
  private readonly batchEnabled: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly batchService: BatchService,
    private readonly batchOrchestratorService: ProjectBatchOrchestratorService,
    private readonly batchExecutionService: BatchExecutionService,
  ) {
    this.batchEnabled = this.configService.get<boolean>('BATCH_ENABLED', true);
    this.logger.log(`Batch task initialized. Batch processing ${this.batchEnabled ? 'enabled' : 'disabled'}`);
  }

  // Run every Monday at 3:00 AM UTC
  @Cron('0 3 * * 1')
  async runWeeklyBatch() {
    if (!this.batchEnabled) {
      this.logger.log('Batch processing is disabled. Skipping weekly batch task.');
      return;
    }

    this.logger.log('Starting weekly batch task using orchestrator');
    
    try {
      // Use the orchestrator to process all projects and create reports with email notifications
      await this.batchOrchestratorService.orchestrateAllProjectBatches();
      this.logger.log('Weekly batch task completed successfully');
    } catch (error) {
      this.logger.error(`Weekly batch task failed: ${error.message}`, error.stack);
    }
  }

  // For manual triggering (testing/debugging)
  async triggerManualBatch() {
    this.logger.log('Manually triggering batch task using orchestrator');
    
    try {
      // Use the orchestrator to process all projects
      const result = await this.batchOrchestratorService.orchestrateAllProjectBatches();
      this.logger.log('Manual batch task completed successfully');
      return { 
        success: true, 
        message: `Batch task completed successfully. Processed ${result.successful} projects successfully. Failed: ${result.failed}`,
        details: result
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
      const result = await this.batchOrchestratorService.orchestrateProjectBatches(projectId);
      this.logger.log(`Project batch completed successfully for ${projectId}`);
      return { 
        success: true, 
        message: `Project batch completed successfully`,
        details: result
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
      const stalledBatches = await this.batchExecutionService.findStalledBatchExecutions(twoHoursAgo);
      
      if (stalledBatches.length === 0) {
        this.logger.log('No stalled batch executions found');
        return;
      }
      
      this.logger.warn(`Found ${stalledBatches.length} stalled batch executions`);
      
      // Mark each stalled batch as failed
      for (const batch of stalledBatches) {
        this.logger.warn(`Marking stalled batch ${batch.id} for project ${batch.projectId} as failed. Created at: ${batch.createdAt}`);
        
        try {
          await this.batchExecutionService.updateBatchExecutionStatus(
            batch.id, 
            'failed', 
            'Automatically marked as failed after running for more than 2 hours'
          );
        } catch (error) {
          this.logger.error(`Failed to update stalled batch ${batch.id}: ${error.message}`, error.stack);
        }
      }
      
      this.logger.log(`Processed ${stalledBatches.length} stalled batch executions`);
    } catch (error) {
      this.logger.error(`Failed to check for stalled batch executions: ${error.message}`, error.stack);
    }
  }
}