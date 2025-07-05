#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Common score patterns and their max scores
const SCORE_PATTERNS = {
  // URL Structure rule
  'URL too long': { score: -20, maxScore: 20 },
  'URL lengthy': { score: -10, maxScore: 10 },
  'No HTTPS': { score: -30, maxScore: 30 },
  'URL length is good': { score: 0, maxScore: 0 },
  'Using secure HTTPS protocol': { score: 0, maxScore: 0 },
  'URL uses descriptive, readable words': { score: 0, maxScore: 0 },
  'Non-descriptive URL': { score: -15, maxScore: 15 },
  'No problematic special characters in URL': { score: 0, maxScore: 0 },
  'URL appears keyword-optimized': { score: 0, maxScore: 0 },
  'Clear URL hierarchy/structure': { score: 0, maxScore: 0 },
  'Poor URL hierarchy': { score: -10, maxScore: 10 },
  'Too many URL parameters': { score: -15, maxScore: 15 },
  'File extension in URL': { score: -5, maxScore: 5 },
  'URL contains unencoded spaces': { score: -10, maxScore: 10 },
  'URL uses underscores': { score: -10, maxScore: 10 },
  'URL contains uppercase letters': { score: -10, maxScore: 10 },
  'URL contains special characters': { score: -10, maxScore: 10 },
  'URL contains double slashes': { score: -10, maxScore: 10 },
  
  // Subheadings rule
  'No subheadings': { score: 20, maxScore: 100 },
  'Excellent density': { score: 100, maxScore: 100 },
  'Good density': { score: 80, maxScore: 100 },
  'Moderate density': { score: 60, maxScore: 100 },
  'Poor density': { score: 40, maxScore: 100 },
  'question-based H2s': { score: 10, maxScore: 10 },
  'No question-based H2s penalty': { score: -10, maxScore: 10 },
  'Generic headings penalty': { score: -5, maxScore: 5 }, // per generic heading
  'Improper hierarchy penalty': { score: -10, maxScore: 10 },
  
  // Citing sources rule
  'No external citations found': { score: 0, maxScore: 100 },
  'Base score': { score: 20, maxScore: 100 },
  
  // Image alt rule  
  'Excellent alt coverage': { score: 40, maxScore: 40 },
  'Good alt coverage': { score: 30, maxScore: 40 },
  'Moderate alt coverage': { score: 20, maxScore: 40 },
  'Poor alt coverage': { score: 10, maxScore: 40 },
  'Very poor alt coverage': { score: 0, maxScore: 40 },
  'Most alt texts descriptive': { score: 40, maxScore: 40 },
  'Many alt texts descriptive': { score: 30, maxScore: 40 },
  'Some alt texts descriptive': { score: 20, maxScore: 40 },
  'Few alt texts descriptive': { score: 10, maxScore: 40 },
  'Empty alt attributes penalty': { score: -5, maxScore: 5 }, // per empty alt
  'Generic alt texts penalty': { score: -10, maxScore: 10 },
  'Semantic figure/figcaption bonus': { score: 10, maxScore: 10 },
  
  // Content freshness rule
  'Date found in URL structure': { score: 15, maxScore: 15 },
  'Structured date metadata found': { score: 20, maxScore: 20 },
  'Content updated within last month': { score: 25, maxScore: 25 },
  'Content updated within last 6 months': { score: 15, maxScore: 25 },
  'visible date reference': { score: 15, maxScore: 15 },
  'recent year references': { score: 15, maxScore: 15 },
  'Some recent year references': { score: 10, maxScore: 15 },
  'freshness indicators': { score: 10, maxScore: 10 },
  'Some freshness indicators': { score: 5, maxScore: 10 },
  
  // Concise answers rule
  'Has summary/TL;DR section': { score: 25, maxScore: 25 },
  'list(s) in first half': { score: 20, maxScore: 20 },
  'direct answer indicators': { score: 15, maxScore: 15 },
  'concise sentences': { score: 20, maxScore: 20 },
  'sentences are moderate': { score: 10, maxScore: 20 },
  'Clear structured format': { score: 20, maxScore: 20 },
  'Some structure markers': { score: 10, maxScore: 20 },
};

function updateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const fileName = path.basename(filePath);
  let updatedCount = 0;
  
  // First pass: identify patterns
  const lines = content.split('\n');
  const updatedLines = lines.map((line, index) => {
    // Match EvidenceHelper calls with score parameter
    const evidenceMatch = line.match(/(EvidenceHelper\.(success|warning|error|info)\([^,]+,\s*[^,]+,\s*\{)([^}]*)(score:\s*(-?\d+))([^}]*)\}/);
    
    if (evidenceMatch) {
      const beforeScore = evidenceMatch[3];
      const scoreValue = parseInt(evidenceMatch[5]);
      const afterScore = evidenceMatch[6];
      
      // Check if maxScore already exists
      if (!line.includes('maxScore:')) {
        // Try to determine maxScore based on content
        let maxScore = Math.abs(scoreValue);
        
        // Check against known patterns
        for (const [pattern, config] of Object.entries(SCORE_PATTERNS)) {
          if (lines[index].includes(pattern) || (index > 0 && lines[index-1].includes(pattern))) {
            maxScore = config.maxScore;
            break;
          }
        }
        
        // For bonus/penalty scores that are variable, use the absolute value
        if (line.includes('penalty') || line.includes('bonus')) {
          maxScore = Math.abs(scoreValue);
        }
        
        // Special cases for rules with specific scoring systems
        if (fileName.includes('subheadings') && line.includes('density')) {
          maxScore = 100;
        }
        if (fileName.includes('citing-sources')) {
          maxScore = 100;
        }
        
        // Reconstruct the line with maxScore
        const newLine = line.replace(
          evidenceMatch[0],
          `${evidenceMatch[1]}${beforeScore}score: ${scoreValue}, maxScore: ${maxScore}${afterScore}}`
        );
        
        updatedCount++;
        return newLine;
      }
    }
    
    return line;
  });
  
  if (updatedCount > 0) {
    content = updatedLines.join('\n');
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${fileName}: ${updatedCount} evidence items`);
  }
  
  return updatedCount;
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

// Update each file
let totalUpdated = 0;
let filesUpdated = 0;

ruleFiles.forEach(file => {
  const count = updateFile(file);
  if (count > 0) {
    totalUpdated += count;
    filesUpdated++;
  }
});

console.log(`\nTotal files updated: ${filesUpdated}`);
console.log(`Total evidence items updated: ${totalUpdated}`);

// Clean up
fs.unlinkSync('/Users/emmanuelcosta/Projects/geo/backend/update-maxscore.js');
fs.unlinkSync('/Users/emmanuelcosta/Projects/geo/backend/auto-update-maxscore.js');