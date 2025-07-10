import { Controller, Post, Body, Req, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiProperty } from '@nestjs/swagger';
import { EmailService } from '../services/email.service';
import { UserService } from '../../user/services/user.service';
import { TokenRoute } from '../../auth/decorators/token-route.decorator';
import { Throttle } from '@nestjs/throttler';
import { IsNotEmpty, IsString } from 'class-validator';

export class SendFeedbackDto {
  @ApiProperty({ description: 'Feedback subject' })
  @IsNotEmpty()
  @IsString()
  subject: string;

  @ApiProperty({ description: 'Feedback message' })
  @IsNotEmpty()
  @IsString()
  message: string;
}

@ApiTags('feedback')
@Controller('feedback')
export class FeedbackController {
  private readonly logger = new Logger(FeedbackController.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly userService: UserService,
  ) {}

  @Post('send')
  @TokenRoute()
  @ApiOperation({ summary: 'Send feedback email' })
  @Throttle({ default: { limit: 1, ttl: 60000 } }) // 1 request per minute per IP
  async sendFeedback(
    @Body() dto: SendFeedbackDto,
    @Req() req: any,
  ): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.debug('Feedback request received');
      this.logger.debug(`Request object keys: ${Object.keys(req).join(', ')}`);
      this.logger.debug(`userId from request: ${req.userId}`);
      this.logger.debug(`user from request: ${JSON.stringify(req.user)}`);
      
      const userId = req.userId;
      
      if (!userId) {
        this.logger.error('No userId found in request');
        throw new HttpException('User not authenticated', HttpStatus.UNAUTHORIZED);
      }

      // Get user details
      const user = await this.userService.findOne(userId);
      if (!user) {
        this.logger.error(`User not found for userId: ${userId}`);
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      // Sanitize input to prevent XSS
      const sanitizedSubject = dto.subject.replace(/[<>]/g, '');
      const sanitizedMessage = dto.message.replace(/[<>]/g, '');

      await this.emailService.sendFeedbackEmail(
        user.email,
        user.email, // Use email as name since UserResponseDto doesn't have name
        sanitizedSubject,
        sanitizedMessage,
      );

      return {
        success: true,
        message: 'Feedback sent successfully',
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        'Failed to send feedback. Please try again later.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}