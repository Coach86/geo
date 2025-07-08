const axios = require('axios');
const { parseStringPromise } = require('xml2js');
const { URL } = require('url');

// User agent for sitemap requests - using browser-like UA to avoid blocks
const USER_AGENT = 'Mozilla/5.0 (compatible; PageIntelligenceBot/1.0; +https://mintai.com/bot)';

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
 * Parse robots.txt to find sitemap URLs
 * @param {string} baseUrl - The base URL of the website
 * @returns {Array} Array of sitemap URLs found in robots.txt
 */
async function getRobotsTextSitemaps(baseUrl) {
  try {
    const domain = getDomain(baseUrl);
    const robotsUrl = `https://${domain}/robots.txt`;
    
    console.log(`  [ROBOTS.TXT] Checking ${robotsUrl}`);
    
    const response = await axios.get(robotsUrl, {
      headers: { 'User-Agent': USER_AGENT },
      timeout: 10000,
      validateStatus: (status) => status < 500
    });
    
    if (response.status !== 200) {
      console.log(`  [ROBOTS.TXT] Not found or error: ${response.status}`);
      return [];
    }
    
    const sitemapUrls = [];
    const lines = response.data.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.toLowerCase().startsWith('sitemap:')) {
        const sitemapUrl = trimmed.substring(8).trim();
        if (sitemapUrl) {
          try {
            // Resolve relative URLs
            const absoluteUrl = new URL(sitemapUrl, baseUrl).toString();
            sitemapUrls.push(absoluteUrl);
          } catch (e) {
            console.log(`  [ROBOTS.TXT] Invalid sitemap URL: ${sitemapUrl}`);
          }
        }
      }
    }
    
    console.log(`  [ROBOTS.TXT] Found ${sitemapUrls.length} sitemap URLs`);
    return sitemapUrls;
    
  } catch (error) {
    console.log(`  [ROBOTS.TXT] Error: ${error.message}`);
    return [];
  }
}

/**
 * Get common sitemap locations to try
 * @param {string} baseUrl - The base URL of the website
 * @returns {Array} Array of common sitemap URLs to try
 */
function getCommonSitemapUrls(baseUrl) {
  const domain = getDomain(baseUrl);
  return [
    `https://${domain}/sitemap.xml`,
    `https://${domain}/sitemap_index.xml`,
    `https://${domain}/sitemaps.xml`,
    `https://${domain}/sitemap/sitemap.xml`,
    `https://${domain}/wp-sitemap.xml`,
    `https://${domain}/sitemap/index.xml`
  ];
}

/**
 * Parse XML sitemap content
 * @param {string} xmlContent - The XML content
 * @returns {Object} Parsed sitemap data with URLs and nested sitemaps
 */
async function parseXmlSitemap(xmlContent) {
  try {
    const result = await parseStringPromise(xmlContent, {
      explicitArray: false,
      ignoreAttrs: false,
      trim: true
    });
    
    const parsed = {
      urls: [],
      sitemaps: [],
      type: 'unknown'
    };
    
    // Handle sitemap index (contains references to other sitemaps)
    if (result.sitemapindex && result.sitemapindex.sitemap) {
      parsed.type = 'index';
      const sitemaps = Array.isArray(result.sitemapindex.sitemap) 
        ? result.sitemapindex.sitemap 
        : [result.sitemapindex.sitemap];
      
      for (const sitemap of sitemaps) {
        if (sitemap.loc) {
          parsed.sitemaps.push({
            url: sitemap.loc,
            lastmod: sitemap.lastmod || null
          });
        }
      }
    }
    
    // Handle URL set (contains actual URLs)
    if (result.urlset && result.urlset.url) {
      parsed.type = 'urlset';
      const urls = Array.isArray(result.urlset.url) 
        ? result.urlset.url 
        : [result.urlset.url];
      
      for (const url of urls) {
        if (url.loc) {
          parsed.urls.push({
            url: url.loc,
            lastmod: url.lastmod || null,
            changefreq: url.changefreq || null,
            priority: url.priority || null
          });
        }
      }
    }
    
    return parsed;
    
  } catch (error) {
    throw new Error(`Failed to parse XML sitemap: ${error.message}`);
  }
}

