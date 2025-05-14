import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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

@Module({
  imports: [ConfigModule],
  controllers: [LlmController],
  providers: [
    LlmService,
    {
      provide: 'LLM_ADAPTERS',
      useFactory: (
        openAi: OpenAiAdapter,
        anthropic: AnthropicAdapter,
        google: GoogleAdapter,
        deepSeek: DeepSeekAdapter,
        grok: GrokAdapter,
        llama: LlamaAdapter,
        mistral: MistralAdapter,
        perplexity: PerplexityAdapter,
        openAiLangChain: OpenAILangChainAdapter,
        anthropicLangChain: AnthropicLangChainAdapter,
      ) => ({
        openAi,
        anthropic,
        google,
        deepSeek,
        grok,
        llama,
        mistral,
        perplexity,
        openAiLangChain,
        anthropicLangChain,
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