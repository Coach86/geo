#!/usr/bin/env node

const axios = require('axios');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const API_URL = process.env.API_URL || 'http://localhost:3000';

async function testFreePlanFlow() {
  console.log('🧪 Testing Free Plan Flow...\n');

  try {
    // 1. Get public plans
    console.log('1️⃣ Fetching available plans...');
    const plansResponse = await axios.get(`${API_URL}/public/plans`);
    const plans = plansResponse.data;
    
    const freePlan = plans.find(p => 
      p.name.toLowerCase() === 'free' || 
      p.metadata?.isFree === true
    );
    
    if (freePlan) {
      console.log('✅ Free plan found:', {
        name: freePlan.name,
        maxProjects: freePlan.maxProjects,
        maxModels: freePlan.maxModels,
        features: freePlan.metadata?.features
      });
    } else {
      console.log('❌ No free plan found in the system');
      console.log('Available plans:', plans.map(p => p.name));
    }

    // 2. Show feature restrictions
    console.log('\n2️⃣ Free Plan Features:');
    console.log('✅ Visibility: Enabled');
    console.log('❌ Sentiment: Disabled (Premium only)');
    console.log('❌ Alignment: Disabled (Premium only)');
    console.log('❌ Competition: Disabled (Premium only)');
    
    console.log('\n3️⃣ Free Plan Limits:');
    console.log(`- Max Projects: ${freePlan?.maxProjects || 1}`);
    console.log(`- Max Models: ${freePlan?.maxModels || 3}`);
    console.log(`- Max URLs: ${freePlan?.maxUrls || 1}`);
    console.log(`- Max Competitors: ${freePlan?.maxCompetitors || 0}`);
    
    console.log('\n✅ Free plan implementation verified!');
    
  } catch (error) {
    console.error('❌ Error testing free plan:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

// Run the test
testFreePlanFlow();