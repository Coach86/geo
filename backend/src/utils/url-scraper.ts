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

  // Remove non-visible elements before extracting content
  $('script').remove();
  $('style').remove();
  $('noscript').remove();
  $('meta').remove();
  $('link').remove();
  $('head').remove();
  $('[style*="display:none"]').remove();
  $('[style*="display: none"]').remove();
  $('[hidden]').remove();
  $('.hidden').remove();
  $('[aria-hidden="true"]').remove();
  
  // Remove common non-content elements
  $('nav').remove();
  $('header').remove();
  $('footer').remove();
  $('aside').remove();
  $('.sidebar').remove();
  $('.navigation').remove();
  $('.menu').remove();
  $('.breadcrumb').remove();
  $('.cookie-banner').remove();
  $('.advertisement').remove();
  $('.ads').remove();
  $('#ads').remove();
  
  // Extract main content
  // This is a basic implementation and might need refinement for specific websites
  const contentSelectors = [
    'main',
    'article',
    '[role="main"]',
    '#main-content',
    '#content',
    '.main-content',
    '.content',
    '.post-content',
    '.entry-content',
    '.article-content',
    'body',
  ];

  let contentHtml = '';
  for (const selector of contentSelectors) {
    const element = $(selector);
    if (element.length > 0 && element.text().trim().length > 100) {
      contentHtml = element.html() || '';
      break;
    }
  }

  // If no content found with selectors, get body content
  if (!contentHtml) {
    contentHtml = $('body').html() || '';
  }

  // Extract text content while preserving structure
  const $content = cheerio.load(contentHtml);
  
  // Convert headers to preserve structure
  $content('h1, h2, h3, h4, h5, h6').each((_, elem) => {
    const $elem = $content(elem);
    $elem.replaceWith(`\n\n${$elem.text()}\n\n`);
  });
  
  // Convert paragraphs
  $content('p').each((_, elem) => {
    const $elem = $content(elem);
    $elem.replaceWith(`\n\n${$elem.text()}\n\n`);
  });
  
  // Convert list items
  $content('li').each((_, elem) => {
    const $elem = $content(elem);
    $elem.replaceWith(`\n• ${$elem.text()}`);
  });
  
  // Get the cleaned text
  const content = $content.text()
    .replace(/\n{3,}/g, '\n\n') // Multiple newlines to double
    .replace(/\s+/g, ' ') // Multiple spaces to single
    .replace(/^\s+|\s+$/gm, '') // Trim each line
    .trim();

  return {
    title,
    description: metaDescription,
    keywords,
    content,
    url,
  };
}