import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserService } from './services/user.service';
import { UserController } from './controllers/user.controller';
import { UserProfileController } from './controllers/user-profile.controller';
import { User, UserSchema } from './schemas/user.schema';
import { UserRepository } from './repositories/user.repository';
import { Project, ProjectSchema } from '../project/schemas/project-base.schema';
import { TokenService } from '../auth/services/token.service';
import { AccessTokenRepository } from '../auth/repositories/access-token.repository';
import { AccessToken, AccessTokenSchema } from '../auth/schemas/access-token.schema';
import { OrganizationModule } from '../organization/organization.module';
import { ConfigModule } from '../config/config.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { PlanModule } from '../plan/plan.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: AccessToken.name, schema: AccessTokenSchema },
    ]),
    forwardRef(() => OrganizationModule),
    forwardRef(() => PlanModule),
    ConfigModule,
    AnalyticsModule,
  ],
  controllers: [UserController, UserProfileController],
  providers: [UserService, UserRepository, TokenService, AccessTokenRepository],
  exports: [UserService, UserRepository],
})
export class UserModule {}
