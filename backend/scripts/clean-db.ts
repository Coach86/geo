import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();

  try {
    console.log('Deleting database records...');

    // Delete all records in order to respect foreign key constraints
    // Start with tables that depend on others
    await prisma.rawResponse.deleteMany({});
    console.log('✅ Deleted all raw responses');

    await prisma.batchResult.deleteMany({});
    console.log('✅ Deleted all batch results');

    await prisma.batchExecution.deleteMany({});
    console.log('✅ Deleted all batch executions');

    await prisma.weeklyReport.deleteMany({});
    console.log('✅ Deleted all weekly reports');

    await prisma.promptSet.deleteMany({});
    console.log('✅ Deleted all prompt sets');

    await prisma.identityCard.deleteMany({});
    console.log('✅ Deleted all identity cards');

    await prisma.user.deleteMany({});
    console.log('✅ Deleted all users');

    console.log('Database has been cleaned successfully! 🎉');
  } catch (error) {
    console.error('Error cleaning database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();