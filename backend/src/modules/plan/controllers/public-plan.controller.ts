import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { PublicRoute } from '../../auth/decorators/public-route.decorator';
import { PlanService } from '../services/plan.service';
import { PlanResponseDto } from '../dto/plan-response.dto';

@Controller('public/plans')
export class PublicPlanController {
  constructor(private readonly planService: PlanService) {}

  @Get()
  @PublicRoute()
  async findAll(): Promise<PlanResponseDto[]> {
    return this.planService.findAll(false); // Only active plans for public
  }

  @Post(':id/create-checkout')
  @PublicRoute()
  async createCheckout(
    @Param('id') planId: string,
    @Body() body: { userId: string; billingPeriod: 'monthly' | 'yearly' }
  ): Promise<{ url: string }> {
    return this.planService.createUserCheckoutSession(planId, body.userId, body.billingPeriod);
  }
}
