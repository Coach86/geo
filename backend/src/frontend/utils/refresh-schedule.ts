/**
 * Utility functions for determining project refresh schedules
 */

export interface RefreshScheduleInfo {
  schedule: string;
  isPaid: boolean;
}

/**
 * Get the refresh schedule description for a project
 * @param planName - The name of the plan (e.g., 'Free', 'Pro', 'Growth')
 * @param refreshFrequency - The refresh frequency from the plan ('daily', 'weekly', 'unlimited')
 * @param projectCreatedAt - The date when the project was created
 * @param hasActiveSubscription - Whether the organization has an active subscription
 * @returns RefreshScheduleInfo object with schedule description and payment status
 */
export function getRefreshSchedule(
  planName: string | null | undefined,
  refreshFrequency: string | undefined,
  projectCreatedAt: string | Date,
  hasActiveSubscription: boolean = false
): RefreshScheduleInfo {
  // Free plans or no subscription = no automatic refresh
  if (!planName || planName.toLowerCase() === 'free' || !hasActiveSubscription) {
    return {
      schedule: 'None',
      isPaid: false
    };
  }

  const frequency = refreshFrequency || 'weekly';
  
  switch (frequency) {
    case 'daily':
      return {
        schedule: 'Every day',
        isPaid: true
      };
    
    case 'unlimited':
      return {
        schedule: 'Every day',
        isPaid: true
      };
    
    case 'weekly':
      const createdDate = new Date(projectCreatedAt);
      const dayOfWeek = createdDate.getDay();
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return {
        schedule: `Every ${dayNames[dayOfWeek]}`,
        isPaid: true
      };
    
    default:
      // Default to weekly behavior
      const defaultCreatedDate = new Date(projectCreatedAt);
      const defaultDayOfWeek = defaultCreatedDate.getDay();
      const defaultDayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return {
        schedule: `Every ${defaultDayNames[defaultDayOfWeek]}`,
        isPaid: true
      };
  }
}

/**
 * Get a shortened version of the refresh schedule for table display
 * @param planName - The name of the plan
 * @param refreshFrequency - The refresh frequency from the plan
 * @param projectCreatedAt - The date when the project was created
 * @param hasActiveSubscription - Whether the organization has an active subscription
 * @returns Short schedule description
 */
export function getShortRefreshSchedule(
  planName: string | null | undefined,
  refreshFrequency: string | undefined,
  projectCreatedAt: string | Date,
  hasActiveSubscription: boolean = false
): string {
  const info = getRefreshSchedule(planName, refreshFrequency, projectCreatedAt, hasActiveSubscription);
  return info.schedule;
}