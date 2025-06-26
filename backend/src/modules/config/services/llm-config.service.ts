import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

interface LlmModelConfig {
  id: string;
  provider: string;
  model: string;
  name: string;
  enabled: boolean;
  webAccess?: boolean;
  maxWebSearches?: number;
  parameters?: any;
}

interface ConfigJson {
  llmModels: LlmModelConfig[];
}

@Injectable()
export class LlmConfigService {
  private modelConfigs: Map<string, LlmModelConfig> = new Map();

  constructor() {
    this.loadConfig();
  }

  private loadConfig() {
    try {
      // Load config.json
      const configPath = path.join(process.cwd(), 'config.json');
      const configContent = fs.readFileSync(configPath, 'utf-8');
      const config: ConfigJson = JSON.parse(configContent);

      // Index models by their model ID (not the id field, but the actual model name)
      for (const modelConfig of config.llmModels) {
        this.modelConfigs.set(modelConfig.model, modelConfig);
      }
    } catch (error) {
      console.error('Failed to load config.json for LLM configuration:', error);
    }
  }

  getModelConfig(modelId: string): LlmModelConfig | undefined {
    return this.modelConfigs.get(modelId);
  }

  getMaxWebSearches(modelId: string): number {
    const modelConfig = this.modelConfigs.get(modelId);
    return modelConfig?.maxWebSearches ?? 3; // Default to 3 if not specified
  }

  isWebAccessEnabled(modelId: string): boolean {
    const modelConfig = this.modelConfigs.get(modelId);
    return modelConfig?.webAccess ?? false; // Default to false if not specified
  }
}