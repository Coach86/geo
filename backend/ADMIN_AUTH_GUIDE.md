# Admin Authentication Implementation Guide

This guide provides step-by-step instructions for implementing the authentication system for the admin frontend, based on the detailed plan in `ADMIN_AUTH_PLAN.md`.

## Prerequisites

Before starting the implementation, ensure you have:

1. Node.js 20 LTS installed
2. Access to MongoDB database
3. Basic knowledge of NestJS and React

## Quick Start

1. Install required dependencies:
   ```bash
   npm install @nestjs/jwt @nestjs/passport passport passport-jwt passport-local bcrypt
   npm install --save-dev @types/passport-jwt @types/passport-local @types/bcrypt
   ```

2. Set up environment variables:
   ```bash
   # Add to your .env file
   JWT_SECRET=your_very_strong_secret_key_here
   JWT_EXPIRATION=3600
   ```

3. Create admin user:
   ```bash
   npm run create:admin
   ```

## Implementation Steps

Follow these steps to implement the authentication system:

### 1. Create Authentication Module

Use NestJS CLI to create the auth module structure:

```bash
nest g module auth
nest g service auth
nest g controller auth
```

### 2. Create Admin Schema

Create a dedicated Admin schema for authentication:

```typescript
// src/modules/auth/schemas/admin.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type AdminDocument = Admin & Document;

@Schema({
  collection: 'admins',
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
})
export class Admin {
  @Prop({ 
    type: String, 
    default: () => uuidv4(),
    index: true,
  })
  id: string;

  @Prop({ 
    type: String, 
    required: true,
    unique: true
  })
  email: string;

  @Prop({ type: String, required: true })
  passwordHash: string;

  @Prop({ type: Date, required: false })
  lastLogin: Date;
  
  @Prop({ type: Date })
  createdAt: Date;
  
  @Prop({ type: Date })
  updatedAt: Date;
}

export const AdminSchema = SchemaFactory.createForClass(Admin);
```

### 3. Create Auth Strategies and Guards

Implement JWT and Local strategies:

```bash
# Create files based on the provided code snippets in the authentication plan
```

### 4. Secure Controllers

Apply guards to all admin-facing controllers:

```typescript
// Example for a controller
import { Controller, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('prompt-set')
export class PromptSetController {
  // ... controller methods
}
```

### 5. Update Frontend

Implement the authentication utility and components:

```typescript
// Create auth.ts with login/logout functionality
// Create Login.tsx component
// Create ProtectedRoute.tsx component
```

### 6. Test Implementation

Run the following tests to ensure authentication is working properly:

1. Create an admin user:
   ```bash
   npm run create:admin
   ```

2. Try logging in with valid credentials
3. Try accessing protected routes with and without authentication
4. Test token refresh functionality

## Important Note

This implementation uses a separate `admins` collection in MongoDB, completely distinct from the `users` collection. This ensures a clear separation between application users and administrators who can access the admin interface.

## Security Considerations

1. **JWT Secret**: Use a strong, randomly generated secret key
2. **Password Hashing**: Ensure passwords are properly hashed with bcrypt
3. **HTTPS**: Always use HTTPS in production
4. **Token Expiration**: Set appropriate expiration times for JWTs
5. **Rate Limiting**: Implement rate limiting for login attempts

## Maintenance

Regularly review and update the authentication system:

1. Rotate JWT secrets periodically
2. Update dependencies to fix security vulnerabilities
3. Audit authentication logs for suspicious activity

## Support

If you encounter issues during implementation, refer to:

1. The detailed plan in `ADMIN_AUTH_PLAN.md`
2. NestJS documentation on authentication
3. React Router documentation for protected routes

## References

- [NestJS Authentication](https://docs.nestjs.com/security/authentication)
- [Passport.js](http://www.passportjs.org/docs/)
- [React Router](https://reactrouter.com/en/main/start/concepts)
- [JWT.io](https://jwt.io/)