import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import pLimit from 'p-limit';
import { z } from 'zod';
import { LlmService } from '../../llm/services/llm.service';
import { RawResponseService } from './raw-response.service';
import { ProjectBatchContext } from '../interfaces/batch.interfaces';
import { LlmModelConfig, PipelineConfig, AnalyzerConfig, PipelineType, PromptType } from '../interfaces/llm.interfaces';
import { ConfigService as AppConfigService } from '../../config/services/config.service';

// Default concurrency limits for different pipeline types
const DEFAULT_CONCURRENCY = 100; // Very high concurrency for batch processing
const DEFAULT_PIPELINE_LIMITS = {
  visibility: 150, // Higher since these are typically simpler prompts
  sentiment: 100, // Medium complexity analysis
  competition: 80, // More complex comparisons that may require more resources
  alignment: 100, // Medium complexity analysis similar to sentiment
};

/**
 * Base class for pipeline services that handles common functionality
 */
@Injectable()
export abstract class BasePipelineService implements OnModuleInit {
  protected readonly logger: Logger;
  protected readonly limiter: ReturnType<typeof pLimit>;
  protected config: PipelineConfig;
  protected analyzerConfig: AnalyzerConfig;

  constructor(
    protected readonly configService: ConfigService,
    protected readonly llmService: LlmService,
    protected readonly serviceName: string,
    protected readonly pipelineType: PipelineType,
    protected readonly rawResponseService?: RawResponseService,
  ) {
    this.logger = new Logger(serviceName);

    // Initialize concurrency limiter with higher default values
    // Will be updated in onModuleInit from config file
    // IMPORTANT: Each pipeline service has its own independent limiter
    // to ensure proper parallelism across different pipelines
    const configLimit = this.configService.get<string | number>(
      'CONCURRENCY_LIMIT',
      String(DEFAULT_CONCURRENCY),
    );
    const defaultPipelineLimit = DEFAULT_PIPELINE_LIMITS[pipelineType] || DEFAULT_CONCURRENCY;
    const concurrencyLimit = Math.max(1, parseInt(String(configLimit), 10) || defaultPipelineLimit);
    this.limiter = pLimit(concurrencyLimit);

    this.logger.log(
      `Initializing ${pipelineType} pipeline with initial concurrency limit of ${concurrencyLimit}`,
    );
  }

  onModuleInit() {
    // Load configuration from our ConfigService
    try {
      this.logger.log(`Loading LLM configuration from ConfigService`);

      // Create a new instance of AppConfigService to get the cached config
      const appConfigService = new AppConfigService();
      this.config = appConfigService.getConfig();

      // Update concurrency limiter with pipeline-specific limit if available
      // This allows different pipelines to have different concurrency settings
      // Default to the higher built-in defaults if not specified
      const globalLimit = this.config.concurrencyLimit || DEFAULT_CONCURRENCY;
      let pipelineLimit = globalLimit;

      if (
        this.config.pipelineLimits &&
        this.config.pipelineLimits[this.pipelineType] !== undefined
      ) {
        const specificLimit = this.config.pipelineLimits[this.pipelineType];
        if (specificLimit !== undefined) {
          pipelineLimit = specificLimit;
          this.logger.log(
            `Using pipeline-specific concurrency limit: ${pipelineLimit} for ${this.pipelineType}`,
          );
        }
      } else {
        // Use the pipeline type's default if no specific config
        pipelineLimit = DEFAULT_PIPELINE_LIMITS[this.pipelineType] || globalLimit;
        this.logger.log(
          `Using default pipeline limit: ${pipelineLimit} for ${this.pipelineType}`,
        );
      }

      // Set the concurrency limit (minimum of 1)
      this.limiter.concurrency = Math.max(1, pipelineLimit);

      // Get analyzer config for this service
      this.analyzerConfig = this.getAnalyzerConfig();

      // Log the enabled models
      const enabledModels = this.config.llmModels
        .filter((model) => model.enabled)
        .map((model) => model.id);

      this.logger.log(
        `Initialized service with ${enabledModels.length} enabled models: ${enabledModels.join(', ')}`,
      );
      this.logger.log(
        `Using ${this.analyzerConfig.primary.provider}/${this.analyzerConfig.primary.model} as primary analyzer with ${this.analyzerConfig.fallback.provider}/${this.analyzerConfig.fallback.model} as fallback`,
      );
    } catch (error) {
      this.logger.error(`Failed to load config: ${error.message}`);
      throw error;
    }
  }

  /**
   * Abstract method to run the pipeline
   * @param context Company batch context
   */
  abstract run(context: ProjectBatchContext): Promise<any>;

  /**
   * Get the appropriate analyzer configuration based on pipeline type
   */
  protected abstract getAnalyzerConfig(): AnalyzerConfig;

