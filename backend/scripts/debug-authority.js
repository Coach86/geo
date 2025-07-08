// Debug Authority dimension issue
const { analyzeWithRules } = require('./lib/rules/rule-engine-with-filtering');
const { crawlUrl } = require('./lib/crawler');
const { initDatabase } = require('./lib/database');
const cheerio = require('cheerio');

async function debugAuthority() {
  console.log('=== DEBUG AUTHORITY DIMENSION ===');
  
  // Initialize database
  const db = initDatabase();
  
  try {
    // Get the problematic page
    const url = 'https://www.agryco.com/24-0-0-18so3/p211171';
    console.log(`Analyzing: ${url}`);
    
    // Crawl the page
    const pageData = await crawlUrl(url, {});
    if (!pageData || pageData.error) {
      console.error('Failed to crawl page:', pageData?.error);
      return;
    }
    
    // Mock LLM clients (simplified)
    const llmClients = {
      openai: { apiKey: process.env.OPENAI_API_KEY },
      anthropic: { apiKey: process.env.ANTHROPIC_API_KEY }
    };
    
    // Prepare pageContent with Cheerio like the real pipeline
    const pageContent = {
      url: pageData.url,
      html: pageData.html,
      $: cheerio.load(pageData.html),
      title: pageData.title,
      meta_description: pageData.meta_description
    };
    
    // Analyze with rules
    const results = await analyzeWithRules(pageContent, {
      llmClients,
      pageCategory: 'product_detail_page', // Force the problematic category
      analysisLevel: 'full'
    });
    
    console.log('\n=== RESULTS ===');
    console.log('Authority Score:', results.scores.authority);
    console.log('Authority Rule Results:', results.ruleResults.authority?.length || 0, 'rules');
    
    if (results.ruleResults.authority) {
      console.log('\nAuthority Rule Details:');
      results.ruleResults.authority.forEach((rule, i) => {
        console.log(`  ${i+1}. ${rule.ruleName || rule.ruleId}: score=${rule.score}, weight=${rule.weight}, contribution=${rule.contribution}`);
      });
      
      // Manual aggregation check
      const totalWeightedScore = results.ruleResults.authority.reduce((sum, r) => sum + r.contribution, 0);
      const totalWeight = results.ruleResults.authority.reduce((sum, r) => sum + r.weight, 0);
      const manualFinalScore = totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight * 100) : 0;
      
      console.log('\nManual calculation:');
      console.log(`Total weighted score: ${totalWeightedScore}`);
      console.log(`Total weight: ${totalWeight}`);
      console.log(`Manual final score: ${manualFinalScore}`);
    }
    
    console.log('\nDimension Results Authority:');
    console.log(JSON.stringify(results.dimensionResults.authority, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    db.close();
  }
}

// Only run if executed directly
if (require.main === module) {
  debugAuthority().catch(console.error);
}