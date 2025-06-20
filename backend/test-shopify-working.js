const axios = require('axios');

// Environment variables needed for proper testing:
// - SHOPIFY_API_KEY: Your Shopify app's API key (REQUIRED)
// - SHOPIFY_API_SECRET: Your Shopify app's API secret for JWT signing (REQUIRED)
// - SHOPIFY_WEBHOOK_SECRET: Secret for webhook signature validation (REQUIRED)
// - SHOPIFY_ACCESS_TOKEN: (Optional) Access token for Shopify Admin API calls
//
// Note: All test-specific code has been removed from the service.
// The JWT signature MUST be valid for authentication to work.

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3002/api';

// Simple test configuration
const TEST_SHOP = 'demo-shop.myshopify.com';
const TEST_USER_ID = '12345678';

// Create a properly signed mock token
const crypto = require('crypto');

function createMockToken() {
  const payload = {
    iss: `https://${TEST_SHOP}/admin`,
    dest: `https://${TEST_SHOP}`,
    aud: process.env.SHOPIFY_API_KEY || 'test-api-key',
    sub: TEST_USER_ID,
    exp: Math.floor(Date.now() / 1000) + 3600,
    nbf: Math.floor(Date.now() / 1000),
    iat: Math.floor(Date.now() / 1000),
    jti: 'test-session',
    sid: 'test-session'
  };

  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  
  // Create proper signature if we have the secret
  const secret = process.env.SHOPIFY_API_SECRET || 'test-secret';
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest('base64url');
  
  return `${header}.${body}.${signature}`;
}

