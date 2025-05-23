import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PromptService } from './services/prompt.service';
import { PromptSetController } from './controllers/prompt-set.controller';
import { PublicPromptController } from './controllers/public-prompt.controller';
import { PromptSetRepository } from './repositories/prompt-set.repository';
import { LlmModule } from '../llm/llm.module';
import { IdentityCardModule } from '../identity-card/identity-card.module';
import { PromptSet, PromptSetSchema } from './schemas/prompt-set.schema';
import { TokenService } from '../auth/services/token.service';
import { AccessTokenRepository } from '../auth/repositories/access-token.repository';
import { AccessToken, AccessTokenSchema } from '../auth/schemas/access-token.schema';

@Module({
  imports: [
    LlmModule,
    IdentityCardModule,
    MongooseModule.forFeature([
      { name: PromptSet.name, schema: PromptSetSchema },
      { name: AccessToken.name, schema: AccessTokenSchema },
    ]),
  ],
  providers: [PromptService, PromptSetRepository, TokenService, AccessTokenRepository],
  controllers: [PromptSetController, PublicPromptController],
  exports: [PromptService, PromptSetRepository],
})
export class PromptModule {}
