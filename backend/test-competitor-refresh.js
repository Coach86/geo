const axios = require('axios');

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:3000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

async function testCompetitorRefresh() {
  try {
    console.log('🔐 Logging in as admin...');
    const loginResponse = await axios.post(`${API_URL}/auth/admin/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });

    const token = loginResponse.data.access_token;
    console.log('✅ Admin login successful');

    // Get all projects
    console.log('\n📋 Fetching all projects...');
    const projectsResponse = await axios.get(`${API_URL}/admin/project`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const projects = projectsResponse.data;
    console.log(`✅ Found ${projects.length} projects`);

    if (projects.length === 0) {
      console.log('❌ No projects found to test');
      return;
    }

    // Test refresh on first project
    const testProject = projects[0];
    console.log(`\n🔄 Testing competitor refresh for project: ${testProject.brandName} (${testProject.id})`);
    console.log(`Current competitors: ${testProject.competitors.join(', ')}`);
    console.log(`Current competitor details:`, testProject.competitorDetails);

    // Trigger refresh
    console.log('\n🚀 Triggering competitor website refresh...');
    const refreshResponse = await axios.post(
      `${API_URL}/admin/project/${testProject.id}/refresh-competitors`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    console.log('✅ Refresh triggered:', refreshResponse.data.message);
    console.log('\n⏳ Waiting 5 seconds for processing...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Check updated project
    console.log('\n📋 Fetching updated project...');
    const updatedProjectResponse = await axios.get(
      `${API_URL}/admin/project/${testProject.id}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const updatedProject = updatedProjectResponse.data;
    console.log('\n✅ Updated competitor details:');
    updatedProject.competitorDetails.forEach(detail => {
      console.log(`  - ${detail.name}: ${detail.website || 'No website found'}`);
    });

  } catch (error) {
    if (error.response) {
      console.error('\n❌ API Error:', error.response.data);
      console.error('Status:', error.response.status);
    } else {
      console.error('\n❌ Error:', error.message);
    }
  }
}

// Run the test
testCompetitorRefresh();