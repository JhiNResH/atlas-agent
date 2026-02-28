/**
 * Rate limiting for Twitter replies
 * Max 1 reply per user per 24h to prevent spam
 */

// In-memory store (use Redis in production)
const replyHistory = new Map<string, number>();

// 24 hours in milliseconds
const RATE_LIMIT_WINDOW = 24 * 60 * 60 * 1000;

/**
 * Check if we can reply to a user
 */
export function canReplyToUser(userId: string): boolean {
  const lastReply = replyHistory.get(userId);
  if (!lastReply) return true;

  const elapsed = Date.now() - lastReply;
  return elapsed >= RATE_LIMIT_WINDOW;
}

/**
 * Record a reply to a user
 */
export function recordReply(userId: string): void {
  replyHistory.set(userId, Date.now());
}

/**
 * Clean up old entries (call periodically)
 */
export function cleanupOldEntries(): void {
  const now = Date.now();
  for (const [userId, timestamp] of replyHistory.entries()) {
    if (now - timestamp >= RATE_LIMIT_WINDOW) {
      replyHistory.delete(userId);
    }
  }
}

/**
 * Get rate limit status
 */
export function getRateLimitStatus(): { total: number; active: number } {
  const now = Date.now();
  let active = 0;
  for (const timestamp of replyHistory.values()) {
    if (now - timestamp < RATE_LIMIT_WINDOW) {
      active++;
    }
  }
  return { total: replyHistory.size, active };
}
