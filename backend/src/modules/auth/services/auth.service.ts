import { Injectable, BadRequestException, Inject, Logger, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as bcrypt from 'bcrypt';
import { Admin, AdminDocument } from '../schemas/admin.schema';
import { AdminRepository } from '../repositories/admin.repository';
import { UserService } from '../../user/services/user.service';
import { TokenService } from './token.service';
import { PromoCodeService } from '../../promo/services/promo-code.service';
import { OrganizationService } from '../../organization/services/organization.service';
import { MagicLinkResponseDto } from '../dto/magic-link.dto';
import { SendMagicLinkEmailEvent } from '../../email/events/email.events';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly adminRepository: AdminRepository,
    private jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    @Inject(UserService) private readonly userService: UserService,
    @Inject(TokenService) private readonly tokenService: TokenService,
    @Inject(forwardRef(() => PromoCodeService)) private readonly promoCodeService: PromoCodeService,
    @Inject(forwardRef(() => OrganizationService)) private readonly organizationService: OrganizationService,
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
      isAdmin: true, // Add isAdmin flag for admin JWT tokens
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
      isAdmin: true, // Add isAdmin flag for admin JWT tokens
    };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async sendMagicLink(email: string, promoCode?: string): Promise<MagicLinkResponseDto> {
    this.logger.log(`Magic link request for email: ${email}, promo: ${promoCode}`);

    try {
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new BadRequestException('Valid email address is required');
      }

      // Validate promo code if provided
      let promoValidation = null;
      if (promoCode) {
        promoValidation = await this.promoCodeService.validate({ code: promoCode });
        if (!promoValidation.valid) {
          this.logger.warn(`Invalid promo code ${promoCode}: ${promoValidation.reason}`);
          // Don't throw error, just ignore invalid promo code
          promoCode = undefined;
        }
      }

      // First, try to find existing user
      let user;
      let isNewUser = false;
      try {
        user = await this.userService.findByEmail(email);
        this.logger.log(`Found existing user: ${user.id}`);
      } catch (error) {
        // User not found, create new one
        isNewUser = true;
        this.logger.log(`User not found, creating new user for: ${email}`);
        user = await this.userService.create({ email });
        this.logger.log(`Created new user: ${user.id}`);
      }

      // Apply promo code to the user's organization
      if (promoCode && promoValidation?.valid && promoValidation.promoCode) {
        const promoDetails = promoValidation.promoCode;
        
        // Check if user has already used this promo code
        const hasUsedPromo = !isNewUser && await this.promoCodeService.hasUserUsedPromo(user.id, promoCode);
        
        if (!hasUsedPromo) {
          // Apply trial if promo code provides trial days
          if (promoDetails.discountType === 'trial_days' && promoDetails.trialPlanId) {
            await this.organizationService.activateTrial(
              user.organizationId,
              promoDetails.trialPlanId,
              promoDetails.discountValue,
              promoCode
            );
            
            // Track promo code usage
            await this.promoCodeService.apply(
              promoCode,
              user.id,
              user.organizationId
            );
            
            this.logger.log(`Applied promo code ${promoCode} with ${promoDetails.discountValue} trial days for user ${user.id}`);
          } else {
            // For non-trial promo codes, just store the promo code in the organization
            await this.organizationService.update(user.organizationId, { promoCode });
            
            // Track promo code usage
            await this.promoCodeService.apply(
              promoCode,
              user.id,
              user.organizationId
            );
            
            this.logger.log(`Applied promo code ${promoCode} for user ${user.id}`);
          }
        } else {
          this.logger.log(`User ${user.id} has already used promo code ${promoCode}`);
        }
      }

      // Generate access token with promo metadata
      const tokenMetadata: any = { userId: user.id };
      if (promoCode !== undefined && promoValidation?.valid) {
        tokenMetadata.promoCode = promoCode;
      }
      
      const token = await this.tokenService.generateAccessToken(user.id, tokenMetadata);

      // Emit event to send magic link email
      this.eventEmitter.emit(
        'email.magic-link',
        new SendMagicLinkEmailEvent(email, token, promoCode),
      );

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

}
