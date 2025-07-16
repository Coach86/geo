import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ContentItemSchema } from './entities/content-item.entity';
import { ContentLibraryService } from './services/content-library.service';
import { ContentScrapingService } from './services/content-scraping.service';
import { ContentLibraryController } from './controllers/content-library.controller';
import { ContentItemRepository } from './repositories/content-item.repository';
import { ProjectModule } from '../project/project.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'ContentItem', schema: ContentItemSchema },
    ]),
    ProjectModule,
    AuthModule,
  ],
  controllers: [ContentLibraryController],
  providers: [
    ContentLibraryService,
    ContentScrapingService,
    ContentItemRepository,
  ],
  exports: [ContentLibraryService, ContentItemRepository],
})
export class ContentLibraryModule {}