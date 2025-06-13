import { ScrapedWebsite } from '../../../utils/url-scraper';

/**
 * Builds a prompt for LLM to analyze and summarize company data
 */
export function buildProjectPrompt({
  url,
  scrapedData,
  language,
}: {
  url: string;
  scrapedData: ScrapedWebsite;
  language: string;
}): string {
  // Check if we have meaningful scraped data to include
  const hasScrapedData =
    scrapedData &&
    (scrapedData.title ||
      scrapedData.description ||
      (scrapedData.keywords && scrapedData.keywords.length > 0) ||
      scrapedData.content);

  let promptWithScrapedData = '';

  if (hasScrapedData) {
    promptWithScrapedData = `
    As additional context, I've also scraped some data from their website that may be helpful:

    Title: ${scrapedData.title || 'Not available'}
    Description: ${scrapedData.description || 'No meta description'}
    Keywords: ${scrapedData.keywords?.join(', ') || 'No keywords'}

    Content sample (${scrapedData.content ? `first ${Math.min(2000, scrapedData.content.length)} chars` : 'not available'}):
    ${scrapedData.content ? scrapedData.content.substring(0, 2000) + '...' : 'No content scraped'}`;
  }

  return `
    ## GOAL:
    Your goal is to generate a comprehensive company project profile for the company at ${url}.

    IMPORTANT: You have the capability to search the web. First, search the web for up-to-date information about this company.
    Look for the company's official website, about pages, LinkedIn, social media, press releases, and other reliable sources.
    ${hasScrapedData ? promptWithScrapedData : ''}

    ## INSTRUCTIONS:
    Based on your web search${hasScrapedData ? ' AND the scraped data above' : ''}, please analyze the company and provide the following in JSON format:
    1. The company's brand name
    2. The industry or sector they operate in
    3. A short description (1-2 sentences)
    4. A full description (2-3 paragraphs)
    5. The company's business objectives and goals (1-2 paragraphs describing their mission, vision, and strategic objectives)
    6. 4-5 key brand attributes of the company

    ## OUTPUT LANGUAGE:
    **Output language MUST BE ${language}**

    Return your analysis as a valid JSON object with the following structure:
  `;
}

/**
 * Builds a prompt for LLM to identify company competitors
 */
export function buildCompetitorsPrompt({
  url,
  scrapedData,
  brandName,
  industry,
  market,
  language,
}: {
  url: string;
  scrapedData: ScrapedWebsite;
  brandName: string;
  industry: string;
  market: string;
  language: string;
}): string {
  // Check if we have meaningful scraped data to include
  const hasScrapedData =
    scrapedData &&
    (scrapedData.title ||
      scrapedData.description ||
      (scrapedData.keywords && scrapedData.keywords.length > 0) ||
      scrapedData.content);

  let promptWithScrapedData = '';

  if (hasScrapedData) {
    promptWithScrapedData = `
    As additional context, I've also scraped some data from their website that may be helpful:

    Title: ${scrapedData.title || 'Not available'}
    Description: ${scrapedData.description || 'No meta description'}
    Keywords: ${scrapedData.keywords?.join(', ') || 'No keywords'}

    Content sample (${scrapedData.content ? `first ${Math.min(1000, scrapedData.content.length)} chars` : 'not available'}):
    ${scrapedData.content ? scrapedData.content.substring(0, 1000) + '...' : 'No content scraped'}`;
  }

  return `
    ## GOAL:
    I need to identify the main competitors for "${brandName}", a company in the ${industry} industry (website: ${url}), whose competitors operate in the ${market} market.

    IMPORTANT: You have the capability to search the web. First, search the web for up-to-date information about this company's competitors.
    Look for industry reports, market analysis, business directories, and comparison sites.
    ${hasScrapedData ? promptWithScrapedData : ''}

    ## INSTRUCTIONS:
    Based on your web search${hasScrapedData ? ' AND the scraped data above' : ''}, please identify 3-5 direct competitors of ${brandName}.
    Return the biggest competitors (per revenues and/or market share, traffic, etc.) in order of importance.
    These should be actual company names that compete in the same market space, not generic categories.

    ## OUTPUT LANGUAGE:
    **Output language MUST BE ${language}**

    ## OUTPUT:
    Return your analysis as a valid JSON object with the following structure:
  `;
}

/**
 * Get system prompt for project generation
 */
export function getProjectSystemPrompt(): string {
  return `
    You are a business analyst specializing in company analysis with access to web search capability.
    Your primary task is to search the web for company information and then analyze it.
    Use the scraped website data as supplementary information only if needed.
  `;
}

/**
 * Get system prompt for competitors generation
 */
export function getCompetitorsSystemPrompt(): string {
  return `
    You are a competitive intelligence analyst specializing in identifying direct competitors of companies.
    You have access to web search capability. Your task is to search the web for competitive information
    and identify actual company names that are direct competitors to the target company.
  `;
}
