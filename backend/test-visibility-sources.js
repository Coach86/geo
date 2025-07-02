require('dotenv').config();
const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:3000';

async function testVisibilitySources() {
  try {
    console.log('Testing visibility sources attribution...\n');
    
    // First, get projects to find a projectId
    const projectsResponse = await axios.get(`${API_URL}/api/admin/projects`, {
      headers: {
        'Authorization': 'Bearer ' + process.env.ADMIN_TOKEN
      }
    });
    
    if (projectsResponse.data.length === 0) {
      console.log('No projects found');
      return;
    }
    
    const project = projectsResponse.data[0];
    console.log(`Using project: ${project.brandName} (${project.projectId})`);
    console.log(`Project website: ${project.website}`);
    console.log(`Competitor details:`, project.competitorDetails || 'No competitor details');
    console.log('\n');
    
    // Test aggregated visibility endpoint
    console.log('Testing aggregated visibility endpoint...');
    const visibilityResponse = await axios.get(
      `${API_URL}/api/brand-reports/project/${project.projectId}/visibility/aggregated?latestOnly=true`,
      {
        headers: {
          'Authorization': 'Bearer ' + process.env.ADMIN_TOKEN
        }
      }
    );
    
    const visibilityData = visibilityResponse.data;
    console.log('\nVisibility Response Summary:');
    console.log('- Average Score:', visibilityData.averageScore);
    console.log('- Top Domains Count:', visibilityData.topDomains?.length || 0);
    console.log('- Top Domains:', visibilityData.topDomains?.slice(0, 3) || []);
    console.log('\nSources Attribution (domainSourceAnalysis):');
    
    if (visibilityData.domainSourceAnalysis) {
      console.log('✅ Sources attribution is populated!');
      console.log('- Brand Domain %:', visibilityData.domainSourceAnalysis.brandDomainPercentage);
      console.log('- Other Sources %:', visibilityData.domainSourceAnalysis.otherSourcesPercentage);
      console.log('- Brand Domain Count:', visibilityData.domainSourceAnalysis.brandDomainCount);
      console.log('- Other Sources Count:', visibilityData.domainSourceAnalysis.otherSourcesCount);
      
      if (visibilityData.domainSourceAnalysis.competitorBreakdown) {
        console.log('\nCompetitor Breakdown:');
        visibilityData.domainSourceAnalysis.competitorBreakdown.forEach(comp => {
          console.log(`  - ${comp.name}: ${comp.count} citations (${comp.percentage}%)`);
        });
      }
      
      if (visibilityData.domainSourceAnalysis.unknownSourcesCount !== undefined) {
        console.log('\nUnknown Sources:');
        console.log('- Count:', visibilityData.domainSourceAnalysis.unknownSourcesCount);
        console.log('- Percentage:', visibilityData.domainSourceAnalysis.unknownSourcesPercentage);
      }
    } else {
      console.log('❌ Sources attribution (domainSourceAnalysis) is NOT populated');
    }
    
    console.log('\n\nFull response:', JSON.stringify(visibilityData, null, 2));
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testVisibilitySources();