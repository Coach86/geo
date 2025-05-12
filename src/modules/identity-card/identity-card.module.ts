import { Module } from '@nestjs/common';
import { IdentityCardController } from './controllers/identity-card.controller';
import { IdentityCardService } from './services/identity-card.service';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [LlmModule],
  controllers: [IdentityCardController],
  providers: [
    IdentityCardService,
  ],
  exports: [IdentityCardService],
})
export class IdentityCardModule {}