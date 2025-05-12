import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import pLimit from 'p-limit';
import { z } from 'zod';
import { LlmService } from '../../llm/services/llm.service';
import { CompanyBatchContext } from '../interfaces/batch.interfaces';
import { 
  LlmModelConfig, 
  PipelineConfig, 
  AnalyzerConfig 
} from '../interfaces/llm.interfaces';

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
    serviceName: string,
  ) {
    this.logger = new Logger(serviceName);
    
    // Initialize concurrency limiter with default value
    // Will be updated in onModuleInit from config file
    // IMPORTANT: Each pipeline service has its own independent limiter
    // to ensure proper parallelism across different pipelines
    const configLimit = this.configService.get<string | number>('CONCURRENCY_LIMIT', '5');
    const concurrencyLimit = Math.max(1, parseInt(String(configLimit), 10) || 5);
    this.limiter = pLimit(concurrencyLimit);
  }

  onModuleInit() {
    // Load configuration from config.json
    try {
      const configPath = path.resolve(process.cwd(), 'config.json');
      this.logger.log(`Loading LLM configuration from ${configPath}`);
      
      if (fs.existsSync(configPath)) {
        const configFile = fs.readFileSync(configPath, 'utf8');
        this.config = JSON.parse(configFile);
        
        // Update concurrency limiter with pipeline-specific limit
        // This allows different pipelines to have different concurrency settings
        if (this.config.concurrencyLimit) {
          this.limiter.concurrency = this.config.concurrencyLimit;
        }
        
        // Get analyzer config for this service
        this.analyzerConfig = this.getAnalyzerConfig();
        
        // Log the enabled models
        const enabledModels = this.config.llmModels
          .filter(model => model.enabled)
          .map(model => model.id);
        
        this.logger.log(`Initialized service with ${enabledModels.length} enabled models: ${enabledModels.join(', ')}`);
        this.logger.log(`Using ${this.analyzerConfig.primary.provider}/${this.analyzerConfig.primary.model} as primary analyzer with ${this.analyzerConfig.fallback.provider}/${this.analyzerConfig.fallback.model} as fallback`);
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
   * @returns The raw response from the LLM
   */
  protected async executePrompt(modelName: string, prompt: string): Promise<string> {
    this.logger.log(`Executing prompt with ${modelName}: "${prompt.substring(0, 50)}..."`);
    
    // Find the model configuration
    const modelConfig = this.config.llmModels.find(model => model.id === modelName);
    
    if (!modelConfig) {
      throw new Error(`Model configuration for ${modelName} not found`);
    }
    
    // Call the LLM adapter using the LlmService
    const options = {
      temperature: modelConfig.parameters.temperature,
      maxTokens: modelConfig.parameters.maxTokens,
      systemPrompt: modelConfig.parameters.systemPrompt,
      model: modelConfig.model, // Pass the specific model name
    };
    
    // Call the LLM adapter using the LlmService
    const result = await this.llmService.call(modelConfig.provider, prompt, options);
    return result.text;
  }

  /**
   * Get the enabled LLM model IDs from configuration
   * @returns Array of enabled model IDs
   */
  protected getEnabledModels(): string[] {
    return this.config.llmModels
      .filter(model => model.enabled)
      .map(model => model.id);
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
    systemPrompt: string
  ): Promise<T> {
    try {
      // Try with primary analyzer
      this.logger.log(`Using ${this.analyzerConfig.primary.provider}/${this.analyzerConfig.primary.model} for analysis`);
      
      return await this.llmService.getStructuredOutput(
        this.analyzerConfig.primary.provider,
        userPrompt,
        schema,
        {
          systemPrompt,
          model: this.analyzerConfig.primary.model,
          temperature: 0.2
        }
      );
    } catch (error) {
      this.logger.error(`Error analyzing with ${this.analyzerConfig.primary.provider}/${this.analyzerConfig.primary.model}, trying fallback: ${error.message}`);
      
      try {
        // Try with fallback analyzer
        this.logger.log(`Using fallback analyzer ${this.analyzerConfig.fallback.provider}/${this.analyzerConfig.fallback.model}`);
        
        return await this.llmService.getStructuredOutput(
          this.analyzerConfig.fallback.provider,
          userPrompt,
          schema,
          {
            systemPrompt,
            model: this.analyzerConfig.fallback.model,
            temperature: 0.2
          }
        );
      } catch (fallbackError) {
        this.logger.error(`Fallback analyzer also failed: ${fallbackError.message}`);
        throw fallbackError;
      }
    }
  }
}