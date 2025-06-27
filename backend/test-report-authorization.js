/**
 * Test script to verify report authorization
 * This tests that users can only access reports from their own organization
 */

const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

// Test data - you'll need to replace these with actual values from your database
const USER1_TOKEN = process.env.USER1_TOKEN || 'your-user1-token-here';
const USER2_TOKEN = process.env.USER2_TOKEN || 'your-user2-token-here';
const USER1_REPORT_ID = process.env.USER1_REPORT_ID || 'user1-report-id';
const USER2_REPORT_ID = process.env.USER2_REPORT_ID || 'user2-report-id';
const USER1_PROJECT_ID = process.env.USER1_PROJECT_ID || 'user1-project-id';
const USER2_PROJECT_ID = process.env.USER2_PROJECT_ID || 'user2-project-id';

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

async function testReportAccess() {
  console.log(`${colors.blue}Testing Report Authorization...${colors.reset}\n`);

  const tests = [
    {
      name: 'User 1 accessing their own report',
      token: USER1_TOKEN,
      endpoint: `/brand-reports/${USER1_REPORT_ID}`,
      expectedStatus: 200,
      shouldSucceed: true,
    },
    {
      name: 'User 1 accessing User 2\'s report',
      token: USER1_TOKEN,
      endpoint: `/brand-reports/${USER2_REPORT_ID}`,
      expectedStatus: 401,
      shouldSucceed: false,
    },
    {
      name: 'User 2 accessing their own report',
      token: USER2_TOKEN,
      endpoint: `/brand-reports/${USER2_REPORT_ID}`,
      expectedStatus: 200,
      shouldSucceed: true,
    },
    {
      name: 'User 2 accessing User 1\'s report',
      token: USER2_TOKEN,
      endpoint: `/brand-reports/${USER1_REPORT_ID}`,
      expectedStatus: 401,
      shouldSucceed: false,
    },
    {
      name: 'User 1 accessing their own project reports',
      token: USER1_TOKEN,
      endpoint: `/brand-reports/project/${USER1_PROJECT_ID}`,
      expectedStatus: 200,
      shouldSucceed: true,
    },
    {
      name: 'User 1 accessing User 2\'s project reports',
      token: USER1_TOKEN,
      endpoint: `/brand-reports/project/${USER2_PROJECT_ID}`,
      expectedStatus: 401,
      shouldSucceed: false,
    },
    {
      name: 'User 1 accessing their own report visibility data',
      token: USER1_TOKEN,
      endpoint: `/brand-reports/${USER1_REPORT_ID}/visibility`,
      expectedStatus: 200,
      shouldSucceed: true,
    },
    {
      name: 'User 1 accessing User 2\'s report visibility data',
      token: USER1_TOKEN,
      endpoint: `/brand-reports/${USER2_REPORT_ID}/visibility`,
      expectedStatus: 401,
      shouldSucceed: false,
    },
    {
      name: 'User 1 accessing their own aggregated visibility data',
      token: USER1_TOKEN,
      endpoint: `/brand-reports/project/${USER1_PROJECT_ID}/visibility/aggregated`,
      expectedStatus: 200,
      shouldSucceed: true,
    },
    {
      name: 'User 1 accessing User 2\'s aggregated visibility data',
      token: USER1_TOKEN,
      endpoint: `/brand-reports/project/${USER2_PROJECT_ID}/visibility/aggregated`,
      expectedStatus: 401,
      shouldSucceed: false,
    },
    {
      name: 'User 1 accessing their own report sentiment data',
      token: USER1_TOKEN,
      endpoint: `/brand-reports/${USER1_REPORT_ID}/sentiment`,
      expectedStatus: 200,
      shouldSucceed: true,
    },
    {
      name: 'User 1 accessing User 2\'s report sentiment data',
      token: USER1_TOKEN,
      endpoint: `/brand-reports/${USER2_REPORT_ID}/sentiment`,
      expectedStatus: 401,
      shouldSucceed: false,
    },
    {
      name: 'User 1 accessing their own report alignment data',
      token: USER1_TOKEN,
      endpoint: `/brand-reports/${USER1_REPORT_ID}/alignment`,
      expectedStatus: 200,
      shouldSucceed: true,
    },
    {
      name: 'User 1 accessing User 2\'s report alignment data',
      token: USER1_TOKEN,
      endpoint: `/brand-reports/${USER2_REPORT_ID}/alignment`,
      expectedStatus: 401,
      shouldSucceed: false,
    },
    {
      name: 'User 1 accessing their own report competition data',
      token: USER1_TOKEN,
      endpoint: `/brand-reports/${USER1_REPORT_ID}/competition`,
      expectedStatus: 200,
      shouldSucceed: true,
    },
    {
      name: 'User 1 accessing User 2\'s report competition data',
      token: USER1_TOKEN,
      endpoint: `/brand-reports/${USER2_REPORT_ID}/competition`,
      expectedStatus: 401,
      shouldSucceed: false,
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const response = await axios.get(`${API_BASE_URL}${test.endpoint}`, {
        headers: {
          Authorization: `Bearer ${test.token}`,
        },
        validateStatus: () => true, // Don't throw on non-2xx status
      });

      const success = response.status === test.expectedStatus;
      
      if (success) {
        console.log(`${colors.green}✓${colors.reset} ${test.name}`);
        console.log(`  Status: ${response.status} (expected ${test.expectedStatus})`);
        passed++;
      } else {
        console.log(`${colors.red}✗${colors.reset} ${test.name}`);
        console.log(`  Status: ${response.status} (expected ${test.expectedStatus})`);
        if (response.data?.message) {
          console.log(`  Message: ${response.data.message}`);
        }
        failed++;
      }

      // Additional validation for unauthorized access
      if (!test.shouldSucceed && response.status === 401) {
        const message = response.data?.message || '';
        if (message.includes('permission to access this project')) {
          console.log(`  ${colors.green}✓${colors.reset} Correct authorization error message`);
        }
      }

    } catch (error) {
      console.log(`${colors.red}✗${colors.reset} ${test.name}`);
      console.log(`  Error: ${error.message}`);
      failed++;
    }

    console.log('');
  }

  console.log(`${colors.blue}Summary:${colors.reset}`);
  console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failed}${colors.reset}`);
  console.log(`Total: ${tests.length}`);

  if (failed === 0) {
    console.log(`\n${colors.green}All authorization tests passed! ✅${colors.reset}`);
  } else {
    console.log(`\n${colors.red}Some authorization tests failed! ❌${colors.reset}`);
    process.exit(1);
  }
}

// Instructions for running the test
function printInstructions() {
  console.log(`${colors.yellow}To run this test, you need to set up the following:${colors.reset}`);
  console.log('');
  console.log('1. Create two users in different organizations');
  console.log('2. Create at least one project and report for each user');
  console.log('3. Get valid access tokens for both users');
  console.log('4. Set the environment variables:');
  console.log('   - USER1_TOKEN: Access token for user 1');
  console.log('   - USER2_TOKEN: Access token for user 2');
  console.log('   - USER1_REPORT_ID: A report ID belonging to user 1');
  console.log('   - USER2_REPORT_ID: A report ID belonging to user 2');
  console.log('   - USER1_PROJECT_ID: A project ID belonging to user 1');
  console.log('   - USER2_PROJECT_ID: A project ID belonging to user 2');
  console.log('');
  console.log('Example:');
  console.log(`${colors.blue}USER1_TOKEN=token1 USER2_TOKEN=token2 USER1_REPORT_ID=report1 USER2_REPORT_ID=report2 USER1_PROJECT_ID=proj1 USER2_PROJECT_ID=proj2 node test-report-authorization.js${colors.reset}`);
  console.log('');
}

// Check if required environment variables are set
if (!USER1_TOKEN || !USER2_TOKEN || !USER1_REPORT_ID || !USER2_REPORT_ID || !USER1_PROJECT_ID || !USER2_PROJECT_ID || 
    USER1_TOKEN.includes('your-') || USER2_TOKEN.includes('your-')) {
  printInstructions();
  process.exit(0);
}

// Run the tests
testReportAccess().catch(console.error);