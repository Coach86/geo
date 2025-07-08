const axios = require('axios');
const cheerio = require('cheerio');
const { URL } = require('url');
const { default: pLimit } = require('p-limit');
const {
  getCachedPage,
  saveCachedPage,
  addDiscoveredUrl,
  getUncrawledUrls,
  markUrlAsCrawled,
  getCrawledPagesForDomain
} = require('./database');

// User agent for crawling
const USER_AGENT = 'PageIntelligenceBot/1.0 (+https://mintai.com/bot)';

/**
 * Normalize URL for consistent storage and comparison
 * @param {string} url - The URL to normalize
 * @returns {string} Normalized URL
 */
function normalizeUrl(url) {
  try {
    const parsed = new URL(url);
    // Remove fragment
    parsed.hash = '';
    // Sort query parameters for consistency
    parsed.searchParams.sort();
    // Remove trailing slash from path
    if (parsed.pathname.endsWith('/') && parsed.pathname !== '/') {
      parsed.pathname = parsed.pathname.slice(0, -1);
    }
    return parsed.toString();
  } catch (e) {
    return url;
  }
}

/**
 * Extract domain from URL
 * @param {string} url - The URL
 * @returns {string} The domain
 */
function getDomain(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch (e) {
    return '';
  }
}

/**
 * Check if URL is valid and should be crawled
 * @param {string} url - The URL to check
 * @param {string} baseDomain - The base domain to stay within
 * @returns {boolean} Whether URL should be crawled
 */
function shouldCrawlUrl(url, baseDomain) {
  try {
    const parsed = new URL(url);
    
    // Only HTTP(S) protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }
    
    // Stay within the same domain
    if (parsed.hostname !== baseDomain) {
      return false;
    }
    
    // Skip common non-content URLs
    const skipPatterns = [
      /\.(jpg|jpeg|png|gif|pdf|zip|exe|dmg|mp3|mp4|doc|docx|xls|xlsx)$/i,
      /\/wp-admin\//,
      /\/admin\//,
      /\/login/,
      /\/logout/,
      /\/signin/,
      /\/signup/,
      /\/register/,
      /\/api\//,
      /\/feed\/?$/,
      /\/rss\/?$/,
      /\/print\//,
      /\/cdn-cgi\//,
      /\?print=/,
      /\#/,
      /\/tag\//,
      /\/category\//,
      /\/author\//,
      /\/search\//,
      /\/cart\//,
      /\/checkout\//
    ];
    
    const urlPath = parsed.pathname + parsed.search;
    return !skipPatterns.some(pattern => pattern.test(urlPath));
  } catch (e) {
    return false;
  }
}

/**
 * Extract URLs from HTML content
 * @param {string} html - The HTML content
 * @param {string} baseUrl - The base URL for resolving relative URLs
 * @returns {Array} Array of discovered URLs
 */
function extractUrls(html, baseUrl) {
  const $ = cheerio.load(html);
  const urls = new Set();
  
  // Extract from various sources
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (href) {
      try {
        const absoluteUrl = new URL(href, baseUrl).toString();
        urls.add(normalizeUrl(absoluteUrl));
      } catch (e) {
        // Invalid URL, skip
      }
    }
  });
  
  // Also check canonical URL
  const canonical = $('link[rel="canonical"]').attr('href');
  if (canonical) {
    try {
      const absoluteUrl = new URL(canonical, baseUrl).toString();
      urls.add(normalizeUrl(absoluteUrl));
    } catch (e) {
      // Invalid URL, skip
    }
  }
  
  return Array.from(urls);
}

/**
 * Extract page metadata from HTML
 * @param {string} html - The HTML content
 * @param {string} url - The page URL
 * @returns {Object} Page metadata
 */
