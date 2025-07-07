import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PageMagicController } from './controllers/page-magic.controller';
import { PageContentService } from './services/page-content.service';
import { PageImprovementService } from './services/page-improvement.service';
import { SequentialImprovementService } from './services/sequential-improvement.service';
import { SequentialImprovementStructuredService } from './services/sequential-improvement-structured.service';
import { ImprovementWorkflowService } from './services/improvement-workflow.service';
import { StructuredContentService } from './services/structured-content.service';
import { HtmlToMarkdownService } from './services/html-to-markdown.service';
import { PageImprovementJob, PageImprovementJobSchema } from './schemas/page-improvement-job.schema';
import { PageMagicEventsGateway } from './gateways/page-magic-events.gateway';
import { LlmModule } from '../llm/llm.module';
import { CrawlerModule } from '../crawler/crawler.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PageImprovementJob.name, schema: PageImprovementJobSchema },
    ]),
    LlmModule,
    CrawlerModule,
  ],
  controllers: [PageMagicController],
  providers: [
    PageContentService,
    PageImprovementService,
    SequentialImprovementService,
    SequentialImprovementStructuredService,
    ImprovementWorkflowService,
    StructuredContentService,
    HtmlToMarkdownService,
    PageMagicEventsGateway,
  ],
  exports: [
    PageContentService,
    PageImprovementService,
    ImprovementWorkflowService,
  ],
})
export class PageMagicModule {}