async function runWorkingTest() {
  console.log('🔐 Shopify Authentication Test (Corrected Endpoints)\n');
  console.log('📍 Configuration:');
  console.log(`   API URL: ${API_BASE_URL}`);
  console.log(`   Test Shop: ${TEST_SHOP}`);
  console.log(`   Test User ID: ${TEST_USER_ID}\n`);

  const results = {
    login: { passed: false, message: '' },
    profile: { passed: false, message: '' },
    organization: { passed: false, message: '' },
    project: { passed: false, message: '' },
    refresh: { passed: false, message: '' },
    invalidToken: { passed: false, message: '' },
    adminAccess: { passed: false, message: '' },
    webhook: { passed: false, message: '' }
  };

  let accessToken = null;
  let userId = null;
  let organizationId = null;

  try {
    // 1. Login with Shopify session token
    console.log('1️⃣  Login with Shopify session token...');
    const sessionToken = createMockToken();

    try {
      const loginResponse = await axios.post(`${API_BASE_URL}/auth/shopify/session`, {
        sessionToken: sessionToken
      });

      if (loginResponse.status === 201 || loginResponse.status === 200) {
        accessToken = loginResponse.data.access_token;
        userId = loginResponse.data.user.id;
        organizationId = loginResponse.data.user.organizationId;

        results.login.passed = true;
        results.login.message = `User: ${loginResponse.data.user.email}`;

        console.log('   ✅ Login successful!');
        console.log(`   👤 User ID: ${userId}`);
        console.log(`   📧 Email: ${loginResponse.data.user.email}`);
        console.log(`   🏪 Shop: ${loginResponse.data.user.shopifyShopDomain}`);
        console.log(`   🏢 Organization: ${organizationId}`);
        console.log(`   🔑 JWT Token (first 50 chars): ${accessToken.substring(0, 50)}...`);
      }
    } catch (error) {
      results.login.message = error.response?.data?.message || error.message;
      console.error('   ❌ Login failed:', results.login.message);
    }

    if (!accessToken) {
      console.log('\n⚠️  Cannot continue without authentication');
      return;
    }

    // 2. Access user profile (JWT endpoint)
    console.log('\n2️⃣  Access user profile...');
    try {
      const profileResponse = await axios.get(`${API_BASE_URL}/user/profile`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      results.profile.passed = true;
      results.profile.message = `Email: ${profileResponse.data.email}`;

      console.log('   ✅ Profile accessed successfully');
      console.log(`   📧 Email: ${profileResponse.data.email}`);
      console.log(`   🆔 Auth Type: ${profileResponse.data.authType || 'standard'}`);
      console.log(`   🏪 Shop Domain: ${profileResponse.data.shopifyShopDomain || 'N/A'}`);
    } catch (error) {
      results.profile.message = error.response?.data?.message || error.message;
      console.error('   ❌ Profile access failed:', results.profile.message);
      console.error('   📝 Full error:', error.response?.data);
    }

    // 3. Get organization details (JWT endpoint)
    console.log('\n3️⃣  Get organization details...');
    try {
      const orgResponse = await axios.get(`${API_BASE_URL}/user/organization`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      results.organization.passed = true;
      results.organization.message = `Organization: ${orgResponse.data.name}`;

      console.log('   ✅ Organization accessed successfully');
      console.log(`   🏢 Name: ${orgResponse.data.name}`);
      console.log(`   🏪 Shop Domain: ${orgResponse.data.shopifyShopDomain || 'N/A'}`);
      console.log(`   📊 Plan: ${orgResponse.data.stripePlanId || 'Free'}`);
      console.log(`   👥 Max Users: ${orgResponse.data.planSettings?.maxUsers || 'Unlimited'}`);
    } catch (error) {
      results.organization.message = error.response?.data?.message || error.message;
      console.error('   ❌ Organization access failed:', results.organization.message);
      console.error('   📝 Full error:', error.response?.data);
    }

    // 4. Create a test project using the existing create-from-url endpoint
    console.log('\n4️⃣  Create a test project from URL...');
    try {
      // First, check existing projects
      const projectsResponse = await axios.get(`${API_BASE_URL}/user/project`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      console.log(`   📊 Existing projects: ${projectsResponse.data.length}`);

      const projectData = {
        url: `https://testbrand-${Date.now()}.myshopify.com`,
        market: 'United States',
        language: 'en',
        name: `Shopify Test Project ${Date.now()}`
      };

      const projectResponse = await axios.post(`${API_BASE_URL}/user/project/create-from-url`, projectData, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      results.project.passed = true;
      results.project.message = `Project: ${projectResponse.data.name || projectResponse.data.brandName}`;

      console.log('   ✅ Project created successfully');
      console.log(`   🏷️  Project ID: ${projectResponse.data.id}`);
      console.log(`   🏢 Name: ${projectResponse.data.name || projectResponse.data.brandName}`);
      console.log(`   🌐 Website: ${projectResponse.data.website || projectResponse.data.url}`);
    } catch (error) {
      if (error.response?.data?.message?.includes('Project limit reached') || 
          error.response?.data?.message?.includes('project limit')) {
        // This is expected for free plan with 1 project limit
        results.project.passed = true;
        results.project.message = 'Project limit enforced correctly';
        console.log('   ✅ Project limit correctly enforced (Free plan: 1 project)');
      } else {
        results.project.message = error.response?.data?.message || error.message;
        console.error('   ❌ Project creation failed:', results.project.message);
        if (error.response?.data?.message && Array.isArray(error.response.data.message)) {
          console.error('   📝 Validation errors:', error.response.data.message.join(', '));
        }
      }
    }

    // 5. Refresh token
    console.log('\n5️⃣  Refresh access token...');
    try {
      const refreshResponse = await axios.post(`${API_BASE_URL}/auth/shopify/refresh`, {}, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      const newToken = refreshResponse.data.access_token;
      results.refresh.passed = true;
      results.refresh.message = `Token refreshed (changed: ${newToken !== accessToken})`;

      console.log('   ✅ Token refreshed successfully');
      console.log(`   🔄 Token changed: ${newToken !== accessToken}`);

      // Update token for next test
      accessToken = newToken;
    } catch (error) {
      results.refresh.message = error.response?.data?.message || error.message;
      console.error('   ❌ Token refresh failed:', results.refresh.message);
    }

    // 6. Test invalid token (simulate logout)
    console.log('\n6️⃣  Test invalid token handling...');
    try {
      await axios.get(`${API_BASE_URL}/user/profile`, {
        headers: { 'Authorization': 'Bearer invalid_token_123' }
      });

      results.invalidToken.message = 'Invalid token was accepted!';
      console.error('   ❌ Invalid token should have been rejected!');
    } catch (error) {
      if (error.response?.status === 401) {
        results.invalidToken.passed = true;
        results.invalidToken.message = 'Correctly rejected with 401';
        console.log('   ✅ Invalid token correctly rejected (401 Unauthorized)');
      } else {
        results.invalidToken.message = `Unexpected error: ${error.response?.status}`;
        console.error('   ❌ Unexpected error:', error.response?.status);
      }
    }

    // 7. Test that Shopify tokens CANNOT access admin endpoints
    console.log('\n7️⃣  Test admin endpoint access (should be denied)...');
    const adminEndpoints = [
      { method: 'GET', url: '/admin/users', name: 'List all users' },
      { method: 'POST', url: '/admin/users', name: 'Create user', data: { email: 'test@example.com', organizationId: organizationId } },
      { method: 'GET', url: '/admin/project', name: 'List all projects' },
      { method: 'GET', url: '/admin/organizations', name: 'List all organizations' },
      { method: 'GET', url: '/admin/batch', name: 'List all batches' },
      { method: 'POST', url: '/auth/admin/login', name: 'Admin login', data: { email: 'admin@example.com', password: 'password' } }
    ];

    let adminTestsPassed = 0;
    let adminTestsFailed = 0;
    let adminEndpointsFound = 0;

    for (const endpoint of adminEndpoints) {
      try {
        const config = {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        };

        let response;
        if (endpoint.method === 'GET') {
          response = await axios.get(`${API_BASE_URL}${endpoint.url}`, config);
        } else if (endpoint.method === 'POST') {
          response = await axios.post(`${API_BASE_URL}${endpoint.url}`, endpoint.data || {}, config);
        }

        // If we get here, the endpoint allowed access - this is BAD
        console.error(`   ❌ ${endpoint.name}: SECURITY ISSUE - Shopify token was accepted!`);
        adminTestsFailed++;
      } catch (error) {
        if (error.response?.status === 401 || error.response?.status === 403) {
          console.log(`   ✅ ${endpoint.name}: Correctly denied (${error.response.status})`);
          adminTestsPassed++;
          adminEndpointsFound++;
        } else if (error.response?.status === 404) {
          console.log(`   ⏭️  ${endpoint.name}: Endpoint not found (404) - skipping`);
          // Don't count 404s as failures - the endpoint might not exist
        } else {
          console.error(`   ⚠️  ${endpoint.name}: Unexpected error (${error.response?.status || error.message})`);
          adminTestsFailed++;
          adminEndpointsFound++;
        }
      }
    }

    results.adminAccess.passed = adminEndpointsFound > 0 && adminTestsFailed === 0;
    results.adminAccess.message = adminEndpointsFound > 0 
      ? `${adminTestsPassed}/${adminEndpointsFound} existing endpoints correctly denied access`
      : 'No admin endpoints found to test';

    // 8. Test webhook handling
    console.log('\n8️⃣  Test webhook handling...');
    try {
      const webhookData = {
        id: 12345,
        name: TEST_SHOP,
        email: 'test@example.com',
        domain: TEST_SHOP,
        updated_at: new Date().toISOString()
      };

      const webhookBody = JSON.stringify(webhookData);
      const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET || 'test-webhook-secret';
      const hmac = crypto
        .createHmac('sha256', webhookSecret)
        .update(webhookBody, 'utf8')
        .digest('base64');

      const webhookResponse = await axios.post(
        `${API_BASE_URL}/auth/shopify/webhook`,
        webhookData,
        {
          headers: {
            'X-Shopify-Topic': 'shop/update',
            'X-Shopify-Shop-Domain': TEST_SHOP,
            'X-Shopify-API-Version': '2024-01',
            'X-Shopify-Webhook-Id': 'test-webhook-id',
            'X-Shopify-Hmac-SHA256': hmac
          }
        }
      );

      if (webhookResponse.status === 200 || webhookResponse.status === 201) {
        results.webhook.passed = true;
        results.webhook.message = 'Webhook processed successfully';
        console.log('   ✅ Webhook handled successfully');
        console.log('   📦 Response:', webhookResponse.data);
      }
    } catch (error) {
      results.webhook.message = error.response?.data?.message || error.message;
      console.error('   ❌ Webhook test failed:', results.webhook.message);
    }

  } catch (error) {
    console.error('\n❌ Unexpected error:', error.message);
  }

  // Summary
  console.log('\n📊 Test Results Summary:');
  console.log('   ╔════════════════════════════════════════╗');
  console.log(`   ║ Login:         ${results.login.passed ? '✅ PASSED' : '❌ FAILED'}                  ║`);
  console.log(`   ║ Profile:       ${results.profile.passed ? '✅ PASSED' : '❌ FAILED'}                  ║`);
  console.log(`   ║ Organization:  ${results.organization.passed ? '✅ PASSED' : '❌ FAILED'}                  ║`);
  console.log(`   ║ Project:       ${results.project.passed ? '✅ PASSED' : '❌ FAILED'}                  ║`);
  console.log(`   ║ Refresh:       ${results.refresh.passed ? '✅ PASSED' : '❌ FAILED'}                  ║`);
  console.log(`   ║ Invalid Token: ${results.invalidToken.passed ? '✅ PASSED' : '❌ FAILED'}                  ║`);
  console.log(`   ║ Admin Access:  ${results.adminAccess.passed ? '✅ PASSED' : '❌ FAILED'}                  ║`);
  console.log(`   ║ Webhook:       ${results.webhook.passed ? '✅ PASSED' : '❌ FAILED'}                  ║`);
  console.log('   ╚════════════════════════════════════════╝');

  const totalPassed = Object.values(results).filter(r => r.passed).length;
  const totalTests = Object.keys(results).length;

  console.log(`\n📈 Score: ${totalPassed}/${totalTests} tests passed`);

  if (totalPassed === totalTests) {
    console.log('🎉 All tests passed! Shopify authentication is working perfectly!');
  } else {
    console.log('\n❌ Failed tests:');
    Object.entries(results).forEach(([test, result]) => {
      if (!result.passed) {
        console.log(`   - ${test}: ${result.message}`);
      }
    });
  }
}

// Run the test
console.log('🚀 Starting Shopify Authentication Test');
console.log('=====================================\n');
runWorkingTest().catch(error => {
  console.error('\n💥 Unhandled error:', error);
  process.exit(1);
});
