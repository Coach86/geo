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
import { ArticleGenerationService } from '../services/article-generation.service';
import { CreateGenerationJobDto } from '../dto/create-generation-job.dto';
import { UpdateArticleDto } from '../dto/update-article.dto';
import { GeneratedArticle } from '../entities/generated-article.entity';
import { GenerationJob } from '../entities/generation-job.entity';

@ApiTags('article-generator')
@ApiBearerAuth()
@Controller('user/project/:projectId/articles')
export class ArticleGeneratorController {
  constructor(
    private readonly articleGenerationService: ArticleGenerationService,
  ) {}

  @Post('generate')
  @TokenRoute()
  @ApiOperation({ summary: 'Create article generation job' })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: 'Generation job created',
  })
  async generateArticles(
    @Param('projectId') projectId: string,
    @Body() createJobDto: CreateGenerationJobDto,
  ): Promise<GenerationJob> {
    const job = await this.articleGenerationService.createGenerationJob(
      projectId,
      createJobDto,
    );

    // Process job asynchronously
    this.articleGenerationService.processGenerationJob(job.id).catch(error => {
      // Log error but don't throw - job processing is async
      console.error(`Failed to process generation job ${job.id}:`, error);
    });

    return job;
  }

  @Get()
  @TokenRoute()
  @ApiOperation({ summary: 'Get all generated articles for a project' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'List of generated articles',
  })
  async getArticles(@Param('projectId') projectId: string): Promise<GeneratedArticle[]> {
    return this.articleGenerationService.findArticlesByProjectId(projectId);
  }

  @Get('statistics')
  @TokenRoute()
  @ApiOperation({ summary: 'Get article statistics for a project' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Article statistics',
  })
  async getStatistics(@Param('projectId') projectId: string) {
    return this.articleGenerationService.getArticleStatistics(projectId);
  }

  @Get('generation-jobs')
  @TokenRoute()
  @ApiOperation({ summary: 'Get generation jobs for a project' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'List of generation jobs',
  })
  async getGenerationJobs(@Param('projectId') projectId: string): Promise<GenerationJob[]> {
    return this.articleGenerationService.getGenerationJobs(projectId);
  }

  @Get(':articleId')
  @TokenRoute()
  @ApiOperation({ summary: 'Get a specific article' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Article details',
  })
  async getArticle(
    @Param('projectId') projectId: string,
    @Param('articleId') articleId: string,
  ): Promise<GeneratedArticle> {
    const article = await this.articleGenerationService.findArticleById(articleId);
    
    // Verify it belongs to the project
    if (article.projectId !== projectId) {
      throw new Error('Article does not belong to this project');
    }
    
    return article;
  }

  @Put(':articleId')
  @TokenRoute()
  @ApiOperation({ summary: 'Update an article' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Article updated',
  })
  async updateArticle(
    @Param('projectId') projectId: string,
    @Param('articleId') articleId: string,
    @Body() updateDto: UpdateArticleDto,
  ): Promise<GeneratedArticle> {
    const article = await this.articleGenerationService.findArticleById(articleId);
    
    // Verify it belongs to the project
    if (article.projectId !== projectId) {
      throw new Error('Article does not belong to this project');
    }
    
    return this.articleGenerationService.updateArticle(articleId, updateDto);
  }

  @Post(':articleId/publish')
  @TokenRoute()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish an article' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Article published',
  })
  async publishArticle(
    @Param('projectId') projectId: string,
    @Param('articleId') articleId: string,
  ): Promise<GeneratedArticle> {
    const article = await this.articleGenerationService.findArticleById(articleId);
    
    // Verify it belongs to the project
    if (article.projectId !== projectId) {
      throw new Error('Article does not belong to this project');
    }
    
    return this.articleGenerationService.publishArticle(articleId);
  }

  @Delete(':articleId')
  @TokenRoute()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an article' })
  @ApiResponse({ 
    status: HttpStatus.NO_CONTENT, 
    description: 'Article deleted',
  })
  async deleteArticle(
    @Param('projectId') projectId: string,
    @Param('articleId') articleId: string,
  ): Promise<void> {
    const article = await this.articleGenerationService.findArticleById(articleId);
    
    // Verify it belongs to the project
    if (article.projectId !== projectId) {
      throw new Error('Article does not belong to this project');
    }
    
    await this.articleGenerationService.deleteArticle(articleId);
  }
}