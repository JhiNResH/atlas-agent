/**
 * Hermes Twitter Bot
 *
 * Monitors Twitter for conference-related tweets and replies with Blink URLs.
 * Rate limited to 1 reply per user per 24h.
 */

import "dotenv/config";
import { CONFERENCES, detectConference } from "./conferences.js";
import {
  canReplyToUser,
  recordReply,
  cleanupOldEntries,
  getRateLimitStatus,
} from "./rate-limit.js";
import { searchTweets, replyToTweet, buildSearchQuery } from "./twitter.js";

// Poll interval (in ms) - Twitter API rate limits apply
const POLL_INTERVAL = 60_000; // 1 minute

// Track last seen tweet ID per conference
const lastSeenIds = new Map<string, string>();

/**
 * Build reply message for a conference
 */
function buildReplyMessage(confName: string, blinkUrl: string): string {
  return (
    `Flights to ${confName}?\n\n` +
    `${blinkUrl}\n\n` +
    `Check current prices + booking window before it's too late. Powered by @HermesACP`
  );
}

/**
 * Process a single tweet
 */
async function processTweet(tweet: { id: string; text: string; author_id: string }): Promise<void> {
  const conf = detectConference(tweet.text);
  if (!conf) {
    console.log(`[bot] No conference match for tweet ${tweet.id}`);
    return;
  }

  console.log(`[bot] Detected ${conf.name} in tweet ${tweet.id} by ${tweet.author_id}`);

  // Check rate limit
  if (!canReplyToUser(tweet.author_id)) {
    console.log(`[bot] Rate limited: already replied to ${tweet.author_id} in last 24h`);
    return;
  }

  // Build and send reply
  const replyText = buildReplyMessage(conf.name, conf.blinkUrl);

  console.log(`[bot] Replying to tweet ${tweet.id}...`);
  const replyId = await replyToTweet(tweet.id, replyText);

  if (replyId) {
    recordReply(tweet.author_id);
    console.log(`[bot] Reply sent: ${replyId}`);
  } else {
    console.log(`[bot] Reply failed for tweet ${tweet.id}`);
  }
}

/**
 * Poll for new tweets matching conference keywords
 */
async function pollTweets(): Promise<void> {
  // Build combined search query
  const allKeywords = CONFERENCES.flatMap((c) => c.keywords.slice(0, 3)); // Top 3 per conf
  const query = buildSearchQuery(allKeywords);

  console.log(`[bot] Searching: ${query.slice(0, 100)}...`);

  try {
    // Get the most recent sinceId across all conferences
    const sinceIds = Array.from(lastSeenIds.values());
    const sinceId = sinceIds.length > 0 ? sinceIds.sort().pop() : undefined;

    const tweets = await searchTweets(query, sinceId);

    if (tweets.length === 0) {
      console.log(`[bot] No new tweets found`);
      return;
    }

    console.log(`[bot] Found ${tweets.length} new tweets`);

    // Process tweets (oldest first)
    const sortedTweets = [...tweets].reverse();

    for (const tweet of sortedTweets) {
      await processTweet(tweet);

      // Update last seen ID
      const conf = detectConference(tweet.text);
      if (conf) {
        lastSeenIds.set(conf.slug, tweet.id);
      }
    }
  } catch (err) {
    console.error(`[bot] Poll error:`, err);
  }
}

/**
 * Main bot loop
 */
async function main(): Promise<void> {
  console.log("[bot] Hermes Twitter Bot starting...");
  console.log(`[bot] Monitoring ${CONFERENCES.length} conferences`);
  console.log(`[bot] Poll interval: ${POLL_INTERVAL / 1000}s`);

  // Initial poll
  await pollTweets();

  // Set up polling interval
  setInterval(async () => {
    await pollTweets();

    // Cleanup old rate limit entries periodically
    cleanupOldEntries();

    const status = getRateLimitStatus();
    console.log(`[bot] Rate limit status: ${status.active} active / ${status.total} total`);
  }, POLL_INTERVAL);

  console.log("[bot] Bot running. Press Ctrl+C to stop.");
}

// Run
main().catch((err) => {
  console.error("[bot] Fatal error:", err);
  process.exit(1);
});
