import { Injectable, Logger } from '@nestjs/common';
import { LlmService } from '../../llm/services/llm.service';
import { LlmProvider } from '../../llm/interfaces/llm-provider.enum';
import { z } from 'zod';

// Schema for structured output from LLM
const CompetitorWebsiteSchema = z.object({
  companyName: z.string(),
  officialWebsite: z.string().optional(), // Remove .url() validation as Perplexity Sonar doesn't support uri format
  confidence: z.enum(['high', 'medium', 'low']),
  reasoning: z.string().optional(),
});

type CompetitorWebsite = z.infer<typeof CompetitorWebsiteSchema>;

@Injectable()
export class CompetitorWebsiteResolverService {
  private readonly logger = new Logger(CompetitorWebsiteResolverService.name);
  
  // Fallback competitor website mappings when Perplexity is not available
  private readonly knownCompetitors = new Map<string, string>([
    ['Orange', 'https://www.orange.fr'],
    ['Bouygues Telecom', 'https://www.bouyguestelecom.fr'],
    ['Free (Iliad)', 'https://www.free.fr'],
    ['Free', 'https://www.free.fr'],
    ['WooCommerce', 'https://woocommerce.com'],
    ['BigCommerce', 'https://www.bigcommerce.com'],
    ['Wix', 'https://www.wix.com'],
    ['Squarespace', 'https://www.squarespace.com'],
    ['Magento', 'https://magento.com'],
    ['Shopify', 'https://www.shopify.com'],
    ['Lufthansa', 'https://www.lufthansa.com'],
    ['British Airways', 'https://www.britishairways.com'],
    ['easyJet', 'https://www.easyjet.com'],
    ['Ryanair', 'https://www.ryanair.com'],
    ['Turkish Airlines', 'https://www.turkishairlines.com'],
    ['Ralph Lauren', 'https://www.ralphlauren.com'],
    ['Tommy Hilfiger', 'https://www.tommy.com'],
    ['Fred Perry', 'https://www.fredperry.com'],
    ['Hugo Boss', 'https://www.hugoboss.com'],
    ['Nike', 'https://www.nike.com'],
    ['Adidas', 'https://www.adidas.com'],
    ['Apple', 'https://www.apple.com'],
    ['Samsung', 'https://www.samsung.com'],
    ['Microsoft', 'https://www.microsoft.com'],
    ['Google', 'https://www.google.com'],
    ['Amazon', 'https://www.amazon.com'],
    ['Netflix', 'https://www.netflix.com'],
    ['Spotify', 'https://www.spotify.com'],
    ['Adobe', 'https://www.adobe.com'],
    ['Salesforce', 'https://www.salesforce.com'],
    ['HubSpot', 'https://www.hubspot.com'],
    ['Stripe', 'https://www.stripe.com'],
    ['PayPal', 'https://www.paypal.com'],
    ['Ecwid', 'https://www.ecwid.com'],
  ]);

  constructor(private readonly llmService: LlmService) {}

