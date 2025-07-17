import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { TokenRoute } from '../../auth/decorators/token-route.decorator';
import { CurrentOrganization } from '../../auth/decorators/current-organization.decorator';
import { RecommendationService } from '../services/recommendation.service';
import { RecommendationType, RecommendationStatus } from '../interfaces/recommendation.interfaces';

@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly recommendationService: RecommendationService) {}

  @Get()
  @TokenRoute()
  async getRecommendations(
    @CurrentOrganization() organizationId: string,
    @Query('projectId') projectId?: string,
    @Query('type') type?: RecommendationType,
    @Query('status') status?: RecommendationStatus,
    @Query('priority') priority?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    try {
      const filters = {
        organizationId,
        ...(projectId && { projectId }),
        ...(type && { type }),
        ...(status && { status }),
        ...(priority && { priority }),
      };

      const pagination = {
        limit: limit ? parseInt(limit, 10) : 20,
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

  @Get(':id')
  @TokenRoute()
  async getRecommendation(
    @CurrentOrganization() organizationId: string,
    @Param('id') id: string,
  ) {
    try {
      const recommendation = await this.recommendationService.findById(
        id,
        organizationId,
      );

      if (!recommendation) {
        throw new HttpException(
          'Recommendation not found',
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        success: true,
        data: recommendation,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to fetch recommendation',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(':id/status')
  @TokenRoute()
  async updateStatus(
    @CurrentOrganization() organizationId: string,
    @Param('id') id: string,
    @Body('status') status: RecommendationStatus,
  ) {
    try {
      const updated = await this.recommendationService.updateStatus(
        id,
        organizationId,
        status,
      );

      return {
        success: true,
        data: updated,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to update recommendation status',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/dismiss')
  @TokenRoute()
  async dismissRecommendation(
    @CurrentOrganization() organizationId: string,
    @Param('id') id: string,
  ) {
    try {
      const dismissed = await this.recommendationService.dismiss(
        id,
        organizationId,
      );

      return {
        success: true,
        data: dismissed,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to dismiss recommendation',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  @TokenRoute()
  async deleteRecommendation(
    @CurrentOrganization() organizationId: string,
    @Param('id') id: string,
  ) {
    try {
      await this.recommendationService.delete(id, organizationId);

      return {
        success: true,
        message: 'Recommendation deleted successfully',
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to delete recommendation',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('project/:projectId/summary')
  @TokenRoute()
  async getProjectSummary(
    @CurrentOrganization() organizationId: string,
    @Param('projectId') projectId: string,
  ) {
    try {
      const summary = await this.recommendationService.getProjectSummary(
        projectId,
        organizationId,
      );

      return {
        success: true,
        data: summary,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to fetch project recommendation summary',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('project/:projectId/analyze')
  @TokenRoute()
  async triggerAnalysis(
    @CurrentOrganization() organizationId: string,
    @Param('projectId') projectId: string,
  ) {
    try {
      const result = await this.recommendationService.triggerAnalysis(
        projectId,
        organizationId,
      );

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to trigger recommendation analysis',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}