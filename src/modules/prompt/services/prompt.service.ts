import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../../services/prisma.service';
import { CompanyCreatedEvent } from '../../identity-card/events/company-created.event';
import { LlmService } from '../../llm/services/llm.service';
import { z } from 'zod';

@Injectable()
export class PromptService implements OnModuleInit {
  private readonly logger = new Logger(PromptService.name);
  private spontPromptCount: number;
  private directPromptCount: number;
  private comparisonPromptCount: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly llmService: LlmService,
  ) {}

  onModuleInit() {
    // Load prompt counts from configuration
    this.spontPromptCount = this.configService.get<number>('SPONT_PROMPTS', 12);
    this.directPromptCount = this.configService.get<number>('DIRECT_PROMPTS', 12);
    this.comparisonPromptCount = this.configService.get<number>('COMP_PROMPTS', 8);
    
    this.logger.log(`Initialized with ${this.spontPromptCount} spontaneous prompts, ${this.directPromptCount} direct prompts, ${this.comparisonPromptCount} comparison prompts`);
  }

  @OnEvent('company.created')
  async handleCompanyCreated(event: CompanyCreatedEvent) {
    this.logger.log(`Generating prompts for new company: ${event.companyId}`);
    
    try {
      // Check if a prompt set already exists for this company
      const existingPromptSet = await this.prisma.promptSet.findUnique({
        where: { companyId: event.companyId },
      });

      if (existingPromptSet) {
        this.logger.log(`Prompt set already exists for company ${event.companyId}`);
        return;
      }

      // Fetch the company details to create context-specific prompts
      const company = await this.prisma.identityCard.findUnique({
        where: { id: event.companyId },
      });

      if (!company) {
        this.logger.error(`Company ${event.companyId} not found when generating prompts`);
        return;
      }

      const promptSet = await this.generatePromptSet(company);
      
      // Save to database
      await this.prisma.promptSet.create({
        data: {
          companyId: event.companyId,
          spontaneous: JSON.stringify(promptSet.spontaneous),
          direct: JSON.stringify(promptSet.direct),
          comparison: JSON.stringify(promptSet.comparison),
        },
      });

      this.logger.log(`Successfully generated prompts for company ${event.companyId}`);
    } catch (error) {
      this.logger.error(`Failed to generate prompts: ${error.message}`, error.stack);
    }
  }

  private async generatePromptSet(company: any) {
    // Parse company info to ensure we have all fields
    const brandName = company.brandName || 'the company';
    const industry = company.industry || 'technology';
    const competitors = JSON.parse(company.competitorsJson || '[]');
    const keyFeatures = JSON.parse(company.keyFeaturesJson || '[]');
    const shortDescription = company.shortDescription || '';
    
    // Generate all prompts using LLM
    const [spontaneous, direct, comparison] = await Promise.all([
      this.generateSpontaneousPrompts(industry, brandName, this.spontPromptCount),
      this.generateDirectBrandPrompts(brandName, industry, keyFeatures, this.directPromptCount),
      this.generateComparisonPrompts(brandName, competitors, industry, keyFeatures, this.comparisonPromptCount)
    ]);
    
    return { spontaneous, direct, comparison };
  }

  private async generateSpontaneousPrompts(
    industry: string, 
    brandName: string,
    count: number
  ): Promise<string[]> {
    // Define our schema for the LLM output
    const promptsSchema = z.object({
      prompts: z.array(z.string()).min(count).max(count)
    });
    
    // Create system prompt
    const systemPrompt = `You are a prompt engineering expert specializing in creating questions that subtly explore brand awareness.`;
    
    // Create user prompt
    const userPrompt = `
      Generate ${count} different prompts to assess brand awareness in the ${industry} industry.
      
      IMPORTANT GUIDELINES:
      1. The prompts should NEVER explicitly mention "${brandName}" - they should be indirect
      2. Prompts should ask about leading companies, innovations, or market leaders in the ${industry} industry
      3. Each prompt should be phrased as a question
      4. Make prompts varied and diverse in wording
      5. Each prompt should be 10-15 words long
      6. Do not use repetitive phrasing
      
      Examples of good prompts:
      - "What are the leading companies in the technology industry today?"
      - "Which companies are disrupting the financial services sector?"
      - "Name some well-known healthcare providers you trust."
    `;
    
    // Call LLM with structured output processing
    const result = await this.llmService.getStructuredOutput(
      'OpenAI',
      userPrompt,
      promptsSchema,
      { systemPrompt }
    );
    
    return result.prompts;
  }

  private async generateDirectBrandPrompts(
    brandName: string, 
    industry: string,
    keyFeatures: string[],
    count: number
  ): Promise<string[]> {
    // Define our schema for the LLM output
    const promptsSchema = z.object({
      prompts: z.array(z.string()).min(count).max(count)
    });
    
    // Create system prompt
    const systemPrompt = `You are a prompt engineering expert specializing in creating questions about specific brands.`;
    
    // Create user prompt
    const userPrompt = `
      Generate ${count} different prompts to directly assess opinions and knowledge about ${brandName} in the ${industry} industry.
      
      Company Key Features:
      ${keyFeatures.map(f => `- ${f}`).join('\n')}
      
      IMPORTANT GUIDELINES:
      1. The prompts MUST explicitly mention "${brandName}" by name
      2. Include a mix of questions about sentiment, reputation, and knowledge of products/services
      3. Each prompt should be phrased as a question
      4. Make prompts varied and diverse in wording 
      5. Each prompt should be 10-15 words long
      6. Use the placeholder {COMPANY} instead of the actual company name
      
      Examples of good prompts:
      - "What's your impression of {COMPANY} as a technology provider?"
      - "Is {COMPANY} well-regarded in the healthcare industry?"
      - "What products or services is {COMPANY} known for?"
    `;
    
    // Call LLM with structured output processing
    const result = await this.llmService.getStructuredOutput(
      'OpenAI',
      userPrompt,
      promptsSchema,
      { systemPrompt }
    );
    
    return result.prompts;
  }

  private async generateComparisonPrompts(
    brandName: string,
    competitors: string[],
    industry: string,
    keyFeatures: string[],
    count: number
  ): Promise<string[]> {
    // Use default competitors if none provided
    const competitorList = competitors && competitors.length > 0 
      ? competitors 
      : ['competitors in the industry'];
    
    // Define our schema for the LLM output
    const promptsSchema = z.object({
      prompts: z.array(z.string()).min(count).max(count)
    });
    
    // Create system prompt
    const systemPrompt = `You are a prompt engineering expert specializing in creating comparison questions for market research.`;
    
    // Create user prompt
    const userPrompt = `
      Generate ${count} different prompts to compare ${brandName} with its competitors in the ${industry} industry.
      
      Company Key Features:
      ${keyFeatures.map(f => `- ${f}`).join('\n')}
      
      Competitors:
      ${competitorList.map(c => `- ${c}`).join('\n')}
      
      IMPORTANT GUIDELINES:
      1. Each prompt should compare ${brandName} to one or more competitors
      2. Include comparisons on different aspects: quality, price, service, innovation, etc.
      3. Each prompt should be phrased as a question
      4. Use the placeholder {COMPANY} instead of the actual company name
      5. Use the placeholder {COMPETITORS} when referring to all competitors together
      
      Examples of good prompts:
      - "Compare {COMPANY} to {COMPETITORS}. Which is better overall?"
      - "How do {COMPANY}'s products compare to those from {COMPETITORS}?"
      - "Which has better customer service: {COMPANY} or {COMPETITORS}?"
    `;
    
    // Call LLM with structured output processing
    const result = await this.llmService.getStructuredOutput(
      'OpenAI',
      userPrompt,
      promptsSchema,
      { systemPrompt }
    );
    
    return result.prompts;
  }
}