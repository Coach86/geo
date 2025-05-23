import {
  Controller,
  Patch,
  Body,
  Req,
  UseInterceptors,
  ClassSerializerInterceptor,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { UserService } from '../services/user.service';
import { UpdatePhoneDto } from '../dto/update-phone.dto';
import { UserResponseDto } from '../dto/user-response.dto';
import { TokenRoute } from '../../auth/decorators/token-route.decorator';
import { TokenService } from '../../auth/services/token.service';

@ApiTags('user-profile')
@Controller('user/profile')
@UseInterceptors(ClassSerializerInterceptor)
export class UserProfileController {
  private readonly logger = new Logger(UserProfileController.name);

  constructor(
    private readonly userService: UserService,
    private readonly tokenService: TokenService,
  ) {}

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
          pattern: '^\\+?[1-9]\\d{1,14}$'
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
}