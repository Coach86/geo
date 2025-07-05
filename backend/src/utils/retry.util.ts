import { Logger } from '@nestjs/common';

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  backoffFactor?: number;
  retryCondition?: (error: any) => boolean;
}

export interface RetryResult<T> {
  result?: T;
  error?: Error;
  attempts: number;
  totalDelayMs: number;
}

/**
 * Utility class for implementing exponential backoff retry logic
 */
export class RetryUtil {
  private static readonly logger = new Logger(RetryUtil.name);

  /**
   * Determines if an error is a permanent quota/billing error that should NOT be retried
   */
  static isQuotaError(error: any): boolean {
    if (!error) return false;
    
    const errorMessage = error?.message?.toLowerCase() || '';
    
    // Quota/billing error indicators that suggest permanent failure
    const quotaIndicators = [
      'exceeded your current quota',
      'check your plan and billing',
      'insufficient quota',
      'insufficientquotaerror',
      'quota has been exhausted',
      'upgrade your plan',
      'billing details',
      'payment required'
    ];

    return quotaIndicators.some(indicator => errorMessage.includes(indicator));
  }

  /**
   * Determines if an error is a rate limiting error that should be retried
   */
  static isRateLimitError(error: any): boolean {
    if (!error) return false;
    
    const errorMessage = error?.message?.toLowerCase() || '';
    const errorCode = error?.code?.toString() || '';
    const statusCode = error?.status || error?.statusCode || 0;

    // First check if it's a quota error - these should NOT be retried
    if (RetryUtil.isQuotaError(error)) {
      return false;
    }

    // Common rate limit indicators (temporary issues that can be retried)
    const rateLimitIndicators = [
      'too many requests',
      'rate limit',
      'rate_limit',
      'requests per minute',
      'rpm',
      'tpm',
      'tokens per minute',
      'rate limited',
      'rate-limited',
      'throttled',
      'throttling',
      'retry after',
      'retry-after',
      'temporarily unavailable'
    ];

    // Check status code
    if (statusCode === 429) {
      // Even with 429, check if it's a quota error
      return !RetryUtil.isQuotaError(error);
    }

    // Check error message and code
    return rateLimitIndicators.some(indicator => 
      errorMessage.includes(indicator) || errorCode.includes(indicator)
    );
  }

  /**
   * Extracts retry delay from error message or headers
   */
  static extractRetryDelay(error: any): number | null {
    try {
      // Check for Retry-After header (in seconds)
      if (error?.response?.headers?.['retry-after']) {
        const retryAfter = parseInt(error.response.headers['retry-after'], 10);
        if (!isNaN(retryAfter)) {
          return retryAfter * 1000; // Convert to milliseconds
        }
      }

      // Check for retry delay in error message (e.g., "retryDelay":"3s")
      const errorMessage = error?.message || '';
      const retryDelayMatch = errorMessage.match(/"retryDelay":"(\d+)s"/);
      if (retryDelayMatch) {
        const delaySeconds = parseInt(retryDelayMatch[1], 10);
        if (!isNaN(delaySeconds)) {
          return delaySeconds * 1000; // Convert to milliseconds
        }
      }

      // Check for other retry delay patterns in the message
      const retryPatterns = [
        /retry.*?(\d+)\s*seconds?/i,
        /wait.*?(\d+)\s*seconds?/i,
        /delay.*?(\d+)\s*seconds?/i
      ];

      for (const pattern of retryPatterns) {
        const match = errorMessage.match(pattern);
        if (match) {
          const delaySeconds = parseInt(match[1], 10);
          if (!isNaN(delaySeconds)) {
            return delaySeconds * 1000;
          }
        }
      }
    } catch (e) {
      // Ignore errors in parsing
    }

    return null;
  }

  /**
   * Calculates exponential backoff delay
   */
  static calculateBackoffDelay(
    attempt: number,
    baseDelayMs: number,
    maxDelayMs: number,
    backoffFactor: number
  ): number {
    const delay = baseDelayMs * Math.pow(backoffFactor, attempt);
    return Math.min(delay, maxDelayMs);
  }

  /**
   * Adds jitter to prevent thundering herd
   */
  static addJitter(delayMs: number, jitterFactor: number = 0.1): number {
    const jitter = delayMs * jitterFactor * Math.random();
    return delayMs + jitter;
  }

  /**
   * Sleep for specified milliseconds
   */
  static async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Executes a function with exponential backoff retry logic
   */
  static async withRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {},
    operationName?: string
  ): Promise<T> {
    const {
      maxRetries = 3,
      baseDelayMs = 1000,
      maxDelayMs = 30000,
      backoffFactor = 2,
      retryCondition = RetryUtil.isRateLimitError
    } = options;

    let lastError: any;
    let totalDelayMs = 0;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();
        
        if (attempt > 0) {
          this.logger.log(
            `${operationName || 'Operation'} succeeded after ${attempt} retries ` +
            `(total delay: ${totalDelayMs}ms)`
          );
        }
        
        return result;
      } catch (error) {
        lastError = error;

        // Don't retry on the last attempt
        if (attempt === maxRetries) {
          break;
        }

        // Check if this error should be retried
        if (!retryCondition(error)) {
          // Check if it's specifically a quota error for better logging
          if (RetryUtil.isQuotaError(error)) {
            this.logger.warn(
              `${operationName || 'Operation'} failed with quota/billing error (not retrying): ${error.message}`
            );
          } else {
            this.logger.debug(
              `${operationName || 'Operation'} failed with non-retryable error: ${error.message}`
            );
          }
          throw error;
        }

        // Calculate delay
        let delayMs: number;

        // First, try to extract delay from error
        const extractedDelay = this.extractRetryDelay(error);
        if (extractedDelay !== null) {
          delayMs = Math.min(extractedDelay, maxDelayMs);
          this.logger.log(
            `Using retry delay from error response: ${delayMs}ms`
          );
        } else {
          // Use exponential backoff
          delayMs = this.calculateBackoffDelay(attempt, baseDelayMs, maxDelayMs, backoffFactor);
          delayMs = this.addJitter(delayMs);
        }

        totalDelayMs += delayMs;

        this.logger.warn(
          `${operationName || 'Operation'} failed (attempt ${attempt + 1}/${maxRetries + 1}): ` +
          `${error.message}. Retrying in ${delayMs}ms...`
        );

        await this.sleep(delayMs);
      }
    }

    // If we get here, all retries have been exhausted
    this.logger.error(
      `${operationName || 'Operation'} failed after ${maxRetries} retries ` +
      `(total delay: ${totalDelayMs}ms). Last error: ${lastError.message}`
    );
    
    throw lastError;
  }
}