require('dotenv').config();
const mongoose = require('mongoose');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27027/geo';

// Get project ID from command line
const projectId = process.argv[2];
if (!projectId) {
  console.error('Please provide a project ID as argument');
  console.error('Usage: node test-visibility-variations.js <projectId>');
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
  }
});

const BrandReport = mongoose.model('BrandReport', brandReportSchema, 'brand_reports');

async function calculateVisibilityVariations(projectId) {
  try {
    console.log('='.repeat(80));
    console.log(`VISIBILITY VARIATION CALCULATION FOR PROJECT: ${projectId}`);
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
    // Handle both UUID and ObjectId formats
    const projectQuery = projectId.includes('-') ? { projectId } : { projectId: new mongoose.Types.ObjectId(projectId) };
    
    const currentReports = await BrandReport.find({
      ...projectQuery,
      reportDate: { $gte: sevenDaysAgo, $lt: now }
    }).sort({ reportDate: 1 }).lean();

    console.log(`\n📊 Current Period Reports: ${currentReports.length} found`);
    currentReports.forEach(report => {
      console.log(`  - ${report.reportDate.toISOString()}: Brand ${report.visibility?.overallMentionRate}%`);
    });

    // Fetch reports for previous period (7-14 days ago)
    const previousReports = await BrandReport.find({
      ...projectQuery,
      reportDate: { $gte: fourteenDaysAgo, $lt: sevenDaysAgo }
    }).sort({ reportDate: 1 }).lean();

    console.log(`\n📊 Previous Period Reports: ${previousReports.length} found`);
    previousReports.forEach(report => {
      console.log(`  - ${report.reportDate.toISOString()}: Brand ${report.visibility?.overallMentionRate}%`);
    });

    // Calculate brand averages
    console.log('\n🏢 BRAND VISIBILITY CALCULATION:');
    const currentBrandAvg = calculateBrandAverage(currentReports);
    const previousBrandAvg = calculateBrandAverage(previousReports);
    const brandVariation = Math.round(currentBrandAvg - previousBrandAvg);

    console.log(`Current Period Average: ${currentBrandAvg}%`);
    console.log(`Previous Period Average: ${previousBrandAvg}%`);
    console.log(`Variation (percentage points): ${brandVariation >= 0 ? '+' : ''}${brandVariation}%`);
    console.log(`Old Formula (% change): ${previousBrandAvg > 0 ? Math.round(((currentBrandAvg - previousBrandAvg) / previousBrandAvg) * 100) : 0}%`);

    // Calculate competitor averages
    console.log('\n🏢 COMPETITOR VISIBILITY CALCULATIONS:');
    const competitors = getUniqueCompetitors(currentReports, previousReports);
    
    for (const competitor of competitors) {
      console.log(`\n${competitor}:`);
      const currentCompAvg = calculateCompetitorAverage(currentReports, competitor);
      const previousCompAvg = calculateCompetitorAverage(previousReports, competitor);
      const compVariation = Math.round(currentCompAvg - previousCompAvg);

      console.log(`  Current Period Average: ${currentCompAvg}%`);
      console.log(`  Previous Period Average: ${previousCompAvg}%`);
      console.log(`  Variation (percentage points): ${compVariation >= 0 ? '+' : ''}${compVariation}%`);
      console.log(`  Old Formula (% change): ${previousCompAvg > 0 ? Math.round(((currentCompAvg - previousCompAvg) / previousCompAvg) * 100) : 0}%`);
    }

    // Show detailed breakdown
    console.log('\n📋 DETAILED BREAKDOWN:');
    console.log('\nCurrent Period Details:');
    currentReports.forEach(report => {
      console.log(`\nReport Date: ${report.reportDate.toISOString()}`);
      console.log(`Brand: ${report.visibility?.overallMentionRate}%`);
      if (report.visibility?.arenaMetrics) {
        report.visibility.arenaMetrics.forEach(comp => {
          console.log(`${comp.name}: ${comp.global}`);
        });
      }
    });

    console.log('\nPrevious Period Details:');
    previousReports.forEach(report => {
      console.log(`\nReport Date: ${report.reportDate.toISOString()}`);
      console.log(`Brand: ${report.visibility?.overallMentionRate}%`);
      if (report.visibility?.arenaMetrics) {
        report.visibility.arenaMetrics.forEach(comp => {
          console.log(`${comp.name}: ${comp.global}`);
        });
      }
    });

  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✓ Disconnected from MongoDB');
  }
}

function calculateBrandAverage(reports) {
  if (reports.length === 0) return 0;
  
  const sum = reports.reduce((acc, report) => {
    return acc + (report.visibility?.overallMentionRate || 0);
  }, 0);
  
  return Math.round(sum / reports.length);
}

function calculateCompetitorAverage(reports, competitorName) {
  if (reports.length === 0) return 0;
  
  let sum = 0;
  let count = 0;
  
  reports.forEach(report => {
    if (report.visibility?.arenaMetrics) {
      const competitor = report.visibility.arenaMetrics.find(c => c.name === competitorName);
      if (competitor) {
        // Parse the global percentage string (e.g., "73%" -> 73)
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

// Run the script
calculateVisibilityVariations(projectId);