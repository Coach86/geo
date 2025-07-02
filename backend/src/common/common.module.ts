import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrganizationAccessService } from './services/organization-access.service';
import { User, UserSchema } from '../modules/user/schemas/user.schema';
import { Project, ProjectSchema } from '../modules/project/schemas/project-base.schema';
import { Organization, OrganizationSchema } from '../modules/organization/schemas/organization.schema';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: Organization.name, schema: OrganizationSchema },
    ]),
  ],
  providers: [OrganizationAccessService],
  exports: [OrganizationAccessService],
})
export class CommonModule {}