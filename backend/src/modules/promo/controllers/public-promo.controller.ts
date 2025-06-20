import {
  Controller,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { PublicRoute } from '../../auth/decorators/public-route.decorator';
import { PromoCodeService } from '../services/promo-code.service';
import { ValidatePromoCodeDto, PromoCodeValidationResponseDto } from '../dto/validate-promo-code.dto';

@ApiTags('public-promo')
@Controller('promo')
@UseGuards(ThrottlerGuard)
export class PublicPromoController {
  constructor(private readonly promoCodeService: PromoCodeService) {}

  @PublicRoute()
  @Post('validate')
  @ApiOperation({ summary: 'Validate a promo code (public endpoint)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Validation result',
    type: PromoCodeValidationResponseDto,
  })
  async validate(@Body() validateDto: ValidatePromoCodeDto) {
    return this.promoCodeService.validate(validateDto);
  }
}