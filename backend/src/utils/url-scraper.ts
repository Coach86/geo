import axios from 'axios';
import * as cheerio from 'cheerio';

export interface ScrapedWebsite {
  title: string;
  description: string;
  keywords: string[];
  content: string;
  url: string;
}

export async function fetchAndScrape(url: string): Promise<ScrapedWebsite> {
  // Fetch the URL content
  const response = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; BrandInsightBot/1.0; +https://brand-insights.example.com)',
    },
    timeout: 10000, // 10 seconds timeout
  });

  const html = response.data;
  const $ = cheerio.load(html);

  // Extract metadata
  const title = $('title').text().trim() || '';
  const metaDescription = $('meta[name="description"]').attr('content') || '';
  const metaKeywords = $('meta[name="keywords"]').attr('content') || '';
  const keywords = metaKeywords.split(',').map(k => k.trim()).filter(Boolean);

  // Extract main content
  // This is a basic implementation and might need refinement for specific websites
  const contentSelectors = [
    'main',
    'article',
    '#main-content',
    '#content',
    '.main-content',
    '.content',
    'body',
  ];

  let contentHtml = '';
  for (const selector of contentSelectors) {
    const element = $(selector);
    if (element.length > 0) {
      contentHtml = element.html() || '';
      break;
    }
  }

  // Clean up the content
  const content = cheerio.load(contentHtml).text()
    .replace(/\s+/g, ' ')
    .trim();

  return {
    title,
    description: metaDescription,
    keywords,
    content,
    url,
  };
}