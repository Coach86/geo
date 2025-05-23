import { Controller, Post, UseGuards, Body } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from '../services/auth.service';
import { PublicRoute } from '../decorators/public-route.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';

@ApiTags('public-auth')
@Controller('auth')
@UseGuards(ThrottlerGuard)
export class PublicAuthController {
  constructor(private authService: AuthService) {}

  @PublicRoute()
  @Post('magic-link')
  @ApiOperation({ summary: 'Send magic link for user authentication' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email', example: 'user@example.com' },
      },
      required: ['email'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Magic link sent successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        userId: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid email or request' })
  async sendMagicLink(@Body() body: { email: string }) {
    return this.authService.sendMagicLink(body.email);
  }
}