require('dotenv').config();
const mongoose = require('mongoose');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27027/geo';

// Parse command line arguments
const args = process.argv.slice(2);
const projectId = args[0];
const analysisType = args[1] || 'all'; // visibility, sentiment, alignment, or all

// Parse excluded models with explicit flag
let excludedModels = [];
const excludeIndex = args.findIndex(arg => arg === '--exclude' || arg === '-e');
if (excludeIndex !== -1 && args[excludeIndex + 1]) {
  excludedModels = args[excludeIndex + 1].split(',').map(m => m.trim());
}

if (!projectId) {
  console.error('❌ ERROR: Project ID is required\n');
  console.error('Usage: node test-all-variations.js <projectId> [type] [options]\n');
  console.error('Arguments:');
  console.error('  <projectId>    Required. The project UUID');
  console.error('  [type]         Optional. Analysis type: visibility|sentiment|alignment|all (default: all)');
  console.error('  --exclude, -e  Optional. Comma-separated list of models to exclude\n');
  console.error('Examples:');
  console.error('  # Run all analyses without exclusions:');
  console.error('  node test-all-variations.js "c43e79b4-d521-426d-85e6-e1fdbe48e876"');
  console.error('');
  console.error('  # Run visibility analysis only:');
  console.error('  node test-all-variations.js "c43e79b4-d521-426d-85e6-e1fdbe48e876" visibility');
  console.error('');
  console.error('  # Run visibility excluding specific models:');
  console.error('  node test-all-variations.js "c43e79b4-d521-426d-85e6-e1fdbe48e876" visibility --exclude gpt-4o');
  console.error('  node test-all-variations.js "c43e79b4-d521-426d-85e6-e1fdbe48e876" visibility -e gpt-4o,claude-3-opus');
  console.error('');
  console.error('  # Run all analyses excluding a model:');
  console.error('  node test-all-variations.js "c43e79b4-d521-426d-85e6-e1fdbe48e876" all --exclude gemini-2.0-flash');
  process.exit(1);
}

// Brand Report Schema (simplified)
const brandReportSchema = new mongoose.Schema({
  projectId: { type: String, required: true }, // UUID format
  reportDate: { type: Date, required: true },
  visibility: {
    overallMentionRate: Number,
    promptsTested: Number,
    modelVisibility: [{
      model: String,
      overallMentionRate: Number
    }],
    arenaMetrics: [{
      name: String,
      size: String,
      global: String,
      modelsMentionsRate: [{
        model: String,
        mentionRate: Number
      }]
    }]
  },
  sentiment: {
    overallScore: Number,
    overallSentiment: String,
    distribution: {
      positive: Number,
      neutral: Number,
      negative: Number
    },
    modelSentiments: [{
      model: String,
      score: Number,
      sentiment: String
    }]
  },
  alignment: {
    overallAlignment: Number,
    modelAlignments: [{
      model: String,
      alignment: Number
    }],
    attributes: [{
      name: String,
      overallScore: Number
    }]
  }
});

const BrandReport = mongoose.model('BrandReport', brandReportSchema, 'brand_reports');

