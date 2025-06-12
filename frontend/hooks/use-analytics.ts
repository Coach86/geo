import { usePostHog } from 'posthog-js/react'
import { useAuth } from '@/providers/auth-provider'

export interface AnalyticsEvent {
  event: string
  properties?: Record<string, any>
}

export const useAnalytics = () => {
  const posthog = usePostHog()
  const { user } = useAuth()

  const track = (event: string, properties?: Record<string, any>) => {
    if (!posthog) return

    // Add user context to all events
    const enrichedProperties = {
      ...properties,
      userId: user?.id,
      userEmail: user?.email,
      timestamp: new Date().toISOString(),
    }

    posthog.capture(event, enrichedProperties)
  }

  // Authentication Events
  const trackLogin = (method: 'email' | 'google' | 'github') => {
    track('user_logged_in', { method })
  }

  const trackSignup = (method: 'email' | 'google' | 'github') => {
    track('user_signed_up', { method })
  }

  const trackLogout = () => {
    track('user_logged_out')
  }

  // Project Events
  const trackProjectCreated = (projectId: string, brandName: string, source: 'url' | 'manual') => {
    track('project_created', { projectId, brandName, source })
  }

  const trackProjectViewed = (projectId: string, brandName: string) => {
    track('project_viewed', { projectId, brandName })
  }

  const trackProjectDeleted = (projectId: string, brandName: string) => {
    track('project_deleted', { projectId, brandName })
  }

  const trackProjectSettingsUpdated = (projectId: string, settingType: string) => {
    track('project_settings_updated', { projectId, settingType })
  }

  // Analysis Events
  const trackAnalysisStarted = (projectId: string, analysisType: 'full' | 'visibility' | 'sentiment' | 'competition' | 'alignment') => {
    track('analysis_started', { projectId, analysisType })
  }

  const trackAnalysisCompleted = (projectId: string, analysisType: string, duration?: number) => {
    track('analysis_completed', { projectId, analysisType, duration })
  }

  const trackAnalysisFailed = (projectId: string, analysisType: string, error: string) => {
    track('analysis_failed', { projectId, analysisType, error })
  }

  const trackManualRefresh = (projectId: string, brandName: string) => {
    track('manual_refresh_triggered', { projectId, brandName })
  }

  // Report Events
  const trackReportViewed = (reportId: string, projectId: string, reportType: string) => {
    track('report_viewed', { reportId, projectId, reportType })
  }

  const trackReportDownloaded = (reportId: string, format: 'pdf' | 'csv' | 'json') => {
    track('report_downloaded', { reportId, format })
  }

  const trackReportShared = (reportId: string, method: 'email' | 'link') => {
    track('report_shared', { reportId, method })
  }

  // Navigation Events
  const trackTabChanged = (tabName: string, context?: string) => {
    track('tab_changed', { tabName, context })
  }

  const trackFilterApplied = (filterType: string, filterValue: string, context?: string) => {
    track('filter_applied', { filterType, filterValue, context })
  }

  const trackSearchPerformed = (searchQuery: string, resultsCount: number, context?: string) => {
    track('search_performed', { searchQuery, resultsCount, context })
  }

  // Plan & Billing Events
  const trackPlanViewed = (currentPlan: string) => {
    track('plan_viewed', { currentPlan })
  }

  const trackPlanUpgradeStarted = (fromPlan: string, toPlan: string) => {
    track('plan_upgrade_started', { fromPlan, toPlan })
  }

  const trackPlanUpgradeCompleted = (fromPlan: string, toPlan: string) => {
    track('plan_upgrade_completed', { fromPlan, toPlan })
  }

  const trackPaymentMethodAdded = () => {
    track('payment_method_added')
  }

  // Organization Events
  const trackOrganizationCreated = (organizationId: string, organizationName: string) => {
    track('organization_created', { organizationId, organizationName })
  }

  const trackOrganizationUpdated = (organizationId: string, updateType: string) => {
    track('organization_updated', { organizationId, updateType })
  }

  const trackUserInvited = (email: string, role: string) => {
    track('user_invited', { invitedEmail: email, role })
  }

  const trackUserRoleChanged = (userId: string, oldRole: string, newRole: string) => {
    track('user_role_changed', { targetUserId: userId, oldRole, newRole })
  }

  // Feature Usage Events
  const trackPromptEdited = (projectId: string, promptType: string) => {
    track('prompt_edited', { projectId, promptType })
  }

  const trackCompetitorAdded = (projectId: string, competitorName: string) => {
    track('competitor_added', { projectId, competitorName })
  }

  const trackCompetitorRemoved = (projectId: string, competitorName: string) => {
    track('competitor_removed', { projectId, competitorName })
  }

  const trackModelSelectionChanged = (selectedModels: string[], context: 'organization' | 'project') => {
    track('model_selection_changed', { selectedModels, modelCount: selectedModels.length, context })
  }

  // Error Events
  const trackError = (errorType: string, errorMessage: string, context?: string) => {
    track('error_occurred', { errorType, errorMessage, context })
  }

  // Performance Events
  const trackPageLoadTime = (pageName: string, loadTime: number) => {
    track('page_load_time', { pageName, loadTime })
  }

  return {
    track,
    // Auth
    trackLogin,
    trackSignup,
    trackLogout,
    // Projects
    trackProjectCreated,
    trackProjectViewed,
    trackProjectDeleted,
    trackProjectSettingsUpdated,
    // Analysis
    trackAnalysisStarted,
    trackAnalysisCompleted,
    trackAnalysisFailed,
    trackManualRefresh,
    // Reports
    trackReportViewed,
    trackReportDownloaded,
    trackReportShared,
    // Navigation
    trackTabChanged,
    trackFilterApplied,
    trackSearchPerformed,
    // Plans
    trackPlanViewed,
    trackPlanUpgradeStarted,
    trackPlanUpgradeCompleted,
    trackPaymentMethodAdded,
    // Organization
    trackOrganizationCreated,
    trackOrganizationUpdated,
    trackUserInvited,
    trackUserRoleChanged,
    // Features
    trackPromptEdited,
    trackCompetitorAdded,
    trackCompetitorRemoved,
    trackModelSelectionChanged,
    // Errors & Performance
    trackError,
    trackPageLoadTime,
  }
}