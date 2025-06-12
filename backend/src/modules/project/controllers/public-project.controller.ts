import {
  Controller,
  Post,
  Param,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { TokenRoute } from '../../auth/decorators/token-route.decorator';
import { ProjectService } from '../services/project.service';
import { BatchService } from '../../batch/services/batch.service';
import { BatchEventsGateway } from '../../batch/gateways/batch-events.gateway';

@ApiTags('public-projects')
@Controller('projects')
export class PublicProjectController {
  constructor(
    private readonly projectService: ProjectService,
    private readonly batchService: BatchService,
    private readonly batchEventsGateway: BatchEventsGateway,
  ) {}

  @Post(':projectId/run-analysis')
  @TokenRoute()
  @ApiOperation({ summary: 'Trigger manual analysis for a project (rate limited)' })
  @ApiParam({ name: 'projectId', description: 'The ID of the project' })
  @ApiResponse({
    status: 202,
    description: 'Analysis started successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        batchExecutionId: { type: 'string' },
        estimatedDuration: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request or rate limit exceeded' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  @ApiResponse({ status: 403, description: 'Analysis not allowed yet - rate limited' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async runManualAnalysis(
    @Req() request: any,
    @Param('projectId') projectId: string,
  ) {
    try {
      // Check rate limiting using service method
      const rateLimit = await this.projectService.isManualAnalysisAllowed(projectId);
      
      if (!rateLimit.allowed) {
        console.log(`[RateLimit] Analysis blocked for project ${projectId}. Next allowed: ${rateLimit.formattedTime}`);
        throw new ForbiddenException(rateLimit.formattedTime);
      }
      
      console.log(`[RateLimit] Analysis allowed for project ${projectId}`);

      // Update the rate limiting field to next day at 8am
      const now = new Date();
      const nextAllowedTime = new Date(now);
      nextAllowedTime.setDate(nextAllowedTime.getDate() + 1); // Next day
      nextAllowedTime.setHours(8, 0, 0, 0); // Set to 8:00 AM
      
      await this.projectService.updateNextAnalysisTime(projectId, nextAllowedTime);

      // Get project context for batch processing
      const projectContext = await this.batchService.getProjectBatchContext(projectId);
      if (!projectContext) {
        throw new NotFoundException(`Project context not found for ID: ${projectId}`);
      }

      // Create a new batch execution record
      const batchExecution = await this.batchService.createBatchExecution(projectId);
      console.log(`[Public] Created new batch execution ${batchExecution.id} for project ${projectId}`);

      // Emit batch started event
      this.batchEventsGateway.emitBatchStarted(
        batchExecution.id,
        projectId,
        projectContext.brandName,
        'full'
      );

      // Start the batch processing in the background (don't await)
      this.batchService
        .processProject(projectId, batchExecution.id)
        .then((result) => {
          console.log(`[Public] Completed batch execution ${batchExecution.id} for project ${projectId}`);
          this.batchService.completeBatchExecution(batchExecution.id, result);
          
          // Emit batch completed event
          this.batchEventsGateway.emitBatchCompleted(
            batchExecution.id,
            projectId,
            projectContext.brandName,
            'full'
          );
        })
        .catch((error) => {
          console.log(`[Public] Failed batch execution ${batchExecution.id} for project ${projectId}: ${error.message}`);
          this.batchService.failBatchExecution(batchExecution.id, error.message || 'Unknown error');
          
          // Emit batch failed event
          this.batchEventsGateway.emitBatchFailed(
            batchExecution.id,
            projectId,
            projectContext.brandName,
            'full',
            error.message || 'Unknown error'
          );
        });

      // Return immediately with success message
      return {
        success: true,
        message: 'Analysis started successfully. This process usually takes 5-10 minutes to complete. Please check back later for results.',
        batchExecutionId: batchExecution.id,
        estimatedDuration: '5-10 minutes',
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      
      throw new BadRequestException(
        `Failed to start analysis for project ${projectId}: ${error.message}`
      );
    }
  }
}