async function calculateVariations(projectId, type) {
  try {
    console.log('='.repeat(80));
    console.log(`VARIATION CALCULATION FOR PROJECT: ${projectId}`);
    console.log(`ANALYSIS TYPE: ${type.toUpperCase()}`);
    if (excludedModels.length > 0) {
      console.log(`EXCLUDED MODELS: ${excludedModels.join(', ')}`);
    }
    console.log('='.repeat(80));

    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('\n✓ Connected to MongoDB');

    // Get current date and calculate date ranges
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);
    const fourteenDaysAgo = new Date(now);
    fourteenDaysAgo.setDate(now.getDate() - 14);

    console.log('\n📅 Date Ranges:');
    console.log(`Current Period: ${sevenDaysAgo.toISOString()} to ${now.toISOString()}`);
    console.log(`Previous Period: ${fourteenDaysAgo.toISOString()} to ${sevenDaysAgo.toISOString()}`);

    // Fetch reports for current period (last 7 days)
    const currentReports = await BrandReport.find({
      projectId: projectId,
      reportDate: { $gte: sevenDaysAgo, $lt: now }
    }).sort({ reportDate: 1 }).lean();

    console.log(`\n📊 Current Period Reports: ${currentReports.length} found`);

    // Fetch reports for previous period (7-14 days ago)
    const previousReports = await BrandReport.find({
      projectId: projectId,
      reportDate: { $gte: fourteenDaysAgo, $lt: sevenDaysAgo }
    }).sort({ reportDate: 1 }).lean();

    console.log(`📊 Previous Period Reports: ${previousReports.length} found`);

    if (type === 'visibility' || type === 'all') {
      calculateVisibilityVariations(currentReports, previousReports);
    }

    if (type === 'sentiment' || type === 'all') {
      calculateSentimentVariations(currentReports, previousReports);
    }

    if (type === 'alignment' || type === 'all') {
      calculateAlignmentVariations(currentReports, previousReports);
    }

  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✓ Disconnected from MongoDB');
  }
}

function calculateVisibilityVariations(currentReports, previousReports) {
  console.log('\n' + '='.repeat(60));
  console.log('VISIBILITY ANALYSIS');
  console.log('='.repeat(60));

  // Brand visibility
  console.log('\n🏢 BRAND VISIBILITY:');
  // If models are excluded, recalculate based on filtered model data
  const currentBrandAvg = excludedModels.length > 0 
    ? calculateAverageWithModelFilter(currentReports, r => r.visibility?.modelVisibility, mv => mv.mentionRate)
    : calculateAverage(currentReports, r => r.visibility?.overallMentionRate);
  const previousBrandAvg = excludedModels.length > 0
    ? calculateAverageWithModelFilter(previousReports, r => r.visibility?.modelVisibility, mv => mv.mentionRate)
    : calculateAverage(previousReports, r => r.visibility?.overallMentionRate);
  const brandVariation = Math.round(currentBrandAvg - previousBrandAvg);

  console.log(`Current Period Average: ${currentBrandAvg}%`);
  console.log(`Previous Period Average: ${previousBrandAvg}%`);
  console.log(`✅ NEW Variation (percentage points): ${brandVariation >= 0 ? '+' : ''}${brandVariation}%`);
  console.log(`❌ OLD Variation (% change): ${previousBrandAvg > 0 ? Math.round(((currentBrandAvg - previousBrandAvg) / previousBrandAvg) * 100) : 0}%`);

  // Brand visibility by model
  console.log('\n🤖 BRAND VISIBILITY BY MODEL:');
  const brandModelData = calculateModelAverages(currentReports, previousReports, 
    report => report.visibility?.modelVisibility || [],
    mv => ({ model: mv.model, value: mv.mentionRate })
  );

  for (const [model, data] of Object.entries(brandModelData)) {
    const variation = Math.round(data.current - data.previous);
    console.log(`\n${model}:`);
    console.log(`  Current: ${data.current}% | Previous: ${data.previous}%`);
    console.log(`  ✅ NEW Variation: ${variation >= 0 ? '+' : ''}${variation}%`);
    console.log(`  ❌ OLD Variation: ${data.previous > 0 ? Math.round(((data.current - data.previous) / data.previous) * 100) : 0}%`);
  }

  // Competitor visibility
  console.log('\n🏢 COMPETITOR VISIBILITY:');
  const competitors = getUniqueCompetitors(currentReports, previousReports);
  
  for (const competitor of competitors) {
    console.log(`\n${competitor}:`);
    const currentCompAvg = calculateCompetitorAverage(currentReports, competitor);
    const previousCompAvg = calculateCompetitorAverage(previousReports, competitor);
    const compVariation = Math.round(currentCompAvg - previousCompAvg);

    console.log(`  Overall - Current: ${currentCompAvg}% | Previous: ${previousCompAvg}%`);
    console.log(`  ✅ NEW Variation: ${compVariation >= 0 ? '+' : ''}${compVariation}%`);
    console.log(`  ❌ OLD Variation: ${previousCompAvg > 0 ? Math.round(((currentCompAvg - previousCompAvg) / previousCompAvg) * 100) : 0}%`);

    // Competitor visibility by model
    const compModelData = calculateCompetitorModelAverages(currentReports, previousReports, competitor);
    for (const [model, data] of Object.entries(compModelData)) {
      const modelVariation = Math.round(data.current - data.previous);
      console.log(`  ${model}: Current=${data.current}% | Previous=${data.previous}% | Variation=${modelVariation >= 0 ? '+' : ''}${modelVariation}%`);
    }
  }

  // Show raw data
  console.log('\n📋 RAW DATA:');
  console.log('Current Period:');
  currentReports.forEach(r => {
    console.log(`  ${r.reportDate.toISOString().split('T')[0]}: Brand=${r.visibility?.overallMentionRate}%`);
    if (r.visibility?.modelVisibility) {
      r.visibility.modelVisibility.forEach(mv => {
        console.log(`    - ${mv.model}: ${mv.mentionRate}%`);
      });
    }
  });
  console.log('Previous Period:');
  previousReports.forEach(r => {
    console.log(`  ${r.reportDate.toISOString().split('T')[0]}: Brand=${r.visibility?.overallMentionRate}%`);
    if (r.visibility?.modelVisibility) {
      r.visibility.modelVisibility.forEach(mv => {
        console.log(`    - ${mv.model}: ${mv.mentionRate}%`);
      });
    }
  });
}

