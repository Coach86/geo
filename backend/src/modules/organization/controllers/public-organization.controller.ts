import {
  Controller,
  Get,
  UseGuards,
  Req,
  NotFoundException,
} from '@nestjs/common';
import { OrganizationService } from '../services/organization.service';
import { UserService } from '../../user/services/user.service';
import { OrganizationResponseDto } from '../dto/organization-response.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { TokenAuthGuard } from '../../auth/guards/token-auth.guard';
import { TokenRoute } from '../../auth/decorators/token-route.decorator';

@ApiTags('User - Organization')
@Controller('organization')
export class PublicOrganizationController {
  constructor(
    private readonly organizationService: OrganizationService,
    private readonly userService: UserService,
  ) {}

  @Get()
  @TokenRoute()
  @ApiOperation({ summary: 'Get organization details using access token' })
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer {access_token}',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Organization details',
    type: OrganizationResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired token',
  })
  async getOrganization(@Req() request: any): Promise<OrganizationResponseDto> {
    // Get user from token
    const user = await this.userService.findOne(request.userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return await this.organizationService.findOne(user.organizationId);
  }

  @Get('plan')
  @TokenRoute()
  @ApiOperation({ summary: 'Get organization plan details using access token' })
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer {access_token}',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Plan details',
    schema: {
      type: 'object',
      properties: {
        planSettings: {
          type: 'object',
          properties: {
            maxProjects: { type: 'number' },
            maxAIModels: { type: 'number' },
            maxSpontaneousPrompts: { type: 'number' },
            maxUrls: { type: 'number' },
            maxUsers: { type: 'number' },
          }
        },
        usage: {
          type: 'object',
          properties: {
            currentProjects: { type: 'number' },
            currentUsers: { type: 'number' },
            currentModels: { type: 'number' },
          }
        }
      }
    }
  })
  async getPlanDetails(@Req() request: any) {
    // Get user from token
    const user = await this.userService.findOne(request.userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const organization = await this.organizationService.findOne(user.organizationId);
    const users = await this.userService.findByOrganizationId(organization.id);
    const projects = await this.organizationService.getProjectCount(organization.id);
    
    return {
      planSettings: organization.planSettings,
      usage: {
        currentProjects: projects,
        currentUsers: users.length,
        currentModels: organization.selectedModels.length,
      }
    };
  }

  @Get('models')
  @TokenRoute()
  @ApiOperation({ summary: 'Get selected AI models using access token' })
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer {access_token}',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'List of selected models',
    schema: {
      type: 'object',
      properties: {
        selectedModels: {
          type: 'array',
          items: { type: 'string' }
        },
        maxModels: { type: 'number' }
      }
    }
  })
  async getSelectedModels(@Req() request: any) {
    // Get user from token
    const user = await this.userService.findOne(request.userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const organization = await this.organizationService.findOne(user.organizationId);
    
    return {
      selectedModels: organization.selectedModels,
      maxModels: organization.planSettings.maxAIModels,
    };
  }
}