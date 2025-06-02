import {
  Controller,
  Get,
  Patch,
  Body,
  Req,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { UserService } from '../services/user.service';
import { UpdatePhoneDto } from '../dto/update-phone.dto';
import { UpdateEmailDto } from '../dto/update-email.dto';
import { UserResponseDto } from '../dto/user-response.dto';
import { TokenRoute } from '../../auth/decorators/token-route.decorator';
import { TokenService } from '../../auth/services/token.service';
import * as fs from 'fs';
import * as path from 'path';

@ApiTags('user-profile')
@Controller('user/profile')
export class UserProfileController {
  private readonly logger = new Logger(UserProfileController.name);

  constructor(
    private readonly userService: UserService,
    private readonly tokenService: TokenService,
  ) {}

  @Get()
  @TokenRoute() // Mark this route as token-authenticated
  @ApiOperation({ summary: 'Get user profile information' })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Token required' })
  async getProfile(@Req() request: any): Promise<UserResponseDto> {
    try {
      this.logger.log(`Token-based user profile request`);

      // Validate user authentication
      if (!request.userId) {
        if (request.token) {
          const validation = await this.tokenService.validateAccessToken(request.token);
          if (validation.valid && validation.userId) {
            request.userId = validation.userId;
          } else {
            throw new UnauthorizedException('Invalid or expired token');
          }
        } else {
          throw new UnauthorizedException('User not authenticated');
        }
      }

      this.logger.log(`Fetching profile for user: ${request.userId}`);
      const user = await this.userService.findOne(request.userId);

      if (!user) {
        throw new BadRequestException('User not found');
      }

      // Get project IDs separately to avoid circular reference
      const projectIds = await this.userService.getUserProjectIds(request.userId);
      const userWithProjectIds = {
        ...user,
        projectIds,
      };

      this.logger.log(`Profile retrieved successfully for user: ${request.userId}`);
      return userWithProjectIds;
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`Failed to get user profile: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to get user profile: ${error.message}`);
    }
  }

  @Patch('phone')
  @TokenRoute() // Mark this route as token-authenticated
  @ApiOperation({ summary: 'Update user phone number' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        phoneNumber: {
          type: 'string',
          example: '+1234567890',
          pattern: '^\\+?[1-9]\\d{1,14}$',
        },
      },
      required: ['phoneNumber'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Phone number updated successfully',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid phone number' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Token required' })
  async updatePhone(
    @Req() request: any,
    @Body() updatePhoneDto: UpdatePhoneDto,
  ): Promise<UserResponseDto> {
    try {
      this.logger.log(`Token-based phone number update request`);

      // Validate user authentication
      if (!request.userId) {
        if (request.token) {
          const validation = await this.tokenService.validateAccessToken(request.token);
          if (validation.valid && validation.userId) {
            request.userId = validation.userId;
          } else {
            throw new UnauthorizedException('Invalid or expired token');
          }
        } else {
          throw new UnauthorizedException('User not authenticated');
        }
      }

      this.logger.log(`Updating phone number for user: ${request.userId}`);
      const updatedUser = await this.userService.updatePhone(request.userId, updatePhoneDto);

      this.logger.log(`Phone number updated successfully for user: ${request.userId}`);
      return updatedUser;
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`Failed to update phone number: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to update phone number: ${error.message}`);
    }
  }

  @Patch('email')
  @TokenRoute() // Mark this route as token-authenticated
  @ApiOperation({ summary: 'Update user email address' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: {
          type: 'string',
          example: 'newemail@example.com',
          format: 'email',
        },
      },
      required: ['email'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Email updated successfully',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid email or email already in use' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Token required' })
  async updateEmail(
    @Req() request: any,
    @Body() updateEmailDto: UpdateEmailDto,
  ): Promise<UserResponseDto> {
    try {
      this.logger.log(`Token-based email update request`);

      // Validate user authentication
      if (!request.userId) {
        if (request.token) {
          const validation = await this.tokenService.validateAccessToken(request.token);
          if (validation.valid && validation.userId) {
            request.userId = validation.userId;
          } else {
            throw new UnauthorizedException('Invalid or expired token');
          }
        } else {
          throw new UnauthorizedException('User not authenticated');
        }
      }

      this.logger.log(`Updating email for user: ${request.userId}`);
      const updatedUser = await this.userService.updateEmail(request.userId, updateEmailDto);

      this.logger.log(`Email updated successfully for user: ${request.userId}`);
      return updatedUser;
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        throw error;
      }
      if (error.message === 'Email already in use') {
        throw new BadRequestException('Email already in use');
      }
      this.logger.error(`Failed to update email: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to update email: ${error.message}`);
    }
  }

  @Get('available-models')
  @TokenRoute() // Mark this route as token-authenticated
  @ApiOperation({ summary: 'Get available AI models for selection' })
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
              enabled: { type: 'boolean', example: true },
            },
          },
        },
        maxSelectable: { type: 'number', example: 3 },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Token required' })
  async getAvailableModels(@Req() request: any) {
    try {
      this.logger.log(`Token-based available models request`);

      // Validate user authentication
      if (!request.userId) {
        if (request.token) {
          const validation = await this.tokenService.validateAccessToken(request.token);
          if (validation.valid && validation.userId) {
            request.userId = validation.userId;
          } else {
            throw new UnauthorizedException('Invalid or expired token');
          }
        } else {
          throw new UnauthorizedException('User not authenticated');
        }
      }

      const user = await this.userService.findOne(request.userId);
      const configPath = path.resolve(process.cwd(), 'config.json');
      const configContent = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(configContent);

      return {
        models: config.llmModels.filter((model: any) => model.enabled),
        maxSelectable: user.planSettings.maxAIModels,
      };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`Failed to get available models: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to get available models: ${error.message}`);
    }
  }

  @Patch('selected-models')
  @TokenRoute() // Mark this route as token-authenticated
  @ApiOperation({ summary: 'Update user selected AI models' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        selectedModels: {
          type: 'array',
          items: { type: 'string' },
          example: ['openai-gpt4o', 'anthropic-claude3.7sonnet'],
        },
      },
      required: ['selectedModels'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Selected models successfully updated',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid model selection',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Token required' })
  async updateSelectedModels(
    @Req() request: any,
    @Body() body: { selectedModels: string[] },
  ): Promise<UserResponseDto> {
    try {
      this.logger.log(`Token-based selected models update request`);

      // Validate user authentication
      if (!request.userId) {
        if (request.token) {
          const validation = await this.tokenService.validateAccessToken(request.token);
          if (validation.valid && validation.userId) {
            request.userId = validation.userId;
          } else {
            throw new UnauthorizedException('Invalid or expired token');
          }
        } else {
          throw new UnauthorizedException('User not authenticated');
        }
      }

      const user = await this.userService.findOne(request.userId);

      // Validate that the number of selected models doesn't exceed the plan limit
      if (body.selectedModels.length > user.planSettings.maxAIModels) {
        throw new BadRequestException(
          `Cannot select more than ${user.planSettings.maxAIModels} models for your current plan`,
        );
      }

      // Validate that all selected models exist in config.json
      const configPath = path.resolve(process.cwd(), 'config.json');
      const configContent = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(configContent);
      const availableModelIds = config.llmModels
        .filter((model: any) => model.enabled)
        .map((model: any) => model.id);

      const invalidModels = body.selectedModels.filter(
        (modelId) => !availableModelIds.includes(modelId),
      );

      if (invalidModels.length > 0) {
        throw new BadRequestException(`Invalid model IDs: ${invalidModels.join(', ')}`);
      }

      this.logger.log(`Updating selected models for user: ${request.userId}`);
      const updatedUser = await this.userService.update(request.userId, {
        selectedModels: body.selectedModels,
      });

      this.logger.log(`Selected models updated successfully for user: ${request.userId}`);
      return updatedUser;
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`Failed to update selected models: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to update selected models: ${error.message}`);
    }
  }
}