function calculateSentimentVariations(currentReports, previousReports) {
  console.log('\n' + '='.repeat(60));
  console.log('SENTIMENT ANALYSIS');
  console.log('='.repeat(60));

  console.log('\n😊 SENTIMENT SCORE:');
  const currentSentimentAvg = calculateAverage(currentReports, r => r.sentiment?.overallScore);
  const previousSentimentAvg = calculateAverage(previousReports, r => r.sentiment?.overallScore);
  const sentimentVariation = Math.round(currentSentimentAvg - previousSentimentAvg);

  console.log(`Current Period Average: ${currentSentimentAvg}%`);
  console.log(`Previous Period Average: ${previousSentimentAvg}%`);
  console.log(`✅ NEW Variation (percentage points): ${sentimentVariation >= 0 ? '+' : ''}${sentimentVariation}%`);
  console.log(`❌ OLD Variation (% change): ${previousSentimentAvg !== 0 ? Math.round(((currentSentimentAvg - previousSentimentAvg) / Math.abs(previousSentimentAvg)) * 100) : 0}%`);

  // Sentiment by model
  console.log('\n🤖 SENTIMENT BY MODEL:');
  const sentimentModelData = calculateModelAverages(currentReports, previousReports,
    report => report.sentiment?.modelSentiments || [],
    ms => ({ model: ms.model, value: ms.score })
  );

  for (const [model, data] of Object.entries(sentimentModelData)) {
    const variation = Math.round(data.current - data.previous);
    console.log(`\n${model}:`);
    console.log(`  Current: ${data.current}% | Previous: ${data.previous}%`);
    console.log(`  ✅ NEW Variation: ${variation >= 0 ? '+' : ''}${variation}%`);
    console.log(`  ❌ OLD Variation: ${data.previous !== 0 ? Math.round(((data.current - data.previous) / Math.abs(data.previous)) * 100) : 0}%`);
  }

  // Distribution
  console.log('\n📊 SENTIMENT DISTRIBUTION:');
  const distributions = ['positive', 'neutral', 'negative'];
  for (const type of distributions) {
    const currentAvg = calculateAverage(currentReports, r => r.sentiment?.distribution?.[type]);
    const previousAvg = calculateAverage(previousReports, r => r.sentiment?.distribution?.[type]);
    const variation = Math.round(currentAvg - previousAvg);
    
    console.log(`\n${type.charAt(0).toUpperCase() + type.slice(1)}:`);
    console.log(`  Current: ${currentAvg}% | Previous: ${previousAvg}%`);
    console.log(`  ✅ NEW Variation: ${variation >= 0 ? '+' : ''}${variation}%`);
    console.log(`  ❌ OLD Variation: ${previousAvg > 0 ? Math.round(((currentAvg - previousAvg) / previousAvg) * 100) : 0}%`);
  }

  // Show raw data
  console.log('\n📋 RAW SENTIMENT DATA:');
  console.log('Current Period:');
  currentReports.forEach(r => {
    console.log(`  ${r.reportDate.toISOString().split('T')[0]}: Score=${r.sentiment?.overallScore}%`);
    if (r.sentiment?.modelSentiments) {
      r.sentiment.modelSentiments.forEach(ms => {
        console.log(`    - ${ms.model}: ${ms.score}% (${ms.sentiment})`);
      });
    }
  });
  console.log('Previous Period:');
  previousReports.forEach(r => {
    console.log(`  ${r.reportDate.toISOString().split('T')[0]}: Score=${r.sentiment?.overallScore}%`);
    if (r.sentiment?.modelSentiments) {
      r.sentiment.modelSentiments.forEach(ms => {
        console.log(`    - ${ms.model}: ${ms.score}% (${ms.sentiment})`);
      });
    }
  });
}

