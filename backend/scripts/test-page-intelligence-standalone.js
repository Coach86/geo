require('dotenv').config();
const fs = require('fs');
const csv = require('csv-parser');
const { createObjectCsvWriter } = require('csv-writer');
const path = require('path');
const { default: pLimit } = require('p-limit');
const axios = require('axios');
const cheerio = require('cheerio');
const Database = require('better-sqlite3');
const { URL } = require('url');

/**
 * Standalone Page Intelligence Analysis Script
 * 
 * This script analyzes web pages using rule-based scoring without requiring the full application.
 * It crawls pages from URLs in a CSV file and applies AEO scoring rules to compute intelligence scores.
 * 
 * Usage:
 *   node scripts/test-page-intelligence-standalone.js [options]
 * 
 * Options:
 *   --runs <number>      Number of analysis runs per company (default: 1)
 *   --parallel <number>  Number of parallel operations (default: 5)
 *   --companies <number> Maximum companies to process, 0 for all (default: 0)
 *   --url <url>          Analyze a single URL instead of CSV
 *   --max-pages <number> Maximum pages to crawl per domain (default: 100)
 *   --help, -h           Show help message
 * 
 * Examples:
 *   node scripts/test-page-intelligence-standalone.js                        # Analyze all companies
 *   node scripts/test-page-intelligence-standalone.js --companies 5          # First 5 companies
 *   node scripts/test-page-intelligence-standalone.js --url https://example.com  # Single URL
 * 
 * Output:
 *   Creates a CSV file in scripts/data/ with page intelligence scores
 *   Caches crawled pages in SQLite database for reuse
 */

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    runs: 1,
    parallel: 5,
    companies: 0,
    url: null,
    maxPages: 100,
    help: false
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];
    
    switch (arg) {
      case '--runs':
        if (nextArg && !isNaN(parseInt(nextArg))) {
          config.runs = parseInt(nextArg);
          i++;
        }
        break;
      case '--parallel':
        if (nextArg && !isNaN(parseInt(nextArg))) {
          config.parallel = parseInt(nextArg);
          i++;
        }
        break;
      case '--companies':
        if (nextArg && !isNaN(parseInt(nextArg))) {
          config.companies = parseInt(nextArg);
          i++;
        }
        break;
      case '--max-pages':
        if (nextArg && !isNaN(parseInt(nextArg))) {
          config.maxPages = parseInt(nextArg);
          i++;
        }
        break;
      case '--url':
        if (nextArg && nextArg.startsWith('http')) {
          config.url = nextArg;
          i++;
        }
        break;
      case '--help':
      case '-h':
        config.help = true;
        break;
    }
  }
  
  return config;
}

// Show help message
function showHelp() {
  console.log(`
Standalone Page Intelligence Analysis Script

This script analyzes web pages using rule-based scoring without requiring the full application.

Usage:
  node scripts/test-page-intelligence-standalone.js [options]

Options:
  --runs <number>      Number of analysis runs per company (default: 1)
  --parallel <number>  Number of parallel operations (default: 5)  
  --companies <number> Maximum companies to process, 0 for all (default: 0)
  --url <url>          Analyze a single URL instead of CSV
  --max-pages <number> Maximum pages to crawl per domain (default: 100)
  --help, -h           Show help message

Examples:
  node scripts/test-page-intelligence-standalone.js                        # Analyze all companies
  node scripts/test-page-intelligence-standalone.js --companies 5          # First 5 companies  
  node scripts/test-page-intelligence-standalone.js --url https://example.com  # Single URL

Output:
  Creates a CSV file in scripts/data/ with page intelligence scores
  Caches crawled pages in SQLite database for reuse
  `);
}

