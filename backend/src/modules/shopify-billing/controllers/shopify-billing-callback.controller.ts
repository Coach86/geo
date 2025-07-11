import {
  Controller,
  Get,
  Query,
  Res,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiQuery, ApiExcludeController } from '@nestjs/swagger';
import { PublicRoute } from '../../auth/decorators/public-route.decorator';
import { ShopifyBillingService } from '../services/shopify-billing.service';
import { OrganizationService } from '../../organization/services/organization.service';
import { PlanService } from '../../plan/services/plan.service';

@ApiTags('shopify-billing')
@ApiExcludeController() // Hide from Swagger as this is a redirect endpoint
@Controller('billing')
export class ShopifyBillingCallbackController {
  private readonly logger = new Logger(ShopifyBillingCallbackController.name);

  constructor(
    private readonly shopifyBillingService: ShopifyBillingService,
    private readonly organizationService: OrganizationService,
    private readonly planService: PlanService,
  ) {}

  @Get('callback')
  @PublicRoute()
  @ApiOperation({ summary: 'Handle Shopify billing callback after merchant approval' })
  @ApiQuery({ name: 'charge_id', required: true, description: 'The charge ID from Shopify' })
  @ApiQuery({ name: 'shop', required: false, description: 'The shop domain' })
  @ApiQuery({ name: 'shop_domain', required: false, description: 'Alternative shop domain parameter' })
  @ApiQuery({ name: 'host', required: false, description: 'Base64 encoded host' })
  async handleBillingCallback(
    @Query('charge_id') chargeId: string,
    @Query('shop') shop: string,
    @Query('shop_domain') shopDomain: string,
    @Query('host') host: string,
    @Query() allParams: any,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.log(`Billing callback received`, { 
      chargeId, 
      shop, 
      shopDomain, 
      host,
      allParams 
    });

    // Try to get shop from various sources (declare outside try block for error handler)
    let actualShop = shop || shopDomain;

    try {
      if (!chargeId) {
        throw new BadRequestException('Missing charge_id parameter');
      }
      
      // If we have a host parameter, decode it
      if (!actualShop && host) {
        try {
          const decodedHost = Buffer.from(host, 'base64').toString('utf-8');
          // Extract shop from the decoded host (format: shop-domain.myshopify.com/admin)
          const match = decodedHost.match(/^([^\/]+)/);
          if (match) {
            actualShop = match[1];
          }
        } catch (e) {
          this.logger.warn(`Failed to decode host parameter: ${e.message}`);
        }
      }

      if (!actualShop) {
        this.logger.error(`No shop parameter found. All params:`, allParams);
        throw new BadRequestException('Missing shop parameter');
      }

      // Find the organization by shop domain
      const organization = await this.organizationService.findByShopifyDomain(actualShop);
      if (!organization) {
        this.logger.error(`Organization not found for shop: ${actualShop}`);
        return res.redirect(`${process.env.APP_URL || 'http://localhost:3002'}/error?message=Organization not found`);
      }

      // Get the full organization data with access token
      const orgWithToken = await this.organizationService.findOneRaw(organization.id);

      if (!orgWithToken.shopifyAccessToken) {
        this.logger.error(`No Shopify access token found for organization: ${organization.id}`);
        return res.redirect(`${process.env.APP_URL || 'http://localhost:3002'}/error?message=No access token found`);
      }

      // Get the charge details to check its status
      const charge = await this.shopifyBillingService.getRecurringCharge(
        actualShop,
        orgWithToken.shopifyAccessToken,
        parseInt(chargeId, 10),
      );

      this.logger.log(`Charge status: ${charge.status}`, { chargeId, shop: actualShop });

      if (charge.status === 'accepted') {
        // Activate the charge
        const activatedCharge = await this.shopifyBillingService.activateRecurringCharge(
          actualShop,
          orgWithToken.shopifyAccessToken,
          parseInt(chargeId, 10),
        );

        this.logger.log(`Charge activated successfully`, {
          chargeId,
          shop: actualShop,
          chargeName: activatedCharge.name,
          price: activatedCharge.price,
        });

        // Find the plan by name to get the plan ID
        const plans = await this.planService.findAll();
        const matchingPlan = plans.find(p => p.name === activatedCharge.name);

        if (matchingPlan) {
          // Update organization with the active subscription
          await this.organizationService.update(organization.id, {
            stripePlanId: matchingPlan.id,
            subscriptionStatus: 'active',
            shopifySubscriptionId: chargeId,
            shopifySubscriptionData: activatedCharge,
            planSettings: {
              maxProjects: matchingPlan.maxProjects,
              maxAIModels: matchingPlan.maxModels,
              maxSpontaneousPrompts: matchingPlan.maxSpontaneousPrompts,
              maxUrls: matchingPlan.maxUrls,
              maxUsers: matchingPlan.maxUsers,
              maxCompetitors: matchingPlan.maxCompetitors,
            },
          });

          this.logger.log(`Organization updated with active subscription`, {
            organizationId: organization.id,
            planId: matchingPlan.id,
            planName: matchingPlan.name,
          });
        } else {
          this.logger.warn(`No matching plan found for charge name: ${activatedCharge.name}`);
        }

        // Redirect to success page in the Shopify admin
        const successUrl = `https://${actualShop}/admin/apps/${process.env.SHOPIFY_APP_HANDLE || 'your-app-handle'}/billing/success`;
        return res.redirect(successUrl);
      } else if (charge.status === 'active') {
        // Charge is already active - this happens when returning from an already activated charge
        this.logger.log(`Charge is already active`, { chargeId, shop: actualShop });
        
        // Find the plan by name to get the plan ID
        const plans = await this.planService.findAll();
        const matchingPlan = plans.find(p => p.name === charge.name);

        if (matchingPlan && organization.stripePlanId !== matchingPlan.id) {
          // Update organization with the active subscription if not already set
          await this.organizationService.update(organization.id, {
            stripePlanId: matchingPlan.id,
            subscriptionStatus: 'active',
            shopifySubscriptionId: chargeId,
            shopifySubscriptionData: charge,
            planSettings: {
              maxProjects: matchingPlan.maxProjects,
              maxAIModels: matchingPlan.maxModels,
              maxSpontaneousPrompts: matchingPlan.maxSpontaneousPrompts,
              maxUrls: matchingPlan.maxUrls,
              maxUsers: matchingPlan.maxUsers,
              maxCompetitors: matchingPlan.maxCompetitors,
            },
          });

          this.logger.log(`Organization updated with already active subscription`, {
            organizationId: organization.id,
            planId: matchingPlan.id,
            planName: matchingPlan.name,
          });
        }

        // Redirect to success page
        const successUrl = `https://${actualShop}/admin/apps/${process.env.SHOPIFY_APP_HANDLE || 'your-app-handle'}/billing/success`;
        return res.redirect(successUrl);
      } else if (charge.status === 'declined') {
        // Merchant declined the charge
        this.logger.log(`Charge declined by merchant`, { chargeId, shop: actualShop });
        const declinedUrl = `https://${actualShop}/admin/apps/${process.env.SHOPIFY_APP_HANDLE || 'your-app-handle'}/billing/declined`;
        return res.redirect(declinedUrl);
      } else {
        // Unexpected status
        this.logger.warn(`Unexpected charge status: ${charge.status}`, { chargeId, shop: actualShop });
        const errorUrl = `https://${actualShop}/admin/apps/${process.env.SHOPIFY_APP_HANDLE || 'your-app-handle'}/billing/error`;
        return res.redirect(errorUrl);
      }
    } catch (error) {
      this.logger.error(`Error handling billing callback: ${error.message}`, error.stack);
      
      // Redirect to error page
      const errorUrl = actualShop 
        ? `https://${actualShop}/admin/apps/${process.env.SHOPIFY_APP_HANDLE || 'your-app-handle'}/billing/error`
        : `${process.env.APP_URL || 'http://localhost:3002'}/error`;
        
      return res.redirect(errorUrl);
    }
  }

