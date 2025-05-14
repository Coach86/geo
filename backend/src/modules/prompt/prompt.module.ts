import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PromptService } from './services/prompt.service';
import { PromptSetController } from './controllers/prompt-set.controller';
import { LlmModule } from '../llm/llm.module';
import { PromptSet, PromptSetSchema } from './schemas/prompt-set.schema';
import { IdentityCard, IdentityCardSchema } from '../identity-card/schemas/identity-card.schema';

@Module({
  imports: [
    LlmModule,
    MongooseModule.forFeature([
      { name: PromptSet.name, schema: PromptSetSchema },
      { name: IdentityCard.name, schema: IdentityCardSchema },
    ]),
  ],
  providers: [PromptService],
  controllers: [PromptSetController],
  exports: [PromptService],
})
export class PromptModule {}
