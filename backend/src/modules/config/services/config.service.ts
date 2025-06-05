import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

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

  getAvailableModels() {
    return (this.config.llmModels || []).map((model: any) => ({
      id: model.id,
      name: model.name,
      provider: model.provider,
      enabled: model.enabled || false,
      webAccess: model.webAccess !== undefined ? model.webAccess : true,
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