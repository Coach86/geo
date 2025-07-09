export interface ShopifySession {
  shop: string;
  accessToken: string;
  scope?: string;
  host?: string;
}

export interface ShopifyRecurringCharge {
  id: number;
  name: string;
  price: string;
  status: 'pending' | 'accepted' | 'active' | 'declined' | 'expired' | 'frozen' | 'cancelled';
  return_url: string;
  billing_on?: string;
  created_at: string;
  updated_at: string;
  test: boolean;
  activated_on?: string;
  cancelled_on?: string;
  trial_days: number;
  trial_ends_on?: string;
  decorated_return_url?: string;
  confirmation_url?: string;
  currency: string;
}

export interface ShopifyUsageCharge {
  id: number;
  description: string;
  price: string;
  created_at: string;
  updated_at: string;
  currency: string;
  balance_used: string;
  balance_remaining: string;
}

export interface ShopifyWebhookPayload {
  shop_id: number;
  shop_domain: string;
  customer?: {
    id: number;
    email: string;
    name: string;
  };
  orders_requested?: number;
  orders_remaining?: number;
  orders_placed?: number;
}

export interface ShopifyBillingPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: 'monthly' | 'annual';
  trialDays?: number;
  features: string[];
  test?: boolean;
}

export interface CreateRecurringChargeInput {
  name: string;
  price: number;
  returnUrl: string;
  trialDays?: number;
  test?: boolean;
  currency?: string;
}

export interface ShopifyAppSubscription {
  appRecurringPricingDetails: {
    price: {
      amount: string;
      currencyCode: string;
    };
    interval: 'EVERY_30_DAYS' | 'ANNUAL';
  };
  id: string;
  name: string;
  status: 'PENDING' | 'ACTIVE' | 'DECLINED' | 'EXPIRED' | 'FROZEN' | 'CANCELLED';
  test: boolean;
  trialDays?: number;
  currentPeriodEnd?: string;
  createdAt: string;
}