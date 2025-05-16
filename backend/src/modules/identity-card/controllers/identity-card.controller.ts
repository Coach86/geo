import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseInterceptors,
  ClassSerializerInterceptor,
  Patch,
  Delete,
  Query,
  BadRequestException,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { IdentityCardService } from '../services/identity-card.service';
import { CreateIdentityCardDto } from '../dto/create-identity-card.dto';
import { UpdateIdentityCardDto } from '../dto/update-identity-card.dto';
import { IdentityCardResponseDto } from '../dto/identity-card-response.dto';

@ApiTags('identity-cards')
@Controller('admin/identity-card')
@UseInterceptors(ClassSerializerInterceptor)
export class IdentityCardController {
  constructor(private readonly identityCardService: IdentityCardService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new company identity card' })
  @ApiResponse({
    status: 201,
    description: 'The identity card has been successfully created.',
    type: IdentityCardResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  async create(
    @Body() createIdentityCardDto: CreateIdentityCardDto,
  ): Promise<IdentityCardResponseDto> {
    const identityCard = await this.identityCardService.create(createIdentityCardDto);
    return this.mapToResponseDto(identityCard);
  }

  @Post('from-url')
  @ApiOperation({ summary: 'Create a new company identity card from URL' })
  @ApiResponse({
    status: 201,
    description: 'The identity card has been successfully created from URL.',
    type: IdentityCardResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  async createFromUrl(
    @Body() body: { url: string; userId?: string; market: string },
  ): Promise<IdentityCardResponseDto> {
    const createDto = new CreateIdentityCardDto();
    createDto.url = body.url;

    if (body.userId) {
      createDto.userId = body.userId;
    }

    // Market is required
    if (!body.market) {
      throw new BadRequestException('Market is required');
    }

    if (!createDto.data) {
      createDto.data = {};
    }
    createDto.data.market = body.market;

    const identityCard = await this.identityCardService.create(createDto);
    return this.mapToResponseDto(identityCard);
  }

  @Get()
  @ApiOperation({ summary: 'Get all company identity cards or filter by user ID' })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter identity cards by user ID' })
  @ApiResponse({
    status: 200,
    description: 'List of identity cards',
    type: [IdentityCardResponseDto],
  })
  async findAll(@Query('userId') userId?: string): Promise<IdentityCardResponseDto[]> {
    const identityCards = await this.identityCardService.findAll(userId);
    return identityCards.map((card) => this.mapToResponseDto(card));
  }

  @Get(':companyId')
  @ApiOperation({ summary: 'Get a company identity card by ID' })
  @ApiParam({ name: 'companyId', description: 'The ID of the company' })
  @ApiResponse({
    status: 200,
    description: 'The identity card has been successfully retrieved.',
    type: IdentityCardResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Identity card not found.' })
  async findById(@Param('companyId') companyId: string): Promise<IdentityCardResponseDto> {
    const identityCard = await this.identityCardService.findById(companyId);
    return this.mapToResponseDto(identityCard);
  }

  @Patch(':companyId')
  @ApiOperation({ summary: 'Update key features and competitors for a company' })
  @ApiParam({ name: 'companyId', description: 'The ID of the company' })
  @ApiResponse({
    status: 200,
    description: 'The identity card has been successfully updated.',
    type: IdentityCardResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Identity card not found.' })
  async update(
    @Param('companyId') companyId: string,
    @Body() updateIdentityCardDto: UpdateIdentityCardDto,
  ): Promise<IdentityCardResponseDto> {
    const identityCard = await this.identityCardService.update(companyId, updateIdentityCardDto);
    return this.mapToResponseDto(identityCard);
  }

  @Delete(':companyId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a company identity card and all related data' })
  @ApiParam({ name: 'companyId', description: 'The ID of the company to delete' })
  @ApiResponse({
    status: 204,
    description: 'The identity card has been successfully deleted.',
  })
  @ApiResponse({ status: 404, description: 'Identity card not found.' })
  async remove(@Param('companyId') companyId: string): Promise<void> {
    await this.identityCardService.remove(companyId);
    // Return nothing (204 No Content)
  }

  private mapToResponseDto(identityCard: any): IdentityCardResponseDto {
    const response = new IdentityCardResponseDto();
    response.id = identityCard.companyId;
    response.brandName = identityCard.brandName;
    response.website = identityCard.website;
    response.url = identityCard.website; // Alias for frontend
    response.industry = identityCard.industry;
    response.market = identityCard.market || 'Global'; // Add market field with default
    response.shortDescription = identityCard.shortDescription;
    response.fullDescription = identityCard.fullDescription;
    response.longDescription = identityCard.fullDescription; // Alias for frontend
    response.keyBrandAttributes = identityCard.keyBrandAttributes;
    response.competitors = identityCard.competitors;
    response.createdAt = identityCard.updatedAt; // Using updatedAt as createdAt for now
    response.updatedAt = identityCard.updatedAt;
    response.userId = identityCard.userId;
    response.userEmail = identityCard.userEmail;
    response.userLanguage = identityCard.userLanguage;
    return response;
  }
}
