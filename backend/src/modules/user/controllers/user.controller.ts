import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  NotFoundException,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { UserService } from '../services/user.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserResponseDto } from '../dto/user-response.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { OrganizationService } from '../../organization/services/organization.service';
import { ConfigService } from '../../config/services/config.service';
import { AdminGuard } from '../../auth/guards/admin.guard';

@ApiTags('Admin - Users')
@Controller('admin/users')
@UseGuards(AdminGuard)
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly organizationService: OrganizationService,
    private readonly configService: ConfigService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({
    status: 201,
    description: 'User successfully created',
    type: UserResponseDto,
  })
  async create(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
    return await this.userService.create(createUserDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all users or find by email or organizationId' })
  @ApiQuery({
    name: 'email',
    required: false,
    description: 'Filter users by email',
  })
  @ApiQuery({
    name: 'organizationId',
    required: false,
    description: 'Filter users by organization ID',
  })
  @ApiResponse({
    status: 200,
    description: 'List of users or single user if email provided',
    type: [UserResponseDto],
  })
  async findAll(
    @Query('email') email?: string,
    @Query('organizationId') organizationId?: string,
  ): Promise<UserResponseDto | UserResponseDto[]> {
    if (email) {
      return await this.userService.findByEmail(email);
    }
    if (organizationId) {
      return await this.userService.findByOrganizationId(organizationId);
    }
    return await this.userService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'User found',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async findOne(@Param('id') id: string): Promise<UserResponseDto> {
    try {
      return await this.userService.findOne(id);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException(`Failed to retrieve user: ${error.message}`);
    }
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'User successfully updated',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return await this.userService.update(id, updateUserDto);
  }

  @Patch(':id/plan-settings')
  @ApiOperation({ summary: 'Update user plan settings' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Plan settings successfully updated',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async updatePlanSettings(
    @Param('id') id: string,
    @Body() planSettings: { maxProjects: number; maxAIModels: number; maxSpontaneousPrompts?: number; maxUrls: number },
  ): Promise<UserResponseDto> {
    return await this.userService.update(id, { planSettings });
  }

  @Get(':id/available-models')
  @ApiOperation({ summary: 'Get available AI models for admin selection' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'List of available AI models',
    schema: {
      type: 'object',
      properties: {
        models: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'openai-gpt4o' },
              name: { type: 'string', example: 'GPT-4o' },
              provider: { type: 'string', example: 'OpenAI' },
              enabled: { type: 'boolean', example: true }
            }
          }
        },
        maxSelectable: { type: 'number', example: 3 }
      }
    }
  })
  async getAvailableModels(@Param('id') id: string) {
    const user = await this.userService.findOne(id);
    const organization = await this.organizationService.findOne(user.organizationId);
    const models = this.configService.getLlmModels();
    
    return {
      models: models.filter((model: any) => model.enabled),
      maxSelectable: organization.planSettings.maxAIModels
    };
  }

  @Patch(':id/selected-models')
  @ApiOperation({ summary: 'Update user selected AI models (admin)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Selected models successfully updated',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid model selection',
  })
  async updateSelectedModels(
    @Param('id') id: string,
    @Body() body: { selectedModels: string[] },
  ): Promise<UserResponseDto> {
    // Admin can select any models without plan restrictions
    // But we still validate that the models exist in config.json
    const models = this.configService.getLlmModels();
    const availableModelIds = models
      .filter((model: any) => model.enabled)
      .map((model: any) => model.id);

    const invalidModels = body.selectedModels.filter(
      modelId => !availableModelIds.includes(modelId)
    );

    if (invalidModels.length > 0) {
      throw new BadRequestException(
        `Invalid model IDs: ${invalidModels.join(', ')}`
      );
    }

    return await this.userService.update(id, { selectedModels: body.selectedModels });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'User successfully deleted',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async remove(@Param('id') id: string): Promise<UserResponseDto> {
    return await this.userService.remove(id);
  }
}
