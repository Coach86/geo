import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../../services/prisma.service';
import { ScrapedWebsite, fetchAndScrape } from '../../../utils/url-scraper';
import { CompanyIdentityCard } from '../entities/company-identity-card.entity';
import { CreateIdentityCardDto } from '../dto/create-identity-card.dto';
import { CompanyCreatedEvent } from '../events/company-created.event';
import { LlmService } from '../../llm/services/llm.service';
import { z } from 'zod';

interface LlmSummaryResult {
  brandName: string;
  industry: string;
  shortDescription: string;
  fullDescription: string;
  keyFeatures: string[];
  competitors: string[];
}

@Injectable()
export class IdentityCardService {
  private readonly logger = new Logger(IdentityCardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly llmService: LlmService,
  ) {}

  async create(createIdentityCardDto: CreateIdentityCardDto): Promise<CompanyIdentityCard> {
    try {
      let identityCard: CompanyIdentityCard;

      if (createIdentityCardDto.url) {
        let scrapedData: ScrapedWebsite | undefined;

        try {
          // Attempt to fetch and scrape URL as additional context
          // But don't let a failure here block the entire process
          scrapedData = await fetchAndScrape(createIdentityCardDto.url);
          this.logger.log(`Successfully scraped data from ${createIdentityCardDto.url}`);
        } catch (scrapingError) {
          // Log the error but continue without scraped data
          this.logger.warn(
            `Failed to scrape URL ${createIdentityCardDto.url}: ${scrapingError.message}`,
          );
          // Create empty ScrapedWebsite object
          scrapedData = {
            title: '',
            description: '',
            keywords: [],
            content: '',
            url: createIdentityCardDto.url,
          };
        }

        // Summarize with LLM using web search + scraped data
        identityCard = await this.summarizeWithLLM(scrapedData, createIdentityCardDto.url);
      } else if (createIdentityCardDto.data) {
        // Create from provided data
        identityCard = {
          companyId: uuidv4(),
          brandName: createIdentityCardDto.data.brandName || 'Unknown',
          website: createIdentityCardDto.data.website || '',
          industry: createIdentityCardDto.data.industry || 'Unknown',
          shortDescription: createIdentityCardDto.data.shortDescription || '',
          fullDescription: createIdentityCardDto.data.fullDescription || '',
          keyFeatures: createIdentityCardDto.data.keyFeatures || [],
          competitors: createIdentityCardDto.data.competitors || [],
          updatedAt: new Date(),
        };
      } else {
        throw new BadRequestException('Either URL or data must be provided');
      }

      // Store to database
      const saved = await this.prisma.identityCard.create({
        data: {
          id: identityCard.companyId,
          brandName: identityCard.brandName,
          website: identityCard.website,
          industry: identityCard.industry,
          shortDescription: identityCard.shortDescription,
          fullDescription: identityCard.fullDescription,
          keyFeaturesJson: JSON.stringify(identityCard.keyFeatures),
          competitorsJson: JSON.stringify(identityCard.competitors),
          data: '{}',
        },
      });

      // Emit company created event
      this.eventEmitter.emit('company.created', new CompanyCreatedEvent(saved.id));

      return {
        companyId: saved.id,
        brandName: saved.brandName,
        website: saved.website,
        industry: saved.industry,
        shortDescription: saved.shortDescription,
        fullDescription: saved.fullDescription,
        keyFeatures: JSON.parse(saved.keyFeaturesJson),
        competitors: JSON.parse(saved.competitorsJson),
        updatedAt: saved.updatedAt,
      };
    } catch (error) {
      this.logger.error(`Failed to create identity card: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findById(companyId: string): Promise<CompanyIdentityCard> {
    const identityCard = await this.prisma.identityCard.findUnique({
      where: { id: companyId },
    });

    if (!identityCard) {
      throw new NotFoundException(`Identity card with ID ${companyId} not found`);
    }

    return {
      companyId: identityCard.id,
      brandName: identityCard.brandName,
      website: identityCard.website,
      industry: identityCard.industry,
      shortDescription: identityCard.shortDescription,
      fullDescription: identityCard.fullDescription,
      keyFeatures: JSON.parse(identityCard.keyFeaturesJson),
      competitors: JSON.parse(identityCard.competitorsJson),
      updatedAt: identityCard.updatedAt,
    };
  }

  /**
   * Use LLM to analyze and summarize company data using web search and scraped website data
   */
  private async summarizeWithLLM(
    scrapedData: ScrapedWebsite, // ScrapedWebsite is always provided, even if empty
    url: string,
  ): Promise<CompanyIdentityCard> {
    try {
      // Format the prompt to prioritize web search but also include scraped data if available
      let promptWithScrapedData = '';

      // Check if we have meaningful scraped data to include
      const hasScrapedData =
        scrapedData &&
        (scrapedData.title ||
          scrapedData.description ||
          (scrapedData.keywords && scrapedData.keywords.length > 0) ||
          scrapedData.content);

      if (hasScrapedData) {
        promptWithScrapedData = `
        As additional context, I've also scraped some data from their website that may be helpful:

        Title: ${scrapedData.title || 'Not available'}
        Description: ${scrapedData.description || 'No meta description'}
        Keywords: ${scrapedData.keywords?.join(', ') || 'No keywords'}

        Content sample (${scrapedData.content ? `first ${Math.min(2000, scrapedData.content.length)} chars` : 'not available'}):
        ${scrapedData.content ? scrapedData.content.substring(0, 2000) + '...' : 'No content scraped'}`;
      }

      const prompt = `
        I need to generate a comprehensive company identity card for the company at ${url}.

        IMPORTANT: You have the capability to search the web. First, search the web for up-to-date information about this company.
        Look for the company's official website, about pages, LinkedIn, social media, press releases, and other reliable sources.
        ${hasScrapedData ? promptWithScrapedData : ''}

        Based on your web search${hasScrapedData ? ' AND the scraped data above' : ''}, please analyze the company and provide the following in JSON format:
        1. The company's brand name
        2. The industry or sector they operate in
        3. A short description (1-2 sentences)
        4. A full description (2-3 paragraphs)
        5. 4-6 key features or strengths of the company
        6. 3-5 likely competitors in their industry

        Return your analysis as a valid JSON object with the following structure:
        {
          "brandName": "Company Name",
          "industry": "Industry Name",
          "shortDescription": "Short description of the company",
          "fullDescription": "Full description of the company in multiple sentences",
          "keyFeatures": ["Feature 1", "Feature 2", "Feature 3", "Feature 4"],
          "competitors": ["Competitor 1", "Competitor 2", "Competitor 3"]
        }
      `;

      // Define the Zod schema for structured output
      const summarySchema = z.object({
        brandName: z.string(),
        industry: z.string(),
        shortDescription: z.string(),
        fullDescription: z.string(),
        keyFeatures: z.array(z.string()),
        competitors: z.array(z.string()),
      });

      // Prioritize providers with good search capabilities for this task
      // Default priority: Perplexity > OpenAI > Anthropic > Others
      let provider = 'OpenAI';

      // Get available adapters from LlmService
      const availableAdapters = this.llmService.getAvailableAdapters();
      const adapterNames = availableAdapters.map((adapter) => adapter.name);

      // First check if Perplexity is available (best for web search)
      if (adapterNames.includes('Anthropic')) {
        provider = 'Anthropic';
      } else if (adapterNames.includes('Perplexity')) {
        provider = 'Perplexity';
        this.logger.log('Using Perplexity for web search-based identity card generation');
      } else if (adapterNames.includes('OpenAI')) {
        provider = 'OpenAI';
      } else if (adapterNames.length > 0) {
        provider = adapterNames[0]; // Use first available adapter
      } else {
        // Fallback to mock if no providers are available
        this.logger.warn('No LLM providers available, using mock data');
        throw new Error('No LLM providers available');
      }

      // Call the LLM with structured output
      const systemPrompt =
        'You are a business analyst specializing in company analysis with access to web search capability. Your primary task is to search the web for company information and then analyze it. Use the scraped website data as supplementary information only if needed.';
      let result: LlmSummaryResult;
      try {
        result = await this.llmService.getStructuredOutput(provider, prompt, summarySchema, {
          systemPrompt,
        });
      } catch (error) {
        this.logger.error(`Failed to get structured output from LLM: ${error.message}`);
        // Fallback to mock if LLM call or parsing fails
        throw error;
      }

      // Create and return the identity card
      return {
        companyId: uuidv4(),
        brandName: result.brandName,
        website: url,
        industry: result.industry,
        shortDescription: result.shortDescription,
        fullDescription: result.fullDescription,
        keyFeatures: result.keyFeatures,
        competitors: result.competitors,
        updatedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`LLM summarization failed: ${error.message}`, error.stack);
      // Fallback to mock if LLM call fails
      throw error;
    }
  }

  /**
   * Extract brand name from scraped data (fallback method)
   */
  private extractBrandName(scrapedData: ScrapedWebsite, url: string): string {
    // Try to extract from title
    let brandName =
      scrapedData.title.split(' - ')[0] || scrapedData.title.split(' | ')[0] || scrapedData.title;

    // Try to extract from URL
    if (!brandName || brandName.length > 30) {
      const urlParts = new URL(url).hostname.split('.');
      if (urlParts.length >= 2) {
        brandName = urlParts[urlParts.length - 2];
        // Capitalize first letter
        brandName = brandName.charAt(0).toUpperCase() + brandName.slice(1);
      }
    }

    return brandName;
  }
}
