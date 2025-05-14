import { PrismaClient } from '@prisma/client';

// Create a new instance of PrismaClient
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:postgres@localhost:5432/brand_insights',
    },
  },
});

async function main() {
  try {
    console.log('Creating a new user and company...');

    // Create a new user
    const user = await prisma.user.create({
      data: {
        email: 'john.doe@example.com',
        language: 'en',
      },
    });
    
    console.log(`User created with ID: ${user.id}`);
    console.log(`Email: ${user.email}`);
    console.log(`Language: ${user.language}`);

    // Create a new company associated with this user
    const company = await prisma.identityCard.create({
      data: {
        brandName: 'Acme Corporation',
        website: 'https://acme.example.com',
        industry: 'Technology',
        shortDescription: 'Leading provider of innovative solutions',
        fullDescription: 'Acme Corporation is a global technology company specializing in cutting-edge software solutions for businesses of all sizes. Founded in 2023, Acme has quickly become known for its innovative approach to solving complex business problems.',
        keyFeaturesJson: JSON.stringify([
          'Cloud-native architecture',
          'AI-powered insights',
          'Enterprise-grade security',
          'Scalable infrastructure'
        ]),
        competitorsJson: JSON.stringify([
          'TechCorp',
          'InnovaSoft',
          'GlobalTech Solutions'
        ]),
        userId: user.id
      }
    });
    
    console.log(`\nCompany created with ID: ${company.id}`);
    console.log(`Brand name: ${company.brandName}`);
    console.log(`Associated with user: ${company.userId}`);

    // Create a prompt set for the company
    const promptSet = await prisma.promptSet.create({
      data: {
        companyId: company.id,
        spontaneous: JSON.stringify([
          "What technology companies come to mind when thinking about innovative solutions?",
          "Which software providers are leading the industry today?",
          "Name some companies that offer cloud-based enterprise solutions."
        ]),
        direct: JSON.stringify([
          "What do you know about {COMPANY}?",
          "What are your impressions of {COMPANY}'s products and services?",
          "How would you rate {COMPANY}'s reputation in the technology sector?"
        ]),
        comparison: JSON.stringify([
          "How does {COMPANY} compare to {COMPETITORS} in terms of innovation?",
          "What are the key differences between {COMPANY} and {COMPETITORS}?",
          "Which company would you recommend between {COMPANY} and {COMPETITORS}?"
        ])
      }
    });
    
    console.log(`\nPrompt set created for company with ID: ${promptSet.companyId}`);
    
    console.log('\nUser and company created successfully!');
    
  } catch (error) {
    console.error('Error creating user and company:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();