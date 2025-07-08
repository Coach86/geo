const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const fs = require('fs');
const csv = require('csv-parser');
const { createObjectCsvWriter } = require('csv-writer');
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
 *   --filter-urls <urls> Only analyze specific URLs from CSV (comma-separated)
 *   --max-pages <number> Maximum pages to crawl per domain (default: 100)
 *   --help, -h           Show help message
 * 
 * Examples:
 *   node scripts/test-page-intelligence-standalone.js                        # Analyze all companies
 *   node scripts/test-page-intelligence-standalone.js --companies 5          # First 5 companies
 *   node scripts/test-page-intelligence-standalone.js --url https://example.com  # Single URL
 *   node scripts/test-page-intelligence-standalone.js --filter-urls "https://site1.com,https://site2.com"  # Specific URLs
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
    filterUrls: null,
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
      case '--filter-urls':
        if (nextArg) {
          config.filterUrls = nextArg.split(',').map(u => u.trim());
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
  --filter-urls <urls> Only analyze specific URLs from CSV (comma-separated)
  --max-pages <number> Maximum pages to crawl per domain (default: 100)
  --help, -h           Show help message

Examples:
  node scripts/test-page-intelligence-standalone.js                        # Analyze all companies
  node scripts/test-page-intelligence-standalone.js --companies 5          # First 5 companies  
  node scripts/test-page-intelligence-standalone.js --url https://example.com  # Single URL
  node scripts/test-page-intelligence-standalone.js --filter-urls "https://site1.com,https://site2.com"  # Specific URLs only

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

// Define all possible rule IDs for consistent CSV columns
const ALL_RULE_IDS = {
  // Technical rules
  'clean_html_structure': 'Technical: Clean HTML Structure',
  'url_structure': 'Technical: URL Structure', 
  'structured_data': 'Technical: Structured Data Implementation',
  'https_security': 'Technical: HTTPS Security',
  'status_code': 'Technical: HTTP Status Code',
  'mobile_optimization': 'Technical: Mobile Optimization',
  
  // Content rules
  'main_heading': 'Content: Main Heading (H1)',
  'meta_description': 'Content: Meta Description',
  'subheadings': 'Content: Subheadings Structure',
  'image_alt_attributes': 'Content: Image Alt Attributes',
  
  // Authority rules
  'citing_sources': 'Authority: Citing Sources',
  'comparison-content': 'Authority: Comparison Content',
  
  // Quality rules
  'in-depth-guides-llm': 'Quality: In-Depth Guides (LLM)',
  'content_freshness': 'Quality: Content Freshness'
};

// Main analysis function for a single company
async function analyzeCompany(company, runNumber, config, csvWriter) {
  console.log(`\n[Run ${runNumber}] Analyzing ${company.name} (${company.url})`);
  
  try {
    let crawledPages = [];
    
    // Check if this is a single URL analysis
    if (config.url && config.url === company.url) {
      // Single URL mode - fetch and analyze just this page
      console.log(`  Single URL analysis mode`);
      const startTime = Date.now();
      
      try {
        // Fetch the single page content
        const axios = require('axios');
        const response = await axios.get(company.url, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; PageIntelligenceBot/1.0)'
          }
        });
        
        crawledPages = [{
          url: company.url,
          html: response.data,
          title: '',
          cleanContent: '',
          status_code: response.status,
          content_type: response.headers['content-type'] || 'text/html'
        }];
        
        const fetchTime = Date.now() - startTime;
        console.log(`  Fetched page content in ${(fetchTime / 1000).toFixed(1)}s`);
        
      } catch (error) {
        console.log(`  ERROR: Failed to fetch page: ${error.message}`);
        return [];
      }
    } else {
      // Step 1: Crawl pages (with caching)
      const startTime = Date.now();
      crawledPages = await crawlPages(company.url, {
        maxPages: config.maxPages,
        parallel: config.parallel
      });
      
      const crawlTime = Date.now() - startTime;
      console.log(`  Crawled ${crawledPages.length} pages in ${(crawlTime / 1000).toFixed(1)}s`);
      
      if (crawledPages.length === 0) {
        console.log(`  WARNING: No pages could be crawled from ${company.url}`);
        return [];
      }
    }
    
    // Step 2: Analyze each page with rules
    const pageResults = [];
    const limiter = pLimit(config.parallel);
    
    const analysisPromises = crawledPages.map((page, index) => 
      limiter(async () => {
        try {
          const score = await analyzePageWithRules(page);
          // Extract rules applied by dimension
          const rulesApplied = {
            technical: score.ruleResults?.technical?.map(r => r.ruleName || r.ruleId || 'Unknown').join(', ') || '',
            content: score.ruleResults?.content?.map(r => r.ruleName || r.ruleId || 'Unknown').join(', ') || '',
            authority: score.ruleResults?.authority?.map(r => r.ruleName || r.ruleId || 'Unknown').join(', ') || '',
            quality: score.ruleResults?.quality?.map(r => r.ruleName || r.ruleId || 'Unknown').join(', ') || ''
          };

          // Extract individual rule scores from all dimensions
          const individualRuleScores = {};
          // Initialize all rule scores as empty to ensure consistent columns
          Object.keys(ALL_RULE_IDS).forEach(ruleId => {
            individualRuleScores[`rule_${ruleId}`] = '';
          });
          
          // Populate actual rule scores from results
          if (score.ruleResults) {
            Object.values(score.ruleResults).forEach(dimensionResults => {
              if (Array.isArray(dimensionResults)) {
                dimensionResults.forEach(ruleResult => {
                  const ruleId = ruleResult.ruleId || ruleResult.ruleName;
                  if (ruleId && ALL_RULE_IDS[ruleId]) {
                    individualRuleScores[`rule_${ruleId}`] = ruleResult.score ?? '';
                  }
                });
              }
            });
          }

          const pageResult = {
            company: company.name,
            companyUrl: company.url,
            pageUrl: page.url,
            run: runNumber,
            pageCategory: score.pageCategory || 'unknown',
            analysisLevel: score.analysisLevel || 'full',
            technicalScore: score.scores.technical ?? '',
            contentScore: score.scores.content ?? '',
            authorityScore: score.scores.authority ?? '',
            qualityScore: score.scores.quality ?? '',
            globalScore: score.globalScore,
            llmUsageCount: score.llmUsageCount || 0,
            // Add individual rule scores
            ...individualRuleScores,
            technicalRules: rulesApplied.technical,
            contentRules: rulesApplied.content,
            authorityRules: rulesApplied.authority,
            qualityRules: rulesApplied.quality,
            issues: JSON.stringify(score.issues || []),
            recommendations: JSON.stringify(score.recommendations || []),
            timestamp: new Date().toISOString()
          };
          
          pageResults.push(pageResult);
          
          // Write to CSV immediately to avoid OOM
          try {
            await csvWriter.writeRecords([pageResult]);
          } catch (csvError) {
            console.warn(`  Warning: Failed to write CSV record: ${csvError.message}`);
          }
          
          // Save to database
          await savePageScore({
            url: page.url,
            companyName: company.name,
            runNumber: runNumber,
            ...score.scores,
            globalScore: score.globalScore,
            issues: JSON.stringify(score.issues || []),
            analyzedAt: new Date()
          });
          
          // Show progress
          if ((index + 1) % 10 === 0) {
            console.log(`  Analyzed ${index + 1}/${crawledPages.length} pages`);
          }
        } catch (error) {
          console.error(`  Error analyzing ${page.url}: ${error.message}`);
          
          // Create error record with empty rule scores
          const errorRuleScores = {};
          Object.keys(ALL_RULE_IDS).forEach(ruleId => {
            errorRuleScores[`rule_${ruleId}`] = '';
          });
          
          const errorRecord = {
            company: company.name,
            companyUrl: company.url,
            pageUrl: page.url,
            run: runNumber,
            pageCategory: 'error',
            analysisLevel: 'excluded',
            technicalScore: '',
            contentScore: '',
            authorityScore: '',
            qualityScore: '',
            globalScore: 0,
            llmUsageCount: 0,
            ...errorRuleScores,
            technicalRules: '',
            contentRules: '',
            authorityRules: '',
            qualityRules: '',
            issues: JSON.stringify([{dimension: 'technical', severity: 'critical', description: error.message}]),
            recommendations: JSON.stringify([]),
            timestamp: new Date().toISOString()
          };
          
          pageResults.push(errorRecord);
          
          // Write error record to CSV immediately
          try {
            await csvWriter.writeRecords([errorRecord]);
          } catch (csvError) {
            console.warn(`  Warning: Failed to write error CSV record: ${csvError.message}`);
          }
        }
      })
    );
    
    await Promise.all(analysisPromises);
    
    // Calculate and show aggregate scores for logging
    const validPages = pageResults.filter(p => p.globalScore > 0);
    if (validPages.length > 0) {
      const avgGlobalScore = validPages.reduce((sum, p) => sum + p.globalScore, 0) / validPages.length;
      const avgTechnical = validPages.filter(p => p.technicalScore !== '').reduce((sum, p) => sum + p.technicalScore, 0) / validPages.filter(p => p.technicalScore !== '').length || 0;
      const avgContent = validPages.filter(p => p.contentScore !== '').reduce((sum, p) => sum + p.contentScore, 0) / validPages.filter(p => p.contentScore !== '').length || 0;
      const avgAuthority = validPages.filter(p => p.authorityScore !== '').reduce((sum, p) => sum + p.authorityScore, 0) / validPages.filter(p => p.authorityScore !== '').length || 0;
      const avgQuality = validPages.filter(p => p.qualityScore !== '').reduce((sum, p) => sum + p.qualityScore, 0) / validPages.filter(p => p.qualityScore !== '').length || 0;
      
      console.log(`\n  🏢 === COMPANY ANALYSIS COMPLETE: ${company.name} ===`);
      console.log(`     📄 Pages Analyzed: ${validPages.length}/${crawledPages.length}`);
      console.log(`     🌐 Global Score Average: ${avgGlobalScore.toFixed(1)}/100`);
      console.log(`     📊 Dimension Averages:`);
      console.log(`        Technical: ${avgTechnical.toFixed(1)}/100`);
      console.log(`        Content:   ${avgContent.toFixed(1)}/100`);
      console.log(`        Authority: ${avgAuthority.toFixed(1)}/100`);
      console.log(`        Quality:   ${avgQuality.toFixed(1)}/100`);
      console.log(`  =====================================\n`);
    } else {
      console.log(`\n  ❌ No valid pages analyzed for ${company.name}\n`);
    }
    
    return pageResults;
    
  } catch (error) {
    console.error(`Error analyzing ${company.name}: ${error.message}`);
    
    // Create error record with empty rule scores
    const errorRuleScores = {};
    Object.keys(ALL_RULE_IDS).forEach(ruleId => {
      errorRuleScores[`rule_${ruleId}`] = '';
    });
    
    const companyErrorRecord = {
      company: company.name,
      companyUrl: company.url,
      pageUrl: company.url,
      run: runNumber,
      pageCategory: 'error',
      analysisLevel: 'excluded',
      technicalScore: '',
      contentScore: '',
      authorityScore: '',
      qualityScore: '',
      globalScore: 0,
      llmUsageCount: 0,
      ...errorRuleScores,
      technicalRules: '',
      contentRules: '',
      authorityRules: '',
      qualityRules: '',
      issues: JSON.stringify([{dimension: 'technical', severity: 'critical', description: error.message}]),
      recommendations: JSON.stringify([]),
      timestamp: new Date().toISOString()
    };
    
    // Write company error record to CSV immediately
    try {
      await csvWriter.writeRecords([companyErrorRecord]);
    } catch (csvError) {
      console.warn(`  Warning: Failed to write company error CSV record: ${csvError.message}`);
    }
    
    return [companyErrorRecord];
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
  
  // Initialize CSV writer with all rule columns
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
  const outputDir = path.join(__dirname, 'data', 'page-intelligence');
  
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const outputPath = path.join(outputDir, `page-intelligence-results-${dateStr}-${timeStr}.csv`);
  
  // Create CSV header with all rule score columns
  const csvHeader = [
    { id: 'company', title: 'Company' },
    { id: 'companyUrl', title: 'Company URL' },
    { id: 'pageUrl', title: 'Page URL' },
    { id: 'run', title: 'Run' },
    { id: 'pageCategory', title: 'Page Category' },
    { id: 'analysisLevel', title: 'Analysis Level' },
    { id: 'technicalScore', title: 'Technical Score' },
    { id: 'contentScore', title: 'Content Score' },
    { id: 'authorityScore', title: 'Authority Score' },
    { id: 'qualityScore', title: 'Quality Score' },
    { id: 'globalScore', title: 'Global Score' },
    { id: 'llmUsageCount', title: 'LLM Usage Count' },
    // Add individual rule score columns
    ...Object.entries(ALL_RULE_IDS).map(([ruleId, ruleName]) => ({
      id: `rule_${ruleId}`,
      title: ruleName
    })),
    { id: 'technicalRules', title: 'Technical Rules Applied' },
    { id: 'contentRules', title: 'Content Rules Applied' },
    { id: 'authorityRules', title: 'Authority Rules Applied' },
    { id: 'qualityRules', title: 'Quality Rules Applied' },
    { id: 'issues', title: 'Issues (JSON)' },
    { id: 'recommendations', title: 'Recommendations (JSON)' },
    { id: 'timestamp', title: 'Timestamp' }
  ];
  
  const csvWriter = createObjectCsvWriter({
    path: outputPath,
    header: csvHeader
  });
  
  console.log(`\nCSV output will be written to: ${outputPath}`);
  
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
      
      // Filter by specific URLs if provided
      if (config.filterUrls && config.filterUrls.length > 0) {
        // Normalize URLs for comparison (handle trailing slashes, www, etc.)
        const normalizeUrl = (url) => {
          try {
            const u = new URL(url.toLowerCase());
            // Remove trailing slash and www
            return u.hostname.replace(/^www\./, '') + u.pathname.replace(/\/$/, '');
          } catch {
            return url.toLowerCase().replace(/\/$/, '');
          }
        };
        
        const filterSet = new Set(config.filterUrls.map(normalizeUrl));
        const originalCount = companies.length;
        
        companies = companies.filter(company => {
          const normalized = normalizeUrl(company.url);
          // Check exact match or if any filter URL is contained in the company URL
          return filterSet.has(normalized) || 
                 Array.from(filterSet).some(f => normalized.includes(f) || f.includes(normalized));
        });
        
        console.log(`Filtered from ${originalCount} to ${companies.length} companies matching specified URLs`);
        
        // Report what was matched
        if (companies.length > 0) {
          console.log('Matched companies:');
          companies.forEach(c => console.log(`  - ${c.name}: ${c.url}`));
        }
        
        // Report any URLs that weren't found
        const foundUrls = new Set(companies.map(c => normalizeUrl(c.url)));
        const notFound = config.filterUrls.filter(u => {
          const normalized = normalizeUrl(u);
          return !Array.from(foundUrls).some(f => f.includes(normalized) || normalized.includes(f));
        });
        if (notFound.length > 0) {
          console.log(`\nWarning: Following URLs not found in CSV: ${notFound.join(', ')}`);
        }
      } else if (config.companies > 0) {
        companies = companies.slice(0, config.companies);
        console.log(`Processing first ${config.companies} companies`);
      }
    }
    
    // Create results array for all pages
    const allPageResults = [];
    let processedCount = 0;
    
    // Process each company
    for (const company of companies) {
      for (let run = 1; run <= config.runs; run++) {
        const pageResults = await analyzeCompany(company, run, config, csvWriter);
        if (pageResults && pageResults.length > 0) {
          allPageResults.push(...pageResults);
        }
        processedCount++;
        
        // Show overall progress
        const totalRuns = companies.length * config.runs;
        const progress = (processedCount / totalRuns * 100).toFixed(1);
        console.log(`Overall progress: ${processedCount}/${totalRuns} (${progress}%)`);
      }
    }
    
    console.log(`\nCSV results have been written incrementally to: ${outputPath}`);
    
    // Summary
    console.log('\n=== Analysis Summary ===');
    console.log(`Total companies analyzed: ${companies.length}`);
    console.log(`Total pages analyzed: ${allPageResults.length}`);
    console.log(`Successful page analyses: ${allPageResults.filter(p => p.globalScore > 0).length}`);
    console.log(`Failed page analyses: ${allPageResults.filter(p => p.globalScore === 0).length}`);
    console.log(`LLM-enabled pages: ${allPageResults.filter(p => p.llmUsageCount > 0).length}`);
    
    if (allPageResults.length > 0) {
      const validPages = allPageResults.filter(p => p.globalScore > 0);
      if (validPages.length > 0) {
        const avgGlobalScore = validPages.reduce((sum, p) => sum + p.globalScore, 0) / validPages.length;
        console.log(`Average global score across all pages: ${avgGlobalScore.toFixed(1)}/100`);
        
        // Page category breakdown
        const categoryBreakdown = {};
        validPages.forEach(p => {
          categoryBreakdown[p.pageCategory] = (categoryBreakdown[p.pageCategory] || 0) + 1;
        });
        console.log('\nPage categories analyzed:');
        Object.entries(categoryBreakdown)
          .sort((a, b) => b[1] - a[1])
          .forEach(([category, count]) => {
            console.log(`  ${category}: ${count} pages`);
          });
        
        // Detailed URL recap
        console.log('\n=== URL Analysis Recap ===');
        console.log('Pages analyzed (sorted by global score):');
        
        // Sort pages by global score descending
        const sortedPages = [...allPageResults].sort((a, b) => b.globalScore - a.globalScore);
        
        sortedPages.forEach((page, index) => {
          const urlDisplay = page.pageUrl.length > 80 
            ? page.pageUrl.substring(0, 77) + '...' 
            : page.pageUrl;
          
          console.log(`\n  ${index + 1}. ${urlDisplay}`);
          console.log(`     Company: ${page.company}`);
          console.log(`     Category: ${page.pageCategory} (${page.analysisLevel})`);
          console.log(`     Scores: Tech:${page.technicalScore || 'N/A'} | Content:${page.contentScore || 'N/A'} | Auth:${page.authorityScore || 'N/A'} | Quality:${page.qualityScore || 'N/A'}`);
          console.log(`     Global Score: ${page.globalScore}/100`);
          
          // Show critical issues if any
          try {
            const issues = JSON.parse(page.issues || '[]');
            const criticalIssues = issues.filter(i => i.severity === 'critical');
            const highIssues = issues.filter(i => i.severity === 'high');
            
            if (criticalIssues.length > 0 || highIssues.length > 0) {
              console.log(`     Issues: ${criticalIssues.length} critical, ${highIssues.length} high`);
            }
          } catch (e) {
            // Ignore JSON parse errors
          }
        });
        
        // Top performers
        if (sortedPages.length > 1) {
          console.log('\n=== Top Performing Pages ===');
          sortedPages.slice(0, 3).forEach((page, index) => {
            console.log(`  ${index + 1}. ${page.pageUrl.substring(0, 60)}... (Score: ${page.globalScore}/100)`);
          });
        }
        
        // Pages needing attention
        const lowScorePages = sortedPages.filter(p => p.globalScore < 50);
        if (lowScorePages.length > 0) {
          console.log('\n=== Pages Needing Attention (Score < 50) ===');
          lowScorePages.slice(0, 5).forEach((page, index) => {
            console.log(`  ${index + 1}. ${page.pageUrl.substring(0, 60)}... (Score: ${page.globalScore}/100)`);
          });
        }
      }
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