# Shopify App Integration with Mint AI

This document outlines the specifications for integrating a Shopify app with the Mint AI backend API for user authentication and project management.

## Authentication Flow

### 1. Session Token Exchange
```
POST /auth/shopify/session
Content-Type: application/json

{
  "sessionToken": "shopify_session_token_here"
}
```

**Response:**
```json
{
  "access_token": "jwt_token",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "organizationId": "org_id"
  }
}
```

### 2. Token Refresh
```
POST /auth/shopify/refresh
Authorization: Bearer {current_jwt_token}
```

**Response:**
```json
{
  "access_token": "new_jwt_token"
}
```

## User Management

### Get User Profile
```
GET /users/profile
Authorization: Bearer {jwt_token}
```

### Get Organization Details
```
GET /users/organization
Authorization: Bearer {jwt_token}
```
