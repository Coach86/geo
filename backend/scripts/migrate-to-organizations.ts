import { config } from 'dotenv';
import { connect, connection } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { ORGANIZATION_DEFAULTS } from '../src/modules/organization/constants/defaults';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
config();

async function migrateToOrganizations() {
  try {
    // Load config.json to get default models
    const configPath = path.resolve(process.cwd(), 'config.json');
    const configContent = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configContent);
    const defaultModels = config.defaultModels || [];
    console.log('Default models from config:', defaultModels);

    // Connect to MongoDB
    const mongoUri = process.env.NODE_ENV === 'production'
      ? `mongodb://${process.env.DB_USER}:${process.env.DB_USER_PWD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}?authMechanism=SCRAM-SHA-1`
      : `mongodb://${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;
    
    await connect(mongoUri);
    console.log('Connected to MongoDB');

    const db = connection.db;
    
    // Get collections
    const usersCollection = db.collection('users');
    const projectsCollection = db.collection('projects');
    const organizationsCollection = db.collection('organizations');
    const reportsCollection = db.collection('weeklyreports');
    const batchResultsCollection = db.collection('batchresults');
    const rawResponsesCollection = db.collection('rawresponses');
    
    // Get all users
    const users = await usersCollection.find({}).toArray();
    console.log(`Found ${users.length} users to migrate`);
    
    for (const user of users) {
      console.log(`\nMigrating user: ${user.email}`);
      
      // Check if user already has organizationId
      if (user.organizationId) {
        console.log(`User ${user.email} already migrated, skipping...`);
        continue;
      }
      
      // Create organization for each user
      const organizationId = uuidv4();
      const organization = {
        id: organizationId,
        name: `${user.email}'s Organization`,
        stripeCustomerId: user.stripeCustomerId,
        stripePlanId: user.stripePlanId,
        planSettings: user.planSettings || {
          maxProjects: ORGANIZATION_DEFAULTS.PLAN_SETTINGS.MAX_PROJECTS,
          maxAIModels: ORGANIZATION_DEFAULTS.PLAN_SETTINGS.MAX_AI_MODELS,
          maxSpontaneousPrompts: ORGANIZATION_DEFAULTS.PLAN_SETTINGS.MAX_SPONTANEOUS_PROMPTS,
          maxUrls: ORGANIZATION_DEFAULTS.PLAN_SETTINGS.MAX_URLS,
          maxUsers: ORGANIZATION_DEFAULTS.PLAN_SETTINGS.MAX_USERS,
        },
        selectedModels: user.selectedModels || defaultModels,
        createdAt: user.createdAt || new Date(),
        updatedAt: new Date(),
      };
      
      // Add maxUsers to planSettings if not present
      if (!organization.planSettings.maxUsers) {
        organization.planSettings.maxUsers = ORGANIZATION_DEFAULTS.PLAN_SETTINGS.MAX_USERS;
      }
      
      // Insert organization
      await organizationsCollection.insertOne(organization);
      console.log(`Created organization: ${organization.name}`);
      
      // Update user with organizationId and remove old fields
      await usersCollection.updateOne(
        { _id: user._id },
        {
          $set: { organizationId },
          $unset: {
            stripeCustomerId: "",
            stripePlanId: "",
            planSettings: "",
            selectedModels: "",
            planId: "",
          },
        }
      );
      console.log(`Updated user with organizationId`);
      
      // Update all projects for this user
      const projectUpdateResult = await projectsCollection.updateMany(
        { userId: user.id },
        { 
          $set: { organizationId },
          $unset: { userId: "" }  // Remove userId field
        }
      );
      console.log(`Updated ${projectUpdateResult.modifiedCount} projects`);
      
      // Update all reports for this user
      const reportUpdateResult = await reportsCollection.updateMany(
        { userId: user.id },
        { $set: { organizationId } }
      );
      console.log(`Updated ${reportUpdateResult.modifiedCount} reports`);
      
      // Update all batch results for organization's projects
      const orgProjects = await projectsCollection.find({ organizationId }).toArray();
      const projectIds = orgProjects.map(p => p.id);
      
      if (projectIds.length > 0) {
        const batchUpdateResult = await batchResultsCollection.updateMany(
          { projectId: { $in: projectIds } },
          { $set: { organizationId } }
        );
        console.log(`Updated ${batchUpdateResult.modifiedCount} batch results`);
        
        // Update all raw responses
        const rawResponseUpdateResult = await rawResponsesCollection.updateMany(
          { projectId: { $in: projectIds } },
          { $set: { organizationId } }
        );
        console.log(`Updated ${rawResponseUpdateResult.modifiedCount} raw responses`);
      }
    }
    
    console.log('\nMigration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await connection.close();
    console.log('Database connection closed');
    process.exit(0);
  }
}

// Run migration
migrateToOrganizations();