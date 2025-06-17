const axios = require('axios');
require('dotenv').config();

const PORT = process.env.PORT || 3000;
const API_URL = `http://localhost:${PORT}`;

async function testMistralWebSearch() {
  console.log('🧪 Testing Mistral Web Search Capability...\n');

  try {
    // Test query that requires web search
    const testPrompt = 'What are the latest features announced for Mistral AI models in 2025? Please search for recent announcements.';
    
    console.log('📝 Test Prompt:', testPrompt);
    console.log('\n🔍 Calling Mistral with web search enabled...\n');

    const response = await axios.post(`${API_URL}/llm/test`, {
      prompt: testPrompt,
      provider: 'Mistral',
      model: 'mistral-medium-2505',
      webAccess: true,
      temperature: 0.7,
      maxTokens: 500
    });

    const result = response.data;
    
    console.log('✅ Response received!\n');
    console.log('📊 Model Version:', result.modelVersion);
    console.log('🌐 Web Search Used:', result.usedWebSearch || false);
    console.log('📝 Token Usage:', result.tokenUsage);
    
    if (result.toolUsage && result.toolUsage.length > 0) {
      console.log('\n🔧 Tool Usage:');
      result.toolUsage.forEach((tool, index) => {
        console.log(`  ${index + 1}. Type: ${tool.type}`);
        console.log(`     Query: ${tool.parameters?.query || 'N/A'}`);
        console.log(`     Status: ${tool.execution_details?.status || 'N/A'}`);
      });
    }
    
    if (result.annotations && result.annotations.length > 0) {
      console.log('\n📚 Citations Found:', result.annotations.length);
      result.annotations.forEach((citation, index) => {
        console.log(`  ${index + 1}. ${citation.title || 'Web Source'}`);
        console.log(`     URL: ${citation.url}`);
      });
    } else {
      console.log('\n⚠️  No citations found in response');
    }
    
    console.log('\n💬 Response Text:');
    console.log('-'.repeat(80));
    console.log(result.text);
    console.log('-'.repeat(80));
    
    // Test without web search for comparison
    console.log('\n\n🔄 Testing same prompt WITHOUT web search...\n');
    
    const noWebResponse = await axios.post(`${API_URL}/llm/test`, {
      prompt: testPrompt,
      provider: 'Mistral',
      model: 'mistral-medium-2505',
      webAccess: false,
      temperature: 0.7,
      maxTokens: 500
    });
    
    console.log('✅ Non-web response received!');
    console.log('🌐 Web Search Used:', noWebResponse.data.usedWebSearch || false);
    console.log('📚 Citations:', noWebResponse.data.annotations?.length || 0);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

// Run the test
testMistralWebSearch();