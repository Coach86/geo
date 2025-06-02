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
} from '@nestjs/common';
import { UserService } from '../services/user.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserResponseDto } from '../dto/user-response.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';

@ApiTags('users')
@Controller('admin/users')
export class UserController {
  constructor(private readonly userService: UserService) {}

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
  @ApiOperation({ summary: 'Get all users or find by email' })
  @ApiQuery({
    name: 'email',
    required: false,
    description: 'Filter users by email',
  })
  @ApiResponse({
    status: 200,
    description: 'List of users or single user if email provided',
    type: [UserResponseDto],
  })
  async findAll(@Query('email') email?: string): Promise<UserResponseDto | UserResponseDto[]> {
    if (email) {
      return await this.userService.findByEmail(email);
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
    @Body() planSettings: { maxBrands: number; maxAIModels: number; maxSpontaneousPrompts?: number },
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
    const configPath = path.resolve(process.cwd(), 'config.json');
    const configContent = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configContent);
    
    return {
      models: config.llmModels.filter((model: any) => model.enabled),
      maxSelectable: user.planSettings.maxAIModels
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
    const configPath = path.resolve(process.cwd(), 'config.json');
    const configContent = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configContent);
    const availableModelIds = config.llmModels
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
