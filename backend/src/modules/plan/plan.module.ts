import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Plan, PlanSchema } from './schemas/plan.schema';
import { PlanRepository } from './repositories/plan.repository';
import { PlanService } from './services/plan.service';
import { PlanController } from './controllers/plan.controller';
import { PublicPlanController } from './controllers/public-plan.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Plan.name, schema: PlanSchema }]),
  ],
  controllers: [PlanController, PublicPlanController],
  providers: [PlanService, PlanRepository],
  exports: [PlanService, PlanRepository],
})
export class PlanModule {}