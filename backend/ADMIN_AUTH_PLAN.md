# Authentication Plan for Backend Admin Interface

## Overview
This document outlines the plan for implementing authentication for all endpoints used by the admin frontend (`/backend/src/frontend/`). Currently, these endpoints lack the secure token-based authentication mechanism used in the public frontend.

## Authentication Requirements

1. **Admin-only access**: Only authorized admin users should access the admin frontend
2. **Stateless authentication**: JWT-based authentication for scalability
3. **Role-based access control**: Differentiate between admin and regular users
4. **Secure storage**: Proper handling of credentials and tokens
5. **Session management**: Token expiration and refresh mechanism

## Implementation Plan

### 1. Authentication Service and Module

```typescript
// Create a new auth module
nest g module auth
nest g service auth
nest g controller auth
```

#### 1.1 Create Admin Schema

```typescript
// Create a new Admin schema in src/modules/auth/schemas/admin.schema.ts
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

Note: This approach keeps the User schema completely separate from admin authentication, ensuring a clear separation between application users and administrators.

### 2. Authentication Strategies

#### 2.1 JWT Strategy Implementation

```typescript
// src/modules/auth/strategies/jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    return { 
      userId: payload.sub, 
      email: payload.email,
      isAdmin: payload.isAdmin 
    };
  }
}
```

#### 2.2 Local Strategy for Username/Password

```typescript
// src/modules/auth/strategies/local.strategy.ts
import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../services/auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({ usernameField: 'email' });
  }

  async validate(email: string, password: string): Promise<any> {
    const admin = await this.authService.validateAdmin(email, password);
    
    if (!admin) {
      throw new UnauthorizedException('Invalid credentials');
    }
    
    return admin;
  }
}
```

### 3. Authentication Service Implementation

```typescript
// src/modules/auth/services/auth.service.ts
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { Admin, AdminDocument } from '../schemas/admin.schema';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(Admin.name) private adminModel: Model<AdminDocument>,
    private jwtService: JwtService,
  ) {}

  async validateAdmin(email: string, password: string): Promise<any> {
    const admin = await this.adminModel.findOne({ email }).exec();
    
    if (admin && await bcrypt.compare(password, admin.passwordHash)) {
      // Update last login timestamp
      await this.adminModel.updateOne(
        { _id: admin._id },
        { $set: { lastLogin: new Date() } }
      );
      
      const { passwordHash, ...result } = admin.toObject();
      return result;
    }
    
    return null;
  }

  async login(admin: any) {
    const payload = { 
      email: admin.email, 
      sub: admin.id
    };
    
    return {
      access_token: this.jwtService.sign(payload),
      admin: {
        id: admin.id,
        email: admin.email
      }
    };
  }
  
  async refreshToken(admin: any) {
    const payload = { 
      email: admin.email, 
      sub: admin.id
    };
    
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
```

### 4. Authentication Controller

```typescript
// src/modules/auth/controllers/auth.controller.ts
import { Controller, Post, UseGuards, Request, Body } from '@nestjs/common';
import { LocalAuthGuard } from '../guards/local-auth.guard';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AuthService } from '../services/auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req) {
    return this.authService.login(req.user);
  }
  
  @UseGuards(JwtAuthGuard)
  @Post('refresh')
  async refresh(@Request() req) {
    return this.authService.refreshToken(req.user);
  }
}
```

### 5. Auth Guards

```typescript
// src/modules/auth/guards/jwt-auth.guard.ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

```typescript
// src/modules/auth/guards/local-auth.guard.ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {}
```

```typescript
// src/modules/auth/guards/admin.guard.ts
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const admin = request.user;
    
    if (!admin) {
      throw new UnauthorizedException('Admin access required');
    }
    
    return true;
  }
}
```

### 6. Auth Module Configuration

```typescript
// src/modules/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthService } from './services/auth.service';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AuthController } from './controllers/auth.controller';
import { Admin, AdminSchema } from './schemas/admin.schema';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1h' },
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([{ name: Admin.name, schema: AdminSchema }]),
  ],
  providers: [AuthService, LocalStrategy, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
```

### 7. Protecting Existing Controllers

Add the JwtAuthGuard and AdminGuard to all admin-only controllers:

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

### 8. Frontend Integration

#### 8.1 Authentication Service in Frontend

```typescript
// src/frontend/utils/auth.ts
import axios from 'axios';

const API_BASE = '/api';

const authApi = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercept requests to add the token
authApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercept 401 responses and redirect to login
authApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const login = async (email: string, password: string) => {
  try {
    const response = await authApi.post('/auth/login', { email, password });
    const { access_token, admin } = response.data;
    
    // Store token in localStorage
    localStorage.setItem('auth_token', access_token);
    localStorage.setItem('admin_data', JSON.stringify(admin));
    
    return admin;
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
};

export const logout = () => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('admin_data');
  window.location.href = '/login';
};

export const refreshToken = async () => {
  try {
    const response = await authApi.post('/auth/refresh');
    const { access_token } = response.data;
    
    // Update token in localStorage
    localStorage.setItem('auth_token', access_token);
    
    return true;
  } catch (error) {
    console.error('Token refresh failed:', error);
    logout();
    return false;
  }
};

export const getCurrentAdmin = () => {
  const adminData = localStorage.getItem('admin_data');
  return adminData ? JSON.parse(adminData) : null;
};

export const isAuthenticated = () => {
  return !!localStorage.getItem('auth_token');
};

// Replace the default axios instance with the authenticated one
export default authApi;
```

#### 8.2 Update API Utilities to Use Authenticated Client