function extractMetadata(html, url) {
  const $ = cheerio.load(html);
  
  const metadata = {
    title: $('title').text().trim() || '',
    metaDescription: $('meta[name="description"]').attr('content') || '',
    metaKeywords: $('meta[name="keywords"]').attr('content') || '',
    canonical: $('link[rel="canonical"]').attr('href') || '',
    robots: $('meta[name="robots"]').attr('content') || '',
    ogTitle: $('meta[property="og:title"]').attr('content') || '',
    ogDescription: $('meta[property="og:description"]').attr('content') || '',
    ogImage: $('meta[property="og:image"]').attr('content') || '',
    structuredData: [],
    headings: {
      h1: [],
      h2: [],
      h3: []
    },
    links: {
      internal: 0,
      external: 0
    },
    images: {
      total: 0,
      withAlt: 0
    },
    contentLength: $('body').text().length
  };
  
  // Extract structured data
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html());
      metadata.structuredData.push(data);
    } catch (e) {
      // Invalid JSON, skip
    }
  });
  
  // Extract headings
  $('h1').each((_, el) => metadata.headings.h1.push($(el).text().trim()));
  $('h2').each((_, el) => metadata.headings.h2.push($(el).text().trim()));
  $('h3').each((_, el) => metadata.headings.h3.push($(el).text().trim()));
  
  // Count links
  const baseDomain = getDomain(url);
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (href) {
      try {
        const linkUrl = new URL(href, url);
        if (linkUrl.hostname === baseDomain) {
          metadata.links.internal++;
        } else {
          metadata.links.external++;
        }
      } catch (e) {
        // Invalid URL, skip
      }
    }
  });
  
  // Count images
  $('img').each((_, el) => {
    metadata.images.total++;
    if ($(el).attr('alt')) {
      metadata.images.withAlt++;
    }
  });
  
  return metadata;
}

/**
 * Crawl a single URL
 * @param {string} url - The URL to crawl
 * @param {Object} options - Crawl options
 * @returns {Object|null} Crawled page data or null if failed
 */
async function crawlUrl(url, options = {}) {
  // Check cache first
  const cached = getCachedPage(url);
  if (cached && !cached.error) {
    console.log(`  [CACHE HIT] ${url}`);
    return cached;
  }
  
  console.log(`  [CRAWLING] ${url}`);
  
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': options.userAgent || USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      timeout: options.timeout || 30000,
      maxRedirects: 5,
      validateStatus: (status) => status < 500 // Don't throw on 4xx
    });
    
    // Extract metadata
    const metadata = extractMetadata(response.data, url);
    
    const pageData = {
      url: normalizeUrl(url),
      domain: getDomain(url),
      html: response.data,
      title: metadata.title,
      meta_description: metadata.metaDescription,
      status_code: response.status,
      content_type: response.headers['content-type'] || '',
      error: null,
      metadata: metadata
    };
    
    // Save to cache
    saveCachedPage(pageData);
    
    // Mark as crawled
    markUrlAsCrawled(url);
    
    return pageData;
    
  } catch (error) {
    const errorData = {
      url: normalizeUrl(url),
      domain: getDomain(url),
      html: null,
      title: null,
      meta_description: null,
      status_code: error.response?.status || 0,
      content_type: null,
      error: error.message,
      metadata: null
    };
    
    // Save error to cache to avoid re-crawling
    saveCachedPage(errorData);
    
    // Mark as crawled (even if failed)
    markUrlAsCrawled(url);
    
    console.log(`  [ERROR] ${url}: ${error.message}`);
    return null;
  }
}

/**
 * Crawl pages from a starting URL
 * @param {string} startUrl - The starting URL
 * @param {Object} options - Crawl options
 * @returns {Array} Array of crawled pages
 */