// Load companies from CSV
async function loadCompaniesFromCSV() {
  const companies = [];
  const csvPath = path.join(__dirname, 'data', 'Database Citations - Next 40 v2.csv');
  
  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV file not found: ${csvPath}`);
  }
  
  return new Promise((resolve, reject) => {
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (row) => {
        if (row['Start-up'] && row['URL']) {
          companies.push({
            name: row['Start-up'],
            url: row['URL'].trim(),
            country: row['Main Country'],
            market: row['Main Market (2025)'],
            keywords: row['Main Visibility keywords']
          });
        }
      })
      .on('end', () => {
        console.log(`Loaded ${companies.length} companies from CSV`);
        resolve(companies);
      })
      .on('error', reject);
  });
}

// Initialize database module (imported from separate file)
const { initDatabase, getCachedPage, saveCachedPage, savePageScore, getPageScores } = require('./lib/database');

// Initialize crawler module (imported from separate file)
const { crawlPages } = require('./lib/crawler');

// Initialize rules and aggregator (imported from separate files)
// Use LLM-enabled version if LLM keys are available
const hasLLMKeys = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.GOOGLE_API_KEY;
const { analyzePageWithRules } = hasLLMKeys 
  ? require('./lib/page-analyzer-with-llm')
  : require('./lib/page-analyzer');

// Main analysis function for a single company
async function analyzeCompany(company, runNumber, config) {
  console.log(`\n[Run ${runNumber}] Analyzing ${company.name} (${company.url})`);
  
  try {
    // Step 1: Crawl pages (with caching)
    const startTime = Date.now();
    const crawledPages = await crawlPages(company.url, {
      maxPages: config.maxPages,
      parallel: config.parallel
    });
    
    const crawlTime = Date.now() - startTime;
    console.log(`  Crawled ${crawledPages.length} pages in ${(crawlTime / 1000).toFixed(1)}s`);
    
    if (crawledPages.length === 0) {
      console.log(`  WARNING: No pages could be crawled from ${company.url}`);
      return null;
    }
    
    // Step 2: Analyze each page with rules
    const pageScores = [];
    const limiter = pLimit(config.parallel);
    
    const analysisPromises = crawledPages.map((page, index) => 
      limiter(async () => {
        try {
          const score = await analyzePageWithRules(page);
          pageScores.push({
            url: page.url,
            ...score
          });
          
          // Show progress
          if ((index + 1) % 10 === 0) {
            console.log(`  Analyzed ${index + 1}/${crawledPages.length} pages`);
          }
        } catch (error) {
          console.error(`  Error analyzing ${page.url}: ${error.message}`);
        }
      })
    );
    
    await Promise.all(analysisPromises);
    
    // Step 3: Calculate aggregate scores
    const aggregateScores = calculateAggregateScores(pageScores);
    
    // Step 4: Save to database
    for (const pageScore of pageScores) {
      await savePageScore({
        url: pageScore.url,
        companyName: company.name,
        runNumber: runNumber,
        ...pageScore.scores,
        globalScore: pageScore.globalScore,
        issues: JSON.stringify(pageScore.issues || []),
        analyzedAt: new Date()
      });
    }
    
    const result = {
      company: company.name,
      url: company.url,
      run: runNumber,
      pagesAnalyzed: pageScores.length,
      ...aggregateScores,
      timestamp: new Date().toISOString()
    };
    
    console.log(`  Completed: Global Score = ${result.avgGlobalScore.toFixed(1)}/100`);
    return result;
    
  } catch (error) {
    console.error(`Error analyzing ${company.name}: ${error.message}`);
    return {
      company: company.name,
      url: company.url,
      run: runNumber,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Calculate aggregate scores from page scores
function calculateAggregateScores(pageScores) {
  if (pageScores.length === 0) {
    return {
      avgTechnicalScore: 0,
      avgContentScore: 0,
      avgAuthorityScore: 0,
      avgQualityScore: 0,
      avgGlobalScore: 0,
      topIssues: []
    };
  }
  
  // Calculate averages
  const sums = pageScores.reduce((acc, score) => ({
    technical: acc.technical + score.scores.technical,
    content: acc.content + score.scores.content,
    authority: acc.authority + score.scores.authority,
    quality: acc.quality + score.scores.quality,
    global: acc.global + score.globalScore
  }), { technical: 0, content: 0, authority: 0, quality: 0, global: 0 });
  
  const count = pageScores.length;
  
  // Collect all issues and count occurrences
  const issueMap = new Map();
  pageScores.forEach(score => {
    (score.issues || []).forEach(issue => {
      const key = `${issue.dimension}-${issue.description}`;
      if (!issueMap.has(key)) {
        issueMap.set(key, { ...issue, count: 0 });
      }
      issueMap.get(key).count++;
    });
  });
  
  // Get top issues sorted by severity and frequency
  const topIssues = Array.from(issueMap.values())
    .sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      return b.count - a.count;
    })
    .slice(0, 5);
  
  return {
    avgTechnicalScore: Math.round(sums.technical / count),
    avgContentScore: Math.round(sums.content / count),
    avgAuthorityScore: Math.round(sums.authority / count),
    avgQualityScore: Math.round(sums.quality / count),
    avgGlobalScore: Math.round(sums.global / count),
    topIssues
  };
}

// Main function
async function main() {
  const config = parseArgs();
  
  if (config.help) {
    showHelp();
    process.exit(0);
  }
  
  console.log('Page Intelligence Analysis Starting...');
  console.log(`Configuration: ${JSON.stringify(config, null, 2)}`);
  
  // Show LLM status
  if (hasLLMKeys) {
    console.log('\nLLM Support Status:');
    if (process.env.OPENAI_API_KEY) console.log('  ✓ OpenAI API configured');
    if (process.env.ANTHROPIC_API_KEY) console.log('  ✓ Anthropic API configured');
    if (process.env.GOOGLE_API_KEY) console.log('  ✓ Google AI API configured');
    console.log('  Some rules will use LLM for enhanced analysis\n');
  } else {
    console.log('\n⚠ No LLM API keys configured');
    console.log('  Rules will use basic analysis only');
    console.log('  Set OPENAI_API_KEY, ANTHROPIC_API_KEY, or GOOGLE_API_KEY for enhanced analysis\n');
  }
  
  // Initialize database
  const db = initDatabase();
  
  try {
    let companies = [];
    
    if (config.url) {
      // Single URL mode
      companies = [{
        name: new URL(config.url).hostname,
        url: config.url
      }];
    } else {
      // CSV mode
      companies = await loadCompaniesFromCSV();
      
      if (config.companies > 0) {
        companies = companies.slice(0, config.companies);
        console.log(`Processing first ${config.companies} companies`);
      }
    }
    
    // Create results array
    const results = [];
    let processedCount = 0;
    
    // Process each company
    for (const company of companies) {
      for (let run = 1; run <= config.runs; run++) {
        const result = await analyzeCompany(company, run, config);
        if (result) {
          results.push(result);
        }
        processedCount++;
        
        // Show overall progress
        const totalRuns = companies.length * config.runs;
        const progress = (processedCount / totalRuns * 100).toFixed(1);
        console.log(`Overall progress: ${processedCount}/${totalRuns} (${progress}%)`);
      }
    }
    
    // Write results to CSV
    const timestamp = new Date().toISOString().split('T')[0];
    const outputPath = path.join(__dirname, 'data', `page-intelligence-results-${timestamp}.csv`);
    
    const csvWriter = createObjectCsvWriter({
      path: outputPath,
      header: [
        { id: 'company', title: 'Company' },
        { id: 'url', title: 'URL' },
        { id: 'run', title: 'Run' },
        { id: 'pagesAnalyzed', title: 'Pages Analyzed' },
        { id: 'avgTechnicalScore', title: 'Avg Technical Score' },
        { id: 'avgContentScore', title: 'Avg Content Score' },
        { id: 'avgAuthorityScore', title: 'Avg Authority Score' },
        { id: 'avgQualityScore', title: 'Avg Quality Score' },
        { id: 'avgGlobalScore', title: 'Avg Global Score' },
        { id: 'topIssues', title: 'Top Issues' },
        { id: 'error', title: 'Error' },
        { id: 'timestamp', title: 'Timestamp' }
      ]
    });
    
    // Transform topIssues to string for CSV
    const csvResults = results.map(r => ({
      ...r,
      topIssues: r.topIssues ? JSON.stringify(r.topIssues) : ''
    }));
    
    await csvWriter.writeRecords(csvResults);
    console.log(`\nResults written to: ${outputPath}`);
    
    // Summary
    console.log('\n=== Analysis Summary ===');
    console.log(`Total companies analyzed: ${companies.length}`);
    console.log(`Total runs: ${results.length}`);
    console.log(`Successful analyses: ${results.filter(r => !r.error).length}`);
    console.log(`Failed analyses: ${results.filter(r => r.error).length}`);
    
    if (results.length > 0) {
      const avgGlobalScore = results
        .filter(r => r.avgGlobalScore)
        .reduce((sum, r) => sum + r.avgGlobalScore, 0) / results.filter(r => r.avgGlobalScore).length;
      console.log(`Average global score across all: ${avgGlobalScore.toFixed(1)}/100`);
    }
    
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    // Close database
    db.close();
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { analyzeCompany, calculateAggregateScores };