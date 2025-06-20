import { Controller, Post, UseGuards, Body } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from '../services/auth.service';
import { PublicRoute } from '../decorators/public-route.decorator';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SendMagicLinkDto, MagicLinkResponseDto } from '../dto/magic-link.dto';

@ApiTags('public-auth')
@Controller('auth')
@UseGuards(ThrottlerGuard)
export class PublicAuthController {
  constructor(private authService: AuthService) {}

  @PublicRoute()
  @Post('magic-link')
  @ApiOperation({ summary: 'Send magic link for user authentication' })
  @ApiResponse({
    status: 200,
    description: 'Magic link sent successfully',
    type: MagicLinkResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid email or request' })
  async sendMagicLink(@Body() body: SendMagicLinkDto): Promise<MagicLinkResponseDto> {
    return this.authService.sendMagicLink(body.email, body.promoCode);
  }
}