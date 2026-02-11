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

/**
 * Maps technical/database errors to safe, user-friendly messages.
 * Prevents leaking internal details (table names, constraints, etc.) to users.
 */
export const getUserFriendlyError = (error: unknown): string => {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('duplicate') || msg.includes('unique')) return 'Este item já existe.';
    if (msg.includes('foreign key') || msg.includes('violates foreign key')) return 'Não é possível realizar esta ação — há dependências.';
    if (msg.includes('not found') || msg.includes('no rows')) return 'Item não encontrado.';
    if (msg.includes('permission') || msg.includes('denied') || msg.includes('rls')) return 'Você não tem permissão para esta ação.';
    if (msg.includes('network') || msg.includes('fetch')) return 'Erro de conexão. Verifique sua internet.';
    if (msg.includes('timeout')) return 'A operação demorou muito. Tente novamente.';
  }
  return 'Ocorreu um erro. Tente novamente.';
};
