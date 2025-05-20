import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { IdentityCardController } from './controllers/identity-card.controller';
import { IdentityCardService } from './services/identity-card.service';
import { IdentityCardRepository } from './repositories/identity-card.repository';
import { IdentityCard, IdentityCardSchema } from './schemas/identity-card.schema';
import { UserModule } from '../user/user.module';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: IdentityCard.name, schema: IdentityCardSchema },
    ]),
    UserModule,
    LlmModule,
  ],
  controllers: [IdentityCardController],
  providers: [IdentityCardService, IdentityCardRepository],
  exports: [IdentityCardService],
})
export class IdentityCardModule {}
