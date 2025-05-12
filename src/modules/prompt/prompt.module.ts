import { Module } from '@nestjs/common';
import { PrismaService } from '../../services/prisma.service';
import { PromptService } from './services/prompt.service';
import { PromptSetController } from './controllers/prompt-set.controller';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [LlmModule],
  providers: [PromptService, PrismaService],
  controllers: [PromptSetController],
  exports: [PromptService],
})
export class PromptModule {}
