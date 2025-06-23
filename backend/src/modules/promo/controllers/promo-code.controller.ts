import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../auth/guards/admin.guard';
import { PromoCodeService } from '../services/promo-code.service';
import { CreatePromoCodeDto } from '../dto/create-promo-code.dto';
import { ValidatePromoCodeDto, PromoCodeValidationResponseDto } from '../dto/validate-promo-code.dto';

@ApiTags('promo-codes')
@Controller('admin/promo-codes')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class PromoCodeController {
  constructor(private readonly promoCodeService: PromoCodeService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new promo code' })
  @ApiResponse({ status: 201, description: 'Promo code created successfully' })
  @ApiResponse({ status: 409, description: 'Promo code already exists' })
  async create(@Body() createPromoCodeDto: CreatePromoCodeDto) {
    return this.promoCodeService.create(createPromoCodeDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all promo codes' })
  @ApiResponse({ status: 200, description: 'List of promo codes' })
  async findAll() {
    return this.promoCodeService.findAll();
  }

  @Get('active')
  @ApiOperation({ summary: 'Get active promo codes' })
  @ApiResponse({ status: 200, description: 'List of active promo codes' })
  async findActive() {
    return this.promoCodeService.findActive();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a promo code by ID' })
  @ApiResponse({ status: 200, description: 'Promo code details' })
  @ApiResponse({ status: 404, description: 'Promo code not found' })
  async findOne(@Param('id') id: string) {
    return this.promoCodeService.findById(id);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get usage statistics for a promo code' })
  @ApiResponse({ status: 200, description: 'Usage statistics' })
  @ApiResponse({ status: 404, description: 'Promo code not found' })
  async getStats(@Param('id') id: string) {
    return this.promoCodeService.getUsageStats(id);
  }

  @Post(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate a promo code' })
  @ApiResponse({ status: 200, description: 'Promo code deactivated' })
  @ApiResponse({ status: 404, description: 'Promo code not found' })
  async deactivate(@Param('id') id: string) {
    return this.promoCodeService.deactivate(id);
  }

  @Post('validate')
  @ApiOperation({ summary: 'Validate a promo code' })
  @ApiResponse({ 
    status: 200, 
    description: 'Validation result',
    type: PromoCodeValidationResponseDto,
  })
  async validate(@Body() validateDto: ValidatePromoCodeDto) {
    return this.promoCodeService.validate(validateDto);
  }
}