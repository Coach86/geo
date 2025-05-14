import { PrismaClient } from '@prisma/client';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

// Connect to databases
const prisma = new PrismaClient();
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/geo';

// Define MongoDB schemas (simplified versions for migration)
const UserSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  language: { type: String, default: 'en' },
}, { timestamps: true });

const IdentityCardSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  brandName: { type: String, required: true },
  website: { type: String, required: true },
  industry: { type: String, required: true },
  market: { type: String, required: true }, 
  shortDescription: { type: String, required: true },
  fullDescription: { type: String, required: true },
  keyFeaturesJson: { type: String, required: true },
  competitorsJson: { type: String, required: true },
  data: { type: String, default: '{}' },
  userId: { type: String },
}, { timestamps: true });

// Add other schemas as needed...

const User = mongoose.model('User', UserSchema);
const IdentityCard = mongoose.model('IdentityCard', IdentityCardSchema);

async function migrateData() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB successfully');

    console.log('Starting migration...');

    // Migrate users
    console.log('Migrating users...');
    const users = await prisma.user.findMany();
    for (const user of users) {
      await User.create({
        id: user.id,
        email: user.email,
        language: user.language,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });
    }
    console.log(`Migrated ${users.length} users`);

    // Migrate identity cards
    console.log('Migrating identity cards...');
    const identityCards = await prisma.identityCard.findMany();
    for (const card of identityCards) {
      await IdentityCard.create({
        id: card.id,
        brandName: card.brandName,
        website: card.website,
        industry: card.industry,
        market: card.market,
        shortDescription: card.shortDescription,
        fullDescription: card.fullDescription,
        keyFeaturesJson: card.keyFeaturesJson,
        competitorsJson: card.competitorsJson,
        data: card.data,
        userId: card.userId,
        createdAt: card.createdAt,
        updatedAt: card.updatedAt,
      });
    }
    console.log(`Migrated ${identityCards.length} identity cards`);

    // Migrate prompt sets
    // TODO: Implement migration for all other entities

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    // Close connections
    await prisma.$disconnect();
    await mongoose.disconnect();
  }
}

migrateData();