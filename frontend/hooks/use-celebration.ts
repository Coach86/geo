"use client";

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export function useCelebration() {
  const [shouldCelebrate, setShouldCelebrate] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check URL params for celebration triggers
    const fromCheckout = searchParams.get('from') === 'checkout';
    const planActivated = searchParams.get('plan_activated') === 'true';
    
    // Check sessionStorage for celebration flag
    const celebrationFlag = sessionStorage.getItem('celebrate_plan_activation');
    
    if (fromCheckout || planActivated || celebrationFlag === 'true') {
      setShouldCelebrate(true);
      
      // Clear the flag after triggering
      sessionStorage.removeItem('celebrate_plan_activation');
      
      // Stop celebration after 4 seconds to match confetti duration
      const timer = setTimeout(() => {
        setShouldCelebrate(false);
      }, 4000);
      
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  return shouldCelebrate;
}