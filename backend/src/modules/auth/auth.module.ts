import { Module, forwardRef } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthService } from './services/auth.service';
import { TokenService } from './services/token.service';
import { JwtTokenService } from './services/jwt-token.service';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AuthController } from './controllers/auth.controller';
import { PublicAuthController } from './controllers/public-auth.controller';
import { TokenController } from './controllers/token.controller';
import { TokenAuthGuard } from './guards/token-auth.guard';
import { Admin, AdminSchema } from './schemas/admin.schema';
import { AccessToken, AccessTokenSchema } from './schemas/access-token.schema';
import { ReportModule } from '../report/report.module';
import { UserModule } from '../user/user.module';
import { AdminRepository } from './repositories/admin.repository';
import { AccessTokenRepository } from './repositories/access-token.repository';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
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
  ],
  providers: [AuthService, TokenService, JwtTokenService, LocalStrategy, JwtStrategy, TokenAuthGuard, AdminRepository, AccessTokenRepository],
  controllers: [AuthController, PublicAuthController, TokenController],
  exports: [AuthService, TokenService, JwtTokenService, TokenAuthGuard, AdminRepository, AccessTokenRepository],
})
export class AuthModule {}
