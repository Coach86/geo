import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { v4 as uuidv4 } from 'uuid';
import { ScrapedWebsite, fetchAndScrape } from '../../../utils/url-scraper';
import { CompanyIdentityCard } from '../entities/company-identity-card.entity';
import { CreateIdentityCardDto } from '../dto/create-identity-card.dto';
import { CompanyCreatedEvent } from '../events/company-created.event';
import { LlmService } from '../../llm/services/llm.service';
import {
  LlmSummaryResult,
  CompetitorsSummaryResult,
  identityCardSummarySchema,
  competitorsSummarySchema,
  DEFAULT_IDENTITY_CARD_LLM_PROVIDER,
  DEFAULT_COMPETITORS_LLM_PROVIDER,
} from '../interfaces/identity-card.llm';
import {
  buildIdentityCardPrompt,
  buildCompetitorsPrompt,
  getIdentityCardSystemPrompt,
  getCompetitorsSystemPrompt,
} from '../prompts/identity-card.prompt';
import { IdentityCardRepository } from '../repositories/identity-card.repository';

// Helper to try multiple URL variants for scraping
async function tryFetchAndScrapeWithVariants(rawUrl: string): Promise<ScrapedWebsite | undefined> {
  const variants = [];
  // 1. Original
  variants.push(rawUrl);

  // 2. Add https:// if missing
  if (!/^https?:\/\//i.test(rawUrl)) {
    variants.push('https://' + rawUrl);
    variants.push('http://' + rawUrl);
  }

  // 3. Add www. if missing (with both protocols)
  const urlNoProtocol = rawUrl.replace(/^https?:\/\//i, '');
  if (!/^www\./i.test(urlNoProtocol)) {
    variants.push('https://www.' + urlNoProtocol);
    variants.push('http://www.' + urlNoProtocol);
  }

  for (const url of variants) {
    try {
      const result = await fetchAndScrape(url);
      if (result && (result.title || result.description || result.content)) {
        result.url = url; // update to the successful variant
        return result;
      }
    } catch (e) {
      // continue to next variant
    }
  }
  return undefined;
}

@Injectable()
export class IdentityCardService {
  private readonly logger = new Logger(IdentityCardService.name);

  constructor(
    private readonly identityCardRepository: IdentityCardRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly llmService: LlmService,
  ) {}

  async create(createIdentityCardDto: CreateIdentityCardDto): Promise<CompanyIdentityCard> {
    try {
      let identityCard: CompanyIdentityCard;

      if (createIdentityCardDto.url) {
        let scrapedData: ScrapedWebsite | undefined;

        try {
          // Try all URL variants for scraping
          scrapedData = await tryFetchAndScrapeWithVariants(createIdentityCardDto.url);
          if (scrapedData) {
            this.logger.log(`Successfully scraped data from ${scrapedData.url}`);
          } else {
            throw new Error('All URL variants failed');
          }
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

        // Check if market is provided in the data
        if (!createIdentityCardDto.data || !createIdentityCardDto.data.market) {
          throw new BadRequestException('Market is required');
        }

        // Summarize with LLM using web search + scraped data
        identityCard = await this.generateIdentityCardWithCompetitors(
          scrapedData,
          createIdentityCardDto.url,
          createIdentityCardDto.data.market,
          createIdentityCardDto.data.language || 'en',
          createIdentityCardDto.userId,
        );
      } else if (createIdentityCardDto.data) {
        // Check if market is provided in the data
        if (!createIdentityCardDto.data.market) {
          throw new BadRequestException('Market is required');
        }

        // Create from provided data
        identityCard = {
          companyId: uuidv4(),
          brandName: createIdentityCardDto.data.brandName || 'Unknown',
          website: createIdentityCardDto.data.website || '',
          industry: createIdentityCardDto.data.industry || 'Unknown',
          market: createIdentityCardDto.data.market,
          shortDescription: createIdentityCardDto.data.shortDescription || '',
          fullDescription: createIdentityCardDto.data.fullDescription || '',
          keyBrandAttributes: createIdentityCardDto.data.keyBrandAttributes || [],
          competitors: createIdentityCardDto.data.competitors || [],
          language: createIdentityCardDto.data.language || 'en',
          userId: createIdentityCardDto.userId,
          updatedAt: new Date(),
        };
      } else {
        throw new BadRequestException('Either URL or data must be provided');
      }

      // Prepare database data object
      const dbData: any = {
        id: identityCard.companyId,
        brandName: identityCard.brandName,
        website: identityCard.website,
        industry: identityCard.industry,
        market: identityCard.market,
        shortDescription: identityCard.shortDescription,
        fullDescription: identityCard.fullDescription,
        keyBrandAttributes: identityCard.keyBrandAttributes,
        competitors: identityCard.competitors,
        language: identityCard.language,
        data: {},
      };

      // Add userId if provided
      if (createIdentityCardDto.userId) {
        // Check if user exists
        const user = await this.identityCardRepository.findUserById(createIdentityCardDto.userId);

        if (!user) {
          throw new NotFoundException(`User with ID ${createIdentityCardDto.userId} not found`);
        }

        // Add userId to the database data
        dbData.userId = createIdentityCardDto.userId;
      }

      // Store to database
      const saved = await this.identityCardRepository.save(dbData);

      // Emit company created event
      this.eventEmitter.emit('company.created', new CompanyCreatedEvent(saved.id));

      return this.identityCardRepository.mapToEntity(saved);
    } catch (error) {
      this.logger.error(`Failed to create identity card: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findById(companyId: string): Promise<CompanyIdentityCard> {
    const identityCard = await this.identityCardRepository.findById(companyId);
    return this.identityCardRepository.mapToEntity(identityCard);
  }

  async findAll(userId?: string): Promise<CompanyIdentityCard[]> {
    const identityCards = await this.identityCardRepository.findAll(userId);
    return identityCards.map((card) => this.identityCardRepository.mapToEntity(card));
  }

  async update(
    companyId: string,
    updateData: { keyBrandAttributes?: string[]; competitors?: string[] },
  ): Promise<CompanyIdentityCard> {
    try {
      // First check if the identity card exists
      await this.identityCardRepository.findById(companyId);

      // Prepare the update data
      const updateObj: any = {};

      if (updateData.keyBrandAttributes !== undefined) {
        updateObj.keyBrandAttributes = updateData.keyBrandAttributes;
      }

      if (updateData.competitors !== undefined) {
        updateObj.competitors = updateData.competitors;
      }

      // Only update if there are changes
      if (Object.keys(updateObj).length === 0) {
        return this.findById(companyId);
      }

      // Update the identity card
      const updatedCard = await this.identityCardRepository.update(companyId, updateObj);
      return this.identityCardRepository.mapToEntity(updatedCard);
    } catch (error) {
      this.logger.error(`Failed to update identity card: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Generate identity card with competitors using two separate LLM calls
   */
  private async generateIdentityCardWithCompetitors(
    scrapedData: ScrapedWebsite,
    url: string,
    market: string,
    language: string,
    userId: string,
  ): Promise<CompanyIdentityCard> {
    try {
      // Step 1: Generate the main identity card using the default provider
      const mainIdentityCard = await this.generateMainIdentityCard(scrapedData, url, language);

      // Step 2: Generate competitors using Perplexity
      const competitors = await this.generateCompetitors(
        scrapedData,
        url,
        mainIdentityCard.brandName,
        mainIdentityCard.industry,
        market,
        language,
      );

      // Step 3: Combine results into a complete identity card
      return {
        companyId: uuidv4(),
        brandName: mainIdentityCard.brandName,
        website: url,
        industry: mainIdentityCard.industry,
        market: market,
        shortDescription: mainIdentityCard.shortDescription,
        fullDescription: mainIdentityCard.fullDescription,
        keyBrandAttributes: mainIdentityCard.keyBrandAttributes,
        competitors: competitors,
        language: language,
        userId: userId,
        updatedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(
        `Failed to generate identity card with competitors: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Generate the main identity card fields using the default LLM provider
   */
  private async generateMainIdentityCard(
    scrapedData: ScrapedWebsite,
    url: string,
    language: string,
  ): Promise<LlmSummaryResult> {
    try {
      // Build prompt for the main identity card
      const prompt = buildIdentityCardPrompt({ url, scrapedData, language });
      const systemPrompt = getIdentityCardSystemPrompt();

      // Call the LLM with structured output
      const result = await this.llmService.getStructuredOutput(
        DEFAULT_IDENTITY_CARD_LLM_PROVIDER,
        prompt,
        identityCardSummarySchema,
        { systemPrompt },
      );

      this.logger.log(
        `Generated main identity card for ${url} with ${DEFAULT_IDENTITY_CARD_LLM_PROVIDER}`,
      );
      return result;
    } catch (error) {
      this.logger.error(`Failed to generate main identity card: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Generate competitors using the Perplexity LLM
   */
  private async generateCompetitors(
    scrapedData: ScrapedWebsite,
    url: string,
    brandName: string,
    industry: string,
    market: string,
    language: string,
  ): Promise<string[]> {
    try {
      // Build prompt for competitors
      const prompt = buildCompetitorsPrompt({
        url,
        scrapedData,
        brandName,
        industry,
        market,
        language,
      });
      const systemPrompt = getCompetitorsSystemPrompt();

      // Call Perplexity LLM with structured output
      const result = await this.llmService.getStructuredOutput(
        DEFAULT_COMPETITORS_LLM_PROVIDER,
        prompt,
        competitorsSummarySchema,
        { systemPrompt },
      );

      this.logger.log(
        `Generated competitors for ${brandName} with ${DEFAULT_COMPETITORS_LLM_PROVIDER}`,
      );
      return result.competitors;
    } catch (error) {
      this.logger.error(`Failed to generate competitors: ${error.message}`, error.stack);
      // Return empty array if we fail to generate competitors
      this.logger.warn(`Returning empty competitors array for ${brandName} due to error`);
      return [];
    }
  }

  /**
   * Delete a company identity card and all related data
   */
  async remove(companyId: string): Promise<void> {
    try {
      // Check if the identity card exists
      await this.identityCardRepository.findById(companyId);

      // Delete the identity card itself
      await this.identityCardRepository.remove(companyId);
      this.logger.log(`Successfully deleted company with ID ${companyId}`);

      // Emit company deleted event
      this.eventEmitter.emit('company.deleted', { companyId });
    } catch (error) {
      this.logger.error(`Failed to delete company: ${error.message}`, error.stack);
      throw error;
    }
  }
}
