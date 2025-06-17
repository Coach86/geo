#!/usr/bin/env node

const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

async function seedFreePlan() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27027/geo';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Get the Plan model
    const PlanSchema = new mongoose.Schema({
      name: String,
      tag: String,
      subtitle: String,
      included: [String],
      stripeProductId: String,
      maxModels: Number,
      maxProjects: Number,
      maxUsers: Number,
      maxUrls: Number,
      maxSpontaneousPrompts: Number,
      maxCompetitors: Number,
      isActive: Boolean,
      isRecommended: Boolean,
      isMostPopular: Boolean,
      order: Number,
      metadata: Object,
    }, { timestamps: true });

    const Plan = mongoose.models.Plan || mongoose.model('Plan', PlanSchema);

    // Check if free plan already exists
    const existingFreePlan = await Plan.findOne({
      $or: [
        { name: 'Free' },
        { tag: 'free' },
        { 'metadata.isFree': true }
      ]
    });

    if (existingFreePlan) {
      console.log('Free plan already exists:', existingFreePlan.name);
      await mongoose.disconnect();
      return;
    }

    // Create the free plan
    const freePlan = new Plan({
      name: 'Free',
      tag: 'free',
      subtitle: 'Get started with AI brand insights',
      included: [
        '1 project',
        '1 URL',
        '1 market/language',
        'Visibility insights only',
        '3 AI models',
        'Weekly reports',
        'Community support'
      ],
      stripeProductId: null, // No Stripe product for free plan
      maxModels: 3,
      maxProjects: 1,
      maxUsers: 1,
      maxUrls: 1,
      maxSpontaneousPrompts: 5,
      maxCompetitors: 0, // No competitors for free plan
      isActive: true,
      isRecommended: false,
      isMostPopular: false,
      order: 0, // First in the list
      metadata: {
        isFree: true,
        features: {
          visibility: true,
          sentiment: false,
          alignment: false,
          competition: false
        }
      }
    });

    await freePlan.save();
    console.log('Free plan created successfully:', freePlan.name);

  } catch (error) {
    console.error('Error creating free plan:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the script
seedFreePlan();
