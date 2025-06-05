import type { Market, PlanType } from "./types";
import { PLAN_LIMITS } from "./types";

export function calculatePlanImpact(markets: Market[]): PlanType {
  const totalMarkets = markets.length;
  const totalLanguages = markets.reduce(
    (sum, market) => sum + market.languages.length,
    0
  );

  if (
    totalMarkets <= PLAN_LIMITS.Starter.markets &&
    totalLanguages <= PLAN_LIMITS.Starter.languages
  ) {
    return "Starter";
  } else if (
    totalMarkets <= PLAN_LIMITS.Growth.markets &&
    totalLanguages <= PLAN_LIMITS.Growth.languages
  ) {
    return "Growth";
  } else if (
    totalMarkets <= PLAN_LIMITS.Pro.markets &&
    totalLanguages <= PLAN_LIMITS.Pro.languages
  ) {
    return "Pro";
  } else {
    return "Enterprise";
  }
}