export interface PricingSavings {
  amount: number;
  percentage: number;
}

export function getYearlyPrice(monthlyPrice: number): number {
  // Fixed values for annual plans
  if (monthlyPrice === 89) {
    return 69; // Monthly equivalent price for Starter
  } else if (monthlyPrice === 199) {
    return 159; // Monthly equivalent price for Growth
  }
  // Fallback to standard calculation (20% discount)
  return Math.round(monthlyPrice * 0.8);
}

export function calculateSavings(monthlyPrice: number | null): PricingSavings {
  if (!monthlyPrice) return { amount: 0, percentage: 0 };

  // Fixed values for annual savings
  if (monthlyPrice === 89) {
    return { amount: 240, percentage: Math.round((240 / (89 * 12)) * 100) };
  } else if (monthlyPrice === 199) {
    return { amount: 480, percentage: Math.round((480 / (199 * 12)) * 100) };
  }

  // Fallback to standard calculation
  const monthlyCost = monthlyPrice * 12;
  const yearlyCost = getYearlyPrice(monthlyPrice) * 12;
  const savings = monthlyCost - yearlyCost;
  const percentage = Math.round((savings / monthlyCost) * 100);

  return { amount: savings, percentage };
}