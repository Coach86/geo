import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Patch,
  Delete,
  Query,
  BadRequestException,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { ProjectService } from '../services/project.service';
import { CreateProjectDto } from '../dto/create-project.dto';
import { CreateFromUrlDto } from '../dto/create-from-url.dto';
import { UpdateProjectDto } from '../dto/update-project.dto';
import { ProjectResponseDto } from '../dto/project-response.dto';
import { AdminGuard } from '../../auth/guards/admin.guard';
import { PaginationDto, PaginatedResponseDto } from '../../../common/dto/pagination.dto';

@ApiTags('Admin - Projects')
@Controller('admin/project')
@UseGuards(AdminGuard)
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new company project' })
  @ApiBody({ type: CreateProjectDto })
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
  @ApiBody({ type: CreateFromUrlDto })
  @ApiResponse({
    status: 201,
    description: 'The project has been successfully created from URL.',
    type: ProjectResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  async createFromUrl(
    @Body() createFromUrlDto: CreateFromUrlDto,
  ): Promise<ProjectResponseDto> {
    const createDto = new CreateProjectDto();
    createDto.url = createFromUrlDto.url;
    createDto.organizationId = createFromUrlDto.organizationId;

    // Market is required
    if (!createFromUrlDto.market) {
      throw new BadRequestException('Market is required');
    }

    if (!createDto.data) {
      createDto.data = {};
    }
    createDto.data.market = createFromUrlDto.market;
    
    if (createFromUrlDto.language) {
      createDto.data.language = createFromUrlDto.language;
    }

    const project = await this.projectService.create(createDto);
    return this.mapToResponseDto(project);
  }

  @Get()
  @ApiOperation({ summary: 'Get all company projects with pagination' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of projects',
  })
  async findAll(@Query() paginationDto: PaginationDto) {
    const projects = await this.projectService.findAll();
    
    // Apply search filter if provided
    let filteredProjects = projects;
    if (paginationDto.search) {
      const searchLower = paginationDto.search.toLowerCase();
      filteredProjects = projects.filter(project => 
        project.projectId.toLowerCase().includes(searchLower) ||
        project.name?.toLowerCase().includes(searchLower) ||
        project.brandName?.toLowerCase().includes(searchLower) ||
        project.website?.toLowerCase().includes(searchLower)
      );
    }

    // Sort by updatedAt (newest first), fallback to projectId
    filteredProjects.sort((a, b) => {
      const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return dateB - dateA;
    });

    // Calculate pagination
    const total = filteredProjects.length;
    const startIndex = paginationDto.offset;
    const endIndex = startIndex + (paginationDto.limit || 20);
    const paginatedProjects = filteredProjects.slice(startIndex, endIndex);

    const mappedProjects = paginatedProjects.map((project) => this.mapToResponseDto(project));

    return new PaginatedResponseDto(
      mappedProjects,
      total,
      paginationDto.page || 1,
      paginationDto.limit || 20
    );
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
  @ApiBody({ type: UpdateProjectDto })
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

  @Post(':projectId/refresh-competitors')
  @HttpCode(200)
  @ApiOperation({ summary: 'Refresh competitor websites for a project (admin only)' })
  @ApiParam({ name: 'projectId', description: 'The ID of the project' })
  @ApiResponse({
    status: 200,
    description: 'Competitor websites refresh has been triggered.',
  })
  @ApiResponse({ status: 404, description: 'Project not found.' })
  async refreshCompetitorWebsites(@Param('projectId') projectId: string): Promise<{ message: string }> {
    await this.projectService.refreshCompetitorWebsites(projectId);
    return { message: 'Competitor websites refresh triggered successfully' };
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
    response.objectives = project.objectives;
    response.keyBrandAttributes = project.keyBrandAttributes;
    response.competitors = project.competitors;
    response.competitorDetails = project.competitorDetails;
    response.organizationId = project.organizationId;
    response.createdAt = project.createdAt || project.updatedAt; // Use actual createdAt if available
    response.updatedAt = project.updatedAt;
    response.nextManualAnalysisAllowedAt = project.nextManualAnalysisAllowedAt;
    return response;
  }
}
