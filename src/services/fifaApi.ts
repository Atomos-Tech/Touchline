/**
 * FIFA World Cup 2026 Game Data Service
 * Source: https://worldcup26.ir/get/games
 *
 * Fetches the complete tournament dataset (104 matches across group, r32,
 * r16, qf, sf, third, and final stages). Transforms raw API shapes into
 * the application's domain types including real scorer data.
 *
 * TEST MOUNTING POINT: parseScorers, mapGameToMatch, detectStatus are all
 * pure functions — unit-test against fixture JSON.
 */

import type {
  Match,
  LiveMatch,
  CompletedMatch,
  ScheduledMatch,
  Team,
  Stage,
  GoalEvent,
} from "@/types/domain";
import { STADIUM_COORDS } from "./weatherApi";

// ---------------------------------------------------------------------------
// Raw API shape (as returned by worldcup26.ir)
// ---------------------------------------------------------------------------

export interface RawGame {
  _id: string;
  id: string;
  home_team_id: string;
  away_team_id: string;
  home_score: string | null;
  away_score: string | null;
  home_scorers: string | null;
  away_scorers: string | null;
  group: string;
  matchday: string;
  local_date: string; // "MM/DD/YYYY HH:MM"
  stadium_id: string;
  finished: "TRUE" | "FALSE";
  time_elapsed: string; // "finished" | "notstarted" | "45'" | "HT" …
  type: "group" | "r32" | "r16" | "qf" | "sf" | "third" | "final";
  home_team_name_en?: string;
  away_team_name_en?: string;
  home_team_label?: string;
  away_team_label?: string;
  match_minute?: string | null;
  home_penalty_score?: string | null;
  away_penalty_score?: string | null;
}

// ---------------------------------------------------------------------------
// Stadium metadata (names come from STADIUM_COORDS in weatherApi.ts)
// ---------------------------------------------------------------------------

function getVenueName(stadiumId: string): string {
  const s = STADIUM_COORDS[stadiumId];
  if (!s) return "FIFA 2026 Venue";
  return `${s.name}, ${s.city}`;
}

// ---------------------------------------------------------------------------
// Country flag emoji lookup
// ---------------------------------------------------------------------------

const FLAG_MAP: Record<string, string> = {
  Mexico: "🇲🇽",
  "South Africa": "🇿🇦",
  "South Korea": "🇰🇷",
  "Czech Republic": "🇨🇿",
  Canada: "🇨🇦",
  "Bosnia and Herzegovina": "🇧🇦",
  "United States": "🇺🇸",
  Ecuador: "🇪🇨",
  Argentina: "🇦🇷",
  Algeria: "🇩🇿",
  France: "🇫🇷",
  Nigeria: "🇳🇬",
  Spain: "🇪🇸",
  Ukraine: "🇺🇦",
  Brazil: "🇧🇷",
  Japan: "🇯🇵",
  England: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  Portugal: "🇵🇹",
  Netherlands: "🇳🇱",
  Morocco: "🇲🇦",
  Colombia: "🇨🇴",
  Ghana: "🇬🇭",
  Norway: "🇳🇴",
  Australia: "🇦🇺",
  Egypt: "🇪🇬",
  Germany: "🇩🇪",
  Paraguay: "🇵🇾",
  "Côte d'Ivoire": "🇨🇮",
  Switzerland: "🇨🇭",
  Belgium: "🇧🇪",
  "Saudi Arabia": "🇸🇦",
  Poland: "🇵🇱",
  Denmark: "🇩🇰",
  Serbia: "🇷🇸",
  Croatia: "🇭🇷",
  Uruguay: "🇺🇾",
  "Cabo Verde": "🇨🇻",
  Senegal: "🇸🇳",
  Turkey: "🇹🇷",
  "New Zealand": "🇳🇿",
  "IR Iran": "🇮🇷",
  China: "🇨🇳",
  Panama: "🇵🇦",
  Italy: "🇮🇹",
  Uzbekistan: "🇺🇿",
  Scotland: "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  "Burkina Faso": "🇧🇫",
  Sweden: "🇸🇪",
  Iran: "🇮🇷",
  Tunisia: "🇹🇳",
  Cameroon: "🇨🇲",
  Qatar: "🇶🇦",
  Venezuela: "🇻🇪",
  "Costa Rica": "🇨🇷",
  Jamaica: "🇯🇲",
  Romania: "🇷🇴",
  Austria: "🇦🇹",
  Slovakia: "🇸🇰",
  Hungary: "🇭🇺",
  Greece: "🇬🇷",
  Wales: "🏴󠁧󠁢󠁷󠁬󠁳󠁿",
  "New Caledonia": "🇳🇨",
  Honduras: "🇭🇳",
  "El Salvador": "🇸🇻",
  Iraq: "🇮🇶",
  Kuwait: "🇰🇼",
  Bahrain: "🇧🇭",
  Oman: "🇴🇲",
  "South Sudan": "🇸🇸",
  Mali: "🇲🇱",
  "DR Congo": "🇨🇩",
  Tanzania: "🇹🇿",
  Mozambique: "🇲🇿",
  "Guinea Bissau": "🇬🇼",
  "Equatorial Guinea": "🇬🇶",
};

