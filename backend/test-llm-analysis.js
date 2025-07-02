const fetch = require('node-fetch');

const API_URL = process.env.API_URL || 'http://localhost:3000';
const PROJECT_ID = process.env.PROJECT_ID || 'c43e79b4-d521-426d-85e6-e1fdbe48e876';
const USER_TOKEN = process.env.USER_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbTR3ajJoZngwMDAxdXByMWxoZ3duaHQ2IiwidGVtcG9yYXJ5VG9rZW4iOnRydWUsImlhdCI6MTczNTMwODQ1OSwiZXhwIjoxNzM1OTEzMjU5fQ.TDdHNAqCEkMLUy6p6iy8QGqD0GQcJP50wA4hcAQSigg';

async function testLLMAnalysis() {
  console.log('Testing LLM Analysis Storage...\n');
  
  try {
    // 1. Get content scores
    console.log('1. Fetching content scores...');
    const scoresResponse = await fetch(`${API_URL}/api/user/projects/${PROJECT_ID}/crawler/content-scores?limit=1`, {
      headers: {
        'Authorization': `Bearer ${USER_TOKEN}`,
      },
    });
    
    if (!scoresResponse.ok) {
      throw new Error(`Failed to fetch scores: ${scoresResponse.status}`);
    }
    
    const data = await scoresResponse.json();
    
    if (!data.scores || data.scores.length === 0) {
      console.log('No content scores found. Please run a content KPI analysis first.');
      return;
    }
    
    const firstScore = data.scores[0];
    console.log(`Found page: ${firstScore.url}`);
    console.log(`Analysis type: ${firstScore.llmAnalysis?.analysisType || 'not found'}`);
    
    // 2. Get LLM analysis details
    console.log('\n2. Fetching LLM analysis details...');
    const encodedUrl = encodeURIComponent(firstScore.url);
    const llmResponse = await fetch(`${API_URL}/api/user/projects/${PROJECT_ID}/crawler/content-scores/${encodedUrl}/llm-analysis`, {
      headers: {
        'Authorization': `Bearer ${USER_TOKEN}`,
      },
    });
    
    if (!llmResponse.ok) {
      throw new Error(`Failed to fetch LLM analysis: ${llmResponse.status}`);
    }
    
    const llmData = await llmResponse.json();
    
    console.log('\nLLM Analysis Details:');
    console.log('- Analysis Type:', llmData.analysisType);
    console.log('- Model:', llmData.model);
    console.log('- Timestamp:', llmData.timestamp);
    
    if (llmData.tokensUsed) {
      console.log('- Tokens Used:', `${llmData.tokensUsed.input} input + ${llmData.tokensUsed.output} output = ${llmData.tokensUsed.input + llmData.tokensUsed.output} total`);
    }
    
    if (llmData.prompt) {
      console.log('\nPrompt Preview (first 200 chars):');
      console.log(llmData.prompt.substring(0, 200) + '...');
    }
    
    if (llmData.response) {
      console.log('\nResponse Preview (first 200 chars):');
      console.log(llmData.response.substring(0, 200) + '...');
    }
    
    console.log('\n✅ LLM Analysis is being stored and retrieved correctly!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testLLMAnalysis();