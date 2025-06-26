import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { ConfigModule } from '../config/config.module';
import { LlmService } from './services/llm.service';
import { LlmController } from './controllers/llm.controller';
import { OpenAiAdapter } from './adapters/openai.adapter';
import { AnthropicAdapter } from './adapters/anthropic.adapter';
import { GoogleAdapter } from './adapters/google.adapter';
import { DeepSeekAdapter } from './adapters/deepseek.adapter';
import { GrokAdapter } from './adapters/grok.adapter';
import { LlamaAdapter } from './adapters/llama.adapter';
import { MistralAdapter } from './adapters/mistral.adapter';
import { PerplexityAdapter } from './adapters/perplexity.adapter';
import { OpenAILangChainAdapter } from './adapters/openai-langchain.adapter';
import { AnthropicLangChainAdapter } from './adapters/anthropic-langchain.adapter';
import { LlmProvider } from './interfaces/llm-provider.enum';

/*
  Anthropic = 'Anthropic',
  OpenAI = 'OpenAI',
  Perplexity = 'Perplexity',
  Google = 'Google',
  Mistral = 'Mistral',
  Llama = 'Llama',
  Grok = 'Grok',
  DeepSeek = 'DeepSeek',
  OpenAILangChain = 'OpenAILangChain',
  AnthropicLangChain = 'AnthropicLangChain',
*/
@Module({
  imports: [NestConfigModule, ConfigModule],
  controllers: [LlmController],
  providers: [
    LlmService,
    {
      provide: 'LLM_ADAPTERS',
      useFactory: (
        OpenAI: OpenAiAdapter,
        Anthropic: AnthropicAdapter,
        Google: GoogleAdapter,
        DeepSeek: DeepSeekAdapter,
        Grok: GrokAdapter,
        Llama: LlamaAdapter,
        Mistral: MistralAdapter,
        Perplexity: PerplexityAdapter,
        OpenAILangChain: OpenAILangChainAdapter,
        AnthropicLangChain: AnthropicLangChainAdapter,
      ) => ({
        OpenAI,
        Anthropic,
        Google,
        DeepSeek,
        Grok,
        Llama,
        Mistral,
        Perplexity,
        OpenAILangChain,
        AnthropicLangChain,
      }),
      inject: [
        OpenAiAdapter,
        AnthropicAdapter,
        GoogleAdapter,
        DeepSeekAdapter,
        GrokAdapter,
        LlamaAdapter,
        MistralAdapter,
        PerplexityAdapter,
        OpenAILangChainAdapter,
        AnthropicLangChainAdapter,
      ],
    },
    OpenAiAdapter,
    AnthropicAdapter,
    GoogleAdapter,
    DeepSeekAdapter,
    GrokAdapter,
    LlamaAdapter,
    MistralAdapter,
    PerplexityAdapter,
    OpenAILangChainAdapter,
    AnthropicLangChainAdapter,
  ],
  exports: [LlmService],
})
export class LlmModule {}
