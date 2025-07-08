import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { usePageImprovementEvents } from './usePageImprovementEvents';
import { apiFetch } from '@/lib/api/utils';

export interface Rule {
  id: string;
  ruleId?: string;
  ruleName?: string;
  dimension: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  recommendation: string;
  currentScore: number;
  affectedElements?: string[];
  status?: 'pending' | 'processing' | 'completed' | 'failed' | 'retrying';
  scoreBefore?: number;
  scoreAfter?: number;
  retryCount?: number;
  maxRetries?: number;
}

export interface ContentVersion {
  content: string;
  contentMarkdown?: string;
  title?: string;
  metaDescription?: string;
  metas?: any;
  ruleProcessed?: string;
  timestamp: Date;
  version: number;
}

export interface UseRuleBasedImprovementReturn {
  job: any;
  loading: boolean;
  error: string | null;
  rules: Rule[];
  currentProcessingIndex: number;
  totalRules: number;
  overallProgress: number;
  contentVersions: ContentVersion[];
  currentVersionIndex: number;
  refetch: () => void;
}

export function useRuleBasedImprovement(jobId: string): UseRuleBasedImprovementReturn {
  const { token } = useAuth();
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  const [currentProcessingIndex, setCurrentProcessingIndex] = useState(-1);
  const [overallProgress, setOverallProgress] = useState(0);
  const [contentVersions, setContentVersions] = useState<ContentVersion[]>([]);
  const [currentVersionIndex, setCurrentVersionIndex] = useState(0);

  // Fetch job data
  const fetchJob = useCallback(async () => {
    if (!jobId || !token) return;

    try {
      setLoading(true);
      setError(null);

      const result = await apiFetch(`/page-magic/improvement/${jobId}`, {
        token,
      });

      if (result.success) {
        setJob(result.data);
        
        // Initialize rules if they're provided in the job data, but preserve existing statuses
        if (result.data.rules && result.data.rules.length > 0) {
          setRules(prevRules => {
            // If no rules exist yet, initialize them all as pending
            if (prevRules.length === 0) {
              const mappedRules: Rule[] = result.data.rules.map((rule, index) => ({
                ...rule,
                status: 'pending' as const,
              }));
              setCurrentProcessingIndex(0);
              return mappedRules;
            }
            
            // If rules already exist, merge the new data but preserve existing statuses and scores
            return prevRules.map((existingRule, index) => {
              const newRuleData = result.data.rules[index];
              if (newRuleData) {
                return {
                  ...newRuleData,
                  status: existingRule.status || 'pending' as const,
                  scoreBefore: existingRule.scoreBefore,
                  scoreAfter: existingRule.scoreAfter,
                };
              }
              return existingRule;
            });
          });
        }
        
        // Initialize content versions
        if (contentVersions.length === 0) {
          const versions: ContentVersion[] = [{
            content: result.data.originalContent,
            contentMarkdown: result.data.originalContentMarkdown,
            title: result.data.originalTitle,
            metaDescription: result.data.originalMetaDescription || result.data.originalMetas?.description,
            metas: result.data.originalMetas,
            timestamp: new Date(result.data.createdAt),
            version: 1,
          }];
          
          // If job is completed and has improved versions, add them
          if (result.data.status === 'completed' && result.data.improvedContent) {
            versions.push({
              content: result.data.improvedContent,
              contentMarkdown: result.data.improvedContentMarkdown,
              title: result.data.improvedTitle,
              metaDescription: result.data.improvedMetas?.description,
              metas: result.data.improvedMetas,
              ruleProcessed: 'All rules processed',
              timestamp: new Date(result.data.completedAt || result.data.updatedAt),
              version: 2,
            });
            setCurrentVersionIndex(1); // Show the improved version
          }
          
          setContentVersions(versions);
        }
      } else {
        setError('Failed to load improvement job');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load improvement job');
    } finally {
      setLoading(false);
    }
  }, [jobId, token, contentVersions.length]);

  // Handle WebSocket events for rule-based processing
  usePageImprovementEvents({
    jobId,
    onProgressUpdate: (progress) => {
      setOverallProgress(progress);
    },
    onScoreUpdate: () => {
      // Handled within individual rule updates
    },
    onComplete: () => {
      fetchJob();
    },
    onRulesListGenerated: (rulesData) => {
      if (!rulesData || rulesData.length === 0) {
        return;
      }
      
      // Only set rules if they haven't been set yet to avoid overwriting statuses
      setRules(prevRules => {
        if (prevRules.length === 0) {
          const mappedRules: Rule[] = rulesData.map((rule, index) => ({
            ...rule,
            status: 'pending' as const,
          }));
          setCurrentProcessingIndex(0);
          return mappedRules;
        }
        return prevRules; // Keep existing rules with their statuses
      });
    },
    onRuleFixStarted: (rule, ruleIndex, totalRules) => {
      console.log(`[RULE-UPDATE] Rule ${ruleIndex}/${totalRules} started: ${rule?.description}`);
      setCurrentProcessingIndex(ruleIndex - 1);
      
      setRules(prevRules => prevRules.map((r, index) => ({
        ...r,
        status: index === ruleIndex - 1 ? 'processing' as const : r.status,
      })));
    },
    onRuleFixCompleted: (rule, result, scoreBefore, scoreAfter, ruleIndex, totalRules) => {
      console.log(`[RULE-UPDATE] Rule ${ruleIndex}/${totalRules} completed: ${rule?.description} (${scoreBefore} → ${scoreAfter})`);
      setRules(prevRules => prevRules.map((r, index) => ({
        ...r,
        status: index === ruleIndex - 1 ? 'completed' as const : r.status,
        scoreBefore: index === ruleIndex - 1 ? scoreBefore : r.scoreBefore,
        scoreAfter: index === ruleIndex - 1 ? scoreAfter : r.scoreAfter,
      })));

      // Add new content version with structured data
      if (result && (result.improvedContent || result.improvedTitle || result.improvedMetas)) {
        // Get the latest version's data as base
        const latestVersion = contentVersions[contentVersions.length - 1] || {
          content: job?.originalContent || '',
          contentMarkdown: job?.originalContentMarkdown || '',
          title: job?.originalTitle || '',
          metaDescription: job?.originalMetaDescription || '',
        };
        
        // Debug logging
        console.log('[CONTENT-UPDATE] Rule fix result:', {
          ruleId: rule.ruleId,
          improvedTitle: result.improvedTitle,
          improvedMetaDesc: result.improvedMetas?.description,
          hasImprovedContent: !!result.improvedContent,
          contentLength: result.improvedContent?.length || 0,
        });
        
        // Only update fields that were actually improved by this rule
        // Don't replace with empty values
        const newVersion: ContentVersion = {
          content: (result.improvedContent && result.improvedContent.trim()) ? result.improvedContent : latestVersion.content,
          contentMarkdown: (result.improvedContentMarkdown && result.improvedContentMarkdown.trim()) ? result.improvedContentMarkdown : ((result.improvedContent && result.improvedContent.trim()) ? result.improvedContent : latestVersion.contentMarkdown),
          title: (result.improvedTitle && result.improvedTitle.trim() && result.improvedTitle !== 'Meta description enhancement') ? result.improvedTitle : latestVersion.title,
          metaDescription: (result.improvedMetas?.description && result.improvedMetas.description.trim()) ? result.improvedMetas.description : latestVersion.metaDescription,
          metas: result.improvedMetas || latestVersion.metas,
          ruleProcessed: rule.ruleName || rule.description,
          timestamp: new Date(),
          version: contentVersions.length + 1,
        };
        
        // Warn if suspicious title change
        if (result.improvedTitle === 'Meta description enhancement') {
          console.warn('[CONTENT-UPDATE] Suspicious title returned from backend:', result.improvedTitle);
        }
        
        setContentVersions(prev => [...prev, newVersion]);
        setCurrentVersionIndex(contentVersions.length); // Move to latest version
      }

      // Move to next rule
      if (ruleIndex < totalRules) {
        setCurrentProcessingIndex(ruleIndex); // Next rule (0-based)
      } else {
        setCurrentProcessingIndex(-1); // All rules completed
      }
    },
    onRuleFixFailed: (rule, error, ruleIndex, totalRules) => {
      console.log(`[RULE-UPDATE] Rule ${ruleIndex}/${totalRules} failed: ${rule?.description} - ${error}`);
      setRules(prevRules => prevRules.map((r, index) => ({
        ...r,
        status: index === ruleIndex - 1 ? 'failed' as const : r.status,
      })));

      // Move to next rule
      if (ruleIndex < totalRules) {
        setCurrentProcessingIndex(ruleIndex); // Next rule (0-based)
      } else {
        setCurrentProcessingIndex(-1); // All rules completed
      }
    },
    onRuleFixRetrying: (rule, retryCount, maxRetries, ruleIndex, totalRules) => {
      console.log(`[RULE-UPDATE] Rule ${ruleIndex}/${totalRules} retrying (${retryCount}/${maxRetries}): ${rule?.description}`);
      setRules(prevRules => prevRules.map((r, index) => ({
        ...r,
        status: index === ruleIndex - 1 ? 'retrying' as const : r.status,
        retryCount: index === ruleIndex - 1 ? retryCount : r.retryCount,
        maxRetries: index === ruleIndex - 1 ? maxRetries : r.maxRetries,
      })));
    },
  });

  // Initial fetch
  useEffect(() => {
    fetchJob();
  }, [fetchJob]);

  return {
    job,
    loading,
    error,
    rules,
    currentProcessingIndex,
    totalRules: rules.length,
    overallProgress,
    contentVersions,
    currentVersionIndex,
    refetch: fetchJob,
  };
}