import { useState, useEffect } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export interface PlanPrice {
  monthly: number;
  yearly: number;
  currency: string;
}

export interface Plan {
  id: string;
  name: string;
  tag: string;
  subtitle: string;
  included: string[];
  stripeProductId: string;
  stripeCheckoutUrls?: {
    monthly?: string;
    yearly?: string;
  };
  maxModels: number;
  maxProjects: number;
  maxUrls: number;
  maxSpontaneousPrompts: number;
  maxUsers: number;
  isActive: boolean;
  isRecommended: boolean;
  isMostPopular: boolean;
  order: number;
  metadata: Record<string, any>;
  prices?: PlanPrice;
  createdAt: Date;
  updatedAt: Date;
}

interface UsePlansReturn {
  plans: Plan[];
  loading: boolean;
  error: Error | null;
}

export function usePlans(): UsePlansReturn {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchPlans() {
      try {
        const response = await fetch(`${API_BASE_URL}/public/plans`);
        if (!response.ok) {
          throw new Error("Failed to fetch plans");
        }
        const data = await response.json();
        // Sort plans by order
        const sortedPlans = data.sort((a: Plan, b: Plan) => a.order - b.order);
        setPlans(sortedPlans);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Unknown error"));
      } finally {
        setLoading(false);
      }
    }

    fetchPlans();
  }, []);

  return { plans, loading, error };
}