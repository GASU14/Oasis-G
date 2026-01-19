export const Logger = {
  info: (context: string, message: string, data?: any) => {
    console.log(`[${context}] ${message}`, data || '');
  },
  warn: (context: string, message: string, data?: any) => {
    console.warn(`[${context}] ${message}`, data || '');
  },
  error: (context: string, message: string, data?: any) => {
    console.error(`[${context}] ${message}`, data || '');
  },
  debug: (context: string, message: string, data?: any) => {
    console.debug(`[${context}] ${message}`, data || '');
  }
};