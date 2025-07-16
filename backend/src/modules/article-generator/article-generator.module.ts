import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GeneratedArticleSchema } from './entities/generated-article.entity';
import { GenerationJobSchema } from './entities/generation-job.entity';
import { ArticleGenerationService } from './services/article-generation.service';
import { ContentRuleApplicatorService } from './services/content-rule-applicator.service';
import { ArticleGeneratorController } from './controllers/article-generator.controller';
import { GeneratedArticleRepository } from './repositories/generated-article.repository';
import { GenerationJobRepository } from './repositories/generation-job.repository';
import { ArticleGenerationTask } from './tasks/article-generation.task';
import { ContentLibraryModule } from '../content-library/content-library.module';
import { ProjectModule } from '../project/project.module';
import { LlmModule } from '../llm/llm.module';
import { CrawlerModule } from '../crawler/crawler.module';
import { BatchModule } from '../batch/batch.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'GeneratedArticle', schema: GeneratedArticleSchema },
      { name: 'GenerationJob', schema: GenerationJobSchema },
    ]),
    ContentLibraryModule,
    ProjectModule,
    LlmModule,
    CrawlerModule,
    forwardRef(() => BatchModule),
    AuthModule,
  ],
  controllers: [ArticleGeneratorController],
  providers: [
    ArticleGenerationService,
    ContentRuleApplicatorService,
    GeneratedArticleRepository,
    GenerationJobRepository,
    ArticleGenerationTask,
  ],
  exports: [ArticleGenerationService],
})
export class ArticleGeneratorModule {}