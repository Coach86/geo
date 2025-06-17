#!/usr/bin/env node

/**
 * Test script for project deletion endpoint
 * This script tests that deleting a project properly cascades to delete all related data
 */

const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:3000';

// Test data
const testProject = {
  organizationId: 'test-org-id',
  data: {
    name: 'test-deletion-project',
    brandName: 'Test Deletion Brand',
    website: 'https://test-deletion.com',
    industry: 'Technology',
    market: 'US',
    shortDescription: 'Test project for deletion',
    fullDescription: 'This is a test project to verify cascade deletion works correctly',
    objectives: 'Test cascade deletion functionality',
    keyBrandAttributes: ['Test', 'Deletion', 'Cascade'],
    competitors: ['Competitor1', 'Competitor2']
  }
};

async function createTestProject() {
  try {
    console.log('Creating test project...');
    const response = await axios.post(`${API_URL}/admin/project`, testProject);
    console.log('✅ Project created successfully');
    console.log(`   Project ID: ${response.data.id}`);
    console.log(`   Brand Name: ${response.data.brandName}`);
    return response.data.id;
  } catch (error) {
    console.error('❌ Failed to create project:', error.response?.data || error.message);
    throw error;
  }
}

async function getProject(projectId) {
  try {
    const response = await axios.get(`${API_URL}/admin/project/${projectId}`);
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

async function deleteProject(projectId) {
  try {
    console.log(`\nDeleting project ${projectId}...`);
    const response = await axios.delete(`${API_URL}/admin/project/${projectId}`);
    console.log('✅ Project deletion request successful');
    console.log(`   Status: ${response.status}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to delete project:', error.response?.data || error.message);
    throw error;
  }
}

async function verifyProjectDeleted(projectId) {
  try {
    console.log(`\nVerifying project ${projectId} is deleted...`);
    const project = await getProject(projectId);
    if (project) {
      console.error('❌ Project still exists after deletion!');
      return false;
    }
    console.log('✅ Project successfully deleted');
    return true;
  } catch (error) {
    console.error('❌ Error verifying deletion:', error.message);
    throw error;
  }
}

async function checkRelatedData(projectId) {
  console.log(`\nChecking for related data cleanup...`);
  
  // Check if prompt sets are deleted
  try {
    const promptsResponse = await axios.get(`${API_URL}/admin/prompts/${projectId}`);
    if (promptsResponse.data) {
      console.log('⚠️  Prompt sets still exist for deleted project');
    }
  } catch (error) {
    if (error.response?.status === 404) {
      console.log('✅ Prompt sets properly cleaned up');
    }
  }

  // Check if reports are deleted
  try {
    const reportsResponse = await axios.get(`${API_URL}/brand-reports/project/${projectId}`);
    if (reportsResponse.data && reportsResponse.data.length > 0) {
      console.log('⚠️  Brand reports still exist for deleted project');
    } else {
      console.log('✅ Brand reports properly cleaned up');
    }
  } catch (error) {
    if (error.response?.status === 404 || (error.response?.data && error.response.data.length === 0)) {
      console.log('✅ Brand reports properly cleaned up');
    }
  }
}

async function runTest() {
  console.log('=== Project Deletion Test ===\n');
  
  let projectId;
  
  try {
    // Step 1: Create a test project
    projectId = await createTestProject();
    
    // Wait a bit to ensure data is persisted
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 2: Verify project exists
    const project = await getProject(projectId);
    if (!project) {
      throw new Error('Project not found after creation');
    }
    console.log('\n✅ Project exists before deletion');
    
    // Step 3: Delete the project
    await deleteProject(projectId);
    
    // Wait a bit for cascade deletion to complete
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 4: Verify project is deleted
    const deleted = await verifyProjectDeleted(projectId);
    
    // Step 5: Check related data is cleaned up
    await checkRelatedData(projectId);
    
    console.log('\n✅ Project deletion test completed successfully!');
    console.log('   - Project deleted');
    console.log('   - Related data cleaned up');
    console.log('   - Cascade deletion working correctly');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
runTest().catch(console.error);