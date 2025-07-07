#!/usr/bin/env node

require('dotenv').config();

console.log('Testing environment...');
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'Set' : 'Not set');
console.log('ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY ? 'Set' : 'Not set');
console.log('GOOGLE_API_KEY:', process.env.GOOGLE_API_KEY ? 'Set' : 'Not set');

// Test basic imports
try {
  require('./lib/page-analyzer-with-llm');
  console.log('✓ Page analyzer loaded');
} catch (error) {
  console.error('✗ Failed to load page analyzer:', error.message);
}

try {
  require('./lib/page-categorizer');
  console.log('✓ Page categorizer loaded');
} catch (error) {
  console.error('✗ Failed to load page categorizer:', error.message);
}

console.log('\nNow try running: node scripts/test-page-intelligence-standalone.js --help');