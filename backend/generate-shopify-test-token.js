const crypto = require('crypto');

// This script generates a valid Shopify session token for testing
// You need to set the SHOPIFY_API_SECRET environment variable

const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET;
const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY || 'test-api-key';

if (!SHOPIFY_API_SECRET) {
  console.error('❌ Error: SHOPIFY_API_SECRET environment variable is required');
  console.error('Example: SHOPIFY_API_SECRET=your_secret node generate-shopify-test-token.js');
  process.exit(1);
}

const TEST_SHOP = 'demo-shop.myshopify.com';
const TEST_USER_ID = '12345678';

function generateTestToken() {
  const payload = {
    iss: `https://${TEST_SHOP}/admin`,
    dest: `https://${TEST_SHOP}`,
    aud: SHOPIFY_API_KEY,
    sub: TEST_USER_ID,
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    nbf: Math.floor(Date.now() / 1000),
    iat: Math.floor(Date.now() / 1000),
    jti: 'test-session-' + Date.now(),
    sid: 'test-session'
  };

  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  
  // Create proper HMAC signature
  const signature = crypto
    .createHmac('sha256', SHOPIFY_API_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');
  
  return {
    token: `${header}.${body}.${signature}`,
    payload,
    header: { alg: 'HS256', typ: 'JWT' }
  };
}

console.log('🔐 Shopify Test Token Generator\n');
console.log('Configuration:');
console.log(`  Shop: ${TEST_SHOP}`);
console.log(`  User ID: ${TEST_USER_ID}`);
console.log(`  API Key (audience): ${SHOPIFY_API_KEY}`);
console.log(`  API Secret: ${SHOPIFY_API_SECRET.substring(0, 10)}...`);
console.log('');

const result = generateTestToken();

console.log('Generated Token:');
console.log('-'.repeat(80));
console.log(result.token);
console.log('-'.repeat(80));
console.log('');

console.log('Token Details:');
console.log('Header:', JSON.stringify(result.header, null, 2));
console.log('Payload:', JSON.stringify(result.payload, null, 2));
console.log('');

console.log('To test authentication, run:');
console.log(`SHOPIFY_API_KEY="${SHOPIFY_API_KEY}" SHOPIFY_API_SECRET="${SHOPIFY_API_SECRET}" node test-shopify-working.js`);
console.log('');

console.log('Or use this token directly in your API calls:');
console.log(`curl -X POST http://localhost:3002/api/auth/shopify/session \\
  -H "Content-Type: application/json" \\
  -d '{"sessionToken": "${result.token}"}'`);