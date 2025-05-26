import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GoogleGenerativeAI,
  GenerativeModel,
  Content,
  Tool,
  GroundingMetadata,
  GenerateContentResult
} from '@google/generative-ai';
import { LlmAdapter, LlmCallOptions, LlmResponse } from '../interfaces/llm-adapter.interface';
import { StructuredOutputParser, OutputFixingParser } from 'langchain/output_parsers';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ZodSchema } from 'zod';
import axios from 'axios';

@Injectable()
export class GoogleAdapter implements LlmAdapter {
  private readonly logger = new Logger(GoogleAdapter.name);
  private readonly apiKey: string;
  private googleAI: GoogleGenerativeAI;
  name = 'Google';

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GOOGLE_API_KEY', '');

    if (this.isAvailable()) {
      this.googleAI = new GoogleGenerativeAI(this.apiKey);
    }
  }

  isAvailable(): boolean {
    // Only consider available if the API key is provided and not empty
    return !!this.apiKey && this.apiKey.length > 0;
  }

  /**
   * Attempts to resolve a Vertex AI Search redirect URL to its actual destination
   * @param redirectUrl The vertexaisearch.cloud.google.com redirect URL
   * @param title The title/domain from the grounding chunk
   * @returns The resolved URL or a URL constructed from the title
   */
  private async resolveRedirectUrl(redirectUrl: string, title?: string): Promise<string> {
    try {
      // Only attempt to resolve if it's a Vertex AI Search redirect URL
      if (!redirectUrl.includes('vertexaisearch.cloud.google.com/grounding-api-redirect/')) {
        return redirectUrl;
      }

      // Make a HEAD request to follow redirects without downloading content
      const response = await axios.head(redirectUrl, {
        maxRedirects: 5,
        validateStatus: (status) => status >= 200 && status < 400,
        timeout: 5000, // 5 second timeout
      });

      // In Node.js, axios stores the final URL in response.request.res.responseUrl
      const finalUrl = response.request.res?.responseUrl || response.config.url;

      if (finalUrl && finalUrl !== redirectUrl && !finalUrl.includes('vertexaisearch.cloud.google.com')) {
        this.logger.debug(`Resolved redirect URL: ${redirectUrl} -> ${finalUrl}`);
        return finalUrl;
      }

      // If we still have a vertexai URL, try to construct from title
      if (title) {
        // Extract domain from title if possible
        const domainMatch = title.match(/(?:https?:\/\/)?(?:www\.)?([^\s\/]+\.[^\s\/]+)/i);
        if (domainMatch) {
          const constructedUrl = `https://${domainMatch[1]}`;
          this.logger.debug(`Constructed URL from title: ${title} -> ${constructedUrl}`);
          return constructedUrl;
        }

        // If title looks like a domain, use it
        if (title.includes('.') && !title.includes(' ')) {
          const constructedUrl = title.startsWith('http') ? title : `https://${title}`;
          this.logger.debug(`Using title as URL: ${constructedUrl}`);
          return constructedUrl;
        }
      }

      // As last resort, if we have a title but couldn't extract domain, return empty
      // This ensures we never return vertexaisearch URLs
      this.logger.debug(`Could not resolve redirect URL and no valid domain in title: ${redirectUrl}`);
      return '';
    } catch (error) {
      // If resolution fails and we have a title, try to use it
      this.logger.debug(`Failed to resolve redirect URL ${redirectUrl}: ${error.message}`);

      if (title) {
        // Try to extract domain from title
        const domainMatch = title.match(/(?:https?:\/\/)?(?:www\.)?([^\s\/]+\.[^\s\/]+)/i);
        if (domainMatch) {
          return `https://${domainMatch[1]}`;
        }

        // If title looks like a domain, use it
        if (title.includes('.') && !title.includes(' ')) {
          return title.startsWith('http') ? title : `https://${title}`;
        }
      }

      // Never return vertexaisearch URLs
      return '';
    }
  }

  async call(prompt: string, options?: LlmCallOptions): Promise<LlmResponse> {
    if (!this.isAvailable()) {
      throw new Error('Google API key not configured');
    }

    try {
      if (!options?.model) {
        throw new Error("Model not specified. Please specify a model using the 'model' option.")
      }
      const modelName = options?.model;

      // Create tools array with Google Search
      const tools: any[] = [{
        google_search: {},
      }];

      // Get the model with grounding configuration
      const model = this.googleAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: options?.temperature ?? 0.7,
          maxOutputTokens: options?.maxTokens ?? 1000,
          topP: options?.topP,
        },
        tools,
      });

      // Build the prompt with system instruction if provided
      let finalPrompt = prompt;
      if (options?.systemPrompt) {
        finalPrompt = `System: ${options.systemPrompt}\n\nUser: ${prompt}`;
      }

      // Generate content
      const result: GenerateContentResult = await model.generateContent(finalPrompt);
      const response = result.response;
      const text = response.text();

      // Extract grounding metadata from the first candidate
      const candidate = response.candidates?.[0];
      const groundingMetadata = candidate?.groundingMetadata;
      const annotations: Array<{ url: string; title?: string }> = [];
      let usedWebSearch = false;
      const toolUsage: any[] = [];

      // Process grounding chunks if available
      if (groundingMetadata?.groundingChunks && groundingMetadata.groundingChunks.length > 0) {
        usedWebSearch = true;
        const processedUrls = new Set<string>();

        // Process each grounding chunk and resolve redirect URLs
        for (const chunk of groundingMetadata.groundingChunks) {
          if (chunk.web?.uri && !processedUrls.has(chunk.web.uri)) {
            processedUrls.add(chunk.web.uri);

            // Attempt to resolve redirect URLs, passing title for fallback
            const resolvedUrl = await this.resolveRedirectUrl(chunk.web.uri, chunk.web.title);

            // Only add annotation if we got a valid URL
            if (resolvedUrl) {
              annotations.push({
                url: resolvedUrl,
                title: chunk.web.title,
              });
            }
          }
        }

        // Add tool usage information
        // First check webSearchQueries (often empty)
        if (groundingMetadata.webSearchQueries && groundingMetadata.webSearchQueries.length > 0) {
          toolUsage.push({
            type: 'web_search',
            input: {
              query: groundingMetadata.webSearchQueries.join(', '),
            },
            execution: {
              resultCount: groundingMetadata.groundingChunks.length,
            },
          });
        } else if (groundingMetadata.searchEntryPoint?.sdkBlob) {
          // Try to extract search queries from searchEntryPoint.sdkBlob
          try {
            const decodedBlob = Buffer.from(groundingMetadata.searchEntryPoint.sdkBlob, 'base64').toString('utf-8');
            const searchData = JSON.parse(decodedBlob);

            // Extract search queries from the decoded data
            let queries: string[] = [];
            if (Array.isArray(searchData)) {
              // Assuming format is array of [searchTerm, searchUrl] tuples
              queries = searchData.map(item => Array.isArray(item) ? item[0] : '').filter(Boolean);
            }

            if (queries.length > 0) {
              toolUsage.push({
                type: 'web_search',
                input: {
                  query: queries.join(', '),
                },
                execution: {
                  resultCount: groundingMetadata.groundingChunks.length,
                  source: 'searchEntryPoint.sdkBlob',
                },
              });
            } else {
              // Fallback if we can't parse the blob
              toolUsage.push({
                type: 'web_search',
                input: {
                  query: '[Search queries extracted from blob but format unknown]',
                },
                execution: {
                  resultCount: groundingMetadata.groundingChunks.length,
                  note: 'Found searchEntryPoint.sdkBlob but could not parse search queries',
                },
              });
            }
          } catch (error) {
            // If decoding fails, still record web search usage
            toolUsage.push({
              type: 'web_search',
              input: {
                query: '[Search queries in sdkBlob but decoding failed]',
              },
              execution: {
                resultCount: groundingMetadata.groundingChunks.length,
                note: `Failed to decode searchEntryPoint.sdkBlob: ${error.message}`,
              },
            });
          }
        } else if (usedWebSearch) {
          // If web search was used but no queries found anywhere
          toolUsage.push({
            type: 'web_search',
            input: {
              query: '[Search queries not provided by API]',
            },
            execution: {
              resultCount: groundingMetadata.groundingChunks.length,
              note: 'Google API did not populate webSearchQueries or searchEntryPoint.sdkBlob',
            },
          });
        }
      }

      // Get usage metadata
      const usageMetadata = response.usageMetadata;

      // Create a map of original URLs to resolved URLs for webSearchResults
      const urlMap = new Map<string, string>();
      annotations.forEach(annotation => {
        // Find the original URL from grounding chunks
        const originalChunk = groundingMetadata?.groundingChunks?.find(
          chunk => chunk.web?.uri && (annotation.url === chunk.web.uri || annotation.url.includes(chunk.web.uri))
        );
        if (originalChunk?.web?.uri) {
          urlMap.set(originalChunk.web.uri, annotation.url);
        }
      });

      return {
        text,
        modelVersion: modelName,
        tokenUsage: {
          input: usageMetadata?.promptTokenCount || 0,
          output: usageMetadata?.candidatesTokenCount || 0,
          total: usageMetadata?.totalTokenCount || 0,
        },
        annotations: annotations.length > 0 ? annotations : undefined,
        usedWebSearch,
        toolUsage: toolUsage.length > 0 ? toolUsage : undefined,
        responseMetadata: {
          groundingMetadata,
          webSearchResults: groundingMetadata?.groundingChunks?.map(chunk => {
            const mappedUrl = urlMap.get(chunk.web?.uri || '') || chunk.web?.uri || '';
            // Filter out empty URLs or vertexaisearch URLs
            if (!mappedUrl || mappedUrl.includes('vertexaisearch.cloud.google.com')) {
              return null;
            }
            return {
              url: mappedUrl,
              title: chunk.web?.title,
              age: undefined, // Google doesn't provide age information
            };
          }).filter(Boolean),
        },
      };
    } catch (error) {
      this.logger.error(`Error calling Google API: ${error.message}`);
      throw new Error(`Failed to call Google API: ${error.message}`);
    }
  }

  /**
   * Get structured output using a schema
   * @param prompt The prompt to send
   * @param schema The zod schema to validate against
   * @param options Additional options for the call
   * @returns Structured output conforming to the schema
   */
  async getStructuredOutput<T>(
    prompt: string,
    schema: ZodSchema<T>,
    options?: LlmCallOptions,
  ): Promise<T> {
    if (!this.isAvailable()) {
      throw new Error('Google API not available for structured output');
    }

    try {
      // For structured output, we still use LangChain as Google's native SDK doesn't have built-in structured output support
      const modelName = options?.model || 'gemini-1.5-pro';

      // Configure Google client with updated options
      const client = new ChatGoogleGenerativeAI({
        apiKey: this.apiKey,
        model: modelName,
        temperature: options?.temperature ?? 0.2, // Lower temperature for structured output
        maxOutputTokens: options?.maxTokens ?? 1000,
        topP: options?.topP ?? 1,
      });

      // Create a parser based on the schema
      const parser = StructuredOutputParser.fromZodSchema(schema);

      // Create a fixing parser for error recovery
      const fixingParser = OutputFixingParser.fromLLM(client, parser);

      // Get format instructions
      const formatInstructions = parser.getFormatInstructions();

      // Create messages array
      const messages = [];

      // Add system message if provided
      if (options?.systemPrompt) {
        messages.push(new SystemMessage(options.systemPrompt));
      } else {
        // Default system message for structured output
        messages.push(
          new SystemMessage(
            'You are a helpful assistant that always responds with structured data.',
          ),
        );
      }

      // Add user message with format instructions
      const userPrompt = `${prompt}\n\n${formatInstructions}\n\nYour response:`;
      messages.push(new HumanMessage(userPrompt));

      // Call the model
      const result = await client.call(messages);
      const text = result.content.toString();

      // Try to parse the response
      try {
        return await parser.parse(text);
      } catch (error) {
        // If parsing fails, try to fix the output
        this.logger.warn(`Failed to parse structured output, attempting to fix: ${error.message}`);
        return await fixingParser.parse(text);
      }
    } catch (error) {
      this.logger.error(`Error getting structured output: ${error.message}`);
      throw new Error(`Failed to get structured output: ${error.message}`);
    }
  }
}
