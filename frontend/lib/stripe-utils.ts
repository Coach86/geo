/**
 * Utility functions for Stripe integration
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export interface StripeCheckoutOptions {
  planId: string;
  userId: string;
  billingPeriod: "monthly" | "yearly";
}

/**
 * Create checkout session and redirect to Stripe
 */
export async function redirectToStripeCheckout({ planId, userId, billingPeriod }: StripeCheckoutOptions): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/public/plans/${planId}/create-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        billingPeriod,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create checkout session');
    }

    const { url } = await response.json();
    window.location.href = url;
    return true;
  } catch (error) {
    console.error('Failed to create checkout session:', error);
    return false;
  }
}