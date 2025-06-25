import { Controller, Post, Get, UseGuards, Request, Inject, forwardRef, Logger, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TokenAuthGuard } from '../guards/token-auth.guard';
import { TokenRoute } from '../decorators/token-route.decorator';
import { PublicRoute } from '../decorators/public-route.decorator';
import { TokenService } from '../services/token.service';
import { OrganizationService } from '../../organization/services/organization.service';
import { PromoCodeService } from '../../promo/services/promo-code.service';
import { UserService } from '../../user/services/user.service';
import { DiscountType } from '../../promo/schemas/promo-code.schema';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FreePlanActivatedEvent } from '../../organization/events/free-plan-activated.event';

@ApiTags('user-auth')
@Controller('users/auth')
export class UserAuthController {
  private readonly logger = new Logger(UserAuthController.name);

  constructor(
    @Inject(forwardRef(() => OrganizationService))
    private readonly organizationService: OrganizationService,
    @Inject(forwardRef(() => PromoCodeService))
    private readonly promoCodeService: PromoCodeService,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    private readonly eventEmitter: EventEmitter2,
    private readonly tokenService: TokenService,
  ) {}

  @PublicRoute()
  @UseGuards(TokenAuthGuard)
  @Post('complete-login')
  @ApiOperation({ summary: 'Complete user login and apply any promo codes or trials' })
  @ApiResponse({
    status: 200,
    description: 'Login completed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        appliedPromo: { type: 'boolean' },
        appliedTrial: { type: 'boolean' },
      },
    },
  })
  async completeLogin(@Request() req: any) {
    const { userId, metadata } = req.user;
    
    try {
      this.logger.log(`Completing login for user ${userId} with metadata: ${JSON.stringify(metadata)}`);
      
      // Get user and organization
      const user = await this.userService.findOne(userId);
      const organization = await this.organizationService.findOne(user.organizationId);
      
      let appliedPromo = false;
      let appliedTrial = false;
      let message = 'Login completed successfully';

      // Handle promo code if provided
      if (metadata?.promoCode) {
        try {
          const validation = await this.promoCodeService.validate({
            code: metadata.promoCode,
            userId: userId,
          });

          if (validation.valid && validation.promoCode) {
            // Apply promo code
            await this.promoCodeService.apply(
              metadata.promoCode,
              userId,
              user.organizationId,
            );

            // Handle different promo types
            if (validation.promoCode.discountType === DiscountType.TRIAL_DAYS || 
                validation.promoCode.discountType === DiscountType.FREE_TRIAL) {
              // Apply trial
              const trialDays = validation.promoCode.discountValue;
              const trialPlanId = validation.promoCode.trialPlanId || metadata.planId;
              
              if (trialPlanId) {
                await this.organizationService.activateTrial(
                  user.organizationId,
                  trialPlanId,
                  trialDays,
                );
                appliedTrial = true;
                message = `Trial activated for ${trialDays} days with promo code`;
              }
            } else {
              // For percentage or fixed discounts, we'll need Stripe integration
              appliedPromo = true;
              message = 'Promo code applied successfully';
            }
          } else {
            this.logger.warn(`Invalid promo code ${metadata.promoCode}: ${validation.reason}`);
          }
        } catch (error) {
          this.logger.error(`Failed to apply promo code: ${error.message}`, error.stack);
        }
      }
      // Handle direct trial activation (without promo code)
      else if (metadata?.trialDays && metadata?.planId) {
        try {
          await this.organizationService.activateTrial(
            user.organizationId,
            metadata.planId,
            metadata.trialDays,
          );
          appliedTrial = true;
          message = `Trial activated for ${metadata.trialDays} days`;
        } catch (error) {
          this.logger.error(`Failed to activate trial: ${error.message}`, error.stack);
        }
      }

      return {
        success: true,
        message,
        appliedPromo,
        appliedTrial,
      };
    } catch (error) {
      this.logger.error(`Failed to complete login: ${error.message}`, error.stack);
      return {
        success: false,
        message: 'Failed to complete login',
        appliedPromo: false,
        appliedTrial: false,
      };
    }
  }

  @Get('promo-info')
  @TokenRoute()
  @UseGuards(TokenAuthGuard)
  @ApiOperation({ summary: 'Get user organization promo code information' })
  @ApiResponse({
    status: 200,
    description: 'Promo code information retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        hasPromoCode: { type: 'boolean' },
        promoCode: { type: 'string', nullable: true },
        promoDetails: {
          type: 'object',
          nullable: true,
          properties: {
            discountType: { type: 'string' },
            discountValue: { type: 'number' },
            trialPlanId: { type: 'string', nullable: true },
            validPlanIds: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
  })
  async getPromoInfo(@Request() req: any) {
    try {
      const userId = req.user?.userId || req.userId;
      
      if (!userId) {
        throw new UnauthorizedException('User not authenticated');
      }

      // Get user and organization
      const user = await this.userService.findOne(userId);
      const organization = await this.organizationService.findOne(user.organizationId);

      // Check if organization has a promo code
      if (!organization.promoCode) {
        return {
          hasPromoCode: false,
          promoCode: null,
          promoDetails: null,
        };
      }

      // Get promo code details WITHOUT checking if user has used it
      // This is just for display purposes
      const promo = await this.promoCodeService.findByCode(organization.promoCode);
      
      if (!promo || !promo.isActive) {
        return {
          hasPromoCode: true,
          promoCode: organization.promoCode,
          promoDetails: null,
        };
      }

      return {
        hasPromoCode: true,
        promoCode: organization.promoCode,
        promoDetails: {
          discountType: promo.discountType,
          discountValue: promo.discountValue,
          trialPlanId: promo.trialPlanId,
          validPlanIds: promo.validPlanIds || [],
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get promo info: ${error.message}`, error.stack);
      return {
        hasPromoCode: false,
        promoCode: null,
        promoDetails: null,
      };
    }
  }

  @Post('activate-free-plan')
  @TokenRoute()
  @ApiOperation({ summary: 'Activate free plan for the user' })
  @ApiResponse({
    status: 200,
    description: 'Free plan activated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  })
  async activateFreePlan(@Request() req: any) {
    try {
      // Validate user authentication
      if (!req.userId) {
        if (req.token) {
          const validation = await this.tokenService.validateAccessToken(req.token);
          if (validation.valid && validation.userId) {
            req.userId = validation.userId;
          } else {
            throw new UnauthorizedException('Invalid or expired token');
          }
        } else {
          throw new UnauthorizedException('User not authenticated');
        }
      }
      
      const userId = req.userId;
      this.logger.log(`Activating free plan for user ${userId}`);
      
      // Get user to find their organization
      const user = await this.userService.findOne(userId);
      
      // Check if organization has already activated free plan
      const organization = await this.organizationService.findOne(user.organizationId);
      
      if (organization.hasActivatedFreePlan) {
        this.logger.warn(`User ${userId} attempted to activate free plan again for organization ${user.organizationId}`);
        return {
          success: false,
          message: 'Free plan has already been activated for this organization',
        };
      }
      
      // Mark organization as having activated free plan
      await this.organizationService.update(user.organizationId, {
        hasActivatedFreePlan: true,
        freePlanActivatedAt: new Date(),
      });
      
      // Emit event for batch processing
      this.eventEmitter.emit('free-plan.activated', new FreePlanActivatedEvent(user.organizationId, userId));
      
      return {
        success: true,
        message: 'Free plan activated successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to activate free plan: ${error.message}`, error.stack);
      return {
        success: false,
        message: 'Failed to activate free plan',
      };
    }
  }
}