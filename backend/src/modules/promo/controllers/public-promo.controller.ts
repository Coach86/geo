import {
  Controller,
  Post,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PublicRoute } from '../../auth/decorators/public-route.decorator';
import { PromoCodeService } from '../services/promo-code.service';
import { ValidatePromoCodeDto, PromoCodeValidationResponseDto } from '../dto/validate-promo-code.dto';

@ApiTags('Public - Promotions')
@Controller('promo')
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