function calculateAlignmentVariations(currentReports, previousReports) {
  console.log('\n' + '='.repeat(60));
  console.log('ALIGNMENT ANALYSIS');
  console.log('='.repeat(60));

  console.log('\n🎯 OVERALL ALIGNMENT:');
  const currentAlignmentAvg = calculateAverage(currentReports, r => r.alignment?.overallAlignment);
  const previousAlignmentAvg = calculateAverage(previousReports, r => r.alignment?.overallAlignment);
  const alignmentVariation = Math.round(currentAlignmentAvg - previousAlignmentAvg);

  console.log(`Current Period Average: ${currentAlignmentAvg}%`);
  console.log(`Previous Period Average: ${previousAlignmentAvg}%`);
  console.log(`✅ NEW Variation (percentage points): ${alignmentVariation >= 0 ? '+' : ''}${alignmentVariation}%`);
  console.log(`❌ OLD Variation (% change): ${previousAlignmentAvg > 0 ? Math.round(((currentAlignmentAvg - previousAlignmentAvg) / previousAlignmentAvg) * 100) : 0}%`);

  // Alignment by model
  console.log('\n🤖 ALIGNMENT BY MODEL:');
  const alignmentModelData = calculateModelAverages(currentReports, previousReports,
    report => report.alignment?.modelAlignments || [],
    ma => ({ model: ma.model, value: ma.alignment })
  );

  for (const [model, data] of Object.entries(alignmentModelData)) {
    const variation = Math.round(data.current - data.previous);
    console.log(`\n${model}:`);
    console.log(`  Current: ${data.current}% | Previous: ${data.previous}%`);
    console.log(`  ✅ NEW Variation: ${variation >= 0 ? '+' : ''}${variation}%`);
    console.log(`  ❌ OLD Variation: ${data.previous > 0 ? Math.round(((data.current - data.previous) / data.previous) * 100) : 0}%`);
  }

  // Attributes
  console.log('\n🏷️ ALIGNMENT BY ATTRIBUTE:');
  const attributes = getUniqueAttributes(currentReports, previousReports);
  
  for (const attribute of attributes) {
    const currentAttrAvg = calculateAttributeAverage(currentReports, attribute);
    const previousAttrAvg = calculateAttributeAverage(previousReports, attribute);
    const attrVariation = Math.round(currentAttrAvg - previousAttrAvg);
    
    console.log(`\n${attribute}:`);
    console.log(`  Current: ${currentAttrAvg}% | Previous: ${previousAttrAvg}%`);
    console.log(`  ✅ NEW Variation: ${attrVariation >= 0 ? '+' : ''}${attrVariation}%`);
    console.log(`  ❌ OLD Variation: ${previousAttrAvg > 0 ? Math.round(((currentAttrAvg - previousAttrAvg) / previousAttrAvg) * 100) : 0}%`);
  }

  // Show raw data
  console.log('\n📋 RAW ALIGNMENT DATA:');
  console.log('Current Period:');
  currentReports.forEach(r => {
    console.log(`  ${r.reportDate.toISOString().split('T')[0]}: Overall=${r.alignment?.overallAlignment}%`);
    if (r.alignment?.modelAlignments) {
      r.alignment.modelAlignments.forEach(ma => {
        console.log(`    - ${ma.model}: ${ma.alignment}%`);
      });
    }
  });
  console.log('Previous Period:');
  previousReports.forEach(r => {
    console.log(`  ${r.reportDate.toISOString().split('T')[0]}: Overall=${r.alignment?.overallAlignment}%`);
    if (r.alignment?.modelAlignments) {
      r.alignment.modelAlignments.forEach(ma => {
        console.log(`    - ${ma.model}: ${ma.alignment}%`);
      });
    }
  });
}

