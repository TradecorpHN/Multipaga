import { Redis } from '@upstash/redis';

// Inicializar cliente Redis
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
});

/**
 * Rate limiter using Upstash Redis
 */
const rateLimit = {
  /**
   * Checks if a request is within the rate limit for a given key
   * @param key Unique identifier for rate limiting (e.g., IP address)
   * @param limit Maximum number of requests allowed within the time window
   * @returns Object indicating whether the request is allowed
   * @throws Error if Redis operations fail
   */
  async check(key: string, limit: number): Promise<{ success: boolean }> {
    try {
      // Validate inputs
      if (!key || typeof key !== 'string') {
        throw new Error('Rate limit key must be a non-empty string');
      }
      if (!Number.isInteger(limit) || limit <= 0) {
        throw new Error('Rate limit must be a positive integer');
      }

      // Increment counter in Redis
      const current = await redis.incr(key);

      // Check if limit is exceeded
      if (current > limit) {
        return { success: false };
      }

      // Set expiration for first request
      if (current === 1) {
        await redis.expire(key, 60); // Expire in 1 minute
      }

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown Redis error';
      throw new Error(`Rate limit check failed: ${errorMessage}`);
    }
  },
};

// Export as default to match import in route.ts
export default rateLimit;