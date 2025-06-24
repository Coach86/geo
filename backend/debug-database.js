require('dotenv').config();
const mongoose = require('mongoose');

// MongoDB connection - try different possibilities
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27027/geo';

async function debugDatabase() {
  try {
    console.log('🔍 DATABASE DEBUGGING SCRIPT');
    console.log('='.repeat(60));
    console.log(`Connecting to: ${MONGODB_URI}`);
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected to MongoDB\n');

    // Get database information
    const db = mongoose.connection.db;
    console.log(`📊 Database Name: ${db.databaseName}`);
    
    // List all collections
    const collections = await db.listCollections().toArray();
    console.log(`\n📁 Collections found (${collections.length}):`);
    collections.forEach(col => {
      console.log(`  - ${col.name}`);
    });

    // Look for brand report collection
    const brandReportCollections = collections.filter(col => 
      col.name.toLowerCase().includes('brand') || 
      col.name.toLowerCase().includes('report')
    );
    
    console.log(`\n🎯 Potential Brand Report Collections:`);
    brandReportCollections.forEach(col => {
      console.log(`  - ${col.name}`);
    });

    // Try to find documents with the given projectId
    const projectId = process.argv[2];
    if (projectId) {
      console.log(`\n🔍 Searching for documents with projectId: ${projectId}`);
      
      for (const col of brandReportCollections) {
        const collection = db.collection(col.name);
        const count = await collection.countDocuments({ projectId: projectId });
        console.log(`  - ${col.name}: ${count} documents found`);
        
        if (count > 0) {
          // Get a sample document to see the structure
          const sample = await collection.findOne({ projectId: projectId });
          console.log(`\n📄 Sample document structure from ${col.name}:`);
          console.log('    Fields:', Object.keys(sample));
          console.log('    Report Date:', sample.reportDate);
          console.log('    Has visibility?', !!sample.visibility);
          console.log('    Has sentiment?', !!sample.sentiment);
          console.log('    Has alignment?', !!sample.alignment);
          
          // Get date range of reports
          const reports = await collection.find({ projectId: projectId })
            .sort({ reportDate: 1 })
            .toArray();
          
          if (reports.length > 0) {
            console.log(`\n📅 Date range of reports:`);
            console.log(`    First: ${reports[0].reportDate}`);
            console.log(`    Last: ${reports[reports.length - 1].reportDate}`);
            console.log(`    Total: ${reports.length} reports`);
          }
        }
      }
    }

    // Try common collection names if no brand report collections found
    if (brandReportCollections.length === 0) {
      console.log('\n⚠️  No obvious brand report collections found. Checking common names...');
      const commonNames = ['brandreports', 'brand_reports', 'reports', 'brandReport', 'brand-reports'];
      
      for (const name of commonNames) {
        if (collections.some(c => c.name === name)) {
          console.log(`  ✓ Found: ${name}`);
          const collection = db.collection(name);
          const count = await collection.countDocuments();
          console.log(`    Total documents: ${count}`);
          
          if (projectId) {
            const projectCount = await collection.countDocuments({ projectId: projectId });
            console.log(`    Documents for project: ${projectCount}`);
          }
        }
      }
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✓ Disconnected from MongoDB');
  }
}

// Run the script
debugDatabase();