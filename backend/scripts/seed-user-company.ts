import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

async function main() {
  const prisma = new PrismaClient();

  try {
    console.log('Starting database seeding...');

    // 1. Create a new user
    const user = await prisma.user.create({
      data: {
        email: 'user@example.com',
        language: 'en',
      },
    });

    console.log(`✅ Created user: ${user.email} (ID: ${user.id})`);

    // 2. Create a new company associated with the user
    const company = await prisma.identityCard.create({
      data: {
        brandName: 'Acme Corporation',
        website: 'https://acme.example.com',
        industry: 'Technology',
        shortDescription: 'A leading provider of innovative solutions.',
        fullDescription: 'Acme Corporation is a global leader in technology solutions, providing cutting-edge software and services to businesses worldwide. Founded in 2023, Acme has quickly established itself as an industry pioneer.',
        keyFeaturesJson: JSON.stringify([
          'Cloud-native architecture',
          'AI-powered analytics',
          'Enterprise-grade security',
          'Scalable infrastructure'
        ]),
        competitorsJson: JSON.stringify([
          'TechGiant Inc.',
          'InnovateSoft',
          'GlobalTech Solutions'
        ]),
        userId: user.id,
      },
    });

    console.log(`✅ Created company: ${company.brandName} (ID: ${company.id})`);

    // 3. Create a prompt set for the company
    const promptSet = await prisma.promptSet.create({
      data: {
        companyId: company.id,
        spontaneous: JSON.stringify([
          "What companies come to mind when thinking about innovative technology solutions?",
          "Name some leading technology providers you're familiar with.",
          "Which software companies are known for their cloud services?"
        ]),
        direct: JSON.stringify([
          "What do you know about {COMPANY}?",
          "What are your thoughts on {COMPANY}'s products and services?",
          "How would you rate {COMPANY}'s reputation in the industry?"
        ]),
        comparison: JSON.stringify([
          "Compare {COMPANY} with {COMPETITORS} in terms of innovation.",
          "How does {COMPANY} stack up against {COMPETITORS} in the market?",
          "What are the key differentiators between {COMPANY} and {COMPETITORS}?"
        ]),
      },
    });

    console.log(`✅ Created prompt set for company ${company.id}`);

    console.log('Database seeding completed successfully! 🎉');
    console.log('-----------------------------------');
    console.log('Summary:');
    console.log(`User ID: ${user.id}`);
    console.log(`User Email: ${user.email}`);
    console.log(`Company ID: ${company.id}`);
    console.log(`Company Name: ${company.brandName}`);
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();