  @Get('success')
  @PublicRoute()
  @ApiOperation({ summary: 'Billing success page' })
  async billingSuccess(@Res() res: Response): Promise<void> {
    // This would typically be handled by your frontend
    res.send(`
      <html>
        <head>
          <title>Subscription Activated</title>
        </head>
        <body>
          <h1>Subscription Activated Successfully!</h1>
          <p>Your subscription has been activated. You can close this window.</p>
          <script>
            // Optionally close the window or redirect
            setTimeout(() => {
              if (window.opener) {
                window.close();
              } else {
                window.location.href = '/';
              }
            }, 3000);
          </script>
        </body>
      </html>
    `);
  }

  @Get('declined')
  @PublicRoute()
  @ApiOperation({ summary: 'Billing declined page' })
  async billingDeclined(@Res() res: Response): Promise<void> {
    res.send(`
      <html>
        <head>
          <title>Subscription Declined</title>
        </head>
        <body>
          <h1>Subscription Declined</h1>
          <p>You have declined the subscription. You can close this window.</p>
        </body>
      </html>
    `);
  }

  @Get('error')
  @PublicRoute()
  @ApiOperation({ summary: 'Billing error page' })
  async billingError(@Query('message') message: string, @Res() res: Response): Promise<void> {
    res.send(`
      <html>
        <head>
          <title>Billing Error</title>
        </head>
        <body>
          <h1>Billing Error</h1>
          <p>An error occurred: ${message || 'Unknown error'}</p>
        </body>
      </html>
    `);
  }
}