// Test script to trigger a new crawl with categorization
const axios = require('axios');

const API_URL = 'http://localhost:3001/user/projects';
const TOKEN = process.env.USER_TOKEN;
const PROJECT_ID = process.env.PROJECT_ID;

async function triggerCrawl() {
  try {
    console.log('Triggering crawl for project:', PROJECT_ID);
    
    const response = await axios.post(
      `${API_URL}/${PROJECT_ID}/crawler/crawl`,
      {
        maxPages: 10,  // Limit to 10 pages for testing
        crawlDelay: 1000
      },
      {
        headers: { Authorization: `Bearer ${TOKEN}` }
      }
    );
    
    console.log('Crawl triggered successfully!');
    console.log('Response:', response.data);
    
    // Poll for status
    console.log('\nMonitoring crawl progress...');
    let isComplete = false;
    
    while (!isComplete) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      
      const statusResponse = await axios.get(
        `${API_URL}/${PROJECT_ID}/crawler/status`,
        {
          headers: { Authorization: `Bearer ${TOKEN}` }
        }
      );
      
      const { crawl, lastAnalysis } = statusResponse.data;
      
      if (crawl.isRunning) {
        console.log(`Progress: ${crawl.pagesAnalyzed}/${crawl.totalPages} pages analyzed`);
      } else {
        isComplete = true;
        console.log('\nCrawl completed!');
        console.log(`Total pages crawled: ${crawl.pagesCrawled}`);
        console.log(`Total pages analyzed: ${crawl.pagesAnalyzed}`);
        
        if (lastAnalysis) {
          console.log(`\nLast analysis:`);
          console.log(`  Status: ${lastAnalysis.status}`);
          console.log(`  Pages analyzed: ${lastAnalysis.analyzedPages}`);
          console.log(`  Completed at: ${lastAnalysis.completedAt}`);
        }
      }
    }
    
    // Now check the categorization results
    console.log('\nFetching categorization results...');
    const { exec } = require('child_process');
    exec(`USER_TOKEN=${TOKEN} PROJECT_ID=${PROJECT_ID} node test-categorization.js`, (error, stdout, stderr) => {
      if (error) {
        console.error('Error running categorization test:', error);
        return;
      }
      console.log(stdout);
    });
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

// Usage instructions
if (!TOKEN || !PROJECT_ID) {
  console.log('Usage: USER_TOKEN=your_token PROJECT_ID=your_project_id node test-trigger-crawl.js');
  console.log('\nTo get a token: curl -X POST http://localhost:3001/auth/token -H "Content-Type: application/json" -d \'{"email":"your-email"}\'');
  process.exit(1);
}

triggerCrawl();