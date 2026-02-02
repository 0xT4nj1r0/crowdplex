/**
 * Simple in-memory rate limiter middleware
 * Limits requests per IP address within a time window
 */

const rateLimitStore = new Map();

// Clean up old entries every minute
setInterval(() => {
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;
  
  for (const [ip, requests] of rateLimitStore) {
    const recentRequests = requests.filter(timestamp => timestamp > oneHourAgo);
    
    if (recentRequests.length === 0) {
      rateLimitStore.delete(ip);
    } else {
      rateLimitStore.set(ip, recentRequests);
    }
  }
}, 60 * 1000);

/**
 * Rate limiter middleware factory
 * @param {Object} options - Rate limit options
 * @param {number} options.maxRequests - Maximum requests allowed in time window
 * @param {number} options.windowMs - Time window in milliseconds
 * @returns {Function} Express middleware
 */
export function createRateLimiter(options = {}) {
  const maxRequests = options.maxRequests || 60;
  const windowMs = options.windowMs || 60 * 1000; // Default: 60 requests per minute

  return (req, res, next) => {
    // Get client IP (handle proxies)
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get existing requests for this IP
    const requests = rateLimitStore.get(ip) || [];
    
    // Filter to only requests within current window
    const recentRequests = requests.filter(timestamp => timestamp > windowStart);

    // Check if rate limit exceeded
    if (recentRequests.length >= maxRequests) {
      const oldestRequest = Math.min(...recentRequests);
      const resetTime = Math.ceil((oldestRequest + windowMs - now) / 1000);
      
      res.set('X-RateLimit-Limit', maxRequests);
      res.set('X-RateLimit-Remaining', 0);
      res.set('X-RateLimit-Reset', resetTime);
      
      return res.status(429).json({
        error: 'Too many requests',
        message: `Rate limit exceeded. Maximum ${maxRequests} requests per ${windowMs / 1000} seconds.`,
        retryAfter: resetTime
      });
    }

    // Add current request timestamp
    recentRequests.push(now);
    rateLimitStore.set(ip, recentRequests);

    // Set rate limit headers
    res.set('X-RateLimit-Limit', maxRequests);
    res.set('X-RateLimit-Remaining', maxRequests - recentRequests.length);

    next();
  };
}

export default createRateLimiter;
