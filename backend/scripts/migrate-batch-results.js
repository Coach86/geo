#!/usr/bin/env node

/**
 * Migration script to update batch_results collection resultType values
 * 
 * This script updates the following resultType values:
 * - spontaneous → visibility
 * - accuracy → alignment
 * - comparison → competition (if any exist)
 * 
 * Note: 'direct' was already mapped to 'sentiment' in the original schema
 * 
 * Usage: node scripts/migrate-batch-results.js
 */

const { MongoClient } = require('mongodb');

// MongoDB connection string - update this with your actual connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/geo';

async function migrate() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db();
    const collection = db.collection('batch_results');

    // Count documents that need migration
    const docsToMigrate = await collection.countDocuments({
      resultType: { $in: ['spontaneous', 'accuracy', 'comparison'] }
    });

    console.log(`Found ${docsToMigrate} documents to migrate`);

    if (docsToMigrate === 0) {
      console.log('No documents need migration');
      return;
    }

    // Update spontaneous → visibility
    const spontaneousResult = await collection.updateMany(
      { resultType: 'spontaneous' },
      { $set: { resultType: 'visibility' } }
    );
    console.log(`Updated ${spontaneousResult.modifiedCount} documents from 'spontaneous' to 'visibility'`);

    // Update accuracy → alignment
    const accuracyResult = await collection.updateMany(
      { resultType: 'accuracy' },
      { $set: { resultType: 'alignment' } }
    );
    console.log(`Updated ${accuracyResult.modifiedCount} documents from 'accuracy' to 'alignment'`);

    // Update comparison → competition (if any)
    const comparisonResult = await collection.updateMany(
      { resultType: 'comparison' },
      { $set: { resultType: 'competition' } }
    );
    console.log(`Updated ${comparisonResult.modifiedCount} documents from 'comparison' to 'competition'`);

    // Verify migration
    const remainingOldDocs = await collection.countDocuments({
      resultType: { $in: ['spontaneous', 'accuracy', 'comparison'] }
    });

    if (remainingOldDocs > 0) {
      console.warn(`Warning: ${remainingOldDocs} documents still have old resultType values`);
    } else {
      console.log('All documents successfully migrated');
    }

    // Show current resultType distribution
    const resultTypes = await collection.aggregate([
      { $group: { _id: '$resultType', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]).toArray();

    console.log('\nCurrent resultType distribution:');
    resultTypes.forEach(type => {
      console.log(`  ${type._id}: ${type.count} documents`);
    });

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the migration
migrate().catch(console.error);