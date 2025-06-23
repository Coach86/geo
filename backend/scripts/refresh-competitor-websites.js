#!/usr/bin/env node

/**
 * Admin script to refresh competitor websites for a project
 * 
 * Usage:
 *   node scripts/refresh-competitor-websites.js <projectId>
 *   
 * Environment variables:
 *   API_URL - API base URL (default: http://localhost:3000)
 *   ADMIN_EMAIL - Admin email for authentication
 *   ADMIN_PASSWORD - Admin password for authentication
 */

const axios = require('axios');

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:3000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

async function refreshCompetitorWebsites(projectId) {
  try {
    // Get project ID from command line
    if (!projectId) {
      console.error('❌ Error: Please provide a project ID');
      console.log('Usage: node scripts/refresh-competitor-websites.js <projectId>');
      process.exit(1);
    }

    console.log('🔐 Logging in as admin...');
    const loginResponse = await axios.post(`${API_URL}/auth/admin/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });

    const token = loginResponse.data.access_token;
    console.log('✅ Admin login successful');

    // Get project details
    console.log(`\n📋 Fetching project ${projectId}...`);
    const projectResponse = await axios.get(`${API_URL}/admin/project/${projectId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const project = projectResponse.data;
    console.log(`✅ Found project: ${project.brandName}`);
    console.log(`Current competitors: ${project.competitors.join(', ')}`);
    console.log(`Current competitor details:`, project.competitorDetails || 'None');

    // Trigger refresh
    console.log('\n🚀 Triggering competitor website refresh...');
    const refreshResponse = await axios.post(
      `${API_URL}/admin/project/${projectId}/refresh-competitors`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    console.log('✅ Refresh triggered:', refreshResponse.data.message);
    console.log('\n⏳ The competitor websites are being fetched in the background.');
    console.log('   Check the project again in a few seconds to see the updated competitor details.');

  } catch (error) {
    if (error.response) {
      console.error('\n❌ API Error:', error.response.data);
      console.error('Status:', error.response.status);
    } else {
      console.error('\n❌ Error:', error.message);
    }
    process.exit(1);
  }
}

// Get project ID from command line arguments
const projectId = process.argv[2];

// Run the script
refreshCompetitorWebsites(projectId);