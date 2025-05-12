const axios = require('axios');

/**
 * Brand Insight Test Script
 * 
 * This script takes a company URL, calls the identity card service to create or retrieve
 * a company profile, and then runs the batch processes to generate insights.
 */

// Default company URL if none is provided
const DEFAULT_URL = 'https://www.manpower.fr';

// Get company URL from command line arguments or use default
const companyUrl = process.argv[2] || DEFAULT_URL;

// Base API URL
const API_BASE = 'http://localhost:3000/api';

// Function to create an identity card from a URL
async function createIdentityCardFromUrl(url) {
  console.log('\n=== Creating Identity Card from URL ===');
  console.log(`URL: ${url}`);
  
  try {
    const response = await axios.post(
      `${API_BASE}/identity-card/from-url`,
      { url },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('\n=== Identity Card Created ===');
    console.log('Company ID:', response.data.id);
    console.log('Brand Name:', response.data.brandName);
    console.log('Industry:', response.data.industry);
    console.log('Short Description:', response.data.shortDescription);
    
    console.log('\nKey Features:');
    const keyFeatures = response.data.keyFeatures || [];
    keyFeatures.forEach(feature => console.log(`- ${feature}`));
    
    console.log('\nCompetitors:');
    const competitors = response.data.competitors || [];
    competitors.forEach(competitor => console.log(`- ${competitor}`));
    
    return response.data;
  } catch (error) {
    console.error('Failed to create identity card from URL:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Status code:', error.response.status);
    }
    throw error;
  }
}

// Function to wait for prompt set to be created
async function waitForPromptSet(companyId, timeout = 30000, interval = 2000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const response = await axios.get(`${API_BASE}/prompt-set/${companyId}`);
      if (response.data) {
        console.log('Prompt set is ready.');
        return response.data;
      }
    } catch (err) {
      // Not found yet, keep waiting
    }
    await new Promise(res => setTimeout(res, interval));
  }
  throw new Error('Timed out waiting for prompt set to be created');
}

// Function to run the spontaneous mentions pipeline
async function runSpontaneousPipeline(companyId) {
  console.log('\n=== Running Spontaneous Mentions Pipeline ===');
  
  try {
    const response = await axios.post(
      `${API_BASE}/batch/pipeline/spontaneous/${companyId}`,
      {},
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('\n=== Spontaneous Mentions Results ===');
    console.log('Mention Rate:', response.data.summary.mentionRate);
    console.log('Top Mentions:');
    response.data.summary.topMentions.forEach(company => console.log(`- ${company}`));
    
    console.log('\nDetailed Results:');
    response.data.results.forEach(result => {
      console.log(`- LLM: ${result.llmProvider}`);
      console.log(`  Mentioned: ${result.mentioned}`);
      if (result.topOfMind && result.topOfMind.length > 0) {
        console.log(`  Top of Mind: ${result.topOfMind.join(', ')}`);
      }
      if (result.originalPrompt) {
        console.log(`  Original Question: "${result.originalPrompt}"`);
      }
      if (result.llmResponse) {
        console.log(`  LLM Answer: "${result.llmResponse}"`);
      }
      if (result.error) {
        console.log(`  Error: ${result.error}`);
      }
      console.log(); // Add empty line for better separation
    });
    
    return response.data;
  } catch (error) {
    console.error('Failed to run spontaneous pipeline:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Status code:', error.response.status);
    }
    throw error;
  }
}

// Function to run the sentiment analysis pipeline
async function runSentimentPipeline(companyId) {
  console.log('\n=== Running Sentiment Analysis Pipeline ===');
  
  try {
    const response = await axios.post(
      `${API_BASE}/batch/pipeline/sentiment/${companyId}`,
      {},
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('\n=== Sentiment Analysis Results ===');
    console.log('Overall Sentiment:', response.data.summary.overallSentiment);
    console.log('Average Accuracy:', response.data.summary.averageAccuracy);
    
    console.log('\nDetailed Results:');
    response.data.results.forEach(result => {
      console.log(`- LLM: ${result.llmProvider}`);
      console.log(`  Sentiment: ${result.sentiment}`);
      console.log(`  Accuracy: ${result.accuracy}`);

      if (result.extractedFacts && result.extractedFacts.length > 0) {
        console.log(`  Extracted Facts:`);
        result.extractedFacts.forEach(fact => console.log(`    * ${fact}`));
      }

      if (result.originalPrompt) {
        console.log(`  Original Question: "${result.originalPrompt}"`);
      }
      if (result.llmResponse) {
        console.log(`  LLM Answer: "${result.llmResponse}"`);
      }

      if (result.error) {
        console.log(`  Error: ${result.error}`);
      }
      console.log(); // Add empty line for better separation
    });
    
    return response.data;
  } catch (error) {
    console.error('Failed to run sentiment pipeline:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Status code:', error.response.status);
    }
    throw error;
  }
}

