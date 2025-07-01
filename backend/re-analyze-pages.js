// Script to re-analyze existing pages to add category data
const axios = require('axios');

const API_URL = 'http://localhost:3001/user/projects';
const TOKEN = process.env.USER_TOKEN;
const PROJECT_ID = process.env.PROJECT_ID;

async function reAnalyzePages() {
  try {
    console.log('Re-analyzing pages to add category data...\n');
    
    // First, get current content scores
    const response = await axios.get(
      `${API_URL}/${PROJECT_ID}/crawler/content-scores`,
      {
        headers: { Authorization: `Bearer ${TOKEN}` }
      }
    );
    
    const { scores } = response.data;
    console.log(`Found ${scores.length} pages to re-analyze\n`);
    
    // Clear existing scores to force re-analysis
    console.log('Triggering new analysis...');
    const crawlResponse = await axios.post(
      `${API_URL}/${PROJECT_ID}/crawler/crawl`,
      {
        maxPages: 50,  // Analyze up to 50 pages
        crawlDelay: 500
      },
      {
        headers: { Authorization: `Bearer ${TOKEN}` }
      }
    );
    
    console.log('Analysis triggered!');
    console.log('This will re-analyze all pages with category detection enabled.');
    console.log('\nMonitor progress with: USER_TOKEN=' + TOKEN + ' PROJECT_ID=' + PROJECT_ID + ' node test-trigger-crawl.js');
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

// Usage instructions
if (!TOKEN || !PROJECT_ID) {
  console.log('Usage: USER_TOKEN=your_token PROJECT_ID=your_project_id node re-analyze-pages.js');
  console.log('\nTo get a token: curl -X POST http://localhost:3001/auth/token -H "Content-Type: application/json" -d \'{"email":"your-email"}\'');
  process.exit(1);
}

reAnalyzePages();