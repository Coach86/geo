import { Injectable, BadRequestException, Inject, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { renderAsync } from '@react-email/render';
import React from 'react';
import * as bcrypt from 'bcrypt';
import { Admin, AdminDocument } from '../schemas/admin.schema';
import { AdminRepository } from '../repositories/admin.repository';
import { UserService } from '../../user/services/user.service';
import { TokenService } from './token.service';
import { MagicLinkEmail } from '../../report/email';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly adminRepository: AdminRepository,
    private jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(UserService) private readonly userService: UserService,
    @Inject(TokenService) private readonly tokenService: TokenService,
  ) {}

  async validateAdmin(email: string, password: string): Promise<any> {
    const admin = await this.adminRepository.findByEmail(email);

    if (admin && (await bcrypt.compare(password, admin.passwordHash))) {
      // Update last login timestamp
      await this.adminRepository.updateLastLogin(admin.id);

      // Since we're using lean(), admin is already a plain JS object
      const { passwordHash, ...result } = admin;
      return result;
    }

    return null;
  }

  async login(admin: any) {
    const payload = {
      email: admin.email,
      sub: admin.id,
    };

    return {
      access_token: this.jwtService.sign(payload),
      admin: {
        id: admin.id,
        email: admin.email,
      },
    };
  }

  async refreshToken(admin: any) {
    const payload = {
      email: admin.email,
      sub: admin.id,
    };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async sendMagicLink(email: string) {
    this.logger.log(`Magic link request for email: ${email}`);

    try {
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new BadRequestException('Valid email address is required');
      }

      // First, try to find existing user
      let user;
      try {
        user = await this.userService.findByEmail(email);
        this.logger.log(`Found existing user: ${user.id}`);
      } catch (error) {
        // User not found, create new one
        this.logger.log(`User not found, creating new user for: ${email}`);
        user = await this.userService.create({ email });
        this.logger.log(`Created new user: ${user.id}`);
      }

      // Generate access token
      const token = await this.tokenService.generateAccessToken(user.id);

      // Send magic link email
      await this.sendMagicLinkEmail(email, token);

      return {
        success: true,
        message: 'Magic link sent successfully',
        userId: user.id,
      };
    } catch (error) {
      this.logger.error(`Magic link error for ${email}: ${error.message}`, error.stack);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to send magic link: ${error.message}`);
    }
  }

  private async sendMagicLinkEmail(email: string, token: string): Promise<void> {
    try {
      const resendApiKey = this.configService.get<string>('RESEND_API_KEY');
      if (!resendApiKey) {
        this.logger.warn('RESEND_API_KEY not configured, skipping email notification');
        return;
      }

      const baseUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3001';
      const accessUrl = `${baseUrl}/auth/login?token=${token}`;

      const resend = new Resend(resendApiKey);

      const emailResponse = await resend.emails.send({
        from: 'tailorfeed-ai@tailorfeed.ai',
        to: email,
        subject: 'Sign in to Mint - Your magic link is ready',
        react: React.createElement(MagicLinkEmail, {
          email,
          accessUrl,
        }),
      });

      if (emailResponse.error) {
        throw new Error(`Failed to send email: ${emailResponse.error.message}`);
      }

      this.logger.log(`Magic link email sent to ${email} with token ${token.substring(0, 8)}...`);
    } catch (error) {
      this.logger.error(`Failed to send magic link email: ${error.message}`, error.stack);
      throw error;
    }
  }
}
