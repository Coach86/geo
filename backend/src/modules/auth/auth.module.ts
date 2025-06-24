import { Module, forwardRef } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthService } from './services/auth.service';
import { TokenService } from './services/token.service';
import { JwtTokenService } from './services/jwt-token.service';
import { ShopifyAuthService } from './services/shopify-auth.service';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AuthController } from './controllers/auth.controller';
import { PublicAuthController } from './controllers/public-auth.controller';
import { TokenController } from './controllers/token.controller';
import { ShopifyAuthController } from './controllers/shopify-auth.controller';
import { UserAuthController } from './controllers/user-auth.controller';
import { TokenAuthGuard } from './guards/token-auth.guard';
import { Admin, AdminSchema } from './schemas/admin.schema';
import { AccessToken, AccessTokenSchema } from './schemas/access-token.schema';
import { ReportModule } from '../report/report.module';
import { UserModule } from '../user/user.module';
import { OrganizationModule } from '../organization/organization.module';
import { PromoModule } from '../promo/promo.module';
import { AdminRepository } from './repositories/admin.repository';
import { AccessTokenRepository } from './repositories/access-token.repository';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'default_secret_key_for_dev',
        signOptions: { expiresIn: '2h' },
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: Admin.name, schema: AdminSchema },
      { name: AccessToken.name, schema: AccessTokenSchema },
    ]),
    forwardRef(() => ReportModule),
    forwardRef(() => UserModule),
    forwardRef(() => PromoModule),
    forwardRef(() => OrganizationModule),
  ],
  providers: [
    AuthService,
    TokenService,
    JwtTokenService,
    ShopifyAuthService,
    LocalStrategy,
    JwtStrategy,
    TokenAuthGuard,
    AdminRepository,
    AccessTokenRepository
  ],
  controllers: [AuthController, PublicAuthController, TokenController, ShopifyAuthController, UserAuthController],
  exports: [AuthService, TokenService, JwtTokenService, ShopifyAuthService, TokenAuthGuard, AdminRepository, AccessTokenRepository, JwtModule],
})
export class AuthModule {}
