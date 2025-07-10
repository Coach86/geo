# Shopify Billing Module

This module provides a comprehensive wrapper for Shopify In-App Billing functionality, supporting both REST API and GraphQL approaches.

## Features

- **Recurring Charges**: Create and manage monthly/annual subscriptions
- **Usage Charges**: Add metered billing on top of recurring charges
- **Webhook Handling**: Automatic subscription status updates via webhooks
- **GraphQL Support**: Modern API for newer Shopify apps
- **Multi-tenant**: Supports multiple Shopify stores

## Usage

### 1. Create a Subscription

```typescript
// In your controller
const subscription = await this.shopifyBillingService.createRecurringCharge(
  shop,
  accessToken,
  {
    name: 'Professional Plan',
    price: 29.99,
    returnUrl: 'https://yourapp.com/billing/callback',
    trialDays: 14,
    test: false,
  }
);

// Redirect merchant to confirmation URL
return res.redirect(subscription.confirmation_url);
```

### 2. Activate After Merchant Approval

```typescript
// After merchant approves the charge
const activatedCharge = await this.shopifyBillingService.activateRecurringCharge(
  shop,
  accessToken,
  chargeId
);
```

### 3. Add Usage Charges

```typescript
const usageCharge = await this.shopifyBillingService.createUsageCharge(
  shop,
  accessToken,
  recurringChargeId,
  'API calls overage',
  5.00
);
```

### 4. Handle Webhooks

Configure these webhook endpoints in your Shopify app:

- `POST /shopify/webhooks` - General webhook handler
- `POST /shopify/webhooks/subscriptions/update` - Subscription updates
- `POST /shopify/webhooks/subscriptions/cancel` - Cancellations
- `POST /shopify/webhooks/app/uninstalled` - App uninstalls

### 5. Check Billing Status

```typescript
const billingStatus = await this.shopifyBillingService.getActiveSubscription(
  shop,
  accessToken
);

if (!billingStatus) {
  // No active subscription - prompt for upgrade
}
```

## Environment Variables

```env
SHOPIFY_WEBHOOK_SECRET=your_webhook_secret
APP_URL=https://yourapp.com
```

## Integration with Organization Module

The module automatically updates organization records with Shopify subscription data:

- `shopifyShopDomain`: Store domain
- `shopifyAccessToken`: Store access token
- `shopifySubscriptionId`: Active subscription ID
- `shopifySubscriptionData`: Full subscription details
- `subscriptionStatus`: Normalized status (active, cancelled, etc.)

## Security

- All webhooks are verified using HMAC signatures
- Access tokens are stored securely
- Test mode supported for development