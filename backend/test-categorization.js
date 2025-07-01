// Test script for page categorization
const axios = require('axios');

const API_URL = 'http://localhost:3001/user/projects';
const TOKEN = process.env.USER_TOKEN;
const PROJECT_ID = process.env.PROJECT_ID;

async function testCategorization() {
  try {
    console.log('Testing page categorization feature...\n');
    
    // First get content scores to see if category data is included
    console.log('1. Fetching content scores...');
    const response = await axios.get(
      `${API_URL}/${PROJECT_ID}/crawler/content-scores`,
      {
        headers: { Authorization: `Bearer ${TOKEN}` }
      }
    );
    
    const { scores } = response.data;
    console.log(`Found ${scores.length} analyzed pages\n`);
    
    // Check first few pages for category data
    console.log('2. Checking category data:');
    scores.slice(0, 5).forEach((score, index) => {
      console.log(`\nPage ${index + 1}: ${score.url}`);
      console.log(`  Category: ${score.pageCategory || 'NOT SET'}`);
      console.log(`  Analysis Level: ${score.analysisLevel || 'NOT SET'}`);
      console.log(`  Confidence: ${score.categoryConfidence ? (score.categoryConfidence * 100).toFixed(1) + '%' : 'NOT SET'}`);
      console.log(`  Global Score: ${score.globalScore}`);
    });
    
    // Summary
    const pagesWithCategory = scores.filter(s => s.pageCategory).length;
    const categoriesCount = {};
    scores.forEach(s => {
      const cat = s.pageCategory || 'unknown';
      categoriesCount[cat] = (categoriesCount[cat] || 0) + 1;
    });
    
    console.log('\n3. Summary:');
    console.log(`  Pages with categories: ${pagesWithCategory}/${scores.length}`);
    console.log('\n  Category distribution:');
    Object.entries(categoriesCount).forEach(([cat, count]) => {
      console.log(`    ${cat}: ${count} pages`);
    });
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

// Usage instructions
if (!TOKEN || !PROJECT_ID) {
  console.log('Usage: USER_TOKEN=your_token PROJECT_ID=your_project_id node test-categorization.js');
  console.log('\nTo get a token: curl -X POST http://localhost:3001/auth/token -H "Content-Type: application/json" -d \'{"email":"your-email"}\'');
  process.exit(1);
}

testCategorization();