interface RetryOptions {
  maxAttempts?: number;
  delayMs?: number;
  backoffMultiplier?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  delayMs: 1000,
  backoffMultiplier: 2,
  onRetry: () => {},
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on the last attempt
      if (attempt === opts.maxAttempts) {
        break;
      }

      // Don't retry on certain error types (e.g., validation errors, 400 Bad Request)
      if (isNonRetriableError(lastError)) {
        break;
      }

      // Call the onRetry callback
      opts.onRetry(attempt, lastError);

      // Calculate delay with exponential backoff
      const delay = opts.delayMs * Math.pow(opts.backoffMultiplier, attempt - 1);

      // Wait before retrying
      await sleep(delay);
    }
  }

  // All attempts failed
  throw new Error(
    `Failed after ${opts.maxAttempts} attempts: ${lastError?.message || 'Unknown error'}`
  );
}

// Helper function to determine if an error should not be retried
function isNonRetriableError(error: Error): boolean {
  const message = error.message.toLowerCase();

  // Don't retry client errors
  const nonRetriablePatterns = [
    'invalid',
    'bad request',
    'unauthorized',
    'forbidden',
    'not found',
    'validation',
  ];

  return nonRetriablePatterns.some((pattern) => message.includes(pattern));
}
