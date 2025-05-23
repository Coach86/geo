import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserService } from './services/user.service';
import { UserController } from './controllers/user.controller';
import { UserProfileController } from './controllers/user-profile.controller';
import { User, UserSchema } from './schemas/user.schema';
import { UserRepository } from './repositories/user.repository';
import { IdentityCard, IdentityCardSchema } from '../identity-card/schemas/identity-card.schema';
import { TokenService } from '../auth/services/token.service';
import { AccessTokenRepository } from '../auth/repositories/access-token.repository';
import { AccessToken, AccessTokenSchema } from '../auth/schemas/access-token.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: IdentityCard.name, schema: IdentityCardSchema },
      { name: AccessToken.name, schema: AccessTokenSchema },
    ]),
  ],
  controllers: [UserController, UserProfileController],
  providers: [UserService, UserRepository, TokenService, AccessTokenRepository],
  exports: [UserService, UserRepository],
})
export class UserModule {}