```typescript
// src/frontend/utils/api.ts
import authApi from './auth';
// Replace existing axios client with the authenticated one

// Update all API functions to use authApi instead of api
export const getCompanies = async (): Promise<CompanyIdentityCard[]> => {
  const response = await authApi.get('/identity-card');
  return response.data;
};

// ... update all other API functions similarly
```

#### 8.3 Create Login Component

```tsx
// src/frontend/pages/Login.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, TextField, Button, Typography, Paper, Container, Alert } from '@mui/material';
import { login } from '../utils/auth';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      await login(email, password);
      navigate('/'); // Redirect to dashboard on success
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8 }}>
        <Paper sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" align="center" gutterBottom>
            Admin Login
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              label="Email"
              type="email"
              fullWidth
              margin="normal"
              variant="outlined"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            
            <TextField
              label="Password"
              type="password"
              fullWidth
              margin="normal"
              variant="outlined"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="primary"
              size="large"
              sx={{ mt: 3 }}
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;
```

#### 8.4 Create Protected Route Component

```tsx
// src/frontend/components/ProtectedRoute.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { isAuthenticated } from '../utils/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children
}) => {
  const authenticated = isAuthenticated();
  
  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

export default ProtectedRoute;
```

#### 8.5 Update App Routing

```tsx
// src/frontend/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Unauthorized from './pages/Unauthorized';
import CompanyList from './pages/CompanyList';
// ... other imports

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/unauthorized" element={<Unauthorized />} />
        
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/companies" replace />} />
          <Route path="companies" element={<CompanyList />} />
          <Route path="companies/:id" element={<CompanyDetail />} />
          {/* ... other protected routes */}
        </Route>
      </Routes>
    </Router>
  );
};

export default App;
```

### 9. Security Enhancements

#### 9.1 Rate Limiting

```typescript
// Install necessary packages
// npm install @nestjs/throttler

// src/app.module.ts
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    // Other modules
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 10, // 10 requests per minute for authentication endpoints
    }),
  ],
})
export class AppModule {}
```

#### 9.2 Environment Configuration

```env
# .env
JWT_SECRET=your_very_strong_secret_key
JWT_EXPIRATION=3600
```

### 10. Admin User Creation Script

```typescript
// scripts/create-admin-user.ts
import { MongoClient } from 'mongodb';
import * as bcrypt from 'bcrypt';
import * as readline from 'readline';
import { v4 as uuidv4 } from 'uuid';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function createAdminUser() {
  // Get input from user
  const email = await new Promise(resolve => {
    rl.question('Enter admin email: ', resolve);
  });
  
  const password = await new Promise(resolve => {
    rl.question('Enter admin password: ', resolve);
  });
  
  // Connect to MongoDB
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/geo';
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const usersCollection = db.collection('users');
    
    // Check if admin already exists
    const adminsCollection = db.collection('admins');
    const existingAdmin = await adminsCollection.findOne({ email });
    
    if (existingAdmin) {
      console.log(`Admin with email ${email} already exists. Updating password...`);
      
      // Update existing admin's password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);
      
      await adminsCollection.updateOne(
        { email },
        { 
          $set: { 
            passwordHash,
            updatedAt: new Date()
          } 
        }
      );
      
      console.log('Admin password updated successfully');
    } else {
      // Create new admin user
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);
      
      await adminsCollection.insertOne({
        id: uuidv4(),
        email,
        passwordHash,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      console.log('Admin user created successfully');
    }
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await client.close();
    rl.close();
  }
}

createAdminUser().catch(console.error);
```

### 11. Migration Plan

1. **Add authentication dependencies**
   ```bash
   npm install @nestjs/jwt @nestjs/passport passport passport-jwt passport-local bcrypt
   npm install --save-dev @types/passport-jwt @types/passport-local @types/bcrypt
   ```

2. **Create the authentication module and all related files**
   - Create auth module, service, controller and guards as outlined above

3. **Update the User schema to include admin-related fields**
   - Add isAdmin and passwordHash fields to the User schema

4. **Secure all admin endpoints with guards**
   - Apply JwtAuthGuard and AdminGuard to all controllers

5. **Create the admin user creation script**
   - Implement the script as outlined and run it to create the first admin user

6. **Implement the frontend authentication components**
   - Create the Login page and authentication utility

7. **Update the API utilities to use the authenticated client**
   - Replace the existing axios client with the authenticated one

8. **Update the routing to protect admin routes**
   - Use the ProtectedRoute component to secure all admin routes

### 12. Testing the Authentication

1. **Unit test the AuthService**
   ```typescript
   // src/modules/auth/services/auth.service.spec.ts
   // Tests for user validation, login, token refresh
   ```

2. **End-to-end test the authentication flow**
   ```typescript
   // test/auth.e2e-spec.ts
   // Tests for login, protected routes, admin access
   ```

3. **Manual testing checklist**
   - Login with valid admin credentials
   - Login with invalid credentials
   - Access protected routes without authentication
   - Access admin-only routes as non-admin user
   - Token refresh functionality
   - Logout functionality

## Conclusion

This authentication plan provides a comprehensive approach to securing the admin frontend and its associated API endpoints. By implementing JWT-based authentication with role-based access control, we ensure that only authorized admin users can access the administrative features of the application.

The implementation will follow best practices for secure authentication, including:
- Secure password storage using bcrypt
- Token-based authentication with expiration
- Role-based access control for admin features
- Rate limiting to prevent brute force attacks

This solution is scalable and can be extended to support more complex authorization requirements in the future.