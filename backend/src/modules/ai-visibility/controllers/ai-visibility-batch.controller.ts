import { Controller, Post, Param, Body, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { TokenRoute } from '../../auth/decorators/token-route.decorator';
import { AIVisibilityBatchTask } from '../tasks/ai-visibility-batch.task';
import { AIVisibilityOrchestratorService } from '../services/ai-visibility-orchestrator.service';

class AuditOptionsDto {
  forceRecrawl?: boolean;
  deepAnalysis?: boolean;
  queryCount?: number;
}

@ApiTags('ai-visibility-batch')
@Controller('api/ai-visibility/batch')
@TokenRoute()
export class AIVisibilityBatchController {
  constructor(
    private readonly batchTask: AIVisibilityBatchTask,
    private readonly orchestratorService: AIVisibilityOrchestratorService,
  ) {}

  @Post('audit/:projectId')
  @ApiOperation({ summary: 'Manually trigger AI visibility audit for a project' })
  @ApiParam({ name: 'projectId', description: 'The ID of the project' })
  @ApiResponse({
    status: 200,
    description: 'Audit triggered successfully',
  })
  async triggerProjectAudit(
    @Param('projectId') projectId: string,
    @Body() options: AuditOptionsDto,
  ) {
    return this.batchTask.triggerProjectAudit(projectId, options);
  }

  @Post('audit/all')
  @ApiOperation({ summary: 'Manually trigger AI visibility audit for all projects' })
  @ApiResponse({
    status: 200,
    description: 'Audits triggered successfully for all projects',
  })
  async triggerAllAudits(@Body() options: AuditOptionsDto) {
    const result = await this.orchestratorService.orchestrateAllProjectAudits(options);
    return {
      success: true,
      message: `AI visibility audits triggered for all projects`,
      ...result,
    };
  }

  @Get('status')
  @ApiOperation({ summary: 'Get batch processing status' })
  @ApiResponse({
    status: 200,
    description: 'Batch status information',
  })
  async getBatchStatus() {
    // This could be expanded to show running audits, scheduled times, etc.
    return {
      aiVisibilityEnabled: true,
      schedules: {
        weekly: 'Every Monday at 4:00 AM UTC',
        monthly: '1st of each month at 5:00 AM UTC',
        cleanup: 'Every Sunday at 6:00 AM UTC',
      },
    };
  }
}