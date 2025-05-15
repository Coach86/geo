import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  UseInterceptors,
  ClassSerializerInterceptor,
  NotFoundException,
  BadRequestException,
  Inject,
  Logger,
  Headers,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBody } from '@nestjs/swagger';
import { UserService } from '../../user/services/user.service';
import { TokenService } from '../services/token.service';
import {
  ValidateTokenResponseDto,
  GenerateTokenRequestDto, 
  GenerateTokenResponseDto,
  TokenDebugResponseDto,
} from '../dto/token.dto';
import { PublicRoute } from '../decorators/public-route.decorator';

@ApiTags('tokens')
@Controller('tokens')
@UseInterceptors(ClassSerializerInterceptor)
export class TokenController {
  private readonly logger = new Logger(TokenController.name);

  constructor(
    private readonly tokenService: TokenService,
    @Inject(UserService) private readonly userService: UserService,
  ) {}

  @Get('validate')
  @PublicRoute()
  @ApiOperation({ summary: 'Validate an access token' })
  @ApiQuery({ name: 'token', description: 'The access token to validate' })
  @ApiResponse({
    status: 200,
    description: 'The token validation result',
    type: ValidateTokenResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid request.' })
  async validateToken(@Query('token') token: string): Promise<ValidateTokenResponseDto> {
    this.logger.log(`Token validation attempt - Token: ${token ? token.substring(0, 8) + '...' : 'undefined'}`);
    
    try {
      if (!token) {
        this.logger.warn('Token validation failed: Token is required');
        throw new BadRequestException('Token is required');
      }

      const result = await this.tokenService.validateAccessToken(token);
      this.logger.log(`Token validation result - Valid: ${result.valid}, UserId: ${result.userId ? result.userId : 'none'}`);
      return result;
    } catch (error) {
      this.logger.error(`Token validation error: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Post('generate')
  @PublicRoute()
  @ApiOperation({ summary: 'Generate a token for accessing all user reports' })
  @ApiBody({ type: GenerateTokenRequestDto })
  @ApiResponse({
    status: 200,
    description: 'The token has been generated successfully',
    type: GenerateTokenResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid request.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async generateToken(@Body() request: GenerateTokenRequestDto): Promise<GenerateTokenResponseDto> {
    this.logger.log(`Token generation request for userId: ${request.userId}`);
    
    try {
      if (!request.userId) {
        this.logger.warn('Token generation failed: userId is required');
        throw new BadRequestException('userId is required');
      }

      // Check that the user exists
      const user = await this.userService.findOne(request.userId);
      if (!user) {
        this.logger.warn(`Token generation failed: User not found with ID ${request.userId}`);
        throw new NotFoundException(`User not found with ID ${request.userId}`);
      }

      // Generate a new token
      const token = await this.tokenService.generateAccessToken(request.userId);
      this.logger.log(`Token generated successfully for userId: ${request.userId}`);

      // Here we would send an email but for now we'll just return success
      return {
        success: true,
        message: 'Access token generated successfully',
      };
    } catch (error) {
      this.logger.error(`Token generation error: ${error.message}`, error.stack);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to generate access token: ${error.message}`);
    }
  }

  @Get('debug')
  @PublicRoute()
  @ApiOperation({ summary: 'Generate a debug token for development (non-production only)' })
  @ApiQuery({ name: 'userId', description: 'The user ID to generate a token for' })
  @ApiResponse({
    status: 200,
    description: 'Debug token generated successfully',
    type: TokenDebugResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid request or not in development mode.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async debugToken(@Query('userId') userId: string): Promise<TokenDebugResponseDto> {
    // Only allow in development mode
    const environment = process.env.NODE_ENV || 'development';
    if (environment !== 'development') {
      throw new BadRequestException('Debug endpoint only available in development mode');
    }

    if (!userId) {
      throw new BadRequestException('UserId is required');
    }

    try {
      // Verify the user exists
      const user = await this.userService.findOne(userId);
      if (!user) {
        throw new NotFoundException(`User not found with ID ${userId}`);
      }

      // Generate token
      const token = await this.tokenService.generateAccessToken(userId);

      // Construct the access URL
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const accessUrl = `${baseUrl}/report-access?token=${token}`;

      return {
        token,
        accessUrl,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to generate debug token: ${error.message}`);
    }
  }
  
  @Get('debug-request')
  @PublicRoute()
  @ApiOperation({ summary: 'Debug token request details (non-production only)' })
  @ApiQuery({ name: 'token', description: 'The access token to debug', required: false })
  async debugRequest(
    @Query('token') token: string,
    @Headers() headers: any,
    @Req() request: any
  ): Promise<any> {
    // Only allow in development mode
    const environment = process.env.NODE_ENV || 'development';
    if (environment !== 'development') {
      throw new BadRequestException('Debug endpoint only available in development mode');
    }
    
    this.logger.log(`Debug request called with token: ${token ? token.substring(0, 8) + '...' : 'none'}`);
    
    // Information about the request
    const requestInfo = {
      path: request.path,
      method: request.method,
      params: request.params,
      query: request.query,
      body: request.body,
      userId: request.userId,
      token: request.token,
      headers: {
        authorization: headers.authorization ? `${headers.authorization.substring(0, 10)}...` : undefined,
        'user-agent': headers['user-agent'],
      },
    };
    
    // If token is provided, validate it
    let tokenValidation = null;
    if (token) {
      tokenValidation = await this.tokenService.validateAccessToken(token);
      this.logger.log(`Token validation result: ${JSON.stringify(tokenValidation)}`);
    }
    
    return {
      message: 'Debug information for token request',
      requestInfo,
      tokenValidation,
      timestamp: new Date().toISOString(),
    };
  }
}