  /**
   * Resolve the official website URL for a competitor company
   * @param competitorName The name of the competitor company
   * @param industry Optional industry context to improve accuracy
   * @returns The resolved website URL or undefined if not found
   */
  async resolveCompetitorWebsite(
    competitorName: string,
    industry?: string,
  ): Promise<{ website?: string; confidence: string }> {
    try {
      this.logger.log(`Resolving website for competitor: ${competitorName}`);

      // Check if Perplexity is available
      const perplexityAvailable = this.llmService.isProviderAvailable(LlmProvider.Perplexity);
      
      if (!perplexityAvailable) {
        this.logger.warn('Perplexity not available, using fallback competitor database');
        
        // Try to find the competitor in our known database
        const knownWebsite = this.knownCompetitors.get(competitorName);
        if (knownWebsite) {
          this.logger.log(`Found ${competitorName} in fallback database: ${knownWebsite}`);
          return {
            website: knownWebsite,
            confidence: 'medium'
          };
        }
        
        // Try case-insensitive search
        for (const [name, website] of this.knownCompetitors.entries()) {
          if (name.toLowerCase() === competitorName.toLowerCase()) {
            this.logger.log(`Found ${competitorName} in fallback database (case-insensitive): ${website}`);
            return {
              website,
              confidence: 'medium'
            };
          }
        }
        
        this.logger.log(`${competitorName} not found in fallback database`);
        return { confidence: 'low' };
      }

      const industryContext = industry ? ` in the ${industry} industry` : '';
      const prompt = `Find the official website URL for the company "${competitorName}"${industryContext}. 
      
      Please provide:
      1. The exact official website URL (must start with https:// or http://)
      2. Your confidence level (high/medium/low)
      3. Brief reasoning for your answer
      
      If you cannot find a definitive official website, set officialWebsite to null.`;

      const systemPrompt = `You are a business research assistant specializing in finding official company websites. 
      You use web search to find accurate, up-to-date information about companies. 
      Always verify that the website you provide is the official company website, not a third-party site.`;

      try {
        const result = await this.llmService.getStructuredOutput<CompetitorWebsite>(
          LlmProvider.Perplexity,
          prompt,
          CompetitorWebsiteSchema,
          {
            model: 'sonar',
            systemPrompt,
            temperature: 0.1, // Low temperature for factual accuracy
          },
        );

        if (result.officialWebsite) {
          // Validate URL format manually since Perplexity doesn't support uri format in schema
          try {
            new URL(result.officialWebsite);
          } catch (error) {
            this.logger.warn(
              `Invalid URL format returned for ${competitorName}: ${result.officialWebsite}`,
            );
            return {
              confidence: 'low',
            };
          }
          
          this.logger.log(
            `Found website for ${competitorName}: ${result.officialWebsite} (confidence: ${result.confidence})`,
          );
          return {
            website: result.officialWebsite,
            confidence: result.confidence,
          };
        } else {
          this.logger.log(
            `No website found for ${competitorName} (confidence: ${result.confidence})`,
          );
          return {
            confidence: result.confidence,
          };
        }
      } catch (error) {
        this.logger.warn(
          `Failed to get structured output for ${competitorName}, trying unstructured approach: ${error.message}`,
        );

        // Fallback to unstructured approach
        const response = await this.llmService.call(LlmProvider.Perplexity, prompt, {
          model: 'sonar',
          systemPrompt,
          temperature: 0.1,
        });

        // Extract URL from response text
        const urlRegex = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)/gi;
        const urls = response.text.match(urlRegex);

        if (urls && urls.length > 0) {
          // Take the first URL as it's likely the official website
          const website = urls[0];
          this.logger.log(`Extracted website from unstructured response: ${website}`);
          return {
            website,
            confidence: 'medium',
          };
        }

        return { confidence: 'low' };
      }
    } catch (error) {
      this.logger.error(
        `Failed to resolve website for competitor ${competitorName}: ${error.message}`,
        error.stack,
      );
      return { confidence: 'low' };
    }
  }

  /**
   * Resolve websites for multiple competitors
   * @param competitors Array of competitor names
   * @param industry Optional industry context
   * @returns Map of competitor names to their resolved websites
   */
  async resolveMultipleCompetitorWebsites(
    competitors: string[],
    industry?: string,
  ): Promise<Map<string, { website?: string; confidence: string }>> {
    const results = new Map<string, { website?: string; confidence: string }>();

    // Process competitors in parallel with a limit to avoid rate limiting
    const BATCH_SIZE = 3;
    for (let i = 0; i < competitors.length; i += BATCH_SIZE) {
      const batch = competitors.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map((competitor) =>
        this.resolveCompetitorWebsite(competitor, industry).then((result) => ({
          competitor,
          result,
        })),
      );

      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach(({ competitor, result }) => {
        results.set(competitor, result);
      });

      // Add a small delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < competitors.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return results;
  }
}