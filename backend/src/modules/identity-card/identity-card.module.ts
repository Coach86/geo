import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { IdentityCardController } from './controllers/identity-card.controller';
import { UserIdentityCardController } from './controllers/user-identity-card.controller';
import { IdentityCardService } from './services/identity-card.service';
import { IdentityCardRepository } from './repositories/identity-card.repository';
import { IdentityCard, IdentityCardSchema } from './schemas/identity-card.schema';
import { UserModule } from '../user/user.module';
import { LlmModule } from '../llm/llm.module';
import { TokenService } from '../auth/services/token.service';
import { AccessTokenRepository } from '../auth/repositories/access-token.repository';
import { AccessToken, AccessTokenSchema } from '../auth/schemas/access-token.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: IdentityCard.name, schema: IdentityCardSchema },
      { name: AccessToken.name, schema: AccessTokenSchema },
    ]),
    UserModule,
    LlmModule,
    ConfigModule,
  ],
  controllers: [IdentityCardController, UserIdentityCardController],
  providers: [
    IdentityCardService, 
    IdentityCardRepository, 
    TokenService,
    AccessTokenRepository
  ],
  exports: [IdentityCardService, IdentityCardRepository],
})
export class IdentityCardModule {}
