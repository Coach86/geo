import { 
  Controller, 
  Post, 
  Get, 
  Param, 
  Body, 
  Req,
  HttpException,
  HttpStatus,
  UnauthorizedException
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TokenRoute } from '../../auth/decorators/token-route.decorator';
import { TokenService } from '../../auth/services/token.service';
import { WebCrawlerService } from '../services/web-crawler.service';
import { CrawledPageRepository } from '../repositories/crawled-page.repository';
import { ProjectService } from '../../project/services/project.service';
import { StartCrawlDto } from '../dto/crawl-config.dto';

@ApiTags('AI Visibility - Crawler')
@Controller('ai-visibility/crawl')
export class CrawlerController {
  constructor(
    private readonly webCrawlerService: WebCrawlerService,
    private readonly crawledPageRepository: CrawledPageRepository,
    private readonly projectService: ProjectService,
    private readonly tokenService: TokenService,
  ) {}

  @Post(':projectId')
  @TokenRoute()
  @ApiOperation({ summary: 'Start crawling a website' })
  @ApiResponse({ status: 200, description: 'Crawl started successfully' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async startCrawl(
    @Param('projectId') projectId: string,
    @Body() dto: StartCrawlDto,
    @Req() request: any
  ) {
    // Validate user authentication
    if (!request.userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Validate project exists and user has access
    const project = await this.projectService.findByIdAndUser(projectId, request.userId);
    if (!project) {
      throw new HttpException('Project not found', HttpStatus.NOT_FOUND);
    }

    // Use project website if rootUrl not provided
    const rootUrl = dto.rootUrl || project.website;
    if (!rootUrl) {
      throw new HttpException(
        'No URL provided and project has no website',
        HttpStatus.BAD_REQUEST
      );
    }

    // Start crawl
    const result = await this.webCrawlerService.crawlWebsite(
      projectId,
      rootUrl,
      dto.config
    );

    return {
      message: 'Crawl completed',
      projectId,
      rootUrl,
      ...result,
    };
  }

  @Get(':projectId/status')
  @TokenRoute()
  @ApiOperation({ summary: 'Get crawl status for a project' })
  @ApiResponse({ status: 200, description: 'Crawl status retrieved' })
  async getCrawlStatus(
    @Param('projectId') projectId: string,
    @Req() request: any
  ) {
    // Validate user authentication
    if (!request.userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Validate project exists and user has access
    const project = await this.projectService.findByIdAndUser(projectId, request.userId);
    if (!project) {
      throw new HttpException('Project not found', HttpStatus.NOT_FOUND);
    }

    const status = await this.webCrawlerService.getCrawlStatus(
      projectId
    );

    return status;
  }

  @Get(':projectId/pages')
  @TokenRoute()
  @ApiOperation({ summary: 'List crawled pages for a project' })
  @ApiResponse({ status: 200, description: 'Crawled pages retrieved' })
  async getCrawledPages(
    @Param('projectId') projectId: string,
    @Req() request: any
  ) {
    // Validate user authentication
    if (!request.userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Validate project exists and user has access
    const project = await this.projectService.findByIdAndUser(projectId, request.userId);
    if (!project) {
      throw new HttpException('Project not found', HttpStatus.NOT_FOUND);
    }

    const pages = await this.crawledPageRepository.findByProjectId(
      projectId
    );

    return {
      total: pages.length,
      pages: pages.map(page => ({
        url: page.url,
        title: page.title,
        status: page.status,
        wordCount: page.wordCount,
        crawlDepth: page.crawlDepth,
        crawledAt: page.crawledAt,
        errorMessage: page.errorMessage,
      })),
    };
  }
}