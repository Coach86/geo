import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { ProjectController } from './controllers/project.controller';
import { UserProjectController } from './controllers/user-project.controller';
import { PublicProjectController } from './controllers/public-project.controller';
import { ProjectService } from './services/project.service';
import { FaviconService } from './services/favicon.service';
import { CompetitorWebsiteResolverService } from './services/competitor-website-resolver.service';
import { ProjectCreatedListener } from './listeners/project-created.listener';
import { CompetitorWebsiteListener } from './listeners/competitor-website.listener';
import { ProjectRepository } from './repositories/project.repository';
import { Project, ProjectSchema } from './schemas/project-base.schema';
import { UserModule } from '../user/user.module';
import { LlmModule } from '../llm/llm.module';
import { TokenService } from '../auth/services/token.service';
import { AccessTokenRepository } from '../auth/repositories/access-token.repository';
import { AccessToken, AccessTokenSchema } from '../auth/schemas/access-token.schema';
import { OrganizationModule } from '../organization/organization.module';
import { PromptModule } from '../prompt/prompt.module';
import { BatchModule } from '../batch/batch.module';
import { PlanModule } from '../plan/plan.module';
import { ReportModule } from '../report/report.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Project.name, schema: ProjectSchema },
      { name: AccessToken.name, schema: AccessTokenSchema },
    ]),
    forwardRef(() => UserModule),
    LlmModule,
    ConfigModule,
    forwardRef(() => OrganizationModule),
    forwardRef(() => PromptModule),
    forwardRef(() => BatchModule),
    forwardRef(() => PlanModule),
    forwardRef(() => ReportModule),
  ],
  controllers: [ProjectController, UserProjectController, PublicProjectController],
  providers: [
    ProjectService, 
    FaviconService,
    CompetitorWebsiteResolverService,
    ProjectCreatedListener,
    CompetitorWebsiteListener,
    ProjectRepository, 
    TokenService,
    AccessTokenRepository
  ],
  exports: [ProjectService, ProjectRepository],
})
export class ProjectModule {}
