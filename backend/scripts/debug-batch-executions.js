const { MongoClient } = require('mongodb');
require('dotenv').config();

async function debugBatchExecutions() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/mint-ai';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db();
    const batchExecutions = db.collection('batchexecutions');

    // Get the last 50 batch executions
    const recentExecutions = await batchExecutions
      .find({})
      .sort({ executedAt: -1 })
      .limit(50)
      .toArray();

    console.log(`\nFound ${recentExecutions.length} recent batch executions:\n`);

    // Group by trigger source
    const triggerSourceCounts = {};
    const byDate = {};

    recentExecutions.forEach(exec => {
      const trigger = exec.triggerSource || 'manual';
      triggerSourceCounts[trigger] = (triggerSourceCounts[trigger] || 0) + 1;
      
      if (exec.executedAt) {
        const date = new Date(exec.executedAt).toISOString().split('T')[0];
        if (!byDate[date]) {
          byDate[date] = { cron: 0, manual: 0, project_creation: 0 };
        }
        byDate[date][trigger]++;
      }
    });

    console.log('Batch executions by trigger source:');
    Object.entries(triggerSourceCounts).forEach(([trigger, count]) => {
      console.log(`  ${trigger}: ${count}`);
    });

    console.log('\nBatch executions by date:');
    Object.entries(byDate)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 10)
      .forEach(([date, counts]) => {
        console.log(`  ${date}: cron=${counts.cron}, manual=${counts.manual}, project_creation=${counts.project_creation}`);
      });

    // Check for cron executions in the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const cronExecutions = await batchExecutions
      .find({
        triggerSource: 'cron',
        executedAt: { $gte: sevenDaysAgo }
      })
      .toArray();

    console.log(`\nCron executions in the last 7 days: ${cronExecutions.length}`);
    
    if (cronExecutions.length > 0) {
      console.log('Recent cron executions:');
      cronExecutions.forEach(exec => {
        console.log(`  - ${exec.executedAt} (Project: ${exec.projectId})`);
      });
    }

    // Check if cron job should have run today
    const today = new Date();
    today.setHours(3, 0, 0, 0); // 3 AM today
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todaysCronExecutions = await batchExecutions
      .find({
        triggerSource: 'cron',
        executedAt: { $gte: today, $lt: tomorrow }
      })
      .toArray();

    console.log(`\nCron executions today (after 3 AM): ${todaysCronExecutions.length}`);

    // Check organizations and their schedules
    const organizations = db.collection('organizations');
    const projects = db.collection('projects');

    const orgsWithSubscriptions = await organizations
      .find({ stripeSubscriptionId: { $exists: true, $ne: null } })
      .toArray();

    console.log(`\nOrganizations with active subscriptions: ${orgsWithSubscriptions.length}`);

    // Check projects that should run today
    const projectsToCheck = await projects.find({}).toArray();
    let shouldRunToday = 0;

    for (const project of projectsToCheck) {
      const org = orgsWithSubscriptions.find(o => o._id.toString() === project.organizationId.toString());
      if (org && project.createdAt) {
        const projectCreatedAt = new Date(project.createdAt);
        const todayDayOfWeek = today.getDay();
        const createdDayOfWeek = projectCreatedAt.getDay();
        
        if (todayDayOfWeek === createdDayOfWeek) {
          shouldRunToday++;
        }
      }
    }

    console.log(`\nProjects that should run today (weekly anniversary): ${shouldRunToday}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

debugBatchExecutions();