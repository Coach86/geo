const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

let db = null;

/**
 * Initialize SQLite database with schema
 */
function initDatabase() {
  // Ensure data directory exists
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  // Open database
  const dbPath = path.join(dataDir, 'page-intelligence.db');
  db = new Database(dbPath);
  
  // Enable foreign keys
  db.pragma('foreign_keys = ON');
  
  // Create tables
  db.exec(`
    -- Table for cached crawled pages
    CREATE TABLE IF NOT EXISTS crawled_pages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT UNIQUE NOT NULL,
      domain TEXT NOT NULL,
      html TEXT,
      title TEXT,
      meta_description TEXT,
      status_code INTEGER,
      content_type TEXT,
      crawled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      error TEXT,
      metadata TEXT -- JSON string for additional metadata
    );
    
    -- Index for faster lookups
    CREATE INDEX IF NOT EXISTS idx_crawled_pages_domain ON crawled_pages(domain);
    CREATE INDEX IF NOT EXISTS idx_crawled_pages_crawled_at ON crawled_pages(crawled_at);
    
    -- Table for page analysis scores
    CREATE TABLE IF NOT EXISTS page_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT NOT NULL,
      company_name TEXT NOT NULL,
      run_number INTEGER NOT NULL,
      technical_score REAL,
      content_score REAL,
      authority_score REAL,
      quality_score REAL,
      global_score REAL,
      issues TEXT, -- JSON string
      recommendations TEXT, -- JSON string
      analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(url, company_name, run_number)
    );
    
    -- Indexes for page scores
    CREATE INDEX IF NOT EXISTS idx_page_scores_company ON page_scores(company_name);
    CREATE INDEX IF NOT EXISTS idx_page_scores_global_score ON page_scores(global_score);
    
    -- Table for discovered URLs (for crawl queue management)
    CREATE TABLE IF NOT EXISTS discovered_urls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT UNIQUE NOT NULL,
      domain TEXT NOT NULL,
      source_url TEXT,
      discovered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      crawled BOOLEAN DEFAULT 0
    );
    
    -- Index for discovered URLs
    CREATE INDEX IF NOT EXISTS idx_discovered_urls_domain ON discovered_urls(domain);
    CREATE INDEX IF NOT EXISTS idx_discovered_urls_crawled ON discovered_urls(crawled);
  `);
  
  console.log(`Database initialized at: ${dbPath}`);
  return db;
}

/**
 * Get cached page from database
 * @param {string} url - The URL to look up
 * @returns {Object|null} The cached page data or null if not found
 */
function getCachedPage(url) {
  if (!db) throw new Error('Database not initialized');
  
  const stmt = db.prepare(`
    SELECT * FROM crawled_pages 
    WHERE url = ? 
    AND crawled_at > datetime('now', '-7 days')
  `);
  
  const row = stmt.get(url);
  
  if (row && row.metadata) {
    try {
      row.metadata = JSON.parse(row.metadata);
    } catch (e) {
      row.metadata = {};
    }
  }
  
  return row;
}

/**
 * Save crawled page to cache
 * @param {Object} pageData - The page data to save
 */
function saveCachedPage(pageData) {
  if (!db) throw new Error('Database not initialized');
  
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO crawled_pages 
    (url, domain, html, title, meta_description, status_code, content_type, error, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const metadata = pageData.metadata ? JSON.stringify(pageData.metadata) : null;
  
  stmt.run(
    pageData.url,
    pageData.domain,
    pageData.html,
    pageData.title,
    pageData.meta_description,
    pageData.status_code,
    pageData.content_type,
    pageData.error,
    metadata
  );
}

/**
 * Save page analysis score
 * @param {Object} scoreData - The score data to save
 */
function savePageScore(scoreData) {
  if (!db) throw new Error('Database not initialized');
  
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO page_scores 
    (url, company_name, run_number, technical_score, content_score, 
     authority_score, quality_score, global_score, issues, recommendations)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    scoreData.url,
    scoreData.companyName,
    scoreData.runNumber,
    scoreData.technical_score,
    scoreData.content_score,
    scoreData.authority_score,
    scoreData.quality_score,
    scoreData.globalScore,
    scoreData.issues,
    scoreData.recommendations || '[]'
  );
}

/**
 * Get page scores for a company
 * @param {string} companyName - The company name
 * @param {number} runNumber - Optional run number
 * @returns {Array} Array of page scores
 */
