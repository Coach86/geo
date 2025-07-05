#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Function to extract score patterns from a file
function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const fileName = path.basename(filePath);
  
  // Find all evidence lines with score
  const scorePatterns = [];
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    // Match EvidenceHelper calls with score parameter
    const evidenceMatch = line.match(/EvidenceHelper\.(success|warning|error|info)\([^,]+,\s*[^,]+,\s*\{[^}]*score:\s*(-?\d+|[^,}]+)/);
    if (evidenceMatch) {
      const scoreValue = evidenceMatch[2];
      scorePatterns.push({
        file: fileName,
        line: index + 1,
        type: evidenceMatch[1],
        score: scoreValue,
        content: line.trim()
      });
    }
  });
  
  return scorePatterns;
}

// Get all rule files
const rulesDir = '/Users/emmanuelcosta/Projects/geo/backend/src/modules/crawler/rules/aeo';
const getAllFiles = (dirPath, arrayOfFiles = []) => {
  const files = fs.readdirSync(dirPath);
  
  files.forEach((file) => {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
    } else if (file.endsWith('.rule.ts')) {
      arrayOfFiles.push(filePath);
    }
  });
  
  return arrayOfFiles;
};

const ruleFiles = getAllFiles(rulesDir);

// Analyze each file
const allPatterns = [];
ruleFiles.forEach(file => {
  const patterns = analyzeFile(file);
  if (patterns.length > 0) {
    allPatterns.push(...patterns);
  }
});

// Group by file and show summary
const fileGroups = {};
allPatterns.forEach(pattern => {
  if (!fileGroups[pattern.file]) {
    fileGroups[pattern.file] = [];
  }
  fileGroups[pattern.file].push(pattern);
});

console.log('Files with score evidence items:');
console.log('================================\n');

Object.keys(fileGroups).sort().forEach(file => {
  console.log(`\n${file}:`);
  const patterns = fileGroups[file];
  
  // Group by score values to identify patterns
  const scoreGroups = {};
  patterns.forEach(p => {
    const key = p.score.toString();
    if (!scoreGroups[key]) {
      scoreGroups[key] = [];
    }
    scoreGroups[key].push(p);
  });
  
  Object.keys(scoreGroups).forEach(score => {
    console.log(`  Score ${score}: ${scoreGroups[score].length} occurrences`);
  });
});

console.log(`\nTotal files with scores: ${Object.keys(fileGroups).length}`);
console.log(`Total score evidence items: ${allPatterns.length}`);