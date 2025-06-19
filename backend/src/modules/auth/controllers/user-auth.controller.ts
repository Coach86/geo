import { Controller, Post, UseGuards, Request, Inject, forwardRef, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TokenAuthGuard } from '../guards/token-auth.guard';
import { PublicRoute } from '../decorators/public-route.decorator';
import { OrganizationService } from '../../organization/services/organization.service';
import { PromoCodeService } from '../../promo/services/promo-code.service';
import { UserService } from '../../user/services/user.service';
import { DiscountType } from '../../promo/schemas/promo-code.schema';

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
}