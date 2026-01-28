// Simple in-memory rate limiting (per function instance)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
export const MAX_REQUESTS_PER_WINDOW = 10;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number;
}

export function getRateLimitKey(req: Request): string {
  // Use authorization header user ID or IP for rate limiting
  const authHeader = req.headers.get("authorization") || "";
  const clientInfo = req.headers.get("x-client-info") || "";
  const forwarded = req.headers.get("x-forwarded-for") || "unknown";
  return `${authHeader.slice(-20)}-${clientInfo}-${forwarded}`;
}

export function checkRateLimit(key: string): RateLimitResult {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1, resetIn: RATE_LIMIT_WINDOW_MS };
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return { allowed: false, remaining: 0, resetIn: record.resetTime - now };
  }

  record.count++;
  return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - record.count, resetIn: record.resetTime - now };
}

export function createRateLimitResponse(resetIn: number, corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({ 
      error: "Too many requests. Please wait a moment and try again.",
      retryAfter: Math.ceil(resetIn / 1000)
    }), 
    {
      status: 429,
      headers: { 
        ...corsHeaders, 
        "Content-Type": "application/json",
        "Retry-After": String(Math.ceil(resetIn / 1000))
      },
    }
  );
}
