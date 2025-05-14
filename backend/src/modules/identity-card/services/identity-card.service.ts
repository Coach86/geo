import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { ScrapedWebsite, fetchAndScrape } from '../../../utils/url-scraper';
import { CompanyIdentityCard } from '../entities/company-identity-card.entity';
import { CreateIdentityCardDto } from '../dto/create-identity-card.dto';
import { CompanyCreatedEvent } from '../events/company-created.event';
import { LlmService } from '../../llm/services/llm.service';
import { z } from 'zod';
import { IdentityCard, IdentityCardDocument } from '../schemas/identity-card.schema';
import { User, UserDocument } from '../../user/schemas/user.schema';

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
    @InjectModel(IdentityCard.name) private identityCardModel: Model<IdentityCardDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
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

        // Check if market is provided in the data
        if (!createIdentityCardDto.data || !createIdentityCardDto.data.market) {
          throw new BadRequestException('Market is required');
        }

        // Summarize with LLM using web search + scraped data
        identityCard = await this.summarizeWithLLM(
          scrapedData,
          createIdentityCardDto.url,
          createIdentityCardDto.data.market, // Pass the market (we've verified it exists)
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
          market: createIdentityCardDto.data.market, // Market is now verified
          shortDescription: createIdentityCardDto.data.shortDescription || '',
          fullDescription: createIdentityCardDto.data.fullDescription || '',
          keyFeatures: createIdentityCardDto.data.keyFeatures || [],
          competitors: createIdentityCardDto.data.competitors || [],
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
        market: identityCard.market, // Market is mandatory
        shortDescription: identityCard.shortDescription,
        fullDescription: identityCard.fullDescription,
        keyFeatures: identityCard.keyFeatures,
        competitors: identityCard.competitors,
        data: {},
      };

      // Add userId if provided
      if (createIdentityCardDto.userId) {
        // Check if user exists
        const user = await this.userModel.findOne({ id: createIdentityCardDto.userId }).exec();

        if (!user) {
          throw new NotFoundException(`User with ID ${createIdentityCardDto.userId} not found`);
        }

        // Add userId to the database data
        dbData.userId = createIdentityCardDto.userId;
      }

      // Store to database using Mongoose
      const newIdentityCard = new this.identityCardModel(dbData);
      const saved = await newIdentityCard.save();

      // Emit company created event
      this.eventEmitter.emit('company.created', new CompanyCreatedEvent(saved.id));

      return {
        companyId: saved.id,
        brandName: saved.brandName,
        website: saved.website,
        industry: saved.industry,
        market: saved.market,
        shortDescription: saved.shortDescription,
        fullDescription: saved.fullDescription,
        keyFeatures: saved.keyFeatures,
        competitors: saved.competitors,
        updatedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to create identity card: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findById(companyId: string): Promise<CompanyIdentityCard> {
    const identityCard = await this.identityCardModel.findOne({ id: companyId }).exec();

    if (!identityCard) {
      throw new NotFoundException(`Identity card with ID ${companyId} not found`);
    }

    // Get user information if available
    let userEmail = null;
    let userLanguage = null;

    if (identityCard.userId) {
      const user = await this.userModel.findOne({ id: identityCard.userId }).exec();
      if (user) {
        userEmail = user.email;
        userLanguage = user.language;
      }
    }

    return {
      companyId: identityCard.id,
      brandName: identityCard.brandName,
      website: identityCard.website,
      industry: identityCard.industry,
      market: identityCard.market,
      shortDescription: identityCard.shortDescription,
      fullDescription: identityCard.fullDescription,
      keyFeatures: identityCard.keyFeatures,
      competitors: identityCard.competitors,
      updatedAt: identityCard.updatedAt instanceof Date ? identityCard.updatedAt : new Date(),
      userId: identityCard.userId || null,
      userEmail: userEmail,
      userLanguage: userLanguage,
    };
  }

  async findAll(userId?: string): Promise<CompanyIdentityCard[]> {
    // Build the query
    const query: any = {};

    // Add userId filter if provided
    if (userId) {
      query.userId = userId;
    }

    // Use Mongoose to query with filter and sort by updatedAt in descending order
    const identityCards = await this.identityCardModel.find(query).sort({ updatedAt: -1 }).exec();

    // Get all unique user IDs from the cards
    const userIds = [
      ...new Set(identityCards.filter((card) => card.userId).map((card) => card.userId)),
    ] as string[];

    // Fetch all users at once
    const users =
      userIds.length > 0 ? await this.userModel.find({ id: { $in: userIds } }).exec() : [];

    // Create a map of user ID to user data for quick lookup
    const userMap = users.reduce(
      (map, user) => {
        map[user.id] = user;
        return map;
      },
      {} as Record<string, any>,
    );

    return identityCards.map((card) => ({
      companyId: card.id,
      brandName: card.brandName,
      website: card.website,
      industry: card.industry,
      market: card.market,
      shortDescription: card.shortDescription,
      fullDescription: card.fullDescription,
      keyFeatures: card.keyFeatures,
      competitors: card.competitors,
      updatedAt: card.updatedAt instanceof Date ? card.updatedAt : new Date(),
      userId: card.userId || null,
      userEmail: card.userId ? userMap[card.userId]?.email || null : null,
      userLanguage: card.userId ? userMap[card.userId]?.language || null : null,
    }));
  }

  async update(
    companyId: string,
    updateData: { keyFeatures?: string[]; competitors?: string[]; userId?: string | null },
  ): Promise<CompanyIdentityCard> {
    try {
      // First check if the identity card exists
      const existingCard = await this.identityCardModel.findOne({ id: companyId }).exec();

      if (!existingCard) {
        throw new NotFoundException(`Identity card with ID ${companyId} not found`);
      }

      // Prepare the update data
      const updateObj: any = {};

      if (updateData.keyFeatures !== undefined) {
        updateObj.keyFeatures = updateData.keyFeatures;
      }

      if (updateData.competitors !== undefined) {
        updateObj.competitors = updateData.competitors;
      }

      // Handle user association
      if (updateData.userId !== undefined) {
        if (updateData.userId === null) {
          // Remove user association
          updateObj.userId = null;
        } else {
          // Check if user exists
          const user = await this.userModel.findOne({ id: updateData.userId }).exec();

          if (!user) {
            throw new NotFoundException(`User with ID ${updateData.userId} not found`);
          }

          // Update user association
          updateObj.userId = updateData.userId;
        }
      }

      // Only update if there are changes
      if (Object.keys(updateObj).length === 0) {
        return this.findById(companyId);
      }

      // Update the identity card using Mongoose findOneAndUpdate
      const updatedCard = await this.identityCardModel
        .findOneAndUpdate(
          { id: companyId },
          { $set: updateObj },
          { new: true }, // Return the updated document
        )
        .exec();

      if (!updatedCard) {
        throw new NotFoundException(`Identity card with ID ${companyId} not found after update`);
      }

      // Get user information if available
      let userEmail = null;
      let userLanguage = null;

      if (updatedCard.userId) {
        const user = await this.userModel.findOne({ id: updatedCard.userId }).exec();
        if (user) {
          userEmail = user.email;
          userLanguage = user.language;
        }
      }

      // Return the updated card
      return {
        companyId: updatedCard.id,
        brandName: updatedCard.brandName,
        website: updatedCard.website,
        industry: updatedCard.industry,
        market: updatedCard.market,
        shortDescription: updatedCard.shortDescription,
        fullDescription: updatedCard.fullDescription,
        keyFeatures: updatedCard.keyFeatures,
        competitors: updatedCard.competitors,
        updatedAt: updatedCard.updatedAt instanceof Date ? updatedCard.updatedAt : new Date(),
        userId: updatedCard.userId || null,
        userEmail: userEmail,
        userLanguage: userLanguage,
      };
    } catch (error) {
      this.logger.error(`Failed to update identity card: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Use LLM to analyze and summarize company data using web search and scraped website data
   */
  private async summarizeWithLLM(
    scrapedData: ScrapedWebsite, // ScrapedWebsite is always provided, even if empty
    url: string,
    market: string, // Mandatory market parameter from the request
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
        this.logger.warn('No LLM providers available');
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
        market: market, // Market is mandatory and must be provided
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

  /**
   * Delete a company identity card and all related data
   */
  async remove(companyId: string): Promise<void> {
    try {
      // Check if the identity card exists
      const identityCard = await this.identityCardModel.findOne({ id: companyId }).exec();

      if (!identityCard) {
        throw new NotFoundException(`Identity card with ID ${companyId} not found`);
      }

      // Using Mongoose session to ensure all related data is deleted in a transaction
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        // Delete all raw responses related to the company's batch executions
        // First, get all batch executions for this company
        const batchExecutionModel = mongoose.model('BatchExecution');
        const batchExecutions = await batchExecutionModel.find({ companyId }).exec();
        const batchExecutionIds = batchExecutions.map((be) => be.id);

        // Delete raw responses that belong to these batch executions
        if (batchExecutionIds.length > 0) {
          const rawResponseModel = mongoose.model('RawResponse');
          await rawResponseModel
            .deleteMany({
              batchExecutionId: { $in: batchExecutionIds },
            })
            .session(session)
            .exec();
        }

        // Delete batch results that belong to these batch executions
        if (batchExecutionIds.length > 0) {
          const batchResultModel = mongoose.model('BatchResult');
          await batchResultModel
            .deleteMany({
              batchExecutionId: { $in: batchExecutionIds },
            })
            .session(session)
            .exec();
        }

        // Delete all batch executions for this company
        await batchExecutionModel
          .deleteMany({
            companyId,
          })
          .session(session)
          .exec();

        // Delete all weekly reports for this company
        const weeklyReportModel = mongoose.model('WeeklyBrandReport');
        await weeklyReportModel
          .deleteMany({
            companyId,
          })
          .session(session)
          .exec();

        // Delete prompt sets if they exist
        const promptSetModel = mongoose.model('PromptSet');
        await promptSetModel
          .deleteMany({
            companyId,
          })
          .session(session)
          .exec();

        // Finally, delete the identity card itself
        await this.identityCardModel
          .deleteOne({
            id: companyId,
          })
          .session(session)
          .exec();

        // Commit the transaction
        await session.commitTransaction();
        this.logger.log(`Successfully deleted company with ID ${companyId} and all related data`);
      } catch (error) {
        // Abort the transaction on error
        await session.abortTransaction();
        this.logger.error(`Transaction failed: ${error.message}`, error.stack);
        throw error;
      } finally {
        // End the session
        session.endSession();
      }
    } catch (error) {
      this.logger.error(`Failed to delete company: ${error.message}`, error.stack);
      throw error;
    }
  }
}