/**
 * Fetch and parse a single sitemap
 * @param {string} sitemapUrl - The sitemap URL
 * @param {string} baseDomain - The base domain to validate URLs against
 * @returns {Object} Parsed sitemap data
 */
async function fetchSitemap(sitemapUrl, baseDomain) {
  try {
    console.log(`  [SITEMAP] Fetching ${sitemapUrl}`);
    
    const response = await axios.get(sitemapUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/xml, text/xml, application/rss+xml, */*'
      },
      timeout: 15000,
      maxRedirects: 3,
      validateStatus: (status) => status < 500
    });
    
    if (response.status !== 200) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const contentType = response.headers['content-type'] || '';
    if (!contentType.includes('xml') && !contentType.includes('text/plain')) {
      console.log(`  [SITEMAP] Warning: Unexpected content type: ${contentType}`);
    }
    
    const parsed = await parseXmlSitemap(response.data);
    console.log(`  [SITEMAP] Type: ${parsed.type}, URLs: ${parsed.urls.length}, Nested sitemaps: ${parsed.sitemaps.length}`);
    
    return parsed;
    
  } catch (error) {
    throw new Error(`Failed to fetch sitemap: ${error.message}`);
  }
}

/**
 * Recursively process sitemaps to extract all URLs
 * @param {Array} sitemapUrls - Array of sitemap URLs to process
 * @param {string} baseDomain - The base domain to validate URLs against
 * @param {Set} processedSitemaps - Set of already processed sitemap URLs
 * @param {number} maxDepth - Maximum recursion depth
 * @param {number} currentDepth - Current recursion depth
 * @returns {Array} Array of discovered URLs
 */
async function processSitemapsRecursive(sitemapUrls, baseDomain, processedSitemaps = new Set(), maxDepth = 3, currentDepth = 0) {
  if (currentDepth >= maxDepth) {
    console.log(`  [SITEMAP] Maximum depth ${maxDepth} reached, stopping recursion`);
    return [];
  }
  
  // Limit number of sitemaps processed at each level to prevent excessive recursion
  const maxSitemapsPerLevel = 20;
  const limitedUrls = sitemapUrls.slice(0, maxSitemapsPerLevel);
  if (sitemapUrls.length > maxSitemapsPerLevel) {
    console.log(`  [SITEMAP] Limited to ${maxSitemapsPerLevel} sitemaps at depth ${currentDepth} (found ${sitemapUrls.length})`);
  }
  
  const allUrls = [];
  const nestedSitemaps = [];
  
  for (const sitemapUrl of limitedUrls) {
    // Skip if already processed
    if (processedSitemaps.has(sitemapUrl)) {
      continue;
    }
    
    processedSitemaps.add(sitemapUrl);
    
    try {
      const sitemap = await fetchSitemap(sitemapUrl, baseDomain);
      
      // Collect URLs from this sitemap (with limit to prevent memory issues)
      const maxUrlsPerSitemap = 1000;
      const limitedUrls = sitemap.urls.slice(0, maxUrlsPerSitemap);
      
      for (const urlEntry of limitedUrls) {
        if (shouldCrawlUrl(urlEntry.url, baseDomain)) {
          allUrls.push({
            url: normalizeUrl(urlEntry.url),
            source: 'sitemap',
            lastmod: urlEntry.lastmod,
            priority: urlEntry.priority,
            changefreq: urlEntry.changefreq
          });
        }
      }
      
      if (sitemap.urls.length > maxUrlsPerSitemap) {
        console.log(`  [SITEMAP] Limited to first ${maxUrlsPerSitemap} URLs from ${sitemapUrl} (found ${sitemap.urls.length})`);
      }
      
      // Collect nested sitemaps for recursive processing
      for (const nestedSitemap of sitemap.sitemaps) {
        if (!processedSitemaps.has(nestedSitemap.url)) {
          nestedSitemaps.push(nestedSitemap.url);
        }
      }
      
    } catch (error) {
      console.log(`  [SITEMAP] Error processing ${sitemapUrl}: ${error.message}`);
    }
  }
  
  // Process nested sitemaps recursively
  if (nestedSitemaps.length > 0) {
    console.log(`  [SITEMAP] Processing ${nestedSitemaps.length} nested sitemaps at depth ${currentDepth + 1}`);
    const nestedUrls = await processSitemapsRecursive(
      nestedSitemaps, 
      baseDomain, 
      processedSitemaps, 
      maxDepth, 
      currentDepth + 1
    );
    allUrls.push(...nestedUrls);
  }
  
  return allUrls;
}

/**
 * Discover URLs from sitemaps for a domain
 * @param {string} baseUrl - The base URL to start discovery from
 * @param {Object} options - Options for sitemap discovery
 * @returns {Array} Array of discovered URLs with metadata
 */
async function discoverUrlsFromSitemaps(baseUrl, options = {}) {
  const maxUrls = options.maxUrls || 1000;
  const maxDepth = options.maxDepth || 3;
  const maxSitemaps = options.maxSitemaps || 50; // Limit number of sitemaps to process
  
  const domain = getDomain(baseUrl);
  console.log(`[SITEMAP DISCOVERY] Starting for domain: ${domain}`);
  
  // Step 1: Get sitemap URLs from robots.txt
  const robotsSitemaps = await getRobotsTextSitemaps(baseUrl);
  
  // Step 2: Add common sitemap locations
  const commonSitemaps = getCommonSitemapUrls(baseUrl);
  
  // Combine and deduplicate sitemap URLs
  const allSitemapUrls = [...new Set([...robotsSitemaps, ...commonSitemaps])];
  
  console.log(`[SITEMAP DISCOVERY] Found ${allSitemapUrls.length} potential sitemap URLs`);
  
  if (allSitemapUrls.length === 0) {
    console.log(`[SITEMAP DISCOVERY] No sitemaps found for ${domain}`);
    return [];
  }
  
  // Step 3: Process all sitemaps recursively (with limits)
  const limitedSitemapUrls = allSitemapUrls.slice(0, maxSitemaps);
  if (allSitemapUrls.length > maxSitemaps) {
    console.log(`[SITEMAP DISCOVERY] Limited to first ${maxSitemaps} sitemaps (found ${allSitemapUrls.length})`);
  }
  
  const discoveredUrls = await processSitemapsRecursive(limitedSitemapUrls, domain, new Set(), maxDepth);
  
  // Step 4: Deduplicate and limit results
  const uniqueUrls = new Map();
  for (const urlEntry of discoveredUrls) {
    if (!uniqueUrls.has(urlEntry.url)) {
      uniqueUrls.set(urlEntry.url, urlEntry);
    }
  }
  
  const finalUrls = Array.from(uniqueUrls.values()).slice(0, maxUrls);
  
  console.log(`[SITEMAP DISCOVERY] Discovered ${finalUrls.length} unique URLs from sitemaps`);
  
  // Sort URLs by priority (homepage first, then by sitemap priority if available)
  finalUrls.sort((a, b) => {
    // Homepage gets highest priority
    const aIsHomepage = a.url.match(new RegExp(`^https?://${domain.replace('.', '\\.')}/?$`));
    const bIsHomepage = b.url.match(new RegExp(`^https?://${domain.replace('.', '\\.')}/?$`));
    
    if (aIsHomepage && !bIsHomepage) return -1;
    if (!aIsHomepage && bIsHomepage) return 1;
    
    // Then sort by sitemap priority (higher priority first)
    const aPriority = parseFloat(a.priority) || 0.5;
    const bPriority = parseFloat(b.priority) || 0.5;
    
    return bPriority - aPriority;
  });
  
  return finalUrls;
}

module.exports = {
  discoverUrlsFromSitemaps,
  fetchSitemap,
  parseXmlSitemap,
  getRobotsTextSitemaps,
  getCommonSitemapUrls
};