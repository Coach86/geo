import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import pLimit from 'p-limit';
import { z } from 'zod';
import { LlmService } from '../../llm/services/llm.service';
import { RawResponseService } from '../../report/services/raw-response.service';
import { CompanyBatchContext } from '../interfaces/batch.interfaces';
import { LlmModelConfig, PipelineConfig, AnalyzerConfig } from '../interfaces/llm.interfaces';

// Default concurrency limits for different pipeline types
const DEFAULT_CONCURRENCY = 100; // Very high concurrency for batch processing
const DEFAULT_PIPELINE_LIMITS = {
  spontaneous: 150, // Higher since these are typically simpler prompts
  sentiment: 100, // Medium complexity analysis
  comparison: 80, // More complex comparisons that may require more resources
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
    protected readonly pipelineType: 'spontaneous' | 'sentiment' | 'comparison',
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
    // Load configuration from config.json
    try {
      const configPath = path.resolve(process.cwd(), 'config.json');
      this.logger.log(`Loading LLM configuration from ${configPath}`);

      if (fs.existsSync(configPath)) {
        const configFile = fs.readFileSync(configPath, 'utf8');
        this.config = JSON.parse(configFile);

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
      } else {
        const errorMsg = `Config file not found at ${configPath}. Application cannot start without a valid configuration.`;
        this.logger.error(errorMsg);
        throw new Error(errorMsg);
      }
    } catch (error) {
      this.logger.error(`Failed to load config.json: ${error.message}`);
      throw error;
    }
  }

  /**
   * Abstract method to run the pipeline
   * @param context Company batch context
   */
  abstract run(context: CompanyBatchContext): Promise<any>;

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
    };

    // Call the LLM adapter using the LlmService
    const result = await this.llmService.call(modelConfig.provider, prompt, options);

    // Store the raw response if batchExecutionId is provided and rawResponseService is available
    if (batchExecutionId && this.rawResponseService) {
      try {
        const resultWithMeta = result as typeof result & {
          annotations?: any[];
          toolUsage?: any[];
          webSearchResults?: any[];
          usedWebSearch?: boolean;
          responseMetadata?: any;
        };

        // Enhanced metadata to include web search details
        const enhancedMetadata = resultWithMeta.responseMetadata || {};

        // Add web search results to metadata if available
        if (resultWithMeta.webSearchResults && resultWithMeta.webSearchResults.length > 0) {
          enhancedMetadata.webSearchResults = resultWithMeta.webSearchResults;
          this.logger.log(
            `Found ${resultWithMeta.webSearchResults.length} web search results to store`,
          );
        }

        await this.rawResponseService.storeRawResponse(
          batchExecutionId,
          modelConfig.provider,
          this.pipelineType === 'sentiment' ? 'direct' : this.pipelineType, // Map 'sentiment' to 'direct' for DB consistency
          promptIndex,
          result.text,
          {
            citations: resultWithMeta.annotations?.length ? resultWithMeta.annotations : undefined,
            toolUsage: resultWithMeta.toolUsage?.length ? resultWithMeta.toolUsage : undefined,
            usedWebSearch: resultWithMeta.usedWebSearch,
            responseMetadata: enhancedMetadata,
          },
        );

        // Log based on what data we're storing
        const logParts: string[] = [];

        if (resultWithMeta.annotations && resultWithMeta.annotations.length > 0) {
          logParts.push(`${resultWithMeta.annotations.length} citations`);
        }

        if (resultWithMeta.toolUsage && resultWithMeta.toolUsage.length > 0) {
          logParts.push(`${resultWithMeta.toolUsage.length} tool usages`);
        }

        if (resultWithMeta.usedWebSearch) {
          logParts.push(`web search usage`);
        }

        if (logParts.length > 0) {
          this.logger.log(
            `Stored raw response with ${logParts.join(', ')} for ${modelConfig.provider} in batch execution ${batchExecutionId}`,
          );
        } else {
          this.logger.log(
            `Stored raw response for ${modelConfig.provider} in batch execution ${batchExecutionId}`,
          );
        }
      } catch (error) {
        this.logger.error(`Failed to store raw response: ${error.message}`);
        // Don't throw the error, just log it and continue
      }
    }

    // Return the full result object, not just the text, so that other methods can access metadata
    // This includes the complete response with all metadata for downstream processing
    return {
      text: result.text,
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
   * @returns The structured output
   */
  protected async getStructuredAnalysis<T>(
    userPrompt: string,
    schema: z.ZodType<T>,
    systemPrompt: string,
  ): Promise<T> {
    try {
      // Try with primary analyzer
      this.logger.log(
        `Using ${this.analyzerConfig.primary.provider}/${this.analyzerConfig.primary.model} for analysis`,
      );

      return await this.llmService.getStructuredOutput(
        this.analyzerConfig.primary.provider,
        userPrompt,
        schema,
        {
          systemPrompt,
          model: this.analyzerConfig.primary.model,
          temperature: 0.2,
        },
      );
    } catch (error) {
      this.logger.error(
        `Error analyzing with ${this.analyzerConfig.primary.provider}/${this.analyzerConfig.primary.model}, trying fallback: ${error.message}`,
      );

      try {
        // Try with fallback analyzer
        this.logger.log(
          `Using fallback analyzer ${this.analyzerConfig.fallback.provider}/${this.analyzerConfig.fallback.model}`,
        );

        return await this.llmService.getStructuredOutput(
          this.analyzerConfig.fallback.provider,
          userPrompt,
          schema,
          {
            systemPrompt,
            model: this.analyzerConfig.fallback.model,
            temperature: 0.2,
          },
        );
      } catch (fallbackError) {
        this.logger.error(`Fallback analyzer also failed: ${fallbackError.message}`);
        throw fallbackError;
      }
    }
  }
}