  /**
   * Execute a prompt using the specified LLM model
   * @param modelName The name of the model to use
   * @param prompt The prompt to execute
   * @param batchExecutionId Optional batch execution ID to store the raw response
   * @param promptIndex Optional prompt index within its type
   * @returns The raw response from the LLM
   */
  protected async executePrompt(
    modelConfig: LlmModelConfig,
    prompt: string,
    batchExecutionId?: string,
    promptIndex: number = 0,
  ): Promise<any> {
    this.logger.log(
      `Executing prompt with ${modelConfig.provider}/${modelConfig.model}: "${prompt.substring(0, 50)}..."`,
    );

    // Call the LLM adapter using the LlmService
    const options = {
      temperature: modelConfig.parameters.temperature,
      maxTokens: modelConfig.parameters.maxTokens,
      systemPrompt: modelConfig.parameters.systemPrompt,
      model: modelConfig.model, // Pass the specific model name
      webAccess: modelConfig.webAccess, // Pass the web access flag for this model
    };

    // Call the LLM adapter using the LlmService
    const result = await this.llmService.call(modelConfig.provider, prompt, options);

    // Don't store the raw response here - we'll store it once in getStructuredAnalysis
    // when we have both the LLM response and the analyzer response

    // Return the full result object, not just the text, so that other methods can access metadata
    // This includes the complete response with all metadata for downstream processing
    return {
      text: result.text,
      batchExecutionId, // Pass along the batchExecutionId for analyzer storage
      metadata: {
        annotations: result.annotations || [],
        toolUsage: result.toolUsage || [],
        usedWebSearch: result.usedWebSearch || false,
        responseMetadata: result.responseMetadata || {},
      },
      // Include the original result object for accessing provider-specific metadata
      // in a standardized way across all providers
      llmResponseObj: result,
    };
  }

  /**
   * Get the enabled LLM model IDs from configuration
   * @returns Array of enabled model IDs
   */
  protected getEnabledModels(): LlmModelConfig[] {
    return this.config.llmModels.filter((model) => model.enabled);
  }

  /**
   * A utility method to handle structured output analysis with fallback
   * @param userPrompt The prompt to send to the LLM
   * @param schema The Zod schema for validation
   * @param systemPrompt Optional system prompt
   * @param batchExecutionId Optional batch execution ID for storing the analyzer prompt and response
   * @param promptIndex Optional prompt index for associating with the original prompt
   * @param promptType Optional prompt type for storing in the database
   * @param originalPrompt Optional original prompt to store with the analyzer data
   * @param originalLlmResponse Optional original LLM response to store with the analyzer data
   * @param originalLlmModel Optional original LLM model to store with the analyzer data
   * @param modelIdentifier Optional custom identifier for the model to ensure uniqueness (e.g., for competitors)
   * @returns The structured output
   */
  protected async getStructuredAnalysis<T>(
    userPrompt: string,
    schema: z.ZodType<T>,
    systemPrompt: string,
    batchExecutionId?: string,
    promptIndex: number = 0,
    promptType?: PromptType,
    originalPrompt?: string,
    originalLlmResponse?: string,
    originalLlmModel?: string,
    modelIdentifier?: string, // Added parameter for custom model identifier
  ): Promise<T> {
    let structuredResult: T;
    let analyzerResponseText: string;
    
    try {
      // Try with primary analyzer
      this.logger.log(
        `Using ${this.analyzerConfig.primary.provider}/${this.analyzerConfig.primary.model} for analysis`,
      );

      // Get the structured output
      structuredResult = await this.llmService.getStructuredOutput(
        this.analyzerConfig.primary.provider,
        userPrompt,
        schema,
        {
          systemPrompt,
          model: this.analyzerConfig.primary.model,
          temperature: 0.2,
        },
      );
      
      // If successful, store the analyzer prompt and response if rawResponseService is available
      analyzerResponseText = JSON.stringify(structuredResult);
    } catch (error) {
      this.logger.error(
        `Error analyzing with ${this.analyzerConfig.primary.provider}/${this.analyzerConfig.primary.model}, trying fallback: ${error.message}`,
      );

      try {
        // Try with fallback analyzer
        this.logger.log(
          `Using fallback analyzer ${this.analyzerConfig.fallback.provider}/${this.analyzerConfig.fallback.model}`,
        );

        // Get the structured output from the fallback analyzer
        structuredResult = await this.llmService.getStructuredOutput(
          this.analyzerConfig.fallback.provider,
          userPrompt,
          schema,
          {
            systemPrompt,
            model: this.analyzerConfig.fallback.model,
            temperature: 0.2,
          },
        );
        
        // If successful, store the analyzer prompt and response
        analyzerResponseText = JSON.stringify(structuredResult);
      } catch (fallbackError) {
        this.logger.error(`Fallback analyzer also failed: ${fallbackError.message}`);
        throw fallbackError;
      }
    }
    
    // Now store the COMPLETE raw response with both LLM and analyzer data
    if (batchExecutionId && this.rawResponseService && promptType && originalLlmModel) {
      try {
        // Determine which analyzer model was used (primary or fallback)
        const analyzerModel = this.analyzerConfig.primary.model;
        
        // Validate promptType
        if (!promptType) {
          throw new Error(`No valid promptType provided for response storage. Pipeline: ${this.pipelineType}`);
        }
        
        // Create a modelIdentifier to ensure each model gets its own raw response entry
        // Use provided modelIdentifier if available, otherwise just use originalLlmModel
        const uniqueModelId = modelIdentifier || `${originalLlmModel}`;
        
        // Store all data in a single document - this is now the ONLY place we store raw responses
        await this.rawResponseService.storeRawResponse(
          batchExecutionId,
          promptType,
          promptIndex,
          originalPrompt || "Original prompt not available",
          originalLlmResponse || "Original LLM response not available",
          originalLlmModel || "Unknown",
          userPrompt, // The analyzer prompt
          structuredResult, // The structured analyzer response
          analyzerModel, // The model used for analysis
          uniqueModelId // Add model identifier to ensure uniqueness
        );
        
        this.logger.log(
          `Stored complete raw response (original + analyzer) for ${promptType} prompt #${promptIndex} in batch execution ${batchExecutionId}`,
        );
      } catch (error) {
        this.logger.error(`Failed to store raw response: ${error.message}`);
        // Don't throw the error, just log it and continue
      }
    }
    
    return structuredResult;
  }
}
