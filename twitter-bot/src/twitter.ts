/**
 * Twitter API v2 client
 * Uses OAuth 2.0 for app-only auth and user context for posting
 */

// Twitter API v2 endpoints
const TWITTER_API_BASE = "https://api.twitter.com/2";

interface TwitterConfig {
  bearerToken: string; // For search (app-only)
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessSecret: string;
}

interface Tweet {
  id: string;
  text: string;
  author_id: string;
  created_at?: string;
}

interface SearchResult {
  data?: Tweet[];
  meta?: {
    newest_id?: string;
    oldest_id?: string;
    result_count?: number;
  };
}

/**
 * Get config from environment
 */
function getConfig(): TwitterConfig {
  const bearerToken = process.env.TWITTER_BEARER_TOKEN;
  const apiKey = process.env.TWITTER_API_KEY;
  const apiSecret = process.env.TWITTER_API_SECRET;
  const accessToken = process.env.TWITTER_ACCESS_TOKEN;
  const accessSecret = process.env.TWITTER_ACCESS_SECRET;

  if (!bearerToken || !apiKey || !apiSecret || !accessToken || !accessSecret) {
    throw new Error(
      "Missing Twitter credentials. Set TWITTER_BEARER_TOKEN, TWITTER_API_KEY, " +
        "TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET"
    );
  }

  return { bearerToken, apiKey, apiSecret, accessToken, accessSecret };
}

/**
 * Search recent tweets matching keywords
 */
export async function searchTweets(query: string, sinceId?: string): Promise<Tweet[]> {
  const config = getConfig();

  const params = new URLSearchParams({
    query,
    "tweet.fields": "id,text,author_id,created_at",
    max_results: "10",
  });

  if (sinceId) {
    params.set("since_id", sinceId);
  }

  const url = `${TWITTER_API_BASE}/tweets/search/recent?${params}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${config.bearerToken}`,
    },
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Twitter search failed: ${res.status} ${error}`);
  }

  const data = (await res.json()) as SearchResult;
  return data.data || [];
}

/**
 * Post a reply to a tweet
 * Requires OAuth 1.0a user context (more complex auth)
 */
export async function replyToTweet(tweetId: string, text: string): Promise<string | null> {
  const config = getConfig();

  // OAuth 1.0a signature generation
  // For simplicity, we'll use the Twitter API v2 with OAuth 2.0 PKCE
  // In production, use a library like twitter-api-v2

  const url = `${TWITTER_API_BASE}/tweets`;

  const body = {
    text,
    reply: {
      in_reply_to_tweet_id: tweetId,
    },
  };

  // Generate OAuth 1.0a signature
  const oauthSignature = await generateOAuth1Signature(
    "POST",
    url,
    config.apiKey,
    config.apiSecret,
    config.accessToken,
    config.accessSecret
  );

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: oauthSignature,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = await res.text();
    console.error(`[twitter] Reply failed: ${res.status} ${error}`);
    return null;
  }

  const data = (await res.json()) as any;
  return data.data?.id || null;
}

/**
 * Generate OAuth 1.0a Authorization header
 * Simplified implementation - use twitter-api-v2 in production
 */
async function generateOAuth1Signature(
  method: string,
  url: string,
  apiKey: string,
  apiSecret: string,
  accessToken: string,
  accessSecret: string
): Promise<string> {
  const crypto = await import("crypto");

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomBytes(16).toString("hex");

  const params: Record<string, string> = {
    oauth_consumer_key: apiKey,
    oauth_nonce: nonce,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: timestamp,
    oauth_token: accessToken,
    oauth_version: "1.0",
  };

  // Create signature base string
  const sortedParams = Object.keys(params)
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
    .join("&");

  const baseString = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(sortedParams),
  ].join("&");

  // Create signing key
  const signingKey = `${encodeURIComponent(apiSecret)}&${encodeURIComponent(accessSecret)}`;

  // Generate signature
  const signature = crypto.createHmac("sha1", signingKey).update(baseString).digest("base64");

  params.oauth_signature = signature;

  // Build Authorization header
  const authHeader = Object.keys(params)
    .sort()
    .map((k) => `${encodeURIComponent(k)}="${encodeURIComponent(params[k])}"`)
    .join(", ");

  return `OAuth ${authHeader}`;
}

/**
 * Build search query for conference keywords
 */
export function buildSearchQuery(keywords: string[]): string {
  // Twitter search query format
  // Match any of the keywords, exclude retweets and replies
  const keywordQuery = keywords.map((k) => `"${k}"`).join(" OR ");
  return `(${keywordQuery}) -is:retweet -is:reply lang:en`;
}