/**
 * Extract the leading integer from a minute string like "45'" or "90+2'".
 * Used for chronological sorting of goal events.
 */
function getMinuteValue(m: string): number {
  return parseInt(m.match(/\d+/)?.[0] ?? "0");
}

/**
 * Parse the raw "MM/DD/YYYY HH:MM" date format from the FIFA API into ISO 8601.
 * Falls back to current timestamp if the input is malformed.
 * @example parseLocalDate("06/14/2026 20:00") === "2026-06-14T20:00:00.000Z"
 */
export function parseLocalDate(raw: string): string {
  const [datePart, timePart] = raw.split(" ");
  if (!datePart) return new Date().toISOString();
  const [month, day, year] = datePart.split("/");
  return `${year}-${month}-${day}T${timePart ?? "00:00"}:00.000Z`;
}

/**
 * Parse PostgreSQL/JSON set-notation scorer string into an array of scorer names.
 *
 * Input format: `'{"Kylian Mbappé 66'","B. Barcola 82'"}'`
 * Output: `["Kylian Mbappé 66'", "B. Barcola 82'"]`
 *
 * Handles escaped quotes, empty strings, and null inputs gracefully.
 * TEST MOUNTING POINT — test against all observed formats in fixtures.
 */
export function parseScorers(raw: string | null | undefined): string[] {
  if (!raw || raw === "null") return [];

  // Remove outer curly braces
  const stripped = raw.replace(/^\{/, "").replace(/\}$/, "").trim();
  if (!stripped) return [];

  // The format uses double-quoted strings separated by commas:
  // "Name 45'","Name 78'" → split on the boundary between closing and opening quote
  // Handle both escaped and unescaped quotes
  const results: string[] = [];
  let current = "";
  let inQuote = false;

  for (let i = 0; i < stripped.length; i++) {
    const ch = stripped[i];
    if (ch === '"' && !inQuote) {
      inQuote = true;
    } else if (ch === '"' && inQuote) {
      // Check if next char is comma or end — closing quote
      const next = stripped[i + 1];
      if (next === "," || next === undefined) {
        results.push(current.trim());
        current = "";
        inQuote = false;
        i++; // skip the comma
      } else {
        current += ch;
      }
    } else if (inQuote) {
      current += ch;
    }
  }
  if (current.trim()) results.push(current.trim());

  return results.filter(Boolean);
}

/**
 * Parse a single scorer string into a structured GoalEvent.
 *
 * Detects own goals `(OG)`, penalties `(p)`, and extracts the minute.
 * @example parseGoalEvent("Kylian Mbappé 66'", "home")
 *   → { scorer: "Kylian Mbappé", minute: "66'", isOwnGoal: false, isPenalty: false, team: "home" }
 * TEST MOUNTING POINT
 */