function getPageScores(companyName, runNumber = null) {
  if (!db) throw new Error('Database not initialized');
  
  let query = 'SELECT * FROM page_scores WHERE company_name = ?';
  const params = [companyName];
  
  if (runNumber !== null) {
    query += ' AND run_number = ?';
    params.push(runNumber);
  }
  
  query += ' ORDER BY global_score DESC';
  
  const stmt = db.prepare(query);
  const rows = stmt.all(...params);
  
  // Parse JSON fields
  return rows.map(row => {
    if (row.issues) {
      try {
        row.issues = JSON.parse(row.issues);
      } catch (e) {
        row.issues = [];
      }
    }
    if (row.recommendations) {
      try {
        row.recommendations = JSON.parse(row.recommendations);
      } catch (e) {
        row.recommendations = [];
      }
    }
    return row;
  });
}

/**
 * Add discovered URL to queue
 * @param {string} url - The URL to add
 * @param {string} domain - The domain
 * @param {string} sourceUrl - The source URL where this was found
 */
function addDiscoveredUrl(url, domain, sourceUrl) {
  if (!db) throw new Error('Database not initialized');
  
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO discovered_urls (url, domain, source_url)
    VALUES (?, ?, ?)
  `);
  
  stmt.run(url, domain, sourceUrl);
}

/**
 * Get uncrawled URLs for a domain
 * @param {string} domain - The domain
 * @param {number} limit - Maximum number of URLs to return
 * @param {boolean} prioritizeHomepage - Whether to prioritize homepage URLs
 * @returns {Array} Array of URLs to crawl
 */
function getUncrawledUrls(domain, limit = 100, prioritizeHomepage = false) {
  if (!db) throw new Error('Database not initialized');
  
  if (prioritizeHomepage) {
    // First, check for homepage URLs (root domain)
    const homepageStmt = db.prepare(`
      SELECT url FROM discovered_urls 
      WHERE domain = ? AND crawled = 0 
      AND (url LIKE 'https://' || ? || '/' OR url LIKE 'https://' || ? OR url LIKE 'http://' || ? || '/' OR url LIKE 'http://' || ?)
      ORDER BY url
      LIMIT ?
    `);
    
    const homepageUrls = homepageStmt.all(domain, domain, domain, domain, domain, Math.min(1, limit)).map(row => row.url);
    
    if (homepageUrls.length > 0 && limit > 1) {
      // Get remaining URLs randomly
      const remainingStmt = db.prepare(`
        SELECT url FROM discovered_urls 
        WHERE domain = ? AND crawled = 0 
        AND NOT (url LIKE 'https://' || ? || '/' OR url LIKE 'https://' || ? OR url LIKE 'http://' || ? || '/' OR url LIKE 'http://' || ?)
        ORDER BY RANDOM()
        LIMIT ?
      `);
      
      const remainingUrls = remainingStmt.all(domain, domain, domain, domain, domain, limit - homepageUrls.length).map(row => row.url);
      return [...homepageUrls, ...remainingUrls];
    } else {
      return homepageUrls;
    }
  }
  
  // Default behavior: random order
  const stmt = db.prepare(`
    SELECT url FROM discovered_urls 
    WHERE domain = ? AND crawled = 0
    ORDER BY RANDOM()
    LIMIT ?
  `);
  
  return stmt.all(domain, limit).map(row => row.url);
}

/**
 * Mark URL as crawled
 * @param {string} url - The URL to mark
 */
function markUrlAsCrawled(url) {
  if (!db) throw new Error('Database not initialized');
  
  const stmt = db.prepare('UPDATE discovered_urls SET crawled = 1 WHERE url = ?');
  stmt.run(url);
}

/**
 * Get crawled pages for a domain
 * @param {string} domain - The domain
 * @returns {Array} Array of crawled pages
 */
function getCrawledPagesForDomain(domain) {
  if (!db) throw new Error('Database not initialized');
  
  const stmt = db.prepare(`
    SELECT * FROM crawled_pages 
    WHERE domain = ? AND error IS NULL
    ORDER BY crawled_at DESC
  `);
  
  const rows = stmt.all(domain);
  
  // Parse metadata JSON
  return rows.map(row => {
    if (row.metadata) {
      try {
        row.metadata = JSON.parse(row.metadata);
      } catch (e) {
        row.metadata = {};
      }
    }
    return row;
  });
}

/**
 * Clear old cache entries
 * @param {number} daysOld - Remove entries older than this many days
 */
function clearOldCache(daysOld = 30) {
  if (!db) throw new Error('Database not initialized');
  
  const stmt = db.prepare(`
    DELETE FROM crawled_pages 
    WHERE crawled_at < datetime('now', '-' || ? || ' days')
  `);
  
  const result = stmt.run(daysOld);
  console.log(`Cleared ${result.changes} old cache entries`);
}

module.exports = {
  initDatabase,
  getCachedPage,
  saveCachedPage,
  savePageScore,
  getPageScores,
  addDiscoveredUrl,
  getUncrawledUrls,
  markUrlAsCrawled,
  getCrawledPagesForDomain,
  clearOldCache
};