require('dotenv').config();
const mongoose = require('mongoose');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27027/geo';

// Brand Report Schema (simplified)
const brandReportSchema = new mongoose.Schema({}, { strict: false });
const BrandReport = mongoose.model('BrandReport', brandReportSchema, 'brand_reports');

async function debugReportStructure() {
  try {
    const projectId = process.argv[2];
    if (!projectId) {
      console.error('Please provide a project ID');
      process.exit(1);
    }

    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected to MongoDB\n');

    // Get one recent report
    const report = await BrandReport.findOne({ projectId }).sort({ reportDate: -1 }).lean();
    
    if (!report) {
      console.log('No reports found');
      return;
    }

    console.log('📄 REPORT STRUCTURE ANALYSIS');
    console.log('='.repeat(60));
    console.log(`Report Date: ${report.reportDate}`);
    console.log(`Brand Name: ${report.brandName}`);
    
    console.log('\n🔍 VISIBILITY STRUCTURE:');
    if (report.visibility) {
      console.log('Top-level fields:', Object.keys(report.visibility));
      console.log(`Overall Mention Rate: ${report.visibility.overallMentionRate}%`);
      console.log(`Prompts Tested: ${report.visibility.promptsTested}`);
      
      if (report.visibility.modelVisibility && report.visibility.modelVisibility.length > 0) {
        console.log('\n📊 Model Visibility Structure:');
        console.log('Sample model visibility item:');
        console.log(JSON.stringify(report.visibility.modelVisibility[0], null, 2));
      }
      
      if (report.visibility.arenaMetrics && report.visibility.arenaMetrics.length > 0) {
        console.log('\n🏆 Arena Metrics Structure:');
        console.log('Sample competitor:');
        const competitor = report.visibility.arenaMetrics[0];
        console.log(`Name: ${competitor.name}`);
        console.log(`Global: ${competitor.global}`);
        console.log(`Size: ${competitor.size}`);
        
        if (competitor.modelsMentionsRate && competitor.modelsMentionsRate.length > 0) {
          console.log('\nModel Mentions Rate structure:');
          console.log(JSON.stringify(competitor.modelsMentionsRate[0], null, 2));
        }
      }
    }

    console.log('\n🔍 SENTIMENT STRUCTURE:');
    if (report.sentiment) {
      console.log('Top-level fields:', Object.keys(report.sentiment));
      if (report.sentiment.modelSentiments && report.sentiment.modelSentiments.length > 0) {
        console.log('Sample model sentiment:');
        console.log(JSON.stringify(report.sentiment.modelSentiments[0], null, 2));
      }
    }

    console.log('\n🔍 ALIGNMENT STRUCTURE:');
    if (report.alignment) {
      console.log('Top-level fields:', Object.keys(report.alignment));
      if (report.alignment.modelAlignments && report.alignment.modelAlignments.length > 0) {
        console.log('Sample model alignment:');
        console.log(JSON.stringify(report.alignment.modelAlignments[0], null, 2));
      }
    }

  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✓ Disconnected from MongoDB');
  }
}

debugReportStructure();