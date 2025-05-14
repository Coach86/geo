import { Module } from '@nestjs/common';
import { ConfigController } from './controllers/config.controller';

@Module({
  controllers: [ConfigController],
})
export class ConfigModule {}