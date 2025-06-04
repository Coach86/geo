import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { OrganizationService } from '../services/organization.service';
import { UserService } from '../../user/services/user.service';
import { CreateUserDto } from '../../user/dto/create-user.dto';
import { UserResponseDto } from '../../user/dto/user-response.dto';
import { OrganizationResponseDto } from '../dto/organization-response.dto';
import { UpdateOrganizationDto } from '../dto/update-organization.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TokenRoute } from '../../auth/decorators/token-route.decorator';
import { ConfigService } from '../../config/services/config.service';
import { AuthService } from '../../auth/services/auth.service';

@ApiTags('organization')
@Controller('user/organization')
@UseGuards(JwtAuthGuard)
export class UserOrganizationController {
  constructor(
    private readonly organizationService: OrganizationService,
    private readonly userService: UserService,
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {}

  @Get()
  @TokenRoute()
  @ApiOperation({ summary: 'Get current user organization' })
  @ApiResponse({
    status: 200,
    description: 'Organization details',
    type: OrganizationResponseDto,
  })
  async getMyOrganization(@Req() request: any): Promise<OrganizationResponseDto> {
    // For token routes, we get userId instead of user
    const userId = request.userId || request.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    
    // Get the user to find their organizationId
    const user = await this.userService.findOne(userId);
    if (!user || !user.organizationId) {
      throw new NotFoundException('User organization not found');
    }
    
    return await this.organizationService.findOne(user.organizationId);
  }

  @Get('users')
  @TokenRoute()
  @ApiOperation({ summary: 'Get all users in my organization' })
  @ApiResponse({
    status: 200,
    description: 'List of users in organization',
    type: [UserResponseDto],
  })
  async getOrganizationUsers(@Req() request: any): Promise<UserResponseDto[]> {
    // For token routes, we get userId instead of user
    const userId = request.userId || request.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    
    // Get the user to find their organizationId
    const user = await this.userService.findOne(userId);
    if (!user || !user.organizationId) {
      throw new NotFoundException('User organization not found');
    }
    
    return await this.userService.findByOrganizationId(user.organizationId);
  }

  @Post('users')
  @TokenRoute()
  @ApiOperation({ summary: 'Add a user to my organization' })
  @ApiResponse({
    status: 201,
    description: 'User successfully added',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'User limit exceeded',
  })
  async addUser(
    @Req() request: any,
    @Body() createUserDto: CreateUserDto,
  ): Promise<UserResponseDto> {
    // For token routes, we get userId instead of user
    const userId = request.userId || request.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    
    // Get the user to find their organizationId
    const user = await this.userService.findOne(userId);
    if (!user || !user.organizationId) {
      throw new NotFoundException('User organization not found');
    }
    
    const organization = await this.organizationService.findOne(user.organizationId);
    
    // Check if organization can add more users
    const currentUsers = organization.currentUsers || 0;
    const maxUsers = organization.planSettings.maxUsers;
    
    if (maxUsers !== -1 && currentUsers >= maxUsers) {
      throw new BadRequestException(
        `Organization has reached its user limit (${maxUsers}). Please upgrade your plan.`
      );
    }
    
    // Add user with organization ID
    const newUser = await this.userService.create({
      ...createUserDto,
      organizationId: user.organizationId,
    });

    // Send magic link email to the new user
    try {
      await this.authService.sendMagicLink(newUser.email);
    } catch (error) {
      // Log error but don't fail the user creation
      console.error(`Failed to send welcome email to ${newUser.email}:`, error);
    }

    return newUser;
  }

  @Delete('users/:userId')
  @TokenRoute()
  @ApiOperation({ summary: 'Remove a user from my organization' })
  @ApiParam({ name: 'userId', description: 'User ID to remove' })
  @ApiResponse({
    status: 200,
    description: 'User successfully removed',
  })
  @ApiResponse({
    status: 403,
    description: 'Cannot remove yourself or last user',
  })
  async removeUser(
    @Req() request: any,
    @Param('userId') userId: string,
  ): Promise<void> {
    // For token routes, we get userId instead of user
    const currentUserId = request.userId || request.user?.id;
    if (!currentUserId) {
      throw new UnauthorizedException('User not authenticated');
    }
    
    // Get the current user to find their organizationId
    const currentUser = await this.userService.findOne(currentUserId);
    if (!currentUser || !currentUser.organizationId) {
      throw new NotFoundException('User organization not found');
    }
    
    // Prevent user from removing themselves
    if (currentUser.id === userId) {
      throw new ForbiddenException('You cannot remove yourself from the organization');
    }
    
    // Verify the user belongs to the same organization
    const userToRemove = await this.userService.findOne(userId);
    if (userToRemove.organizationId !== currentUser.organizationId) {
      throw new ForbiddenException('User does not belong to your organization');
    }
    
    // Check if this is the last user
    const organization = await this.organizationService.findOne(currentUser.organizationId);
    if ((organization.currentUsers || 0) <= 1) {
      throw new ForbiddenException('Cannot remove the last user from the organization');
    }
    
    await this.userService.remove(userId);
  }

  @Patch('users/:userId')
  @TokenRoute()
  @ApiOperation({ summary: 'Update a user in my organization' })
  @ApiParam({ name: 'userId', description: 'User ID to update' })
  @ApiResponse({
    status: 200,
    description: 'User successfully updated',
    type: UserResponseDto,
  })
  async updateUser(
    @Req() request: any,
    @Param('userId') userId: string,
    @Body() updateData: { language?: string },
  ): Promise<UserResponseDto> {
    // For token routes, we get userId instead of user
    const currentUserId = request.userId || request.user?.id;
    if (!currentUserId) {
      throw new UnauthorizedException('User not authenticated');
    }
    
    // Get the current user to find their organizationId
    const currentUser = await this.userService.findOne(currentUserId);
    if (!currentUser || !currentUser.organizationId) {
      throw new NotFoundException('User organization not found');
    }
    
    // Verify the user belongs to the same organization
    const userToUpdate = await this.userService.findOne(userId);
    if (userToUpdate.organizationId !== currentUser.organizationId) {
      throw new ForbiddenException('User does not belong to your organization');
    }
    
    // Only allow updating language
    return await this.userService.update(userId, { language: updateData.language });
  }

  @Get('models')
  @TokenRoute()
  @ApiOperation({ summary: 'Get selected AI models for my organization' })
  @ApiResponse({
    status: 200,
    description: 'List of selected models and available models',
    schema: {
      type: 'object',
      properties: {
        selectedModels: {
          type: 'array',
          items: { type: 'string' }
        },
        maxModels: { type: 'number' },
        availableModels: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              provider: { type: 'string' },
              enabled: { type: 'boolean' },
              webAccess: { type: 'boolean' }
            }
          }
        }
      }
    }
  })
  async getSelectedModels(@Req() request: any) {
    // For token routes, we get userId instead of user
    const userId = request.userId || request.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    
    // Get the user to find their organizationId
    const user = await this.userService.findOne(userId);
    if (!user || !user.organizationId) {
      throw new NotFoundException('User organization not found');
    }
    
    const organization = await this.organizationService.findOne(user.organizationId);
    
    return {
      selectedModels: organization.selectedModels,
      maxModels: organization.planSettings.maxAIModels,
      availableModels: this.configService.getAvailableModels(),
    };
  }

  @Patch('models')
  @TokenRoute()
  @ApiOperation({ summary: 'Update selected AI models for my organization' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        selectedModels: {
          type: 'array',
          items: { type: 'string' }
        }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Models successfully updated',
  })
  async updateSelectedModels(
    @Req() request: any,
    @Body() body: { selectedModels: string[] }
  ) {
    // For token routes, we get userId instead of user
    const userId = request.userId || request.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    
    // Get the user to find their organizationId
    const user = await this.userService.findOne(userId);
    if (!user || !user.organizationId) {
      throw new NotFoundException('User organization not found');
    }
    
    const organization = await this.organizationService.findOne(user.organizationId);
    
    // Validate number of models
    if (body.selectedModels.length > organization.planSettings.maxAIModels) {
      throw new BadRequestException(
        `Cannot select more than ${organization.planSettings.maxAIModels} models for your current plan`
      );
    }
    
    await this.organizationService.update(organization.id, {
      selectedModels: body.selectedModels,
    });
    
    return { success: true };
  }

  @Patch()
  @ApiOperation({ summary: 'Update organization details' })
  @ApiBody({ type: UpdateOrganizationDto })
  @ApiResponse({
    status: 200,
    description: 'Organization successfully updated',
    type: OrganizationResponseDto,
  })
  async updateOrganization(
    @Req() request: any,
    @Body() updateData: UpdateOrganizationDto
  ): Promise<OrganizationResponseDto> {
    const user = request.user;
    
    // Only allow updating name for now
    if (updateData.planSettings) {
      throw new ForbiddenException('Plan settings can only be updated by administrators');
    }
    
    return await this.organizationService.update(user.organizationId, updateData);
  }

  @Get('plan')
  @ApiOperation({ summary: 'Get organization plan details' })
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
    const user = request.user;
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
}