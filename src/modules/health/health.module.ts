import { Module } from '@nestjs/common';
import { HealthController } from './controllers/health.controller';
import { PrismaService } from '../../services/prisma.service';

@Module({
  controllers: [HealthController],
  providers: [PrismaService],
})
export class HealthModule {}