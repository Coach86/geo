import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TokenRoute } from '../../auth/decorators/token-route.decorator';
import { ContentLibraryService } from '../services/content-library.service';
import { ContentScrapingService } from '../services/content-scraping.service';
import { SubmitUrlDto } from '../dto/submit-url.dto';
import { UpdateContentItemDto } from '../dto/update-content-item.dto';
import { ContentItem } from '../entities/content-item.entity';

@ApiTags('content-library')
@ApiBearerAuth()
@Controller('user/project/:projectId/content-library')
export class ContentLibraryController {
  constructor(
    private readonly contentLibraryService: ContentLibraryService,
    private readonly contentScrapingService: ContentScrapingService,
  ) {}

  @Post('urls')
  @TokenRoute()
  @ApiOperation({ summary: 'Submit URLs for content extraction' })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: 'URLs submitted for content extraction' 
  })
  async submitUrls(
    @Param('projectId') projectId: string,
    @Body() submitUrlDto: SubmitUrlDto,
  ) {
    const result = await this.contentScrapingService.scrapeAndSaveUrls(
      projectId,
      submitUrlDto.urls,
    );

    return {
      message: 'URLs processed',
      successful: result.successful.length,
      failed: result.failed.length,
      details: result,
    };
  }

  @Post('submit-url')
  @TokenRoute()
  @ApiOperation({ summary: 'Submit a single URL for content extraction' })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: 'URL submitted for content extraction' 
  })
  async submitUrl(
    @Param('projectId') projectId: string,
    @Body() body: { url: string },
  ) {
    const result = await this.contentScrapingService.scrapeAndSaveUrls(
      projectId,
      [body.url],
    );

    if (result.failed.length > 0) {
      throw new Error(result.failed[0].error);
    }

    return {
      message: 'Content added successfully',
      contentItem: result.successful[0],
    };
  }

  @Get()
  @TokenRoute()
  @ApiOperation({ summary: 'Get all content items for a project' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'List of content items',
  })
  async getContentItems(@Param('projectId') projectId: string): Promise<ContentItem[]> {
    return this.contentLibraryService.findByProjectId(projectId);
  }

  @Get('statistics')
  @TokenRoute()
  @ApiOperation({ summary: 'Get content library statistics for a project' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Content library statistics' 
  })
  async getStatistics(@Param('projectId') projectId: string) {
    return this.contentLibraryService.getContentStatistics(projectId);
  }

  @Get(':contentId')
  @TokenRoute()
  @ApiOperation({ summary: 'Get a specific content item' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Content item details',
  })
  async getContentItem(
    @Param('projectId') projectId: string,
    @Param('contentId') contentId: string,
  ): Promise<ContentItem> {
    const contentItem = await this.contentLibraryService.findById(contentId);
    
    // Verify it belongs to the project
    if (contentItem.projectId !== projectId) {
      throw new Error('Content item does not belong to this project');
    }
    
    return contentItem;
  }

  @Put(':contentId')
  @TokenRoute()
  @ApiOperation({ summary: 'Update a content item' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Content item updated',
  })
  async updateContentItem(
    @Param('projectId') projectId: string,
    @Param('contentId') contentId: string,
    @Body() updateDto: UpdateContentItemDto,
  ): Promise<ContentItem> {
    const contentItem = await this.contentLibraryService.findById(contentId);
    
    // Verify it belongs to the project
    if (contentItem.projectId !== projectId) {
      throw new Error('Content item does not belong to this project');
    }
    
    return this.contentLibraryService.updateContentItem(contentId, updateDto);
  }

  @Delete(':contentId')
  @TokenRoute()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a content item' })
  @ApiResponse({ 
    status: HttpStatus.NO_CONTENT, 
    description: 'Content item deleted' 
  })
  async deleteContentItem(
    @Param('projectId') projectId: string,
    @Param('contentId') contentId: string,
  ): Promise<void> {
    const contentItem = await this.contentLibraryService.findById(contentId);
    
    // Verify it belongs to the project
    if (contentItem.projectId !== projectId) {
      throw new Error('Content item does not belong to this project');
    }
    
    await this.contentLibraryService.deleteContentItem(contentId);
  }

  @Delete()
  @TokenRoute()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete all content items for a project' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'All content items deleted' 
  })
  async deleteAllContentItems(@Param('projectId') projectId: string) {
    const count = await this.contentLibraryService.deleteByProjectId(projectId);
    return {
      message: `Deleted ${count} content items`,
      count,
    };
  }
}