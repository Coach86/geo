import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { IdentityCardController } from './controllers/identity-card.controller';
import { IdentityCardService } from './services/identity-card.service';
import { LlmModule } from '../llm/llm.module';
import { UserModule } from '../user/user.module';
import { IdentityCard, IdentityCardSchema } from './schemas/identity-card.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: IdentityCard.name, schema: IdentityCardSchema }
    ]),
    LlmModule,
    UserModule
  ],
  controllers: [IdentityCardController],
  providers: [
    IdentityCardService,
  ],
  exports: [IdentityCardService, MongooseModule],
})
export class IdentityCardModule {}