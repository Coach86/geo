#!/usr/bin/env node

/**
 * Test script for the web crawler and content KPI functionality
 * Usage: node test-crawler.js [projectId]
 */

const axios = require('axios');

const API_BASE_URL = process.env.API_URL || 'http://localhost:3000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

async function loginAsAdmin() {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });
    
    return response.data.access_token;
  } catch (error) {
    console.error('Failed to login:', error.response?.data || error.message);
    throw error;
  }
}

async function getProjects(token) {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/projects`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    return response.data;
  } catch (error) {
    console.error('Failed to get projects:', error.response?.data || error.message);
    throw error;
  }
}

async function triggerCrawl(token, projectId) {
  try {
    console.log(`\nTriggering crawl for project ${projectId}...`);
    
    const response = await axios.post(
      `${API_BASE_URL}/api/projects/${projectId}/crawler/crawl`,
      {
        maxPages: 10, // Start with a small number for testing
        crawlDelay: 1000,
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Failed to trigger crawl:', error.response?.data || error.message);
    throw error;
  }
}

async function getCrawlStatus(token, projectId) {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/api/projects/${projectId}/crawler/status`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Failed to get crawl status:', error.response?.data || error.message);
    throw error;
  }
}

async function getContentScores(token, projectId) {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/api/projects/${projectId}/crawler/content-scores`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Failed to get content scores:', error.response?.data || error.message);
    throw error;
  }
}

async function getContentReport(token, projectId) {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/api/projects/${projectId}/crawler/content-scores/report`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Failed to get content report:', error.response?.data || error.message);
    throw error;
  }
}

async function waitForCrawlCompletion(token, projectId, maxWaitMs = 300000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitMs) {
    const status = await getCrawlStatus(token, projectId);
    
    if (!status.crawl.isRunning) {
      return status;
    }
    
    console.log(`Crawl in progress... ${status.crawl.successfulPages}/${status.crawl.totalPages} pages crawled`);
    
    // Wait 5 seconds before checking again
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  throw new Error('Crawl timed out');
}

async function main() {
  try {
    console.log('🕷️  Web Crawler Test Script');
    console.log('========================\n');

    // Login
    console.log('Logging in as admin...');
    const token = await loginAsAdmin();
    console.log('✅ Logged in successfully\n');

    // Get project ID from command line or use first available project
    let projectId = process.argv[2];
    
    if (!projectId) {
      console.log('No project ID provided, fetching available projects...');
      const projects = await getProjects(token);
      
      if (projects.length === 0) {
        console.error('❌ No projects found. Please create a project first.');
        process.exit(1);
      }
      
      projectId = projects[0].projectId;
      console.log(`Using project: ${projects[0].brandName} (${projectId})`);
    }

    // Check initial status
    console.log('\nChecking initial crawl status...');
    const initialStatus = await getCrawlStatus(token, projectId);
    console.log('Current status:', initialStatus);

    // Trigger crawl
    const crawlResult = await triggerCrawl(token, projectId);
    console.log('\n✅ Crawl triggered:', crawlResult.message);

    // Wait for completion
    console.log('\nWaiting for crawl to complete...');
    const finalStatus = await waitForCrawlCompletion(token, projectId);
    console.log('\n✅ Crawl completed!');
    console.log(`  - Crawled pages: ${finalStatus.crawl.successfulPages}`);
    console.log(`  - Failed pages: ${finalStatus.crawl.failedPages}`);
    console.log(`  - Processed pages: ${finalStatus.crawl.processedPages}`);

    // Get content scores
    console.log('\nFetching content scores...');
    const scores = await getContentScores(token, projectId);
    console.log(`\n📊 Content Score Statistics:`);
    console.log(`  - Total analyzed pages: ${scores.stats.totalPages}`);
    console.log(`  - Average global score: ${Math.round(scores.stats.avgGlobalScore)}/100`);
    console.log(`  - Score breakdown:`);
    console.log(`    • Authority: ${Math.round(scores.stats.avgAuthorityScore)}/100`);
    console.log(`    • Freshness: ${Math.round(scores.stats.avgFreshnessScore)}/100`);
    console.log(`    • Structure: ${Math.round(scores.stats.avgStructureScore)}/100`);
    console.log(`    • Snippet: ${Math.round(scores.stats.avgSnippetScore)}/100`);
    console.log(`    • Brand: ${Math.round(scores.stats.avgBrandScore)}/100`);

    // Get detailed report
    console.log('\nFetching detailed report...');
    const report = await getContentReport(token, projectId);
    
    console.log('\n📈 Top Performing Pages:');
    report.topPerformingPages.forEach(page => {
      console.log(`  - ${page.url} (Score: ${page.globalScore})`);
      console.log(`    Strengths: ${page.strengths.join(', ')}`);
    });

    console.log('\n📉 Low Performing Pages:');
    report.lowPerformingPages.forEach(page => {
      console.log(`  - ${page.url} (Score: ${page.globalScore})`);
      page.topIssues.forEach(issue => {
        console.log(`    • [${issue.severity}] ${issue.description}`);
      });
    });

    console.log('\n💡 Recommendations:');
    report.recommendations.forEach((rec, index) => {
      console.log(`  ${index + 1}. ${rec}`);
    });

    console.log('\n✅ Test completed successfully!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
main();