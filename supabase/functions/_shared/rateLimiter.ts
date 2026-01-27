/**
 * Simple in-memory rate limiter for Supabase Edge Functions
 *
 * LIMITATIONS:
 * - In-memory storage resets when function cold starts
 * - Each edge function instance has its own storage
 * - For production scale, consider Upstash Redis
 *
 * This provides basic protection against abuse while keeping costs low.
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store for rate limiting
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up old entries periodically
const CLEANUP_INTERVAL = 60 * 1000; // 1 minute
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;

  lastCleanup = now;
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}

export interface RateLimitConfig {
  maxRequests: number;  // Max requests per window
  windowMs: number;     // Window size in milliseconds
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}

/**
 * Check if a request should be rate limited
 *
 * @param identifier - Unique identifier (usually IP address or user ID)
 * @param config - Rate limit configuration
 * @returns Whether the request is allowed and rate limit info
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  cleanup();

  const now = Date.now();
  const key = identifier;
  const entry = rateLimitStore.get(key);

  // If no entry or window expired, create new entry
  if (!entry || entry.resetTime < now) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: now + config.windowMs,
    };
  }

  // If within window, check count
  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }

  // Increment count
  entry.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * Get client IP from request headers
 * Handles various proxy headers (Cloudflare, Vercel, etc.)
 */
export function getClientIP(req: Request): string {
  // Try various headers in order of preference
  const headers = [
    "cf-connecting-ip",     // Cloudflare
    "x-real-ip",            // Nginx
    "x-forwarded-for",      // Standard proxy header
    "x-client-ip",          // Apache
  ];

  for (const header of headers) {
    const value = req.headers.get(header);
    if (value) {
      // x-forwarded-for can have multiple IPs, take the first
      return value.split(",")[0].trim();
    }
  }

  // Fallback to a default (shouldn't happen in production)
  return "unknown";
}

/**
 * Create a rate limit error response
 */
export function rateLimitResponse(
  result: RateLimitResult,
  corsHeaders: Record<string, string>
): Response {
  const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);

  return new Response(
    JSON.stringify({
      error: "Too many requests. Please try again later.",
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Retry-After": retryAfter.toString(),
        "X-RateLimit-Remaining": result.remaining.toString(),
        "X-RateLimit-Reset": result.resetTime.toString(),
      },
    }
  );
}

// Preset configurations for different function types
export const RATE_LIMITS = {
  // AI-powered functions (expensive, but need room for conversation)
  AI_FUNCTION: {
    maxRequests: 20,      // 20 requests per minute (increased from 10)
    windowMs: 60 * 1000,
  },
  // Search/read functions (less expensive)
  SEARCH_FUNCTION: {
    maxRequests: 30,      // 30 requests
    windowMs: 60 * 1000,  // per minute
  },
  // General API functions
  GENERAL: {
    maxRequests: 60,      // 60 requests
    windowMs: 60 * 1000,  // per minute
  },
} as const;
