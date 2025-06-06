import axios from 'axios';
import * as cheerio from 'cheerio';

export interface ScrapedWebsite {
  title: string;
  description: string;
  keywords: string[];
  content: string;
  html?: string;
  url: string;
  metaDescription?: string;
  metaKeywords?: string;
}

export async function fetchAndScrape(url: string): Promise<ScrapedWebsite> {
  // Fetch the URL content
  const response = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
    },
    timeout: 30000, // 30 seconds timeout
    maxRedirects: 5,
  });

  const html = response.data;
  const $ = cheerio.load(html);

  // Remove script and style elements
  $('script').remove();
  $('style').remove();
  $('noscript').remove();
  
  // Extract metadata
  const title = $('title').text().trim() || $('h1').first().text().trim() || '';
  const metaDescription = $('meta[name="description"]').attr('content') || 
                         $('meta[property="og:description"]').attr('content') || '';
  const metaKeywords = $('meta[name="keywords"]').attr('content') || '';
  const keywords = metaKeywords.split(',').map(k => k.trim()).filter(Boolean);

  // Extract all text content from body
  // First try to get main content areas
  const contentSelectors = [
    'main',
    'article',
    '[role="main"]',
    '#main-content',
    '#content',
    '.main-content',
    '.content',
    '.container',
  ];

  let contentElement = null;
  for (const selector of contentSelectors) {
    const element = $(selector);
    if (element.length > 0 && element.text().trim().length > 100) {
      contentElement = element;
      break;
    }
  }

  // If no main content found, use body
  if (!contentElement) {
    contentElement = $('body');
  }

  // Extract text content
  let content = '';
  
  // Get all text nodes
  contentElement.find('*').each((_, elem) => {
    const $elem = $(elem);
    // Skip if element is hidden
    if ($elem.css('display') === 'none' || $elem.css('visibility') === 'hidden') {
      return;
    }
    
    // Get direct text content
    const text = $elem.contents()
      .filter(function() { return this.type === 'text'; })
      .text()
      .trim();
    
    if (text) {
      content += ' ' + text;
    }
  });

  // Clean up the content
  content = content
    .replace(/\s+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // If content is still too short, get all text from body
  if (content.length < 100) {
    content = $('body').text()
      .replace(/\s+/g, ' ')
      .trim();
  }

  return {
    title,
    description: metaDescription || content.substring(0, 160) + '...',
    keywords,
    content,
    html,
    url,
    metaDescription,
    metaKeywords,
  };
}

// Alias for backward compatibility
export const scrapeWebsite = fetchAndScrape;