export function parseGoalEvent(raw: string, team: "home" | "away"): GoalEvent {
  // OG detection
  const isOwnGoal = /\(OG\)/i.test(raw);
  // Penalty detection
  const isPenalty = /\(p\)/i.test(raw);

  // Strip OG/penalty annotations for cleaner display
  const cleaned = raw.replace(/\s*\(OG\)/i, "").replace(/\s*\(p\)/i, "").trim();

  // Extract minute: last token that looks like "45'", "90+2'"
  const minuteMatch = cleaned.match(/(\d+(?:\+\d+)?)'?\s*$/);
  const minute = minuteMatch ? `${minuteMatch[1]}'` : "";
  const scorer = cleaned.replace(/\s*\d+(?:\+\d+)?'?\s*$/, "").trim();

  return { scorer, minute, isOwnGoal, isPenalty, team };
}

// ---------------------------------------------------------------------------
// Pure helpers: build Team + detect status
// ---------------------------------------------------------------------------

function buildTeam(nameEn: string | undefined, label: string | undefined): Team {
  const name = nameEn ?? label ?? "TBD";
  return {
    code: name.slice(0, 3).toUpperCase(),
    name,
    flag: FLAG_MAP[name] ?? "🏳️",
  };
}

function mapType(type: RawGame["type"]): Stage {
  switch (type) {
    case "group":  return "group";
    case "r32":    return "round_of_32";
    case "r16":    return "round_of_16";
    case "qf":     return "quarter_final";
    case "sf":     return "semi_final";
    case "third":  return "third_place";
    case "final":  return "final";
  }
}

/** TEST MOUNTING POINT — pure, test all finished/time_elapsed combinations */
export function detectStatus(game: RawGame): "live" | "completed" | "scheduled" {
  const elapsed = (game.time_elapsed ?? "").toLowerCase();
  if (game.finished === "TRUE" || elapsed === "finished") return "completed";
  if (elapsed === "notstarted" || elapsed === "") return "scheduled";
  return "live";
}

function parseMinute(elapsed: string | null | undefined): number {
  if (!elapsed) return 1;
  const m = elapsed.match(/^(\d+)(?:\+(\d+))?/);
  if (!m) return 1;
  return parseInt(m[1]) + (m[2] ? parseInt(m[2]) : 0);
}

// ---------------------------------------------------------------------------
// Main transform — raw game → domain Match
// ---------------------------------------------------------------------------

/**
 * Transform a single raw game into a typed domain Match.
 * TEST MOUNTING POINT: pure function — supply fixture RawGame objects.
 */
export function mapGameToMatch(game: RawGame): Match {
  const home = buildTeam(game.home_team_name_en, game.home_team_label);
  const away = buildTeam(game.away_team_name_en, game.away_team_label);
  const stage = mapType(game.type);
  const status = detectStatus(game);
  const kickoff = parseLocalDate(game.local_date);
  const venue = getVenueName(game.stadium_id);
  const stadiumId = game.stadium_id;

  const homeScore =
    !game.home_score || game.home_score === "null"
      ? 0
      : parseInt(game.home_score) || 0;
  const awayScore =
    !game.away_score || game.away_score === "null"
      ? 0
      : parseInt(game.away_score) || 0;

  // Parse goal events from scorer strings
  const homeGoals: GoalEvent[] = parseScorers(game.home_scorers).map((s) =>
    parseGoalEvent(s, "home"),
  );
  const awayGoals: GoalEvent[] = parseScorers(game.away_scorers).map((s) =>
    parseGoalEvent(s, "away"),
  );
  // Sort all goals chronologically by minute integer
  const goals: GoalEvent[] = [...homeGoals, ...awayGoals].sort((a, b) =>
    getMinuteValue(a.minute) - getMinuteValue(b.minute),
  );

  const base = {
    id: `g-${game.id}`,
    stage,
    home,
    away,
    venue,
    stadiumId,
    kickoff,
    homeScore,
    awayScore,
    goals,
  };

  if (status === "live") {
    const minute = parseMinute(game.match_minute ?? game.time_elapsed);
    const lastEvent = goals.length
      ? `${goals[goals.length - 1].scorer} ${goals[goals.length - 1].minute}`
      : undefined;
    return { ...base, status: "live", minute, lastEvent } satisfies LiveMatch;
  }

  if (status === "completed") {
    const penalties =
      game.home_penalty_score && game.home_penalty_score !== "null"
        ? {
            home: parseInt(game.home_penalty_score) || 0,
            away: parseInt(game.away_penalty_score ?? "0") || 0,
          }
        : undefined;
    return { ...base, status: "completed", penalties } satisfies CompletedMatch;
  }

  return { ...base, status: "scheduled" } satisfies ScheduledMatch;
}

// ---------------------------------------------------------------------------
// Public fetch
// ---------------------------------------------------------------------------

let _cachedGames: RawGame[] | null = null;
let _cacheTime = 0;
const CACHE_TTL_MS = 30_000; // 30 seconds

/**
 * Fetch all FIFA 2026 matches. Caches for 30s. Falls back to stale cache on error.
 */
export async function fetchFIFAGames(): Promise<RawGame[]> {
  const now = Date.now();
  if (_cachedGames && now - _cacheTime < CACHE_TTL_MS) return _cachedGames;

  const apiUrl =
    (import.meta.env.VITE_FIFA_API_URL as string | undefined) ??
    "https://worldcup26.ir/get/games";

  try {
    const res = await fetch(apiUrl, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`FIFA API error ${res.status}`);
    const json = (await res.json()) as { games: RawGame[] };
    _cachedGames = json.games;
    _cacheTime = now;
    return _cachedGames;
  } catch (err) {
    console.error("[fifaApi] fetchFIFAGames failed:", err);
    return _cachedGames ?? [];
  }
}

/** Fetch and transform all matches into domain Match objects. */
export async function fetchAllMatches(): Promise<Match[]> {
  const games = await fetchFIFAGames();
  return games.map(mapGameToMatch);
}
