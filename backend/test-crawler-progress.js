const fetch = require('node-fetch');

const API_URL = process.env.API_URL || 'http://localhost:3000';
const PROJECT_ID = process.env.PROJECT_ID || 'c43e79b4-d521-426d-85e6-e1fdbe48e876';
const USER_TOKEN = process.env.USER_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbTR3ajJoZngwMDAxdXByMWxoZ3duaHQ2IiwidGVtcG9yYXJ5VG9rZW4iOnRydWUsImlhdCI6MTczNTMwODQ1OSwiZXhwIjoxNzM1OTEzMjU5fQ.TDdHNAqCEkMLUy6p6iy8QGqD0GQcJP50wA4hcAQSigg';

async function testCrawlerProgress() {
  console.log('Testing Crawler Progress Updates...\n');
  
  try {
    // 1. Check current crawl status
    console.log('1. Checking current crawl status...');
    const statusResponse = await fetch(`${API_URL}/api/user/projects/${PROJECT_ID}/crawler/status`, {
      headers: {
        'Authorization': `Bearer ${USER_TOKEN}`,
      },
    });
    
    if (!statusResponse.ok) {
      throw new Error(`Failed to fetch status: ${statusResponse.status}`);
    }
    
    const status = await statusResponse.json();
    console.log('Current status:', JSON.stringify(status.crawl, null, 2));
    
    if (status.crawl.isActive) {
      console.log('\n✅ Crawl is currently active!');
      console.log(`Progress: ${status.crawl.crawledPages}/${status.crawl.totalPages} pages`);
      console.log(`Current URL: ${status.crawl.currentUrl}`);
    } else {
      console.log('\n❌ No active crawl found.');
      console.log('To test progress, start a crawl from the UI and run this script again.');
    }
    
    // 2. If you want to start a new crawl (uncomment below)
    /*
    console.log('\n2. Starting a new crawl...');
    const crawlResponse = await fetch(`${API_URL}/api/user/projects/${PROJECT_ID}/crawler/crawl`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${USER_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        maxPages: 10,
        crawlDelay: 1000,
      }),
    });
    
    if (!crawlResponse.ok) {
      throw new Error(`Failed to start crawl: ${crawlResponse.status}`);
    }
    
    const result = await crawlResponse.json();
    console.log('Crawl started:', result);
    */
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testCrawlerProgress();