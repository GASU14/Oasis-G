export const Diagnostics = {
  analyze: (context: string, error: any, metadata?: any) => {
    let message = "An unexpected error occurred.";
    
    if (error instanceof Error) {
      message = error.message;
    } else if (typeof error === 'object' && error !== null && 'message' in error) {
      // Handle non-Error objects that have a message property (common in Firebase)
      message = String(error.message);
    } else if (typeof error === "string") {
      message = error;
    }
    
    return {
      userMessage: message,
      technical: error,
      context,
      metadata
    };
  }
};