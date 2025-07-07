#!/usr/bin/env node

require('dotenv').config();

// Test LLM integration for the standalone script
const { PageCategorizerService } = require('./lib/page-categorizer');
const { initializeLLMClients } = require('./lib/page-analyzer-with-llm');

async function testLLMIntegration() {
  console.log('Testing LLM Integration...\n');
  
  // Initialize LLM clients
  const llmClients = initializeLLMClients();
  
  if (Object.keys(llmClients).length === 0) {
    console.error('❌ No LLM clients available. Please set API keys in .env file.');
    process.exit(1);
  }
  
  // Test page categorization
  const testUrl = 'https://example.com/ultimate-guide-to-seo';
  const testHtml = `
    <html>
      <head>
        <title>Ultimate Guide to SEO in 2024 - Complete Tutorial</title>
        <meta name="description" content="Learn everything about SEO with our comprehensive guide covering technical SEO, content optimization, and link building strategies.">
      </head>
      <body>
        <h1>The Ultimate Guide to SEO in 2024</h1>
        <nav>
          <h2>Table of Contents</h2>
          <ul>
            <li><a href="#intro">Introduction</a></li>
            <li><a href="#technical">Technical SEO</a></li>
            <li><a href="#content">Content Optimization</a></li>
            <li><a href="#links">Link Building</a></li>
          </ul>
        </nav>
        <section>
          <h2>Introduction to SEO</h2>
          <p>Search Engine Optimization (SEO) is the practice of improving your website's visibility in search engines. This comprehensive guide covers everything you need to know to succeed in 2024.</p>
        </section>
        <section>
          <h2>Technical SEO Fundamentals</h2>
          <p>Technical SEO forms the foundation of your optimization efforts. In this section, we'll cover site speed, mobile optimization, crawlability, and more...</p>
        </section>
      </body>
    </html>
  `;
  
  try {
    const categorizer = new PageCategorizerService(llmClients);
    
    console.log('Testing page categorization...');
    const category = await categorizer.categorize(testUrl, testHtml, {
      title: 'Ultimate Guide to SEO in 2024 - Complete Tutorial',
      metaDescription: 'Learn everything about SEO with our comprehensive guide'
    });
    
    console.log('\nCategorization Result:');
    console.log(`  Type: ${category.type}`);
    console.log(`  Confidence: ${category.confidence}`);
    console.log(`  Analysis Level: ${category.analysisLevel}`);
    console.log(`  Reason: ${category.reason}`);
    
    // Test LLM-enabled rule
    console.log('\nTesting LLM-enabled rule...');
    const InDepthGuidesLLMRule = require('./lib/rules/quality/in-depth-guides-llm.rule');
    const rule = new InDepthGuidesLLMRule(llmClients);
    
    const cheerio = require('cheerio');
    const pageContent = {
      url: testUrl,
      html: testHtml,
      $: cheerio.load(testHtml),
      pageCategory: category
    };
    
    const result = await rule.evaluate(pageContent);
    
    console.log('\nRule Evaluation Result:');
    console.log(`  Score: ${result.score}/100`);
    console.log(`  Passed: ${result.passed}`);
    console.log('\n  Evidence:');
    result.evidence.forEach(e => console.log(`    - ${e}`));
    
    if (result.recommendations && result.recommendations.length > 0) {
      console.log('\n  Recommendations:');
      result.recommendations.forEach(r => console.log(`    - ${r}`));
    }
    
    console.log('\n✅ LLM integration test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run test
testLLMIntegration().catch(console.error);