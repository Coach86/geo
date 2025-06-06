import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { OnEvent } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { ProjectService } from '../../project/services/project.service';
import { VisibilityScannerService } from '../services/visibility-scanner.service';
import { WebCrawlerService } from '../services/web-crawler.service';
import { SearchIndexRepository } from '../repositories/search-index.repository';
import { ScanResultRepository } from '../repositories/scan-result.repository';
import { AIVisibilityOrchestratorService } from '../services/ai-visibility-orchestrator.service';

@Injectable()
export class AIVisibilityBatchTask {
  private readonly logger = new Logger(AIVisibilityBatchTask.name);
  private readonly aiVisibilityEnabled: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly projectService: ProjectService,
    private readonly orchestratorService: AIVisibilityOrchestratorService,
  ) {
    this.aiVisibilityEnabled = this.configService.get<boolean>('AI_VISIBILITY_ENABLED', true);
    this.logger.log(`AI Visibility batch task initialized. AI Visibility scanning ${this.aiVisibilityEnabled ? 'enabled' : 'disabled'}`);
  }

  // Run every Monday at 4:00 AM UTC (1 hour after regular batch)
  @Cron('0 4 * * 1')
  async runWeeklyAIVisibilityAudit() {
    if (!this.aiVisibilityEnabled) {
      this.logger.log('AI Visibility scanning is disabled. Skipping weekly audit.');
      return;
    }

    this.logger.log('Starting weekly AI Visibility audit task');
    
    try {
      // Process all projects that have AI visibility enabled
      const result = await this.orchestratorService.orchestrateAllProjectAudits();
      this.logger.log(`Weekly AI Visibility audit completed. Processed ${result.successful} projects successfully. Failed: ${result.failed}`);
    } catch (error) {
      this.logger.error(`Weekly AI Visibility audit failed: ${error.message}`, error.stack);
    }
  }

  // Run monthly on the 1st at 5:00 AM UTC for deep analysis
  @Cron('0 5 1 * *')
  async runMonthlyDeepAnalysis() {
    if (!this.aiVisibilityEnabled) {
      return;
    }

    this.logger.log('Starting monthly deep AI Visibility analysis');
    
    try {
      // Run deep analysis with more queries and full re-crawl
      const result = await this.orchestratorService.orchestrateAllProjectAudits({
        deepAnalysis: true,
        forceRecrawl: true,
        queryCount: 100, // Double the queries for deep analysis
      });
      this.logger.log(`Monthly deep analysis completed. Processed ${result.successful} projects successfully. Failed: ${result.failed}`);
    } catch (error) {
      this.logger.error(`Monthly deep analysis failed: ${error.message}`, error.stack);
    }
  }

  // Trigger audit for a specific project
  async triggerProjectAudit(projectId: string, options?: {
    forceRecrawl?: boolean;
    deepAnalysis?: boolean;
  }) {
    this.logger.log(`Manually triggering AI Visibility audit for project ${projectId}`);
    
    try {
      const result = await this.orchestratorService.orchestrateProjectAudit(projectId, options);
      this.logger.log(`Project audit completed successfully for ${projectId}`);
      return { 
        success: true, 
        message: `AI Visibility audit completed successfully`,
        details: result
      };
    } catch (error) {
      this.logger.error(`Project audit failed: ${error.message}`, error.stack);
      return { success: false, message: `AI Visibility audit failed: ${error.message}` };
    }
  }

  /**
   * Handle project created event - run initial AI visibility scan
   */
  @OnEvent('project.created')
  async handleProjectCreated(payload: {
    projectId: string;
    organizationId: string;
    userId: string;
  }) {
    if (!this.aiVisibilityEnabled) {
      return;
    }

    this.logger.log(`Handling project created event for project ${payload.projectId}`);

    try {
      // Wait a bit to ensure project is fully set up
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Run initial scan with basic configuration
      await this.orchestratorService.orchestrateProjectAudit(payload.projectId, {
        initialScan: true,
        queryCount: 20, // Start with fewer queries for initial scan
      });
      
      this.logger.log(`Initial AI visibility scan triggered for new project ${payload.projectId}`);
    } catch (error) {
      this.logger.error(
        `Failed to trigger initial scan for project ${payload.projectId}: ${error.message}`,
        error.stack
      );
    }
  }

  /**
   * Handle plan upgrade event - run AI visibility scan for upgraded projects
   */
  @OnEvent('plan.upgraded')
  async handlePlanUpgraded(payload: {
    organizationId: string;
    planId: string;
    planName: string;
    userId: string;
    timestamp: Date;
  }) {
    if (!this.aiVisibilityEnabled) {
      return;
    }

    // Only process if upgraded to a plan that includes AI visibility
    const aiVisibilityPlans = ['professional', 'enterprise'];
    if (!aiVisibilityPlans.includes(payload.planName.toLowerCase())) {
      return;
    }

    this.logger.log(`Handling plan upgrade to ${payload.planName} for organization ${payload.organizationId}`);

    try {
      const projects = await this.projectService.findByOrganizationId(payload.organizationId);
      
      for (const project of projects) {
        try {
          await this.orchestratorService.orchestrateProjectAudit(project.projectId, {
            planUpgrade: true,
            queryCount: 50, // Full scan for plan upgrade
          });
          
          this.logger.log(`AI visibility scan triggered for project ${project.projectId} after plan upgrade`);
        } catch (error) {
          this.logger.error(
            `Failed to trigger scan for project ${project.projectId}: ${error.message}`,
            error.stack
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to handle plan upgrade for AI visibility: ${error.message}`,
        error.stack
      );
    }
  }

  /**
   * Clean up old scan results (keep last 30 days)
   */
  @Cron('0 6 * * 0') // Run every Sunday at 6:00 AM UTC
  async cleanupOldScans() {
    this.logger.log('Starting cleanup of old AI visibility scans');
    
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const result = await this.orchestratorService.cleanupOldScans(thirtyDaysAgo);
      this.logger.log(`Cleanup completed. Removed ${result.deletedScans} old scans and ${result.deletedIndexes} old indexes`);
    } catch (error) {
      this.logger.error(`Cleanup failed: ${error.message}`, error.stack);
    }
  }
}