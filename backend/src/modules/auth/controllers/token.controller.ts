import { 
  Controller, 
  Get, 
  Post, 
  Query, 
  Body, 
  BadRequestException,
  UnauthorizedException,
  Logger
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBody } from '@nestjs/swagger';
import { TokenService } from '../services/token.service';
import { 
  ValidateTokenResponseDto, 
  GenerateTokenRequestDto, 
  GenerateTokenResponseDto 
} from '../dto/token.dto';
import { PublicRoute } from '../decorators/public-route.decorator';

@ApiTags('tokens')
@Controller('tokens')
export class TokenController {
  private readonly logger = new Logger(TokenController.name);

  constructor(private readonly tokenService: TokenService) {}

  @PublicRoute()
  @Get('validate')
  @ApiOperation({ summary: 'Validate an access token' })
  @ApiQuery({ 
    name: 'token', 
    required: true, 
    description: 'The token to validate',
    example: '4e13f7d89b73f9b34f1510c750a2b02d3cf8cc786b24450d564bc9ac97405929'
  })
  @ApiResponse({
    status: 200,
    description: 'Token validation result',
    type: ValidateTokenResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - Token not provided' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or expired token' })
  async validateToken(@Query('token') token: string): Promise<ValidateTokenResponseDto> {
    if (!token) {
      throw new BadRequestException('Token is required');
    }

    try {
      const result = await this.tokenService.validateAccessToken(token);
      return result;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`Token validation error: ${error.message}`, error.stack);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  @PublicRoute()
  @Post('generate')
  @ApiOperation({ summary: 'Generate a new access token for a user' })
  @ApiBody({ type: GenerateTokenRequestDto })
  @ApiResponse({
    status: 201,
    description: 'Token generated successfully',
    type: GenerateTokenResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid user ID' })
  async generateToken(@Body() body: GenerateTokenRequestDto): Promise<GenerateTokenResponseDto> {
    if (!body.userId) {
      throw new BadRequestException('User ID is required');
    }

    try {
      const token = await this.tokenService.generateAccessToken(body.userId);
      
      // Note: In production, the token would be sent via email or other secure channel
      // This endpoint returns a success message without exposing the token
      return {
        success: true,
        message: 'Access token generated successfully',
      };
    } catch (error) {
      this.logger.error(`Token generation error: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to generate token');
    }
  }
}