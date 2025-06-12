# Database Migration Guide

This guide explains how to migrate your database to use the new prompt type naming conventions.

## Background

We've renamed the prompt types throughout the application:
- `spontaneous` → `visibility`
- `direct` → `sentiment`
- `accuracy` → `alignment`
- `brandBattle` → `competition`
- `comparison` → `competition` (merged)

## Migration Scripts

Two migration scripts are provided in the `scripts/` directory:

### 1. Migrate Prompt Sets

This script updates the `prompt_sets` collection to use the new field names.

```bash
# Set your MongoDB URI (if not using default localhost)
export MONGODB_URI="mongodb://your-connection-string"

# Run the migration
node scripts/migrate-prompt-sets.js
```

The script will:
- Rename `spontaneous` to `visibility`
- Rename `direct` to `sentiment`
- Rename `accuracy` to `alignment`
- Rename `brandBattle` to `competition`
- Merge `comparison` array into `competition` (if it exists)
- Remove the old field names

### 2. Migrate Batch Results

This script updates the `batch_results` collection to use the new `resultType` values.

```bash
# Set your MongoDB URI (if not using default localhost)
export MONGODB_URI="mongodb://your-connection-string"

# Run the migration
node scripts/migrate-batch-results.js
```

The script will:
- Update `resultType: 'spontaneous'` to `'visibility'`
- Update `resultType: 'accuracy'` to `'alignment'`
- Update `resultType: 'comparison'` to `'competition'` (if any exist)

## Important Notes

1. **Backup your database** before running these migrations.

2. The application code has been updated to handle both old and new field names for backward compatibility, so the migration is not strictly required immediately. However, it's recommended to run the migration to ensure consistency.

3. After migration, the old field names will be removed from the documents.

4. The scripts will report how many documents were migrated and verify that no documents with old field names remain.

## Verification

After running the migrations, you can verify the results:

```javascript
// In MongoDB shell or client

// Check prompt_sets collection
db.prompt_sets.findOne()

// Check batch_results collection
db.batch_results.aggregate([
  { $group: { _id: "$resultType", count: { $sum: 1 } } }
])
```

All documents should now use the new field names and values.