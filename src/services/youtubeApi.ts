/**
 * YouTube Data API v3 Service
 *
 * Fetches official FIFA World Cup 2026 highlights from the FIFA YouTube channel.
 * Channel ID: UCpcTrCXblq78GZrTUTLWeBw (FIFA official)
 *
 * TEST MOUNTING POINT: parseDuration, buildHighlightVideo are pure and unit-testable.
 *
 * Security: API key is read from VITE_YOUTUBE_API_KEY env var.
 * The YouTube Data API key has restricted referrer access so browser exposure is safe.
 */

import type { HighlightVideo } from "@/types/domain";

const YT_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY as string | undefined;
const FIFA_CHANNEL_ID = "UCpcTrCXblq78GZrTUTLWeBw";
const YT_BASE = "https://www.googleapis.com/youtube/v3";

// ---------------------------------------------------------------------------
// Raw YouTube API types (subset we use)
// ---------------------------------------------------------------------------

interface YTSearchItem {
  id: { videoId: string };
  snippet: {
    title: string;
    publishedAt: string;
    channelTitle: string;
    thumbnails: {
      maxres?: { url: string };
      high: { url: string };
      medium: { url: string };
    };
  };
}

interface YTVideoItem {
  id: string;
  snippet: {
    title: string;
    publishedAt: string;
    channelTitle: string;
    thumbnails: {
      maxres?: { url: string };
      high: { url: string };
    };
  };
  contentDetails: { duration: string }; // ISO 8601 e.g. "PT2M10S"
  statistics: { viewCount?: string };
}

// ---------------------------------------------------------------------------
// Pure transform helpers
// ---------------------------------------------------------------------------

/**
 * Parse ISO 8601 duration string to total seconds.
 * TEST MOUNTING POINT: pure function.
 * @example parseDuration("PT2M10S") === 130
 */
export function parseDuration(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  const h = parseInt(m[1] ?? "0");
  const min = parseInt(m[2] ?? "0");
  const sec = parseInt(m[3] ?? "0");
  return h * 3600 + min * 60 + sec;
}

/**
 * Transform a YTVideoItem into a domain HighlightVideo.
 * TEST MOUNTING POINT: pure function.
 */
export function buildHighlightVideo(item: YTVideoItem): HighlightVideo {
  const thumb =
    item.snippet.thumbnails.maxres?.url ??
    item.snippet.thumbnails.high?.url ??
    "";
  return {
    id: item.id,
    title: item.snippet.title,
    channel: item.snippet.channelTitle,
    publishedAt: item.snippet.publishedAt,
    durationSec: parseDuration(item.contentDetails.duration),
    views: parseInt(item.statistics.viewCount ?? "0"),
    thumbnail: thumb,
  };
}

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

/**
 * Search the FIFA YouTube channel for World Cup 2026 highlights.
 * Returns up to `maxResults` video IDs sorted by date (newest first).
 */
async function searchFIFAChannel(
  query: string,
  maxResults = 20,
): Promise<string[]> {
  if (!YT_API_KEY) throw new Error("VITE_YOUTUBE_API_KEY not set");

  const url = new URL(`${YT_BASE}/search`);
  url.searchParams.set("part", "snippet");
  url.searchParams.set("channelId", FIFA_CHANNEL_ID);
  url.searchParams.set("q", query);
  url.searchParams.set("type", "video");
  url.searchParams.set("order", "date");
  url.searchParams.set("maxResults", String(maxResults));
  url.searchParams.set("key", YT_API_KEY);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`YouTube search error ${res.status}`);
  const data = (await res.json()) as { items: YTSearchItem[] };
  return data.items.map((i) => i.id.videoId);
}

/**
 * Batch-fetch full video metadata (duration, views, thumbnails) for given IDs.
 */
async function fetchVideoDetails(ids: string[]): Promise<YTVideoItem[]> {
  if (!YT_API_KEY || ids.length === 0) return [];

  const url = new URL(`${YT_BASE}/videos`);
  url.searchParams.set("part", "snippet,contentDetails,statistics");
  url.searchParams.set("id", ids.join(","));
  url.searchParams.set("key", YT_API_KEY);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`YouTube videos error ${res.status}`);
  const data = (await res.json()) as { items: YTVideoItem[] };
  return data.items;
}

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

let _highlightsCache: HighlightVideo[] | null = null;
let _highlightsCacheTime = 0;
const HIGHLIGHTS_CACHE_TTL = 10 * 60_000; // 10 minutes

/**
 * Fetch FIFA World Cup 2026 official highlights from YouTube.
 *
 * Strategy:
 * 1. Search FIFA channel for "FIFA World Cup 2026" (latest first)
 * 2. Filter for highlight-style videos (skip shorts <30s)
 * 3. Return up to 12 videos
 *
 * Falls back to empty array if API key missing or quota exceeded.
 */
export async function fetchHighlights(): Promise<HighlightVideo[]> {
  const now = Date.now();
  if (_highlightsCache && now - _highlightsCacheTime < HIGHLIGHTS_CACHE_TTL) {
    return _highlightsCache;
  }

  if (!YT_API_KEY) {
    console.warn("[youtubeApi] VITE_YOUTUBE_API_KEY not set, returning empty highlights");
    return [];
  }

  try {
    const ids = await searchFIFAChannel("FIFA World Cup 2026 highlights goals", 20);
    const videos = await fetchVideoDetails(ids);

    const highlights = videos
      .map(buildHighlightVideo)
      .filter((v) => v.durationSec >= 30) // exclude clips shorter than 30s (teasers/shorts)
      .slice(0, 12);

    _highlightsCache = highlights;
    _highlightsCacheTime = now;
    return highlights;
  } catch (err) {
    console.error("[youtubeApi] fetchHighlights failed:", err);
    return _highlightsCache ?? [];
  }
}
