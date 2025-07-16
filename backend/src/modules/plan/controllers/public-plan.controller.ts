import { Controller, Get, Post, Body, Param, UseGuards, Req, NotFoundException } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger';;
import { PublicRoute } from '../../auth/decorators/public-route.decorator';
import { TokenRoute } from '../../auth/decorators/token-route.decorator';
import { TokenAuthGuard } from '../../auth/guards/token-auth.guard';
import { PlanService } from '../services/plan.service';
import { PlanResponseDto } from '../dto/plan-response.dto';

@ApiTags('Public - Plans')
@Controller('public/plans')
export class PublicPlanController {
  constructor(private readonly planService: PlanService) {}

  @Get()
  @PublicRoute()
  async findAll(): Promise<PlanResponseDto[]> {
    return this.planService.findAll(false); // Only active plans for public
  }

  @Get(':id/name')
  @TokenRoute()
  @UseGuards(TokenAuthGuard)
  async getPlanName(
    @Param('id') planId: string,
    @Req() req: any,
  ): Promise<{ id: string; name: string }> {
    if (planId === 'manual') {
      throw new NotFoundException('Plan not found');
    }
    const plan = await this.planService.findById(planId);
    return {
      id: plan.id,
      name: plan.name,
    };
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
