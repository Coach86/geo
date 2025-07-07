#!/usr/bin/env node

const path = require('path');
const { glob } = require('glob');

async function testAllRules() {
  console.log('Testing all rule modules...\n');
  
  // Find all rule files
  const ruleFiles = await glob('scripts/lib/rules/**/*.rule.js', { 
    cwd: path.join(__dirname, '..'),
    ignore: ['**/node_modules/**']
  });
  
  let totalRules = 0;
  let successfulRules = 0;
  let failedRules = 0;
  const errors = [];
  
  for (const file of ruleFiles) {
    totalRules++;
    const fullPath = path.join(__dirname, '..', file);
    
    try {
      // Try to require the module
      const RuleClass = require(fullPath);
      
      // Try to instantiate the rule
      const rule = new RuleClass();
      
      // Check if it has required methods
      if (typeof rule.evaluate !== 'function') {
        throw new Error('Rule missing evaluate method');
      }
      
      console.log(`✅ ${file}`);
      console.log(`   Name: ${rule.name || 'Unknown'}`);
      console.log(`   ID: ${rule.id || 'Unknown'}`);
      console.log(`   Dimension: ${rule.dimension || 'Unknown'}`);
      
      successfulRules++;
      
    } catch (error) {
      failedRules++;
      errors.push({
        file,
        error: error.message,
        stack: error.stack
      });
      console.error(`❌ ${file}`);
      console.error(`   ${error.message}\n`);
    }
  }
  
  // Test rule index files
  console.log('\nTesting rule index files...');
  const indexFiles = [
    'scripts/lib/rules/technical/index.js',
    'scripts/lib/rules/content/index.js',
    'scripts/lib/rules/authority/index.js',
    'scripts/lib/rules/quality/index.js'
  ];
  
  for (const indexFile of indexFiles) {
    try {
      const rules = require(path.join(__dirname, '..', indexFile));
      console.log(`✅ ${indexFile} - Loaded ${rules.length} rules`);
    } catch (error) {
      console.error(`❌ ${indexFile} - ${error.message}`);
      errors.push({
        file: indexFile,
        error: error.message
      });
    }
  }
  
  // Summary
  console.log('\n=== Summary ===');
  console.log(`Total rule files tested: ${totalRules}`);
  console.log(`Successful: ${successfulRules}`);
  console.log(`Failed: ${failedRules}`);
  
  if (errors.length > 0) {
    console.log('\n=== Errors Found ===');
    errors.forEach(({ file, error }) => {
      console.log(`\n${file}:`);
      console.log(`  ${error}`);
    });
    process.exit(1);
  } else {
    console.log('\n✅ All rules loaded successfully!');
  }
}

// Run the test
testAllRules().catch(console.error);