// Function to run the comparison pipeline
async function runComparisonPipeline(companyId) {
  console.log('\n=== Running Comparison Pipeline ===');
  
  try {
    const response = await axios.post(
      `${API_BASE}/batch/pipeline/comparison/${companyId}`,
      {},
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('\n=== Comparison Results ===');
    console.log('Win Rate:', response.data.summary.winRate);
    console.log('Key Differentiators:');
    response.data.summary.keyDifferentiators.forEach(diff => console.log(`- ${diff}`));
    
    console.log('\nDetailed Results:');
    response.data.results.forEach(result => {
      console.log(`- LLM: ${result.llmProvider}`);
      console.log(`  Winner: ${result.winner}`);

      if (result.differentiators && result.differentiators.length > 0) {
        console.log(`  Differentiators: ${result.differentiators.join(', ')}`);
      }

      if (result.originalPrompt) {
        console.log(`  Original Question: "${result.originalPrompt}"`);
      }
      if (result.llmResponse) {
        console.log(`  LLM Answer: "${result.llmResponse}"`);
      }

      if (result.error) {
        console.log(`  Error: ${result.error}`);
      }
      console.log(); // Add empty line for better separation
    });
    
    return response.data;
  } catch (error) {
    console.error('Failed to run comparison pipeline:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Status code:', error.response.status);
    }
    throw error;
  }
}

// Main function to run the entire test
async function runBrandInsightTest() {
  console.log('=== BRAND INSIGHT TEST ===');
  console.log(`Testing company URL: ${companyUrl}`);
  
  try {
    // Step 1: Create identity card from URL
    console.log('\nStep 1: Creating company identity card from URL...');
    const company = await createIdentityCardFromUrl(companyUrl);
    
    // Step 1.5: Wait for prompt set to be created
    console.log('\nStep 1.5: Waiting for prompt set to be created...');
    await waitForPromptSet(company.id);
    
    // Step 2: Run each pipeline individually and display results
    console.log('\nStep 2: Running analysis pipelines...');
    const spontaneousResults = await runSpontaneousPipeline(company.id);
    const sentimentResults = await runSentimentPipeline(company.id);
    const comparisonResults = await runComparisonPipeline(company.id);
    
    // Step 3: Display combined report
    console.log('\n=== COMBINED BRAND REPORT ===');
    console.log(`Company: ${company.brandName} (ID: ${company.id})`);
    console.log('Generated at:', new Date().toISOString());
    
    console.log('\nSPONTANEOUS MENTIONS SUMMARY:');
    console.log(`- Mention Rate: ${spontaneousResults.summary.mentionRate.toFixed(2)}`);
    console.log(`- Top Mentions: ${spontaneousResults.summary.topMentions.join(', ')}`);
    
    console.log('\nSENTIMENT ANALYSIS SUMMARY:');
    console.log(`- Overall Sentiment: ${sentimentResults.summary.overallSentiment}`);
    console.log(`- Average Accuracy: ${sentimentResults.summary.averageAccuracy.toFixed(2)}`);
    
    console.log('\nCOMPARISON SUMMARY:');
    console.log(`- Win Rate: ${comparisonResults.summary.winRate.toFixed(2)}`);
    console.log(`- Key Differentiators: ${comparisonResults.summary.keyDifferentiators.join(', ')}`);
    
    console.log('\n=== TEST COMPLETED SUCCESSFULLY ===');
    return {
      success: true,
      companyId: company.id,
      brandName: company.brandName
    };
  } catch (error) {
    console.error('\n=== TEST FAILED ===');
    console.error('Error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the test
runBrandInsightTest().then(result => {
  console.log('\nTest result:', result.success ? 'SUCCESS' : 'FAILURE');
  process.exit(result.success ? 0 : 1);
});