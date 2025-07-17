import {
  Controller,
  Get,
  Query,
  HttpStatus,
  HttpException,
  Request,
  UnauthorizedException,
  Param,
} from '@nestjs/common';
import { TokenRoute } from '../../auth/decorators/token-route.decorator';
import { RecommendationService } from '../services/recommendation.service';
import { RecommendationType, RecommendationStatus } from '../interfaces/recommendation.interfaces';
import { UserService } from '../../user/services/user.service';
import { ProjectService } from '../../project/services/project.service';

@Controller('user/recommendations')
export class UserRecommendationsController {
  constructor(
    private readonly recommendationService: RecommendationService,
    private readonly userService: UserService,
    private readonly projectService: ProjectService,
  ) {}

  @Get()
  @TokenRoute()
  async getUserRecommendations(
    @Request() req: any,
    @Query('projectId') projectId?: string,
    @Query('type') type?: RecommendationType,
    @Query('status') status?: RecommendationStatus,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    try {
      // Get userId from token authentication
      const userId = req.userId || req.user?.id;
      if (!userId) {
        throw new UnauthorizedException('User not authenticated');
      }

      // Get user and their organization
      const user = await this.userService.findOne(userId);
      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      // Get all projects for the user's organization
      const userProjects = await this.projectService.findByOrganizationId(user.organizationId);
      const projectIds = userProjects.map(p => p.projectId);

      // Build filters
      const filters: any = {
        organizationId: user.organizationId,
        ...(type && { type }),
      };

      // Handle status filter (can be comma-separated)
      if (status) {
        const statusArray = status.toString().split(',').map(s => s.trim());
        filters.status = statusArray.length > 1 ? { $in: statusArray } : statusArray[0];
      }

      // Handle projectId filter
      if (projectId) {
        if (!projectIds.includes(projectId)) {
          throw new HttpException(
            'Access denied to project',
            HttpStatus.FORBIDDEN,
          );
        }
        filters.projectId = projectId;
      }

      const pagination = {
        limit: limit ? parseInt(limit, 10) : 10,
        offset: offset ? parseInt(offset, 10) : 0,
      };

      const recommendations = await this.recommendationService.findAll(
        filters,
        pagination,
      );

      return {
        success: true,
        data: recommendations,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to fetch recommendations',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('summary')
  @TokenRoute()
  async getUserRecommendationsSummary(@Request() req: any) {
    try {
      // Get userId from token authentication
      const userId = req.userId || req.user?.id;
      if (!userId) {
        throw new UnauthorizedException('User not authenticated');
      }

      // Get user and their organization
      const user = await this.userService.findOne(userId);
      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      // Get all projects for the user's organization
      const userProjects = await this.projectService.findByOrganizationId(user.organizationId);
      const projectIds = userProjects.map(p => p.projectId);
      
      const summaries = await Promise.all(
        projectIds.map((projectId: string) =>
          this.recommendationService.getProjectSummary(
            projectId,
            user.organizationId,
          ),
        ),
      );

      const aggregated = summaries.reduce(
        (acc, summary) => ({
          totalRecommendations: acc.totalRecommendations + summary.total,
          byType: Object.entries(summary.byType).reduce(
            (typeAcc: Record<string, number>, [type, count]) => ({
              ...typeAcc,
              [type]: (typeAcc[type] || 0) + (count as number),
            }),
            acc.byType,
          ),
          byPriority: Object.entries(summary.byPriority).reduce(
            (priorAcc: Record<string, number>, [priority, count]) => ({
              ...priorAcc,
              [priority]: (priorAcc[priority] || 0) + (count as number),
            }),
            acc.byPriority,
          ),
          byStatus: Object.entries(summary.byStatus).reduce(
            (statusAcc: Record<string, number>, [status, count]) => ({
              ...statusAcc,
              [status]: (statusAcc[status] || 0) + (count as number),
            }),
            acc.byStatus,
          ),
        }),
        {
          totalRecommendations: 0,
          byType: {} as Record<string, number>,
          byPriority: {} as Record<string, number>,
          byStatus: {} as Record<string, number>,
        },
      );

      return {
        success: true,
        data: {
          ...aggregated,
          projects: projectIds,
        },
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to fetch recommendations summary',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('project/:projectId')
  @TokenRoute()
  async getProjectRecommendations(
    @Request() req: any,
    @Param('projectId') projectId: string,
    @Query('type') type?: RecommendationType,
    @Query('limit') limit?: string,
  ) {
    try {
      // Get userId from token authentication
      const userId = req.userId || req.user?.id;
      if (!userId) {
        throw new UnauthorizedException('User not authenticated');
      }

      // Get user and their organization
      const user = await this.userService.findOne(userId);
      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      // Get all projects for the user's organization
      const userProjects = await this.projectService.findByOrganizationId(user.organizationId);
      const projectIds = userProjects.map(p => p.projectId);
      
      if (!projectIds.includes(projectId)) {
        throw new HttpException(
          'Access denied to project',
          HttpStatus.FORBIDDEN,
        );
      }

      const filters = {
        projectId,
        organizationId: user.organizationId,
        ...(type && { type }),
        status: { $ne: RecommendationStatus.DISMISSED },
      };

      const pagination = {
        limit: limit ? parseInt(limit, 10) : 5,
        offset: 0,
      };

      const recommendations = await this.recommendationService.findAll(
        filters,
        pagination,
      );

      return {
        success: true,
        data: recommendations,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to fetch project recommendations',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}