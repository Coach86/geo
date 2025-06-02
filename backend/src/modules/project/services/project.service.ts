import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { v4 as uuidv4 } from 'uuid';
import { ScrapedWebsite, fetchAndScrape } from '../../../utils/url-scraper';
import { Project } from '../entities/project.entity';
import { CreateProjectDto } from '../dto/create-project.dto';
import { ProjectCreatedEvent } from '../events/project-created.event';
import { LlmService } from '../../llm/services/llm.service';
import {
  LlmSummaryResult,
  CompetitorsSummaryResult,
  projectSummarySchema,
  competitorsSummarySchema,
  DEFAULT_PROJECT_LLM_PROVIDER,
  DEFAULT_COMPETITORS_LLM_PROVIDER,
} from '../interfaces/project.llm';
import {
  buildProjectPrompt,
  buildCompetitorsPrompt,
  getProjectSystemPrompt,
  getCompetitorsSystemPrompt,
} from '../prompts/project.prompt';
import { ProjectRepository } from '../repositories/project.repository';

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
export class ProjectService {
  private readonly logger = new Logger(ProjectService.name);

  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly llmService: LlmService,
  ) {}

  async create(createProjectDto: CreateProjectDto): Promise<Project> {
    try {
      let project: Project;

      if (createProjectDto.url) {
        let scrapedData: ScrapedWebsite | undefined;

        try {
          // Try all URL variants for scraping
          scrapedData = await tryFetchAndScrapeWithVariants(createProjectDto.url);
          if (scrapedData) {
            this.logger.log(`Successfully scraped data from ${scrapedData.url}`);
          } else {
            throw new Error('All URL variants failed');
          }
        } catch (scrapingError) {
          // Log the error but continue without scraped data
          this.logger.warn(
            `Failed to scrape URL ${createProjectDto.url}: ${scrapingError.message}`,
          );
          // Create empty ScrapedWebsite object
          scrapedData = {
            title: '',
            description: '',
            keywords: [],
            content: '',
            url: createProjectDto.url,
          };
        }

        // Check if market is provided in the data
        if (!createProjectDto.data || !createProjectDto.data.market) {
          throw new BadRequestException('Market is required');
        }

        // Summarize with LLM using web search + scraped data
        project = await this.generateProjectWithCompetitors(
          scrapedData,
          createProjectDto.url,
          createProjectDto.data.market,
          createProjectDto.data.language || 'en',
          createProjectDto.userId,
        );
      } else if (createProjectDto.data) {
        // Check if market is provided in the data
        if (!createProjectDto.data.market) {
          throw new BadRequestException('Market is required');
        }

        // Create from provided data
        project = {
          projectId: uuidv4(),
          brandName: createProjectDto.data.brandName || 'Unknown',
          website: createProjectDto.data.website || '',
          industry: createProjectDto.data.industry || 'Unknown',
          market: createProjectDto.data.market,
          shortDescription: createProjectDto.data.shortDescription || '',
          fullDescription: createProjectDto.data.fullDescription || '',
          keyBrandAttributes: createProjectDto.data.keyBrandAttributes || [],
          competitors: createProjectDto.data.competitors || [],
          language: createProjectDto.data.language || 'en',
          userId: createProjectDto.userId,
          updatedAt: new Date(),
        };
      } else {
        throw new BadRequestException('Either URL or data must be provided');
      }

      // Prepare database data object
      const dbData: any = {
        id: project.projectId, // Using the correct field name
        brandName: project.brandName,
        website: project.website,
        industry: project.industry,
        market: project.market,
        shortDescription: project.shortDescription,
        fullDescription: project.fullDescription,
        keyBrandAttributes: project.keyBrandAttributes,
        competitors: project.competitors,
        language: project.language,
        data: {},
      };

      // Add userId if provided
      if (createProjectDto.userId) {
        // Check if user exists
        const user = await this.projectRepository.findUserById(createProjectDto.userId);

        if (!user) {
          throw new NotFoundException(`User with ID ${createProjectDto.userId} not found`);
        }

        // Add userId to the database data
        dbData.userId = createProjectDto.userId;
      }

      // Store to database
      const saved = await this.projectRepository.save(dbData);

      // Emit project created event
      this.eventEmitter.emit('project.created', new ProjectCreatedEvent(saved.id));

      return this.projectRepository.mapToEntity(saved);
    } catch (error) {
      this.logger.error(`Failed to create project: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findById(projectId: string): Promise<Project> {
    const project = await this.projectRepository.findById(projectId);
    return this.projectRepository.mapToEntity(project);
  }

  async findAll(userId?: string): Promise<Project[]> {
    const projects = await this.projectRepository.findAll(userId);
    return projects.map((project) => this.projectRepository.mapToEntity(project));
  }

  async update(
    projectId: string,
    updateData: { keyBrandAttributes?: string[]; competitors?: string[] },
  ): Promise<Project> {
    try {
      // First check if the project exists
      await this.projectRepository.findById(projectId);

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
        return this.findById(projectId);
      }

      // Update the project
      const updatedProject = await this.projectRepository.update(projectId, updateObj);
      return this.projectRepository.mapToEntity(updatedProject);
    } catch (error) {
      this.logger.error(`Failed to update project: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Analyze URL and return project data without saving to database
   */
  async analyzeFromUrl(
    url: string,
    market: string,
    language: string = 'en',
    userId: string,
  ): Promise<Project> {
    try {
      let scrapedData: ScrapedWebsite | undefined;

      try {
        // Try all URL variants for scraping
        scrapedData = await tryFetchAndScrapeWithVariants(url);
        if (scrapedData) {
          this.logger.log(`Successfully scraped data from ${scrapedData.url}`);
        } else {
          throw new Error('All URL variants failed');
        }
      } catch (scrapingError) {
        // Log the error but continue without scraped data
        this.logger.warn(
          `Failed to scrape URL ${url}: ${scrapingError.message}`,
        );
        // Create empty ScrapedWebsite object
        scrapedData = {
          title: '',
          description: '',
          keywords: [],
          content: '',
          url: url,
        };
      }

      // Generate project data without saving
      const project = await this.generateProjectWithCompetitors(
        scrapedData,
        url,
        market,
        language,
        userId,
      );

      return project;
    } catch (error) {
      this.logger.error(`Failed to analyze URL ${url}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Generate project with competitors using two separate LLM calls
   */
  private async generateProjectWithCompetitors(
    scrapedData: ScrapedWebsite,
    url: string,
    market: string,
    language: string,
    userId: string,
  ): Promise<Project> {
    try {
      // Step 1: Generate the main project using the default provider
      const mainProject = await this.generateMainProject(scrapedData, url, language);

      // Step 2: Generate competitors using Perplexity
      const competitors = await this.generateCompetitors(
        scrapedData,
        url,
        mainProject.brandName,
        mainProject.industry,
        market,
        language,
      );

      // Step 3: Combine results into a complete project
      return {
        projectId: uuidv4(),
        brandName: mainProject.brandName,
        website: url,
        industry: mainProject.industry,
        market: market,
        shortDescription: mainProject.shortDescription,
        fullDescription: mainProject.fullDescription,
        keyBrandAttributes: mainProject.keyBrandAttributes,
        competitors: competitors,
        language: language,
        userId: userId,
        updatedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(
        `Failed to generate project with competitors: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Generate the main project fields using the default LLM provider
   */
  private async generateMainProject(
    scrapedData: ScrapedWebsite,
    url: string,
    language: string,
  ): Promise<LlmSummaryResult> {
    try {
      // Build prompt for the main project
      const prompt = buildProjectPrompt({ url, scrapedData, language });
      const systemPrompt = getProjectSystemPrompt();

      // Call the LLM with structured output
      const result = await this.llmService.getStructuredOutput(
        DEFAULT_PROJECT_LLM_PROVIDER,
        prompt,
        projectSummarySchema,
        { systemPrompt },
      );

      this.logger.log(
        `Generated main project for ${url} with ${DEFAULT_PROJECT_LLM_PROVIDER}`,
      );
      return result;
    } catch (error) {
      this.logger.error(`Failed to generate main project: ${error.message}`, error.stack);
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
   * Delete a project and all related data
   */
  async remove(projectId: string): Promise<void> {
    try {
      // Check if the project exists
      await this.projectRepository.findById(projectId);

      // Delete the project itself
      await this.projectRepository.remove(projectId);
      this.logger.log(`Successfully deleted project with ID ${projectId}`);

      // Emit project deleted event
      this.eventEmitter.emit('project.deleted', { projectId });
    } catch (error) {
      this.logger.error(`Failed to delete project: ${error.message}`, error.stack);
      throw error;
    }
  }
}
