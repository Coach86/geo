import { useEffect } from 'react';
import { usePageMagicEvents } from './usePageMagicEvents';
import { useAuth } from '@/providers/auth-provider';

interface UsePageImprovementEventsProps {
  jobId: string;
  onProgressUpdate: (progress: number) => void;
  onScoreUpdate: (current: number, previous: number) => void;
  onComplete: () => void;
  onRulesListGenerated?: (rules: any[]) => void;
  onRuleFixStarted?: (rule: any, ruleIndex: number, totalRules: number) => void;
  onRuleFixCompleted?: (rule: any, result: any, scoreBefore: number, scoreAfter: number, ruleIndex: number, totalRules: number) => void;
  onRuleFixFailed?: (rule: any, error: string, ruleIndex: number, totalRules: number) => void;
  onRuleFixRetrying?: (rule: any, retryCount: number, maxRetries: number, ruleIndex: number, totalRules: number) => void;
}

export function usePageImprovementEvents({
  jobId,
  onProgressUpdate,
  onScoreUpdate,
  onComplete,
  onRulesListGenerated,
  onRuleFixStarted,
  onRuleFixCompleted,
  onRuleFixFailed,
  onRuleFixRetrying,
}: UsePageImprovementEventsProps) {
  const { token } = useAuth();
  
  const { latestEvent } = usePageMagicEvents({
    jobId,
    token: token || undefined,
    onEvent: (event) => {
      // Update progress based on event
      if (event.progress !== undefined) {
        onProgressUpdate(event.progress);
      }
      
      // Update scores from score_calculated events
      if (event.eventType === 'score_calculated' && event.scoreData) {
        onScoreUpdate(event.scoreData.after, event.scoreData.before);
      }
      
      // Handle new rule-specific events
      if (event.eventType === 'rules_list_generated') {
        console.log('[RULES-DEBUG] 🔥 rules_list_generated event detected in usePageImprovementEvents!');
        console.log('[RULES-DEBUG] Event data:', event);
        console.log('[RULES-DEBUG] Rules data:', event.rulesData);
        console.log('[RULES-DEBUG] onRulesListGenerated callback:', onRulesListGenerated);
        
        if (event.rulesData) {
          console.log('[RULES-DEBUG] ✅ Calling onRulesListGenerated with rules data');
          onRulesListGenerated?.(event.rulesData);
        } else {
          console.error('[RULES-DEBUG] ❌ No rulesData in the event');
        }
      }
      
      if (event.eventType === 'rule_fix_started' && event.ruleData) {
        onRuleFixStarted?.(
          event.ruleData.rule,
          event.ruleData.ruleIndex,
          event.ruleData.totalRules
        );
      }
      
      if (event.eventType === 'rule_fix_completed' && event.ruleData && event.scoreData) {
        onRuleFixCompleted?.(
          event.ruleData.rule,
          event.ruleData.result,
          event.scoreData.before,
          event.scoreData.after,
          event.ruleData.ruleIndex,
          event.ruleData.totalRules
        );
      }
      
      if (event.eventType === 'rule_fix_failed' && event.ruleData) {
        onRuleFixFailed?.(
          event.ruleData.rule,
          event.error || 'Unknown error',
          event.ruleData.ruleIndex,
          event.ruleData.totalRules
        );
      }
      
      if (event.eventType === 'rule_fix_retrying' && event.ruleData) {
        onRuleFixRetrying?.(
          event.ruleData.rule,
          event.ruleData.retryCount || 1,
          event.ruleData.maxRetries || 3,
          event.ruleData.ruleIndex,
          event.ruleData.totalRules
        );
      }
      
      // Handle completion
      if (event.eventType === 'job_completed' || event.eventType === 'job_failed') {
        onComplete();
      }
    },
  });

  return { latestEvent };
}