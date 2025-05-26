#!/usr/bin/env node

/**
 * Test script for Google Grounding functionality
 * Tests the redirect URL resolution and web search query handling
 */

const axios = require('axios');

const API_URL = 'http://localhost:3000';

async function testGoogleGrounding() {
  console.log('🧪 Testing Google Grounding functionality...\n');

  try {
    // Test 1: Call Google with a prompt that should trigger web search
    console.log('📝 Test 1: Calling Google with web search grounding...');
    const response = await axios.post(`${API_URL}/llm/test`, {
      prompt: 'What are the latest developments in AI in 2025? Give me specific recent news.',
      provider: 'Google',
      options: {
        temperature: 0.5,
        maxTokens: 500,
      }
    });

    const data = response.data;
    console.log('\n✅ Response received:');
    console.log(`- Model: ${data.modelVersion}`);
    console.log(`- Used Web Search: ${data.usedWebSearch}`);
    console.log(`- Token Usage: ${JSON.stringify(data.tokenUsage)}`);

    // Check annotations (resolved URLs)
    if (data.annotations && data.annotations.length > 0) {
      console.log('\n📌 Annotations (resolved URLs):');
      data.annotations.forEach((annotation, idx) => {
        console.log(`  ${idx + 1}. ${annotation.title || 'No title'}`);
        console.log(`     URL: ${annotation.url}`);
        console.log(`     Status: ${annotation.url.includes('vertexaisearch.cloud.google.com') ? '❌ Failed to resolve' : '✅ Resolved'}`);
      });
    } else {
      console.log('\n⚠️  No annotations found');
    }

    // Check tool usage
    if (data.toolUsage && data.toolUsage.length > 0) {
      console.log('\n🔧 Tool Usage:');
      data.toolUsage.forEach((tool) => {
        console.log(`  - Type: ${tool.type}`);
        console.log(`    Query: ${tool.input.query}`);
        console.log(`    Results: ${tool.execution.resultCount}`);
        if (tool.execution.source) {
          console.log(`    Source: ${tool.execution.source}`);
        }
        if (tool.execution.note) {
          console.log(`    Note: ${tool.execution.note}`);
        }
      });
    }

    // Check response metadata
    if (data.responseMetadata?.webSearchResults) {
      console.log('\n🌐 Web Search Results:');
      data.responseMetadata.webSearchResults.forEach((result, idx) => {
        console.log(`  ${idx + 1}. ${result.title || 'No title'}`);
        console.log(`     URL: ${result.url}`);
      });
    }

    // Test 2: Check if web search queries are populated
    console.log('\n\n📝 Test 2: Checking web search queries metadata...');
    const gm = data.responseMetadata?.groundingMetadata;
    if (gm?.webSearchQueries && gm.webSearchQueries.length > 0) {
      console.log('✅ Web Search Queries:', gm.webSearchQueries);
    } else {
      console.log('⚠️  Web Search Queries array is empty');
    }
    
    // Test 3: Check searchEntryPoint
    console.log('\n📝 Test 3: Checking searchEntryPoint...');
    if (gm?.searchEntryPoint) {
      console.log('✅ SearchEntryPoint found');
      if (gm.searchEntryPoint.sdkBlob) {
        console.log('   - sdkBlob present (base64 encoded)');
        try {
          const decoded = Buffer.from(gm.searchEntryPoint.sdkBlob, 'base64').toString('utf-8');
          console.log('   - Decoded content:', decoded);
        } catch (e) {
          console.log('   - Failed to decode:', e.message);
        }
      }
      if (gm.searchEntryPoint.renderedContent) {
        console.log('   - renderedContent present (length:', gm.searchEntryPoint.renderedContent.length, ')');
      }
    } else {
      console.log('⚠️  No searchEntryPoint found');
    }

    console.log('\n✅ All tests completed!');
  } catch (error) {
    console.error('\n❌ Error during testing:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Run the test
testGoogleGrounding();