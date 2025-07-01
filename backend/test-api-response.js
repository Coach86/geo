// Test script to check raw API response
const axios = require('axios');

const API_URL = 'http://localhost:3001/user/projects';
const TOKEN = process.env.USER_TOKEN;
const PROJECT_ID = process.env.PROJECT_ID;

async function checkApiResponse() {
  try {
    console.log('Checking raw API response for content scores...\n');
    
    const response = await axios.get(
      `${API_URL}/${PROJECT_ID}/crawler/content-scores?limit=3`,
      {
        headers: { Authorization: `Bearer ${TOKEN}` }
      }
    );
    
    console.log('Raw API Response:');
    console.log(JSON.stringify(response.data, null, 2));
    
    // Check first score in detail
    if (response.data.scores && response.data.scores.length > 0) {
      const firstScore = response.data.scores[0];
      console.log('\n\nFirst score object keys:');
      console.log(Object.keys(firstScore));
      
      console.log('\n\nCategory fields:');
      console.log(`pageCategory: ${firstScore.pageCategory}`);
      console.log(`analysisLevel: ${firstScore.analysisLevel}`);
      console.log(`categoryConfidence: ${firstScore.categoryConfidence}`);
    }
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

// Usage instructions
if (!TOKEN || !PROJECT_ID) {
  console.log('Usage: USER_TOKEN=your_token PROJECT_ID=your_project_id node test-api-response.js');
  console.log('\nTo get a token: curl -X POST http://localhost:3001/auth/token -H "Content-Type: application/json" -d \'{"email":"your-email"}\'');
  process.exit(1);
}

checkApiResponse();