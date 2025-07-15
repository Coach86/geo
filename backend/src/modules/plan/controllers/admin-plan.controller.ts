import { Controller, Get, Param, UseGuards, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PlanService } from '../services/plan.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../auth/guards/admin.guard';

@ApiTags('Admin - Plans')
@Controller('admin/plans')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class AdminPlanController {
  constructor(private readonly planService: PlanService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get plan details by ID' })
  @ApiParam({ name: 'id', description: 'Plan ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Plan details retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Plan not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - Admin access required',
  })
  async getPlanById(@Param('id') id: string) {
    const plan = await this.planService.findById(id);
    return plan;
  }

  @Get(':id/name')
  @ApiOperation({ summary: 'Get plan name by ID' })
  @ApiParam({ name: 'id', description: 'Plan ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Plan name retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Plan not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - Admin access required',
  })
  async getPlanName(@Param('id') id: string): Promise<{ id: string; name: string }> {
    const plan = await this.planService.findById(id);
    return {
      id: plan.id,
      name: plan.name,
    };
  }
}