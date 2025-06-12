#!/usr/bin/env node

/**
 * Migration script to update prompt_sets collection field names
 * 
 * This script renames the following fields:
 * - spontaneous → visibility
 * - direct → sentiment
 * - accuracy → alignment
 * - brandBattle → competition
 * - Removes comparison field (merged into competition)
 * 
 * Usage: node scripts/migrate-prompt-sets.js
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
    const collection = db.collection('prompt_sets');

    // Count documents that need migration
    const docsToMigrate = await collection.countDocuments({
      $or: [
        { spontaneous: { $exists: true } },
        { direct: { $exists: true } },
        { accuracy: { $exists: true } },
        { brandBattle: { $exists: true } },
        { comparison: { $exists: true } }
      ]
    });

    console.log(`Found ${docsToMigrate} documents to migrate`);

    if (docsToMigrate === 0) {
      console.log('No documents need migration');
      return;
    }

    // Perform the migration
    const result = await collection.updateMany(
      {
        $or: [
          { spontaneous: { $exists: true } },
          { direct: { $exists: true } },
          { accuracy: { $exists: true } },
          { brandBattle: { $exists: true } },
          { comparison: { $exists: true } }
        ]
      },
      [
        {
          $set: {
            // Rename fields
            visibility: { $ifNull: ['$spontaneous', []] },
            sentiment: { $ifNull: ['$direct', []] },
            alignment: { $ifNull: ['$accuracy', []] },
            // Merge brandBattle and comparison into competition
            competition: {
              $concatArrays: [
                { $ifNull: ['$brandBattle', []] },
                { $ifNull: ['$comparison', []] }
              ]
            }
          }
        },
        {
          $unset: ['spontaneous', 'direct', 'accuracy', 'brandBattle', 'comparison']
        }
      ]
    );

    console.log(`Migration completed. Modified ${result.modifiedCount} documents`);

    // Verify migration
    const remainingOldDocs = await collection.countDocuments({
      $or: [
        { spontaneous: { $exists: true } },
        { direct: { $exists: true } },
        { accuracy: { $exists: true } },
        { brandBattle: { $exists: true } },
        { comparison: { $exists: true } }
      ]
    });

    if (remainingOldDocs > 0) {
      console.warn(`Warning: ${remainingOldDocs} documents still have old field names`);
    } else {
      console.log('All documents successfully migrated');
    }

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

// Run the migration
migrate().catch(console.error);