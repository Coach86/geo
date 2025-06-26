import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { OrganizationService } from '../services/organization.service';
import { CreateOrganizationDto } from '../dto/create-organization.dto';
import { UpdateOrganizationDto } from '../dto/update-organization.dto';
import { UpdatePlanSettingsDto } from '../dto/update-plan-settings.dto';
import { UpdateSelectedModelsDto } from '../dto/update-selected-models.dto';
import { OrganizationResponseDto } from '../dto/organization-response.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../auth/guards/admin.guard';

@ApiTags('Admin - Organizations')
@Controller('admin/organizations')
@UseGuards(JwtAuthGuard, AdminGuard)
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new organization' })
  @ApiBody({ type: CreateOrganizationDto })
  @ApiResponse({
    status: 201,
    description: 'Organization successfully created',
    type: OrganizationResponseDto,
  })
  async create(@Body() createOrganizationDto: CreateOrganizationDto): Promise<OrganizationResponseDto> {
    return await this.organizationService.create(createOrganizationDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all organizations' })
  @ApiResponse({
    status: 200,
    description: 'List of organizations',
    type: [OrganizationResponseDto],
  })
  async findAll(@Query('includeProjects') includeProjects?: string): Promise<OrganizationResponseDto[]> {
    return await this.organizationService.findAll(includeProjects === 'true');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an organization by ID' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiResponse({
    status: 200,
    description: 'Organization found',
    type: OrganizationResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Organization not found',
  })
  async findOne(@Param('id') id: string): Promise<OrganizationResponseDto> {
    return await this.organizationService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an organization' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiResponse({
    status: 200,
    description: 'Organization successfully updated',
    type: OrganizationResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Organization not found',
  })
  async update(
    @Param('id') id: string,
    @Body() updateOrganizationDto: UpdateOrganizationDto,
  ): Promise<OrganizationResponseDto> {
    return await this.organizationService.update(id, updateOrganizationDto);
  }

  @Patch(':id/plan-settings')
  @ApiOperation({ summary: 'Update organization plan settings' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiBody({ type: UpdatePlanSettingsDto })
  @ApiResponse({
    status: 200,
    description: 'Plan settings successfully updated',
    type: OrganizationResponseDto,
  })
  async updatePlanSettings(
    @Param('id') id: string,
    @Body() planSettings: UpdatePlanSettingsDto,
  ): Promise<OrganizationResponseDto> {
    return await this.organizationService.updatePlanSettings(id, planSettings);
  }

  @Patch(':id/selected-models')
  @ApiOperation({ summary: 'Update organization selected AI models' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiBody({ type: UpdateSelectedModelsDto })
  @ApiResponse({
    status: 200,
    description: 'Selected models successfully updated',
    type: OrganizationResponseDto,
  })
  async updateSelectedModels(
    @Param('id') id: string,
    @Body() body: UpdateSelectedModelsDto,
  ): Promise<OrganizationResponseDto> {
    return await this.organizationService.updateSelectedModels(id, body.selectedModels);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an organization' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiResponse({
    status: 200,
    description: 'Organization successfully deleted',
  })
  @ApiResponse({
    status: 404,
    description: 'Organization not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Organization still has users',
  })
  async remove(@Param('id') id: string): Promise<void> {
    return await this.organizationService.remove(id);
  }
}