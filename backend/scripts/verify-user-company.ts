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
    console.log('Verifying user and company...\n');

    // Find all users
    const users = await prisma.user.findMany({
      include: {
        companies: true,
      },
    });
    
    console.log(`Total users: ${users.length}`);
    
    for (const user of users) {
      console.log('\n===== USER DETAILS =====');
      console.log(`ID: ${user.id}`);
      console.log(`Email: ${user.email}`);
      console.log(`Language: ${user.language}`);
      console.log(`Created at: ${user.createdAt}`);
      console.log(`Companies: ${user.companies.length}`);
      
      // Show details for each company
      for (const company of user.companies) {
        console.log('\n----- COMPANY DETAILS -----');
        console.log(`ID: ${company.id}`);
        console.log(`Brand name: ${company.brandName}`);
        console.log(`Industry: ${company.industry}`);
        console.log(`Description: ${company.shortDescription}`);
        console.log(`Key features: ${JSON.parse(company.keyFeaturesJson).join(', ')}`);
        console.log(`Competitors: ${JSON.parse(company.competitorsJson).join(', ')}`);
        
        // Get prompt sets for this company
        const promptSets = await prisma.promptSet.findMany({
          where: {
            companyId: company.id,
          },
        });
        
        if (promptSets.length > 0) {
          console.log('\n----- PROMPT SETS -----');
          const promptSet = promptSets[0];
          console.log(`Spontaneous prompts: ${JSON.parse(promptSet.spontaneous).length}`);
          console.log(`Direct prompts: ${JSON.parse(promptSet.direct).length}`);
          console.log(`Comparison prompts: ${JSON.parse(promptSet.comparison).length}`);
        }
      }
    }

  } catch (error) {
    console.error('Error verifying user and company:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();