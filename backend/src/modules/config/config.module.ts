import { Module } from '@nestjs/common';
import { ConfigController, PublicConfigController } from './controllers/config.controller';
import { ConfigService } from './services/config.service';

@Module({
  controllers: [ConfigController, PublicConfigController],
  providers: [ConfigService],
  exports: [ConfigService],
})
export class ConfigModule {}