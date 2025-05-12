import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { BatchService } from '../services/batch.service';

@Injectable()
export class BatchTask {
  private readonly logger = new Logger(BatchTask.name);
  private readonly batchEnabled: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly batchService: BatchService,
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

    this.logger.log('Starting weekly batch task');
    
    try {
      await this.batchService.runBatch();
      this.logger.log('Weekly batch task completed successfully');
    } catch (error) {
      this.logger.error(`Weekly batch task failed: ${error.message}`, error.stack);
    }
  }

  // For manual triggering (testing/debugging)
  async triggerManualBatch() {
    this.logger.log('Manually triggering batch task');
    
    try {
      await this.batchService.runBatch();
      this.logger.log('Manual batch task completed successfully');
      return { success: true, message: 'Batch task completed successfully' };
    } catch (error) {
      this.logger.error(`Manual batch task failed: ${error.message}`, error.stack);
      return { success: false, message: `Batch task failed: ${error.message}` };
    }
  }
}