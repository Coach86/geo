import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../auth/guards/admin.guard';
import { PlanService } from '../services/plan.service';
import { CreatePlanDto } from '../dto/create-plan.dto';
import { UpdatePlanDto } from '../dto/update-plan.dto';
import { PlanResponseDto } from '../dto/plan-response.dto';
import Stripe from 'stripe';

@Controller('admin/plans')
@UseGuards(JwtAuthGuard, AdminGuard)
export class PlanController {
  constructor(private readonly planService: PlanService) {}

  @Post()
  create(@Body() createPlanDto: CreatePlanDto): Promise<PlanResponseDto> {
    return this.planService.create(createPlanDto);
  }

  @Get()
  findAll(@Query('includeInactive') includeInactive?: string): Promise<PlanResponseDto[]> {
    return this.planService.findAll(includeInactive === 'true');
  }

  @Get('stripe-products')
  getStripeProducts(): Promise<Stripe.Product[]> {
    return this.planService.getStripeProducts();
  }

  @Post(':id/generate-checkout-urls')
  generateCheckoutUrls(@Param('id') id: string): Promise<{ monthly?: string; yearly?: string }> {
    return this.planService.generateCheckoutUrls(id);
  }

  @Post(':id/create-checkout-session')
  createCheckoutSession(
    @Param('id') planId: string,
    @Body() body: { userId: string; billingPeriod: 'monthly' | 'yearly' }
  ): Promise<{ url: string }> {
    return this.planService.createUserCheckoutSession(planId, body.userId, body.billingPeriod);
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<PlanResponseDto> {
    return this.planService.findById(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePlanDto: UpdatePlanDto): Promise<PlanResponseDto> {
    return this.planService.update(id, updatePlanDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.planService.delete(id);
  }
}
