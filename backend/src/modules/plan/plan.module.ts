import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Plan, PlanSchema } from './schemas/plan.schema';
import { PlanRepository } from './repositories/plan.repository';
import { PlanService } from './services/plan.service';
import { StripeWebhookService } from './services/stripe-webhook.service';
import { PlanController } from './controllers/plan.controller';
import { PublicPlanController } from './controllers/public-plan.controller';
import { StripeWebhookController } from './controllers/stripe-webhook.controller';
import { OrganizationModule } from '../organization/organization.module';
import { UserModule } from '../user/user.module';
import { AuthModule } from '../auth/auth.module';
import { PromoModule } from '../promo/promo.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Plan.name, schema: PlanSchema }]),
    forwardRef(() => OrganizationModule),
    forwardRef(() => UserModule),
    forwardRef(() => AuthModule),
    forwardRef(() => PromoModule),
  ],
  controllers: [PlanController, PublicPlanController, StripeWebhookController],
  providers: [PlanService, PlanRepository, StripeWebhookService],
  exports: [PlanService, PlanRepository, StripeWebhookService],
})
export class PlanModule {}