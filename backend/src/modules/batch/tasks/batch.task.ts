import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { BatchService } from '../services/batch.service';
import { CompanyBatchOrchestratorService } from '../services/company-batch-orchestrator.service';

@Injectable()
export class BatchTask {
  private readonly logger = new Logger(BatchTask.name);
  private readonly batchEnabled: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly batchService: BatchService,
    private readonly batchOrchestratorService: CompanyBatchOrchestratorService,
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
      // Use the orchestrator to process all companies and create reports with email notifications
      await this.batchOrchestratorService.orchestrateAllCompanyBatches();
      this.logger.log('Weekly batch task completed successfully');
    } catch (error) {
      this.logger.error(`Weekly batch task failed: ${error.message}`, error.stack);
    }
  }

  // For manual triggering (testing/debugging)
  async triggerManualBatch() {
    this.logger.log('Manually triggering batch task using orchestrator');
    
    try {
      // Use the orchestrator to process all companies
      const result = await this.batchOrchestratorService.orchestrateAllCompanyBatches();
      this.logger.log('Manual batch task completed successfully');
      return { 
        success: true, 
        message: `Batch task completed successfully. Processed ${result.successful} companies successfully. Failed: ${result.failed}`,
        details: result
      };
    } catch (error) {
      this.logger.error(`Manual batch task failed: ${error.message}`, error.stack);
      return { success: false, message: `Batch task failed: ${error.message}` };
    }
  }
  
  // Trigger batch for a specific company
  async triggerCompanyBatch(companyId: string) {
    this.logger.log(`Manually triggering batch for company ${companyId}`);
    
    try {
      // Use the orchestrator to process the company
      const result = await this.batchOrchestratorService.orchestrateCompanyBatches(companyId);
      this.logger.log(`Company batch completed successfully for ${companyId}`);
      return { 
        success: true, 
        message: `Company batch completed successfully`,
        details: result
      };
    } catch (error) {
      this.logger.error(`Company batch failed: ${error.message}`, error.stack);
      return { success: false, message: `Company batch failed: ${error.message}` };
    }
  }
}