import { Controller, Get, Patch, Post, Body, Param, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PromptService } from '../services/prompt.service';
import { UpdatePromptSetDto } from '../dto/update-prompt-set.dto';
import { PromptSet, PromptSetDocument } from '../schemas/prompt-set.schema';
import { spontaneousSystemPrompt, spontaneousUserPrompt } from '../services/spontaneous-prompts';
import { directSystemPrompt, directUserPrompt } from '../services/direct-prompts';
import { comparisonSystemPrompt, comparisonUserPrompt } from '../services/comparison-prompts';

@ApiTags('prompt-sets')
@Controller('admin/prompt-set')
export class PromptSetController {
  constructor(
    @InjectModel(PromptSet.name) private promptSetModel: Model<PromptSetDocument>,
    private readonly promptService: PromptService,
    @InjectModel('IdentityCard') private identityCardModel: Model<any>,
  ) {}

  @Get(':companyId')
  @ApiOperation({ summary: 'Get prompt set for a company' })
  @ApiParam({ name: 'companyId', description: 'The ID of the company' })
  @ApiResponse({ status: 200, description: 'Return the prompt set' })
  @ApiResponse({ status: 404, description: 'Prompt set not found' })
  async getPromptSet(@Param('companyId') companyId: string) {
    const promptSet = await this.promptSetModel.findOne({ companyId }).exec();

    if (!promptSet) {
      throw new NotFoundException('Prompt set not found');
    }

    return {
      id: promptSet.id,
      companyId: promptSet.companyId,
      spontaneous: promptSet.spontaneous,
      direct: promptSet.direct,
      comparison: promptSet.comparison,
      updatedAt: promptSet.updatedAt instanceof Date ? promptSet.updatedAt : new Date(),
      createdAt: promptSet.createdAt instanceof Date ? promptSet.createdAt : new Date(),
    };
  }

  @Patch(':companyId')
  @ApiOperation({ summary: 'Update prompt set for a company' })
  @ApiParam({ name: 'companyId', description: 'The ID of the company' })
  @ApiResponse({ status: 200, description: 'The prompt set has been updated successfully' })
  @ApiResponse({ status: 404, description: 'Prompt set not found' })
  async updatePromptSet(
    @Param('companyId') companyId: string,
    @Body() updatePromptSetDto: UpdatePromptSetDto,
  ) {
    return this.promptService.updatePromptSet(companyId, updatePromptSetDto);
  }

  @Post(':companyId/regenerate')
  @ApiOperation({ summary: 'Regenerate the prompt set for a company' })
  @ApiParam({ name: 'companyId', description: 'The ID of the company' })
  @ApiResponse({ status: 200, description: 'The prompt set has been regenerated successfully' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  async regeneratePromptSet(@Param('companyId') companyId: string) {
    return this.promptService.regeneratePromptSet(companyId);
  }

  @Get('templates/:companyId')
  @ApiOperation({ summary: 'Get prompt templates used to generate prompts' })
  @ApiParam({ name: 'companyId', description: 'The ID of the company' })
  @ApiResponse({ status: 200, description: 'Returns the prompt templates' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  async getPromptTemplates(@Param('companyId') companyId: string) {
    try {
      // Get the company identity card to extract information needed for templates
      const company = await this.identityCardModel.findOne({ id: companyId }).exec();

      if (!company) {
        throw new NotFoundException(`Company with ID ${companyId} not found`);
      }

      // Get the prompt set to know how many prompts are generated
      const promptSet = await this.promptSetModel.findOne({ companyId }).exec();
      const spontPromptCount = promptSet?.spontaneous?.length || 15;
      const directPromptCount = promptSet?.direct?.length || 3;
      const comparisonPromptCount = promptSet?.comparison?.length || 5;

      // Get the example prompt templates filled with this company's data
      const spontaneousTemplate = {
        systemPrompt: spontaneousSystemPrompt,
        userPrompt: spontaneousUserPrompt({
          market: company.market || 'US Market / English',
          websiteUrl: company.website || 'example.com',
          industry: company.industry || 'Technology',
          brandName: company.brandName || 'Example Brand',
          count: spontPromptCount,
        }),
      };

      const directTemplate = {
        systemPrompt: directSystemPrompt,
        userPrompt: directUserPrompt({
          market: company.market || 'US Market / English',
          brandName: company.brandName || 'Example Brand',
          industry: company.industry || 'Technology',
          keyFeatures: company.keyFeatures || ['Feature 1', 'Feature 2'],
          count: directPromptCount,
        }),
      };

      const comparisonTemplate = {
        systemPrompt: comparisonSystemPrompt,
        userPrompt: comparisonUserPrompt({
          market: company.market || 'US Market / English',
          brandName: company.brandName || 'Example Brand',
          competitors: company.competitors || ['Competitor 1', 'Competitor 2'],
          industry: company.industry || 'Technology',
          keyFeatures: company.keyFeatures || ['Feature 1', 'Feature 2'],
          count: comparisonPromptCount,
        }),
      };

      return {
        spontaneous: spontaneousTemplate,
        direct: directTemplate,
        comparison: comparisonTemplate,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Failed to get prompt templates: ${error.message}`);
    }
  }
}