async function crawlPages(startUrl, options = {}) {
  const maxPages = options.maxPages || 100;
  const parallel = options.parallel || 5;
  const crawlDelay = options.crawlDelay || 1000;
  
  const normalizedStartUrl = normalizeUrl(startUrl);
  const domain = getDomain(startUrl);
  
  // Always ensure we have the homepage URL
  const homepageUrl = `https://${domain}`;
  const normalizedHomepage = normalizeUrl(homepageUrl);
  
  console.log(`Starting crawl from: ${normalizedStartUrl}`);
  console.log(`Domain: ${domain}`);
  console.log(`Homepage: ${normalizedHomepage}`);
  console.log(`Max pages: ${maxPages}`);
  
  // Check if we already have crawled pages for this domain
  const existingPages = getCrawledPagesForDomain(domain);
  if (existingPages.length >= maxPages) {
    console.log(`Already have ${existingPages.length} cached pages for ${domain}`);
    
    // Ensure homepage is included in existing pages
    const hasHomepage = existingPages.some(page => 
      normalizeUrl(page.url) === normalizedHomepage || 
      normalizeUrl(page.url) === normalizeUrl(`http://${domain}`)
    );
    
    if (hasHomepage) {
      return existingPages.slice(0, maxPages);
    } else {
      console.log('Homepage not found in existing pages, will crawl it first');
    }
  }
  
  // Initialize URLs to discover
  addDiscoveredUrl(normalizedStartUrl, domain, null);
  addDiscoveredUrl(normalizedHomepage, domain, null); // Always add homepage
  
  const crawledPages = [...existingPages];
  const crawledUrls = new Set(crawledPages.map(p => p.url));
  const limiter = pLimit(parallel);
  
  // Crawl loop
  let isFirstBatch = true;
  while (crawledPages.length < maxPages) {
    // Get batch of uncrawled URLs 
    // For first batch, prioritize homepage; then use randomized selection
    const urlsToCrawl = getUncrawledUrls(
      domain, 
      Math.min(parallel * 2, maxPages - crawledPages.length),
      isFirstBatch // Prioritize homepage on first batch
    );
    
    if (urlsToCrawl.length === 0) {
      console.log('No more URLs to crawl');
      break;
    }
    
    if (isFirstBatch) {
      console.log(`  📋 Fetched ${urlsToCrawl.length} URLs (homepage prioritized)`);
    } else {
      console.log(`  📋 Fetched ${urlsToCrawl.length} randomized URLs from queue`);
    }
    
    isFirstBatch = false;
    
    if (urlsToCrawl.length > 0) {
      const isHomepage = urlsToCrawl[0].match(new RegExp(`^https?://${domain.replace('.', '\\.')}/?$`));
      const emoji = isHomepage ? '🏠' : '🎲';
      console.log(`  ${emoji} Next URL: ${urlsToCrawl[0].substring(0, 80)}${urlsToCrawl[0].length > 80 ? '...' : ''}`);
    }
    
    // Crawl batch in parallel
    const crawlPromises = urlsToCrawl.map(url =>
      limiter(async () => {
        // Add delay between requests
        if (crawlDelay > 0) {
          await new Promise(resolve => setTimeout(resolve, crawlDelay));
        }
        
        const pageData = await crawlUrl(url, options);
        
        if (pageData && pageData.html) {
          // Extract new URLs
          const discoveredUrls = extractUrls(pageData.html, url);
          
          // Add new URLs to queue
          for (const discoveredUrl of discoveredUrls) {
            if (shouldCrawlUrl(discoveredUrl, domain) && !crawledUrls.has(discoveredUrl)) {
              addDiscoveredUrl(discoveredUrl, domain, url);
            }
          }
          
          return pageData;
        }
        
        return null;
      })
    );
    
    const batchResults = await Promise.all(crawlPromises);
    
    // Add successful crawls to results
    for (const pageData of batchResults) {
      if (pageData && !pageData.error) {
        crawledPages.push(pageData);
        crawledUrls.add(pageData.url);
        
        if (crawledPages.length >= maxPages) {
          break;
        }
      }
    }
    
    console.log(`Progress: ${crawledPages.length}/${maxPages} pages crawled`);
  }
  
  console.log(`Crawl completed: ${crawledPages.length} pages`);
  return crawledPages.slice(0, maxPages);
}

module.exports = {
  crawlPages,
  crawlUrl,
  normalizeUrl,
  getDomain,
  extractUrls,
  extractMetadata
};