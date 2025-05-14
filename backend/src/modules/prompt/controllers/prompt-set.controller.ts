import { Controller, Get, Patch, Post, Body, Param, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PromptService } from '../services/prompt.service';
import { UpdatePromptSetDto } from '../dto/update-prompt-set.dto';
import { PromptSet, PromptSetDocument } from '../schemas/prompt-set.schema';

@ApiTags('prompt-sets')
@Controller('prompt-set')
export class PromptSetController {
  constructor(
    @InjectModel(PromptSet.name) private promptSetModel: Model<PromptSetDocument>,
    private readonly promptService: PromptService
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
    @Body() updatePromptSetDto: UpdatePromptSetDto
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
}
