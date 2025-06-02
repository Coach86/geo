/**
 * Utility functions for browser notifications
 */

/**
 * Check if browser notifications are supported
 */
export const isNotificationSupported = (): boolean => {
  return 'Notification' in window;
};

/**
 * Check if notifications are permitted by the user
 */
export const isNotificationPermitted = (): boolean => {
  return isNotificationSupported() && Notification.permission === 'granted';
};

/**
 * Request permission to display notifications
 * @returns A promise that resolves with the permission status ('granted', 'denied', or 'default')
 */
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!isNotificationSupported()) {
    console.warn('Browser notifications are not supported');
    return 'denied';
  }

  // Check if permission is already granted
  if (Notification.permission === 'granted') {
    return 'granted';
  }

  // Request permission
  try {
    return await Notification.requestPermission();
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return 'denied';
  }
};

/**
 * Show a browser notification
 * @param title Title of the notification
 * @param options Notification options (body, icon, etc.)
 * @returns The notification object or null if notifications are not supported/permitted
 */
export const showNotification = (
  title: string,
  options?: NotificationOptions,
): Notification | null => {
  // Check if notifications are supported and permitted
  if (!isNotificationSupported()) {
    console.warn('Browser notifications are not supported');
    return null;
  }

  if (Notification.permission !== 'granted') {
    console.warn('Browser notifications are not permitted');
    return null;
  }

  // Create and return the notification
  try {
    const notification = new Notification(title, {
      icon: '/favicon.ico', // Default icon
      ...options,
    });

    // Add event handlers
    notification.onclick = () => {
      window.focus(); // Focus the window when notification is clicked
      notification.close();
    };

    return notification;
  } catch (error) {
    console.error('Error showing notification:', error);
    return null;
  }
};

/**
 * Show a batch start notification
 * @param projectName Name of the project
 * @param batchType Type of batch that is starting
 */
export const showBatchStartNotification = (
  projectName: string,
  batchType: string,
): Notification | null => {
  console.log('Showing batch start notification for:', projectName, batchType);
  const title = `Batch Analysis Started: ${projectName}`;
  const body = `The ${batchType} analysis for ${projectName} has been initiated and is processing.`;

  return showNotification(title, {
    body,
    tag: `batch-start-${projectName}-${Date.now()}`, // Unique tag
    requireInteraction: false, // Auto-dismiss after a few seconds
  });
};

/**
 * Show a batch completion notification
 * @param projectName Name of the project
 * @param batchType Type of batch that completed
 * @param success Whether the batch completed successfully
 */
export const showBatchCompletionNotification = (
  projectName: string,
  batchType: string,
  success: boolean,
): Notification | null => {
  console.log('Showing batch completion notification for:', projectName, batchType, success);
  const title = success
    ? `Batch Analysis Complete: ${projectName}`
    : `Batch Analysis Failed: ${projectName}`;

  const body = success
    ? `The ${batchType} analysis for ${projectName} has completed successfully.`
    : `The ${batchType} analysis for ${projectName} encountered an error.`;

  return showNotification(title, {
    body,
    tag: `batch-${projectName}-${Date.now()}`, // Unique tag
    requireInteraction: true, // The notification will remain visible until the user dismisses it
  });
};
