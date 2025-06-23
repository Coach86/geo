const crypto = require('crypto');

// Test token validation locally
console.log('🔐 Testing Shopify Token Validation\n');

// Set these to match your backend configuration
const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY || 'test-api-key';
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET || 'test-secret';

console.log('Configuration:');
console.log(`  API Key: ${SHOPIFY_API_KEY}`);
console.log(`  API Secret: ${SHOPIFY_API_SECRET}`);
console.log('');

// Create a test token
const TEST_SHOP = 'demo-shop.myshopify.com';
const TEST_USER_ID = '12345678';

const payload = {
  iss: `https://${TEST_SHOP}/admin`,
  dest: `https://${TEST_SHOP}`,
  aud: SHOPIFY_API_KEY,
  sub: TEST_USER_ID,
  exp: Math.floor(Date.now() / 1000) + 3600,
  nbf: Math.floor(Date.now() / 1000),
  iat: Math.floor(Date.now() / 1000),
  jti: 'test-session',
  sid: 'test-session'
};

const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
const body = Buffer.from(JSON.stringify(payload)).toString('base64url');

// Create signature
const message = `${header}.${body}`;
const signature = crypto
  .createHmac('sha256', SHOPIFY_API_SECRET)
  .update(message)
  .digest('base64url');

const token = `${header}.${body}.${signature}`;

console.log('Generated Token:');
console.log(`  Header: ${header.substring(0, 30)}...`);
console.log(`  Body: ${body.substring(0, 30)}...`);
console.log(`  Signature: ${signature.substring(0, 30)}...`);
console.log('');

// Now validate it the same way the backend does
console.log('Validating token...');

const [h, p, s] = token.split('.');
const decodedPayload = JSON.parse(Buffer.from(p, 'base64').toString());

console.log('Decoded payload:', JSON.stringify(decodedPayload, null, 2));

// Recreate signature
const expectedSig = crypto
  .createHmac('sha256', SHOPIFY_API_SECRET)
  .update(`${h}.${p}`)
  .digest('base64url');

console.log('');
console.log('Signature comparison:');
console.log(`  Expected: ${expectedSig.substring(0, 30)}...`);
console.log(`  Received: ${s.substring(0, 30)}...`);
console.log(`  Match: ${expectedSig === s ? '✅ YES' : '❌ NO'}`);

if (expectedSig !== s) {
  console.log('\n❌ Signature mismatch! Check that:');
  console.log('1. SHOPIFY_API_SECRET matches between test and backend');
  console.log('2. The token hasn\'t been modified');
  console.log('3. The same encoding (base64url) is used');
}

console.log('\nFull token to use in tests:');
console.log(token);