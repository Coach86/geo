import {
  Controller,
  Post,
  Body,
  Req,
  UseInterceptors,
  ClassSerializerInterceptor,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { IdentityCardService } from '../services/identity-card.service';
import { IdentityCardRepository } from '../repositories/identity-card.repository';
import { CreateIdentityCardDto } from '../dto/create-identity-card.dto';
import { IdentityCardResponseDto } from '../dto/identity-card-response.dto';
import { TokenRoute } from '../../auth/decorators/token-route.decorator';
import { TokenService } from '../../auth/services/token.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CompanyCreatedEvent } from '../events/company-created.event';
import { v4 as uuidv4 } from 'uuid';

@ApiTags('user-identity-cards')
@Controller('user/identity-card')
@UseInterceptors(ClassSerializerInterceptor)
export class UserIdentityCardController {
  private readonly logger = new Logger(UserIdentityCardController.name);

  constructor(
    private readonly identityCardService: IdentityCardService,
    private readonly identityCardRepository: IdentityCardRepository,
    private readonly tokenService: TokenService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Post('analyze-from-url')
  @TokenRoute() // Mark this route as token-authenticated
  @ApiOperation({ summary: 'Analyze website URL and return brand data without saving' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        url: { type: 'string', format: 'uri', example: 'https://example.com' },
        market: { type: 'string', example: 'United States' },
        language: { type: 'string', example: 'English' },
      },
      required: ['url', 'market'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Website analyzed successfully',
    type: IdentityCardResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid URL or request' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Token required' })
  async analyzeFromUrl(
    @Req() request: any,
    @Body() body: { url: string; market: string; language?: string },
  ): Promise<IdentityCardResponseDto> {
    try {
      this.logger.log(`Token-based website analysis attempt for URL: ${body.url}`);
      this.logger.log(`Request details: userId=${request.userId}, token=${request.token ? request.token.substring(0, 8) + '...' : 'none'}`);
      
      // The userId is added to the request by the TokenAuthGuard
      if (!request.userId) {
        this.logger.warn(`No userId found in request for website analysis`);
        
        // If we have a token but no userId, try to validate it directly
        if (request.token) {
          this.logger.log(`Attempting to validate token directly: ${request.token.substring(0, 8)}...`);
          const validation = await this.tokenService.validateAccessToken(request.token);
          
          if (validation.valid && validation.userId) {
            this.logger.log(`Direct token validation successful, userId: ${validation.userId}`);
            request.userId = validation.userId;
          } else {
            this.logger.warn(`Direct token validation failed`);
            throw new UnauthorizedException('Invalid or expired token');
          }
        } else {
          throw new UnauthorizedException('User not authenticated');
        }
      }

      // Market is required
      if (!body.market) {
        throw new BadRequestException('Market is required');
      }

      this.logger.log(`Analyzing website for user ${request.userId} with URL: ${body.url}`);
      const identityCard = await this.identityCardService.analyzeFromUrl(
        body.url,
        body.market,
        body.language || 'en',
        request.userId
      );
      
      this.logger.log(`Website analysis completed successfully`);
      return this.mapToResponseDto(identityCard);
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`Failed to analyze website: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to analyze website: ${error.message}`);
    }
  }

  @Post('create')
  @TokenRoute() // Mark this route as token-authenticated
  @ApiOperation({ summary: 'Save identity card data directly (without re-analysis)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        url: { type: 'string', format: 'uri', example: 'https://example.com' },
        brandName: { type: 'string', example: 'Acme Corp' },
        description: { type: 'string', example: 'A leading provider of innovative solutions' },
        industry: { type: 'string', example: 'Technology' },
        market: { type: 'string', example: 'United States' },
        language: { type: 'string', example: 'English' },
        keyBrandAttributes: { type: 'array', items: { type: 'string' } },
        competitors: { type: 'array', items: { type: 'string' } },
      },
      required: ['url', 'brandName', 'market'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Identity card saved successfully',
    type: IdentityCardResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Token required' })
  async create(
    @Req() request: any,
    @Body() body: {
      url: string;
      brandName: string;
      description?: string;
      industry?: string;
      market: string;
      language?: string;
      keyBrandAttributes?: string[];
      competitors?: string[];
    },
  ): Promise<IdentityCardResponseDto> {
    try {
      this.logger.log(`Token-based identity card saving for brand: ${body.brandName}`);
      
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

      // Required fields validation
      if (!body.brandName || !body.market || !body.url) {
        throw new BadRequestException('Brand name, market, and URL are required');
      }

      // Get user details
      const user = await this.identityCardRepository.findUserById(request.userId);
      if (!user) {
        throw new BadRequestException('User not found');
      }

      // Generate unique ID for the company
      const companyId = uuidv4();

      // Prepare identity card data for direct database saving
      const identityCardData = {
        id: companyId,
        brandName: body.brandName,
        website: body.url,
        industry: body.industry || '',
        shortDescription: body.description || '',
        fullDescription: body.description || '',
        market: body.market,
        language: body.language || 'en',
        keyBrandAttributes: body.keyBrandAttributes || [],
        competitors: body.competitors || [],
        userId: request.userId,
        userEmail: user.email,
        userLanguage: user.language || 'en',
        updatedAt: new Date(),
        createdAt: new Date(),
      };

      this.logger.log(`Saving identity card directly to database for user ${request.userId}`);
      
      // Save directly to database without analysis
      const savedIdentityCard = await this.identityCardRepository.save(identityCardData);
      
      // Emit the company created event to trigger prompt generation
      this.eventEmitter.emit('company.created', new CompanyCreatedEvent(companyId));
      
      this.logger.log(`Identity card saved successfully with ID: ${companyId}`);
      
      // Return the saved data
      const response = this.mapToResponseDto({
        companyId,
        brandName: body.brandName,
        website: body.url,
        industry: body.industry || '',
        shortDescription: body.description || '',
        fullDescription: body.description || '',
        market: body.market,
        language: body.language || 'en',
        keyBrandAttributes: body.keyBrandAttributes || [],
        competitors: body.competitors || [],
        userId: request.userId,
        userEmail: user.email,
        userLanguage: user.language || 'en',
        updatedAt: new Date(),
      });

      return response;
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`Failed to save identity card: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to save identity card: ${error.message}`);
    }
  }

  private mapToResponseDto(identityCard: any): IdentityCardResponseDto {
    const response = new IdentityCardResponseDto();
    response.id = identityCard.companyId;
    response.brandName = identityCard.brandName;
    response.website = identityCard.website;
    response.url = identityCard.website;
    response.industry = identityCard.industry;
    response.market = identityCard.market || 'Global';
    response.language = identityCard.language;
    response.shortDescription = identityCard.shortDescription;
    response.fullDescription = identityCard.fullDescription;
    response.longDescription = identityCard.fullDescription;
    response.keyBrandAttributes = identityCard.keyBrandAttributes;
    response.competitors = identityCard.competitors;
    response.createdAt = identityCard.updatedAt;
    response.updatedAt = identityCard.updatedAt;
    response.userId = identityCard.userId;
    response.userEmail = identityCard.userEmail;
    response.userLanguage = identityCard.userLanguage;
    return response;
  }
}