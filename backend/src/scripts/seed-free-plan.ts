import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PlanService } from '../modules/plan/services/plan.service';
import { CreatePlanDto } from '../modules/plan/dto/create-plan.dto';

async function seedFreePlan() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const planService = app.get(PlanService);

  try {
    // Check if free plan already exists
    const existingFreePlan = await planService.findFreePlan();
    
    if (existingFreePlan) {
      console.log('Free plan already exists:', existingFreePlan);
      await app.close();
      return;
    }

    // Create the free plan
    const freePlanDto: CreatePlanDto = {
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
      stripeProductId: '', // No Stripe product for free plan
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
    };

    const createdPlan = await planService.create(freePlanDto);
    console.log('Free plan created successfully:', createdPlan);
    
  } catch (error) {
    console.error('Error creating free plan:', error);
  } finally {
    await app.close();
  }
}

seedFreePlan();