/**
 * Safe error logging utility that only logs detailed errors in development mode.
 * In production, only generic error indicators are logged to prevent information leakage.
 */

const isDev = import.meta.env.DEV;

/**
 * Safely log an error with context
 * @param context - Description of where the error occurred
 * @param error - The error object (will be hidden in production)
 */
export const logError = (context: string, error?: unknown): void => {
  if (isDev) {
    console.error(`${context}:`, error);
  }
  // In production, we don't log the full error to console
  // A logging service like Sentry could be added here for production error tracking
};

/**
 * Safely log a warning with context
 * @param context - Description of what happened
 * @param data - Additional data (will be hidden in production)
 */
export const logWarn = (context: string, data?: unknown): void => {
  if (isDev) {
    console.warn(`${context}:`, data);
  }
};

/**
 * Log info messages (development only)
 * @param context - Description 
 * @param data - Additional data
 */
export const logInfo = (context: string, data?: unknown): void => {
  if (isDev) {
    console.log(`${context}:`, data);
  }
};
