import { Controller, Get, Patch, Post, Body, Param, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PromptService } from '../services/prompt.service';
import { UpdatePromptSetDto } from '../dto/update-prompt-set.dto';
import { PromptSet, PromptSetDocument } from '../schemas/prompt-set.schema';
import { visibilitySystemPrompt, visibilityUserPrompt } from '../services/visibility-prompts';
import { sentimentSystemPrompt, sentimentUserPrompt } from '../services/sentiment-prompts';
import { competitionSystemPrompt, competitionUserPrompt } from '../services/competition-prompts';
import { alignmentSystemPrompt, alignmentUserPrompt } from '../services/alignment-prompts';

@ApiTags('prompt-sets')
@Controller('admin/prompt-set')
export class PromptSetController {
  constructor(
    @InjectModel(PromptSet.name) private promptSetModel: Model<PromptSetDocument>,
    private readonly promptService: PromptService,
  ) {}

  @Get(':projectId')
  @ApiOperation({ summary: 'Get prompt set for a project' })
  @ApiParam({ name: 'projectId', description: 'The ID of the project' })
  @ApiResponse({ status: 200, description: 'Return the prompt set' })
  @ApiResponse({ status: 404, description: 'Prompt set not found' })
  async getPromptSet(@Param('projectId') projectId: string) {
    const promptSet = await this.promptSetModel.findOne({ projectId }).lean().exec();

    if (!promptSet) {
      throw new NotFoundException('Prompt set not found');
    }

    return {
      id: promptSet.id,
      projectId: promptSet.projectId,
      visibility: promptSet.visibility || [],
      sentiment: promptSet.sentiment || [],
      alignment: promptSet.alignment || [],
      competition: promptSet.competition || [],
      updatedAt: promptSet.updatedAt instanceof Date ? promptSet.updatedAt : new Date(),
      createdAt: promptSet.createdAt instanceof Date ? promptSet.createdAt : new Date(),
    };
  }

  @Patch(':projectId')
  @ApiOperation({ summary: 'Update prompt set for a project' })
  @ApiParam({ name: 'projectId', description: 'The ID of the project' })
  @ApiResponse({ status: 200, description: 'The prompt set has been updated successfully' })
  @ApiResponse({ status: 404, description: 'Prompt set not found' })
  async updatePromptSet(
    @Param('projectId') projectId: string,
    @Body() updatePromptSetDto: UpdatePromptSetDto,
  ) {
    return this.promptService.updatePromptSet(projectId, updatePromptSetDto);
  }

  @Post(':projectId/regenerate')
  @ApiOperation({ summary: 'Regenerate the prompt set for a project' })
  @ApiParam({ name: 'projectId', description: 'The ID of the project' })
  @ApiResponse({ status: 200, description: 'The prompt set has been regenerated successfully' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async regeneratePromptSet(@Param('projectId') projectId: string) {
    return this.promptService.regeneratePromptSet(projectId);
  }

  @Get('templates/:projectId')
  @ApiOperation({ summary: 'Get prompt templates used to generate prompts' })
  @ApiParam({ name: 'projectId', description: 'The ID of the project' })
  @ApiResponse({ status: 200, description: 'Returns the prompt templates' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async getPromptTemplates(@Param('projectId') projectId: string) {
    try {
      // Get the project identity card to extract information needed for templates
      const project = await this.promptService.getProjectById(projectId);

      if (!project) {
        throw new NotFoundException(`Project with ID ${projectId} not found`);
      }

      // Get the prompt set to know how many prompts are generated
      const promptSet = await this.promptSetModel.findOne({ projectId }).exec();
      const spontPromptCount = promptSet?.visibility?.length || 15;
      const directPromptCount = promptSet?.sentiment?.length || 3;
      const comparisonPromptCount = promptSet?.competition?.length || 5;
      const accuracyPromptCount = promptSet?.alignment?.length || 3;
      const brandBattlePromptCount = 0; // Removed - merged into competition

      // Get the example prompt templates filled with this project's data
      const spontaneousTemplate = {
        systemPrompt: visibilitySystemPrompt,
        userPrompt: visibilityUserPrompt({
          market: project.market,
          language: project.language,
          websiteUrl: project.website,
          industry: project.industry,
          brandName: project.brandName,
          count: spontPromptCount,
          competitors: project.competitors,
          keywords: []
        }),
      };

      const directTemplate = {
        systemPrompt: sentimentSystemPrompt,
        userPrompt: sentimentUserPrompt({
          market: project.market,
          language: project.language,
          brandName: project.brandName,
          count: directPromptCount,
          websiteUrl: project.website,
        }),
      };

      const comparisonTemplate = {
        systemPrompt: competitionSystemPrompt,
        userPrompt: competitionUserPrompt({
          market: project.market,
          language: project.language,
          brandName: project.brandName,
          competitors: project.competitors,
          industry: project.industry,
          keyBrandAttributes: project.keyBrandAttributes,
          count: comparisonPromptCount,
        }),
      };

      const accuracyTemplate = {
        systemPrompt: alignmentSystemPrompt,
        userPrompt: alignmentUserPrompt({
          market: project.market,
          language: project.language,
          brandName: project.brandName,
          brandAttributes: project.keyBrandAttributes,
          count: accuracyPromptCount,
        }),
      };

      const brandBattleTemplate = {
        systemPrompt: '', // Removed - merged into competition
        userPrompt: '', // Removed - merged into competition
      };

      return {
        visibility: spontaneousTemplate,
        sentiment: directTemplate,
        alignment: accuracyTemplate,
        competition: brandBattleTemplate,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Failed to get prompt templates: ${error.message}`);
    }
  }
}
