import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AdminGuard } from '../../auth/guards/admin.guard';
import { DistributedLockService } from '../services/distributed-lock.service';

@ApiTags('Admin - Lock Status')
@Controller('admin/locks')
@UseGuards(AdminGuard)
export class LockStatusController {
  constructor(
    private readonly distributedLockService: DistributedLockService,
  ) {}

  @Get('status')
  @ApiOperation({ summary: 'Get current lock status for all cron jobs' })
  @ApiResponse({
    status: 200,
    description: 'Lock status information',
    schema: {
      type: 'object',
      properties: {
        instanceId: { type: 'string', description: 'Current instance ID' },
        locks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              locked: { type: 'boolean' },
              holder: { type: 'string' },
              expiresAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
  })
  async getLockStatus() {
    const lockNames = ['daily-batch', 'recovery-check', 'stalled-check'];
    const locks = await Promise.all(
      lockNames.map(async (name) => {
        const status = await this.distributedLockService.isLocked(name);
        return {
          name,
          ...status,
        };
      }),
    );

    return {
      instanceId: this.distributedLockService.getInstanceId(),
      locks,
    };
  }
}