function calculateAverage(reports, getter) {
  if (reports.length === 0) return 0;
  const values = reports.map(getter).filter(v => v !== undefined && v !== null);
  if (values.length === 0) return 0;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

function calculateAverageWithModelFilter(reports, modelDataGetter, valueGetter) {
  if (reports.length === 0) return 0;
  
  let sum = 0;
  let count = 0;
  
  reports.forEach(report => {
    const modelData = modelDataGetter(report);
    if (modelData && Array.isArray(modelData)) {
      const filteredData = modelData.filter(item => !excludedModels.includes(item.model));
      const values = filteredData.map(valueGetter).filter(v => v !== undefined && v !== null);
      if (values.length > 0) {
        sum += values.reduce((a, b) => a + b, 0) / values.length;
        count++;
      }
    }
  });
  
  return count > 0 ? Math.round(sum / count) : 0;
}

function calculateCompetitorAverage(reports, competitorName) {
  if (reports.length === 0) return 0;
  
  // If models are excluded, calculate from model-specific data
  if (excludedModels.length > 0) {
    let sum = 0;
    let count = 0;
    
    reports.forEach(report => {
      if (report.visibility?.arenaMetrics) {
        const competitor = report.visibility.arenaMetrics.find(c => c.name === competitorName);
        if (competitor && competitor.modelsMentionsRate) {
          const filteredRates = competitor.modelsMentionsRate.filter(mmr => !excludedModels.includes(mmr.model));
          if (filteredRates.length > 0) {
            const avgForReport = filteredRates.reduce((acc, mmr) => acc + (mmr.mentionsRate || 0), 0) / filteredRates.length;
            sum += avgForReport;
            count++;
          }
        }
      }
    });
    
    return count > 0 ? Math.round(sum / count) : 0;
  }
  
  // Otherwise use the global average
  let sum = 0;
  let count = 0;
  
  reports.forEach(report => {
    if (report.visibility?.arenaMetrics) {
      const competitor = report.visibility.arenaMetrics.find(c => c.name === competitorName);
      if (competitor) {
        const value = parseInt(competitor.global.replace('%', ''));
        if (!isNaN(value)) {
          sum += value;
          count++;
        }
      }
    }
  });
  
  return count > 0 ? Math.round(sum / count) : 0;
}

function getUniqueCompetitors(currentReports, previousReports) {
  const competitors = new Set();
  
  [...currentReports, ...previousReports].forEach(report => {
    if (report.visibility?.arenaMetrics) {
      report.visibility.arenaMetrics.forEach(comp => {
        competitors.add(comp.name);
      });
    }
  });
  
  return Array.from(competitors).sort();
}

function calculateModelAverages(currentReports, previousReports, getModelData, extractValue) {
  const modelData = {};
  
  // Process current reports
  currentReports.forEach(report => {
    const modelItems = getModelData(report);
    modelItems.forEach(item => {
      const { model, value } = extractValue(item);
      // Skip excluded models
      if (excludedModels.includes(model)) return;
      
      if (!modelData[model]) {
        modelData[model] = { currentSum: 0, currentCount: 0, previousSum: 0, previousCount: 0 };
      }
      modelData[model].currentSum += value || 0;
      modelData[model].currentCount++;
    });
  });
  
  // Process previous reports
  previousReports.forEach(report => {
    const modelItems = getModelData(report);
    modelItems.forEach(item => {
      const { model, value } = extractValue(item);
      // Skip excluded models
      if (excludedModels.includes(model)) return;
      
      if (!modelData[model]) {
        modelData[model] = { currentSum: 0, currentCount: 0, previousSum: 0, previousCount: 0 };
      }
      modelData[model].previousSum += value || 0;
      modelData[model].previousCount++;
    });
  });
  
  // Calculate averages
  const result = {};
  for (const [model, data] of Object.entries(modelData)) {
    result[model] = {
      current: data.currentCount > 0 ? Math.round(data.currentSum / data.currentCount) : 0,
      previous: data.previousCount > 0 ? Math.round(data.previousSum / data.previousCount) : 0
    };
  }
  
  return result;
}

function calculateCompetitorModelAverages(currentReports, previousReports, competitorName) {
  const modelData = {};
  
  // Process current reports
  currentReports.forEach(report => {
    if (report.visibility?.arenaMetrics) {
      const competitor = report.visibility.arenaMetrics.find(c => c.name === competitorName);
      if (competitor && competitor.modelsMentionsRate) {
        competitor.modelsMentionsRate.forEach(mmr => {
          // Skip excluded models
          if (excludedModels.includes(mmr.model)) return;
          
          if (!modelData[mmr.model]) {
            modelData[mmr.model] = { currentSum: 0, currentCount: 0, previousSum: 0, previousCount: 0 };
          }
          modelData[mmr.model].currentSum += mmr.mentionsRate || 0;
          modelData[mmr.model].currentCount++;
        });
      }
    }
  });
  
  // Process previous reports
  previousReports.forEach(report => {
    if (report.visibility?.arenaMetrics) {
      const competitor = report.visibility.arenaMetrics.find(c => c.name === competitorName);
      if (competitor && competitor.modelsMentionsRate) {
        competitor.modelsMentionsRate.forEach(mmr => {
          // Skip excluded models
          if (excludedModels.includes(mmr.model)) return;
          
          if (!modelData[mmr.model]) {
            modelData[mmr.model] = { currentSum: 0, currentCount: 0, previousSum: 0, previousCount: 0 };
          }
          modelData[mmr.model].previousSum += mmr.mentionsRate || 0;
          modelData[mmr.model].previousCount++;
        });
      }
    }
  });
  
  // Calculate averages
  const result = {};
  for (const [model, data] of Object.entries(modelData)) {
    result[model] = {
      current: data.currentCount > 0 ? Math.round(data.currentSum / data.currentCount) : 0,
      previous: data.previousCount > 0 ? Math.round(data.previousSum / data.previousCount) : 0
    };
  }
  
  return result;
}

function getUniqueAttributes(currentReports, previousReports) {
  const attributes = new Set();
  
  [...currentReports, ...previousReports].forEach(report => {
    if (report.alignment?.attributes) {
      report.alignment.attributes.forEach(attr => {
        attributes.add(attr.name);
      });
    }
  });
  
  return Array.from(attributes).sort();
}

function calculateAttributeAverage(reports, attributeName) {
  if (reports.length === 0) return 0;
  
  let sum = 0;
  let count = 0;
  
  reports.forEach(report => {
    if (report.alignment?.attributes) {
      const attribute = report.alignment.attributes.find(a => a.name === attributeName);
      if (attribute && attribute.overallScore !== undefined) {
        sum += attribute.overallScore;
        count++;
      }
    }
  });
  
  return count > 0 ? Math.round(sum / count) : 0;
}

// Run the script
calculateVariations(projectId, analysisType);