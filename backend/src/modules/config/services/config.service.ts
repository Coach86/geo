import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { AvailableModel, LLMModelConfig } from '../interfaces/config.interfaces';

@Injectable()
export class ConfigService {
  private static instance: ConfigService;
  private config: any;

  constructor() {
    if (!ConfigService.instance) {
      this.loadConfig();
      ConfigService.instance = this;
    }
    return ConfigService.instance;
  }

  private loadConfig() {
    const configPath = path.resolve(process.cwd(), 'config.json');
    const configContent = fs.readFileSync(configPath, 'utf8');
    this.config = JSON.parse(configContent);
  }

  getConfig() {
    return this.config;
  }

  getLlmModels() {
    return this.config.llmModels || [];
  }

  getAvailableModels(): AvailableModel[] {
    return (this.config.llmModels || []).map((model: LLMModelConfig): AvailableModel => ({
      id: model.id,
      model: model.model, // Include the actual model identifier used in the database
      name: model.name,
      provider: model.provider,
      enabled: model.enabled || false,
      webAccess: model.webAccess !== undefined ? model.webAccess : true,
      premium: model.premium || false,
    }));
  }

  getAnalyzerConfig() {
    return this.config.analyzerConfig || {};
  }

  getConcurrencyLimit() {
    return this.config.concurrencyLimit || 100;
  }

  getPipelineLimits() {
    return this.config.pipelineLimits || {};
  }

  getRetryConfig() {
    return this.config.retryConfig || {};
  }

  getDefaultModels() {
    return this.config.defaultModels || [];
  }
}