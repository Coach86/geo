import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Organization, OrganizationSchema } from './schemas/organization.schema';
import { OrganizationService } from './services/organization.service';
import { OrganizationRepository } from './repositories/organization.repository';
import { OrganizationController } from './controllers/organization.controller';
import { UserOrganizationController } from './controllers/user-organization.controller';
import { PublicOrganizationController } from './controllers/public-organization.controller';
import { UserModule } from '../user/user.module';
import { AuthModule } from '../auth/auth.module';
import { ConfigModule } from '../config/config.module';
import { PlanModule } from '../plan/plan.module';
import { User, UserSchema } from '../user/schemas/user.schema';
import { Project, ProjectSchema } from '../project/schemas/project-base.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Organization.name, schema: OrganizationSchema },
      { name: User.name, schema: UserSchema },
      { name: Project.name, schema: ProjectSchema },
    ]),
    forwardRef(() => UserModule),
    forwardRef(() => AuthModule),
    forwardRef(() => PlanModule),
    ConfigModule,
  ],
  controllers: [OrganizationController, UserOrganizationController, PublicOrganizationController],
  providers: [OrganizationService, OrganizationRepository],
  exports: [OrganizationService, OrganizationRepository],
})
export class OrganizationModule {}