import { 
  Controller, 
  Post, 
  Get, 
  Put,
  Param, 
  Body,
  Req,
  HttpException,
  HttpStatus,
  UnauthorizedException,
  Logger
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TokenRoute } from '../../auth/decorators/token-route.decorator';
import { ProjectService } from '../../project/services/project.service';
import { VisibilityScannerService } from '../services/visibility-scanner.service';
import { ActionPlanService } from '../services/action-plan.service';

@ApiTags('AI Visibility - Action Plans')
@Controller('ai-visibility/action-plans')
export class ActionPlanController {
  private readonly logger = new Logger(ActionPlanController.name);

  constructor(
    private readonly visibilityScannerService: VisibilityScannerService,
    private readonly projectService: ProjectService,
    private readonly actionPlanService: ActionPlanService,
  ) {}

  @Post(':projectId/generate/:scanId')
  @TokenRoute()
  @ApiOperation({ summary: 'Generate actionable implementation plan from scan results' })
  @ApiResponse({ status: 200, description: 'Action plan generated successfully' })
  async generateActionPlan(
    @Param('projectId') projectId: string,
    @Param('scanId') scanId: string,
    @Req() request: any
  ) {
    this.logger.log(`🎯 ACTION PLAN REQUEST for project ${projectId}, scan ${scanId}`);
    
    // Validate user authentication
    if (!request.userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Validate project exists and user has access
    const project = await this.projectService.findByIdAndUser(projectId, request.userId);
    if (!project) {
      throw new HttpException('Project not found', HttpStatus.NOT_FOUND);
    }

    // Get scan results
    const scanResult = await this.visibilityScannerService.getScanResult(scanId);
    if (!scanResult) {
      throw new HttpException('Scan not found', HttpStatus.NOT_FOUND);
    }

    // Verify scan belongs to project
    if (scanResult.projectId.toString() !== projectId) {
      throw new HttpException('Scan not found', HttpStatus.NOT_FOUND);
    }

    if (scanResult.status !== 'completed') {
      throw new HttpException('Scan not completed yet', HttpStatus.BAD_REQUEST);
    }

    this.logger.log(`📊 Generating action plan for ${project.brandName}...`);
    
    // Generate actionable plan (this will save it)
    let actionPlan = await this.actionPlanService.generateActionPlan(
      scanId,
      projectId,
      scanResult
    );

    // Validate action items to show projected improvements
    actionPlan = await this.actionPlanService.validateAllActionItems(
      projectId,
      actionPlan,
      scanResult
    );

    this.logger.log(`✅ Action plan generated: ${actionPlan.totalItems} items across ${actionPlan.phases.length} phases`);

    // Merge with existing recommendations for unified view
    const recommendations = scanResult.recommendations || [];
    
    return {
      message: 'Action plan generated successfully',
      actionPlan,
      recommendations, // Keep original recommendations for reference
      project: {
        brandName: project.brandName,
        industry: project.industry,
        website: project.website,
      },
      scanSummary: {
        scanId: scanResult.scanId,
        completedAt: scanResult.completedAt,
        totalQueries: scanResult.queries?.length || 0,
        bm25Coverage: scanResult.coverageMetrics?.bm25Coverage || 0,
        vectorCoverage: scanResult.coverageMetrics?.vectorCoverage || 0,
      },
    };
  }

  @Get(':projectId/preview/:scanId')
  @TokenRoute()
  @ApiOperation({ summary: 'Preview action plan summary without full generation' })
  @ApiResponse({ status: 200, description: 'Action plan preview retrieved' })
  async previewActionPlan(
    @Param('projectId') projectId: string,
    @Param('scanId') scanId: string,
    @Req() request: any
  ) {
    // Validate user authentication
    if (!request.userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Validate project exists and user has access
    const project = await this.projectService.findByIdAndUser(projectId, request.userId);
    if (!project) {
      throw new HttpException('Project not found', HttpStatus.NOT_FOUND);
    }

    // Get scan results
    const scanResult = await this.visibilityScannerService.getScanResult(scanId);
    if (!scanResult) {
      throw new HttpException('Scan not found', HttpStatus.NOT_FOUND);
    }

    // Generate quick analysis
    const issues = this.analyzeIssuesQuickly(scanResult);
    const estimatedActions = this.estimateActionCount(issues);

    return {
      scanSummary: {
        scanId: scanResult.scanId,
        projectName: project.brandName,
        completedAt: scanResult.completedAt,
        overallScore: {
          bm25Coverage: Math.round((scanResult.coverageMetrics?.bm25Coverage || 0) * 100),
          vectorCoverage: Math.round((scanResult.coverageMetrics?.vectorCoverage || 0) * 100),
          hybridCoverage: Math.round((scanResult.coverageMetrics?.hybridCoverage || 0) * 100),
        },
      },
      identifiedIssues: issues,
      estimatedWork: {
        totalActions: estimatedActions.total,
        highPriority: estimatedActions.high,
        mediumPriority: estimatedActions.medium,
        lowPriority: estimatedActions.low,
        estimatedTimeframe: estimatedActions.timeframe,
      },
      nextSteps: [
        'Generate full action plan for detailed implementation steps',
        'Prioritize high-impact content gaps first',
        'Focus on brand visibility improvements',
        'Implement semantic content enhancements',
      ],
    };
  }

  private analyzeIssuesQuickly(scanResult: any): any[] {
    const issues = [];

    // Zero results analysis
    const zeroResults = scanResult.coverageMetrics?.queriesWithNoResults?.length || 0;
    if (zeroResults > 0) {
      issues.push({
        type: 'Content Gaps',
        severity: zeroResults > 10 ? 'High' : zeroResults > 5 ? 'Medium' : 'Low',
        description: `${zeroResults} queries return no results`,
        impact: 'Missing content opportunities for AI visibility',
      });
    }

    // Brand visibility analysis
    const bm25Coverage = scanResult.coverageMetrics?.bm25Coverage || 0;
    if (bm25Coverage < 0.5) {
      issues.push({
        type: 'Brand Visibility',
        severity: bm25Coverage < 0.3 ? 'High' : 'Medium',
        description: `Only ${Math.round(bm25Coverage * 100)}% keyword coverage`,
        impact: 'AI assistants struggle to find brand-related content',
      });
    }

    // Semantic matching analysis
    const vectorCoverage = scanResult.coverageMetrics?.vectorCoverage || 0;
    if (vectorCoverage < 0.4) {
      issues.push({
        type: 'Semantic Matching',
        severity: vectorCoverage < 0.2 ? 'High' : 'Medium',
        description: `Only ${Math.round(vectorCoverage * 100)}% semantic coverage`,
        impact: 'Content lacks semantic richness for AI understanding',
      });
    }

    // Overall performance
    const avgPerformance = (bm25Coverage + vectorCoverage) / 2;
    if (avgPerformance < 0.6) {
      issues.push({
        type: 'Overall AI Visibility',
        severity: avgPerformance < 0.4 ? 'High' : 'Medium',
        description: `Average visibility score: ${Math.round(avgPerformance * 100)}%`,
        impact: 'Significant opportunity for AI search optimization',
      });
    }

    return issues;
  }

  private estimateActionCount(issues: any[]): any {
    let total = 0;
    let high = 0;
    let medium = 0;
    let low = 0;

    issues.forEach(issue => {
      switch (issue.type) {
        case 'Content Gaps':
          const contentActions = Math.min(parseInt(issue.description.split(' ')[0]) || 0, 15);
          total += contentActions;
          high += Math.ceil(contentActions * 0.7);
          medium += Math.floor(contentActions * 0.3);
          break;
        case 'Brand Visibility':
          total += 3;
          high += 2;
          medium += 1;
          break;
        case 'Semantic Matching':
          total += 4;
          high += 2;
          medium += 2;
          break;
        case 'Overall AI Visibility':
          total += 2;
          medium += 1;
          low += 1;
          break;
      }
    });

    const timeframe = total <= 10 ? '2-4 weeks' : 
                     total <= 20 ? '1-2 months' : 
                     '2-3 months';

    return { total, high, medium, low, timeframe };
  }

  @Get(':projectId/scan/:scanId')
  @TokenRoute()
  @ApiOperation({ summary: 'Get existing action plan for a scan' })
  @ApiResponse({ status: 200, description: 'Action plan retrieved' })
  async getActionPlan(
    @Param('projectId') projectId: string,
    @Param('scanId') scanId: string,
    @Req() request: any
  ) {
    this.logger.log(`📋 Getting action plan for project ${projectId}, scan ${scanId}`);
    
    // Validate user authentication
    if (!request.userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Validate project exists and user has access
    const project = await this.projectService.findByIdAndUser(projectId, request.userId);
    if (!project) {
      throw new HttpException('Project not found', HttpStatus.NOT_FOUND);
    }

    // Get existing action plan
    const actionPlan = await this.actionPlanService.getActionPlan(projectId, scanId);
    
    if (!actionPlan) {
      this.logger.log(`❌ No action plan found for project ${projectId}, scan ${scanId}`);
      throw new HttpException('Action plan not found', HttpStatus.NOT_FOUND);
    }

    this.logger.log(`✅ Found action plan with ${actionPlan.totalItems} items`);

    return {
      actionPlan,
      project: {
        brandName: project.brandName,
        industry: project.industry,
        website: project.website,
      },
    };
  }

  @Get(':projectId/latest')
  @TokenRoute()
  @ApiOperation({ summary: 'Get latest action plan for a project' })
  @ApiResponse({ status: 200, description: 'Latest action plan retrieved' })
  async getLatestActionPlan(
    @Param('projectId') projectId: string,
    @Req() request: any
  ) {
    // Validate user authentication
    if (!request.userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Validate project exists and user has access
    const project = await this.projectService.findByIdAndUser(projectId, request.userId);
    if (!project) {
      throw new HttpException('Project not found', HttpStatus.NOT_FOUND);
    }

    // Get latest action plan
    const actionPlan = await this.actionPlanService.getLatestActionPlan(projectId);
    
    if (!actionPlan) {
      throw new HttpException('No action plans found', HttpStatus.NOT_FOUND);
    }

    return {
      actionPlan,
      project: {
        brandName: project.brandName,
        industry: project.industry,
        website: project.website,
      },
    };
  }

  @Put(':projectId/scan/:scanId/item/:itemId')
  @TokenRoute()
  @ApiOperation({ summary: 'Update action item completion status' })
  @ApiResponse({ status: 200, description: 'Action item updated' })
  async updateActionItem(
    @Param('projectId') projectId: string,
    @Param('scanId') scanId: string,
    @Param('itemId') itemId: string,
    @Body() body: { completed: boolean },
    @Req() request: any
  ) {
    // Validate user authentication
    if (!request.userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Validate project exists and user has access
    const project = await this.projectService.findByIdAndUser(projectId, request.userId);
    if (!project) {
      throw new HttpException('Project not found', HttpStatus.NOT_FOUND);
    }

    // Update action item
    const updatedPlan = await this.actionPlanService.updateActionItemStatus(
      projectId,
      scanId,
      itemId,
      body.completed
    );
    
    if (!updatedPlan) {
      throw new HttpException('Failed to update action item', HttpStatus.BAD_REQUEST);
    }

    return {
      message: 'Action item updated successfully',
      actionPlan: updatedPlan,
    };
  }
}