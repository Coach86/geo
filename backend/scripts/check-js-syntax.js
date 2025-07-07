#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');
const vm = require('vm');

async function checkJavaScriptSyntax() {
  console.log('Checking JavaScript syntax in all files...\n');
  
  // Find all .js files in the scripts directory
  const files = await glob('scripts/**/*.js', { 
    cwd: path.join(__dirname, '..'),
    ignore: ['**/node_modules/**', '**/dist/**', '**/build/**']
  });
  
  let totalFiles = 0;
  let errorFiles = 0;
  const errors = [];
  
  for (const file of files) {
    totalFiles++;
    const fullPath = path.join(__dirname, '..', file);
    
    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      
      // Try to compile the script to check for syntax errors
      new vm.Script(content, { 
        filename: file,
        displayErrors: false 
      });
      
      // Also check for common issues
      checkCommonIssues(content, file);
      
    } catch (error) {
      errorFiles++;
      errors.push({
        file,
        error: error.message,
        line: error.stack ? error.stack.split('\n')[0] : ''
      });
      console.error(`❌ ${file}`);
      console.error(`   ${error.message}\n`);
    }
  }
  
  // Summary
  console.log('\n=== Summary ===');
  console.log(`Total files checked: ${totalFiles}`);
  console.log(`Files with errors: ${errorFiles}`);
  console.log(`Files without errors: ${totalFiles - errorFiles}`);
  
  if (errors.length > 0) {
    console.log('\n=== Errors Found ===');
    errors.forEach(({ file, error }) => {
      console.log(`\n${file}:`);
      console.log(`  ${error}`);
    });
    process.exit(1);
  } else {
    console.log('\n✅ All JavaScript files have valid syntax!');
  }
}

function checkCommonIssues(content, filename) {
  const issues = [];
  
  // Check for undefined variables that might cause runtime errors
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    // Check for common undefined variable patterns
    if (line.includes('$') && !line.includes('content.$') && !line.includes('pageContent.$') && 
        !line.includes('jQuery') && !line.includes('"$"') && !line.includes("'$'") &&
        !line.includes('\\$') && !line.includes('${')) {
      // Potential jQuery/cheerio usage without proper reference
      if (!content.includes('const $ =') && !content.includes('let $ =')) {
        issues.push(`Line ${index + 1}: Potential undefined $ usage`);
      }
    }
  });
  
  if (issues.length > 0) {
    console.warn(`⚠️  ${filename} - Potential issues:`);
    issues.forEach(issue => console.warn(`   ${issue}`));
  }
}

// Run the check
checkJavaScriptSyntax().catch(console.error);