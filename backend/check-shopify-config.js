const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3002/api';

async function checkConfig() {
  console.log('🔍 Checking Shopify Configuration\n');
  
  try {
    // Try to get health endpoint to ensure API is running
    const healthResponse = await axios.get(`${API_BASE_URL.replace('/api', '')}/health`);
    console.log('✅ API is running:', healthResponse.data);
    console.log('');
  } catch (error) {
    console.error('❌ API health check failed:', error.message);
    console.error('Make sure the backend is running on port 3002');
    return;
  }
  
  // Test with a deliberately invalid token to see the error details
  const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0ZXN0IjoidG9rZW4ifQ.invalid';
  
  try {
    await axios.post(`${API_BASE_URL}/auth/shopify/session`, {
      sessionToken: testToken
    });
  } catch (error) {
    console.log('Expected error response:');
    console.log('Status:', error.response?.status);
    console.log('Message:', error.response?.data?.message);
    console.log('');
    
    // The error logs from the backend will show us what API key and secret length it's using
    console.log('Check the backend logs for:');
    console.log('- "Signature verification failed" with apiKey and secretLength');
    console.log('- This will show what environment variables the backend is using');
  }
  
  console.log('\nTo fix authentication issues:');
  console.log('1. Ensure backend has these environment variables set:');
  console.log('   SHOPIFY_API_KEY=your_actual_api_key');
  console.log('   SHOPIFY_API_SECRET=your_actual_secret');
  console.log('');
  console.log('2. Run the test with the SAME values:');
  console.log('   SHOPIFY_API_KEY=your_actual_api_key SHOPIFY_API_SECRET=your_actual_secret node test-shopify-working.js');
}

checkConfig().catch(console.error);