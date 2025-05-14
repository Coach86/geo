import { Module } from '@nestjs/common';
import { HealthController } from './controllers/health.controller';
import { MongoService } from '../../services/mongo.service';

@Module({
  controllers: [HealthController],
  providers: [MongoService],
})
export class HealthModule {}