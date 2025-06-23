# Shopify App Authentication Integration

This document describes the Shopify authentication integration for the Mint AI backend.

## Overview

The Shopify authentication system allows Shopify app users to authenticate and access the Mint AI platform using their Shopify credentials. This is separate from the existing admin JWT and magic link authentication systems.

## Architecture

### New Components

1. **ShopifyAuthService** (`src/modules/auth/services/shopify-auth.service.ts`)
   - Validates Shopify session tokens
   - Creates/updates users and organizations
   - Generates JWT tokens for authenticated Shopify users

2. **ShopifyAuthController** (`src/modules/auth/controllers/shopify-auth.controller.ts`)
   - `POST /auth/shopify/session` - Exchange Shopify session token for JWT
   - `POST /auth/shopify/refresh` - Refresh JWT token
   - `POST /auth/shopify/webhook` - Handle Shopify webhooks

### Database Schema Updates

#### User Schema
- `shopifyShopDomain` - The Shopify shop domain (e.g., "myshop.myshopify.com")
- `shopifyShopId` - The Shopify user ID
- `authType` - Authentication type ("standard" or "shopify")

#### Organization Schema
- `name` - Organization name (required)
- `shopifyShopDomain` - Associated Shopify shop domain

## Authentication Flow

1. **Shopify App Installation**
   - Merchant installs the Mint AI app from Shopify App Store
   - App loads in the Shopify admin

2. **Session Token Exchange**
   - App retrieves Shopify session token
   - App sends token to `POST /auth/shopify/session`
   - Backend validates the token
   - Backend creates/finds organization for the shop
   - Backend creates/finds user
   - Backend returns JWT token

3. **API Access**
   - App uses JWT token in Authorization header
   - Token includes shop domain and user info
   - All existing API endpoints work with Shopify JWT

## Implementation Details

### Token Validation

The system validates Shopify session tokens by:
1. Decoding the JWT structure
2. Checking token expiration
3. Verifying the signature (requires `SHOPIFY_API_SECRET`)

### Organization Management

- Each Shopify shop gets its own organization
- Organization name defaults to the shop domain
- Organizations are automatically assigned the free plan
- Shop domain is indexed for fast lookups

### User Management

- Users are created with email from Shopify
- Users are linked to their shop's organization
- Multiple users from the same shop share the organization
- Users are marked with `authType: 'shopify'`

## Configuration

Add these environment variables:

```env
SHOPIFY_API_SECRET=your_shopify_api_secret
SHOPIFY_WEBHOOK_SECRET=your_webhook_secret
```

## Testing

Use the provided test script to verify the integration:

```bash
node test-shopify-auth.js
```

This script tests:
1. Session token exchange
2. Authenticated endpoint access
3. Token refresh
4. Organization details retrieval

## Security Considerations

1. **Token Validation**: Always validate Shopify session tokens server-side
2. **HMAC Verification**: Verify webhook signatures
3. **Shop Domain**: Use shop domain as part of user identity
4. **Separate Auth Type**: Keep Shopify users separate from standard users

## Future Enhancements

1. **Shopify Billing API**: Integrate with Shopify's billing API for subscriptions
2. **App Uninstall Webhook**: Clean up data when app is uninstalled
3. **Shop Data Sync**: Sync shop metadata from Shopify
4. **Multi-shop Support**: Allow users to manage multiple shops

## API Endpoints

### Exchange Session Token
```http
POST /auth/shopify/session
Content-Type: application/json

{
  "sessionToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

Response:
{
  "access_token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "email": "user@shop.com",
    "shopifyShopDomain": "myshop.myshopify.com",
    "organizationId": "org_id"
  }
}
```

### Refresh Token
```http
POST /auth/shopify/refresh
Authorization: Bearer {jwt_token}

Response:
{
  "access_token": "new_jwt_token"
}
```

### Handle Webhook
```http
POST /auth/shopify/webhook
X-Shopify-Hmac-Sha256: {hmac_signature}
X-Shopify-Topic: {webhook_topic}
X-Shopify-Shop-Domain: {shop_domain}

{webhook_payload}
```