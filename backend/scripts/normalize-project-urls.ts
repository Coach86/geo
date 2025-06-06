import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { ProjectDocument } from '../src/modules/project/schemas/project-base.schema';

async function normalizeProjectUrls() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  try {
    // Get the project model
    const projectModel = app.get<Model<ProjectDocument>>('ProjectModel');
    
    // Find all projects
    const projects = await projectModel.find({}).exec();
    
    console.log(`Found ${projects.length} projects to check`);
    
    let updatedCount = 0;
    
    for (const project of projects) {
      if (project.website && project.website.endsWith('/')) {
        const originalWebsite = project.website;
        const normalizedWebsite = project.website.replace(/\/+$/, '');
        
        // Update the project
        await projectModel.updateOne(
          { _id: project._id },
          { $set: { website: normalizedWebsite } }
        ).exec();
        
        console.log(`Updated project ${project.id}: "${originalWebsite}" -> "${normalizedWebsite}"`);
        updatedCount++;
      }
    }
    
    console.log(`\nNormalization complete. Updated ${updatedCount} projects.`);
  } catch (error) {
    console.error('Error normalizing URLs:', error);
  } finally {
    await app.close();
  }
}

// Run the script
normalizeProjectUrls().catch(console.error);