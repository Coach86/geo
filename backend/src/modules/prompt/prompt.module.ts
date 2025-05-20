import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PromptService } from './services/prompt.service';
import { PromptSetController } from './controllers/prompt-set.controller';
import { PromptSetRepository } from './repositories/prompt-set.repository';
import { LlmModule } from '../llm/llm.module';
import { IdentityCardModule } from '../identity-card/identity-card.module';
import { PromptSet, PromptSetSchema } from './schemas/prompt-set.schema';

@Module({
  imports: [
    LlmModule,
    IdentityCardModule,
    MongooseModule.forFeature([
      { name: PromptSet.name, schema: PromptSetSchema },
    ]),
  ],
  providers: [PromptService, PromptSetRepository],
  controllers: [PromptSetController],
  exports: [PromptService, PromptSetRepository],
})
export class PromptModule {}
