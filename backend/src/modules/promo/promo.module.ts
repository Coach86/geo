import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PromoCode, PromoCodeSchema } from './schemas/promo-code.schema';
import { PromoUsage, PromoUsageSchema } from './schemas/promo-usage.schema';
import { PromoCodeRepository } from './repositories/promo-code.repository';
import { PromoUsageRepository } from './repositories/promo-usage.repository';
import { PromoCodeService } from './services/promo-code.service';
import { PromoCodeController } from './controllers/promo-code.controller';
import { PublicPromoController } from './controllers/public-promo.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PromoCode.name, schema: PromoCodeSchema },
      { name: PromoUsage.name, schema: PromoUsageSchema },
    ]),
  ],
  controllers: [PromoCodeController, PublicPromoController],
  providers: [
    PromoCodeService,
    PromoCodeRepository,
    PromoUsageRepository,
  ],
  exports: [PromoCodeService],
})
export class PromoModule {}