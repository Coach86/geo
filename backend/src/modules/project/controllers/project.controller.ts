import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseInterceptors,
  ClassSerializerInterceptor,
  Patch,
  Delete,
  Query,
  BadRequestException,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ProjectService } from '../services/project.service';
import { CreateProjectDto } from '../dto/create-project.dto';
import { UpdateProjectDto } from '../dto/update-project.dto';
import { ProjectResponseDto } from '../dto/project-response.dto';

@ApiTags('projects')
@Controller('admin/project')
@UseInterceptors(ClassSerializerInterceptor)
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new company project' })
  @ApiResponse({
    status: 201,
    description: 'The project has been successfully created.',
    type: ProjectResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  async create(
    @Body() createProjectDto: CreateProjectDto,
  ): Promise<ProjectResponseDto> {
    const project = await this.projectService.create(createProjectDto);
    return this.mapToResponseDto(project);
  }

  @Post('from-url')
  @ApiOperation({ summary: 'Create a new company project from URL' })
  @ApiResponse({
    status: 201,
    description: 'The project has been successfully created from URL.',
    type: ProjectResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  async createFromUrl(
    @Body() body: { url: string; organizationId: string; market: string; language?: string },
  ): Promise<ProjectResponseDto> {
    const createDto = new CreateProjectDto();
    createDto.url = body.url;
    createDto.organizationId = body.organizationId;

    // Market is required
    if (!body.market) {
      throw new BadRequestException('Market is required');
    }

    if (!createDto.data) {
      createDto.data = {};
    }
    createDto.data.market = body.market;
    
    if (body.language) {
      createDto.data.language = body.language;
    }

    const project = await this.projectService.create(createDto);
    return this.mapToResponseDto(project);
  }

  @Get()
  @ApiOperation({ summary: 'Get all company projects' })
  @ApiResponse({
    status: 200,
    description: 'List of projects',
    type: [ProjectResponseDto],
  })
  async findAll(): Promise<ProjectResponseDto[]> {
    const projects = await this.projectService.findAll();
    return projects.map((project) => this.mapToResponseDto(project));
  }

  @Get(':projectId')
  @ApiOperation({ summary: 'Get a company project by ID' })
  @ApiParam({ name: 'projectId', description: 'The ID of the project' })
  @ApiResponse({
    status: 200,
    description: 'The project has been successfully retrieved.',
    type: ProjectResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Project not found.' })
  async findById(@Param('projectId') projectId: string): Promise<ProjectResponseDto> {
    const project = await this.projectService.findById(projectId);
    return this.mapToResponseDto(project);
  }

  @Patch(':projectId')
  @ApiOperation({ summary: 'Update key features and competitors for a project' })
  @ApiParam({ name: 'projectId', description: 'The ID of the project' })
  @ApiResponse({
    status: 200,
    description: 'The project has been successfully updated.',
    type: ProjectResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Project not found.' })
  async update(
    @Param('projectId') projectId: string,
    @Body() updateProjectDto: UpdateProjectDto,
  ): Promise<ProjectResponseDto> {
    const project = await this.projectService.update(projectId, updateProjectDto);
    return this.mapToResponseDto(project);
  }

  @Delete(':projectId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a project and all related data' })
  @ApiParam({ name: 'projectId', description: 'The ID of the project to delete' })
  @ApiResponse({
    status: 204,
    description: 'The project has been successfully deleted.',
  })
  @ApiResponse({ status: 404, description: 'Project not found.' })
  async remove(@Param('projectId') projectId: string): Promise<void> {
    await this.projectService.remove(projectId);
    // Return nothing (204 No Content)
  }

  private mapToResponseDto(project: any): ProjectResponseDto {
    const response = new ProjectResponseDto();
    response.id = project.projectId || project.companyId; // Support both field names during transition
    response.name = project.name;
    response.brandName = project.brandName;
    response.website = project.website;
    response.url = project.website; // Alias for frontend
    response.industry = project.industry;
    response.market = project.market || 'Global'; // Add market field with default
    response.language = project.language; // Add language field without default
    response.shortDescription = project.shortDescription;
    response.fullDescription = project.fullDescription;
    response.longDescription = project.fullDescription; // Alias for frontend
    response.keyBrandAttributes = project.keyBrandAttributes;
    response.competitors = project.competitors;
    response.organizationId = project.organizationId;
    response.createdAt = project.updatedAt; // Using updatedAt as createdAt for now
    response.updatedAt = project.updatedAt;
    return response;
  }
}
