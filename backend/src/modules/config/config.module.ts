import { Module } from '@nestjs/common';
import { ConfigController, PublicConfigController } from './controllers/config.controller';
import { ConfigService } from './services/config.service';
import { LlmConfigService } from './services/llm-config.service';

@Module({
  controllers: [ConfigController, PublicConfigController],
  providers: [ConfigService, LlmConfigService],
  exports: [ConfigService, LlmConfigService],
})
export class ConfigModule {}