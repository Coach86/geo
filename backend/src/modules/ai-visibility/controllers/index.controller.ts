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
import { BM25IndexService } from '../services/bm25-index.service';
import { VectorIndexService } from '../services/vector-index.service';
import { TextProcessorService } from '../services/text-processor.service';
import { CrawledPageRepository } from '../repositories/crawled-page.repository';
import { SearchIndexRepository } from '../repositories/search-index.repository';
import { ProjectService } from '../../project/services/project.service';

@ApiTags('AI Visibility - Index')
@Controller('ai-visibility/index')
export class IndexController {
  constructor(
    private readonly bm25IndexService: BM25IndexService,
    private readonly vectorIndexService: VectorIndexService,
    private readonly textProcessorService: TextProcessorService,
    private readonly crawledPageRepository: CrawledPageRepository,
    private readonly searchIndexRepository: SearchIndexRepository,
    private readonly projectService: ProjectService,
    private readonly tokenService: TokenService,
  ) {}

  @Post(':projectId/build')
  @TokenRoute()
  @ApiOperation({ summary: 'Build search indexes from crawled pages' })
  @ApiResponse({ status: 200, description: 'Indexes built successfully' })
  async buildIndexes(
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

    // Get crawled pages
    const pages = await this.crawledPageRepository.findByProjectWithStatus(
      projectId,
      'success'
    );

    if (pages.length === 0) {
      throw new HttpException(
        'No crawled pages found. Please crawl the website first.',
        HttpStatus.BAD_REQUEST
      );
    }

    // Mark existing indexes as outdated
    await this.searchIndexRepository.markOutdated(projectId);

    // Process pages into chunks
    const chunks = await this.textProcessorService.processPages(pages);

    // Build indexes in parallel
    const [bm25IndexId, vectorIndexId] = await Promise.all([
      this.bm25IndexService.buildIndex(projectId, chunks),
      this.vectorIndexService.buildIndex(projectId, chunks),
    ]);

    return {
      message: 'Indexes built successfully',
      bm25IndexId: bm25IndexId.toString(),
      vectorIndexId: vectorIndexId.toString(),
      totalChunks: chunks.length,
      totalPages: pages.length,
    };
  }

  @Get(':projectId/status')
  @TokenRoute()
  @ApiOperation({ summary: 'Get index status for a project' })
  @ApiResponse({ status: 200, description: 'Index status retrieved' })
  async getIndexStatus(
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

    const { bm25, vector } = await this.searchIndexRepository.getLatestIndexes(
      projectId
    );

    return {
      bm25: bm25 ? {
        id: (bm25._id as any).toString(),
        status: bm25.status,
        chunkCount: bm25.chunkCount,
        createdAt: (bm25 as any).createdAt,
        configuration: bm25.configuration,
      } : null,
      vector: vector ? {
        id: (vector._id as any).toString(),
        status: vector.status,
        chunkCount: vector.chunkCount,
        createdAt: (vector as any).createdAt,
        configuration: vector.configuration,
      } : null,
    };
  }

  @Post(':projectId/search')
  @TokenRoute()
  @ApiOperation({ summary: 'Test search on indexes' })
  @ApiResponse({ status: 200, description: 'Search results returned' })
  async testSearch(
    @Param('projectId') projectId: string,
    @Body() dto: { query: string; maxResults?: number },
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

    const { bm25, vector } = await this.searchIndexRepository.getLatestIndexes(
      projectId
    );

    if (!bm25 || !vector) {
      throw new HttpException(
        'Indexes not ready. Please build indexes first.',
        HttpStatus.BAD_REQUEST
      );
    }

    const maxResults = dto.maxResults || 10;

    const [bm25Results, vectorResults] = await Promise.all([
      this.bm25IndexService.search(bm25._id as any, dto.query, maxResults),
      this.vectorIndexService.search(vector._id as any, dto.query, maxResults),
    ]);

    return {
      query: dto.query,
      bm25Results,
      vectorResults,
    };
  }
}