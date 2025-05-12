import { Controller, Post, Get, Body, Param, UseInterceptors, ClassSerializerInterceptor } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { IdentityCardService } from '../services/identity-card.service';
import { CreateIdentityCardDto } from '../dto/create-identity-card.dto';
import { IdentityCardResponseDto } from '../dto/identity-card-response.dto';

@ApiTags('identity-cards')
@Controller('identity-card')
@UseInterceptors(ClassSerializerInterceptor)
export class IdentityCardController {
  constructor(private readonly identityCardService: IdentityCardService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new company identity card' })
  @ApiResponse({ 
    status: 201, 
    description: 'The identity card has been successfully created.', 
    type: IdentityCardResponseDto 
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  async create(@Body() createIdentityCardDto: CreateIdentityCardDto): Promise<IdentityCardResponseDto> {
    const identityCard = await this.identityCardService.create(createIdentityCardDto);
    return this.mapToResponseDto(identityCard);
  }

  @Post('from-url')
  @ApiOperation({ summary: 'Create a new company identity card from URL' })
  @ApiResponse({ 
    status: 201, 
    description: 'The identity card has been successfully created from URL.', 
    type: IdentityCardResponseDto 
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  async createFromUrl(@Body() body: { url: string }): Promise<IdentityCardResponseDto> {
    const createDto = new CreateIdentityCardDto();
    createDto.url = body.url;
    
    const identityCard = await this.identityCardService.create(createDto);
    return this.mapToResponseDto(identityCard);
  }

  @Get(':companyId')
  @ApiOperation({ summary: 'Get a company identity card by ID' })
  @ApiParam({ name: 'companyId', description: 'The ID of the company' })
  @ApiResponse({ 
    status: 200, 
    description: 'The identity card has been successfully retrieved.', 
    type: IdentityCardResponseDto 
  })
  @ApiResponse({ status: 404, description: 'Identity card not found.' })
  async findById(@Param('companyId') companyId: string): Promise<IdentityCardResponseDto> {
    const identityCard = await this.identityCardService.findById(companyId);
    return this.mapToResponseDto(identityCard);
  }

  private mapToResponseDto(identityCard: any): IdentityCardResponseDto {
    const response = new IdentityCardResponseDto();
    response.id = identityCard.companyId;
    response.brandName = identityCard.brandName;
    response.website = identityCard.website;
    response.industry = identityCard.industry;
    response.shortDescription = identityCard.shortDescription;
    response.fullDescription = identityCard.fullDescription;
    response.keyFeatures = identityCard.keyFeatures;
    response.competitors = identityCard.competitors;
    response.updatedAt = identityCard.updatedAt;
    return response;
  }
}