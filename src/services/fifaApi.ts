/**
 * FIFA World Cup 2026 Game Data Service
 * Source: https://worldcup26.ir/get/games
 *
 * Fetches the complete tournament dataset (104 matches across group, r32,
 * r16, qf, sf, third, and final stages). Transforms raw API shapes into
 * the application's domain types.
 *
 * TEST MOUNTING POINT: pure transform functions (mapGameToMatch, parseParsedScore,
 * detectStatus) can be unit-tested against fixture JSON.
 */

import type {
  Match,
  LiveMatch,
  CompletedMatch,
  ScheduledMatch,
  Team,
  Stage,
} from "@/types/domain";

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
  time_elapsed: string; // "finished" | "notstarted" | "1'" | "45+2'" …
  type: "group" | "r32" | "r16" | "qf" | "sf" | "third" | "final";
  home_team_name_en?: string;
  away_team_name_en?: string;
  home_team_label?: string;
  away_team_label?: string;
  match_minute?: string | null;
  home_penalty_score?: string | null;
  away_penalty_score?: string | null;
  home_penalty_scorers?: string | null;
  away_penalty_scorers?: string | null;
}

// ---------------------------------------------------------------------------
// Stadium name map (stadium_id → venue string)
// ---------------------------------------------------------------------------

const STADIUM_MAP: Record<string, string> = {
  "1": "MetLife Stadium, NJ",
  "2": "SoFi Stadium, LA",
  "3": "AT&T Stadium, Dallas",
  "4": "Estadio Azteca, Mexico City",
  "5": "BMO Field, Toronto",
  "6": "Mercedes-Benz Stadium, Atlanta",
  "7": "Levi's Stadium, San Jose",
  "8": "Rose Bowl, Pasadena",
  "9": "Gillette Stadium, Boston",
  "10": "Hard Rock Stadium, Miami",
  "11": "Arrowhead Stadium, Kansas City",
  "12": "BC Place, Vancouver",
  "13": "Allegiant Stadium, Las Vegas",
  "14": "NRG Stadium, Houston",
  "15": "Lincoln Financial Field, Philadelphia",
  "16": "Q2 Stadium, Austin",
};

// Country flag emoji map (ISO codes)
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
};

/** Parse "MM/DD/YYYY HH:MM" → ISO 8601 string */
export function parseLocalDate(raw: string): string {
  // raw format: "07/04/2026 17:00"
  const [datePart, timePart] = raw.split(" ");
  if (!datePart) return new Date().toISOString();
  const [month, day, year] = datePart.split("/");
  return `${year}-${month}-${day}T${timePart ?? "00:00"}:00.000Z`;
}

/** Build a Team from raw game data */
function buildTeam(nameEn: string | undefined, label: string | undefined): Team {
  const name = nameEn ?? label ?? "TBD";
  return {
    code: name.substring(0, 3).toUpperCase(),
    name,
    flag: FLAG_MAP[name] ?? "🏳️",
  };
}

/** Map raw API type to domain Stage */
function mapType(type: RawGame["type"]): Stage {
  switch (type) {
    case "group": return "group";
    case "r32": return "round_of_32";
    case "r16": return "round_of_16";
    case "qf": return "quarter_final";
    case "sf": return "semi_final";
    case "third": return "third_place";
    case "final": return "final";
  }
}

/** Detect match status from raw fields */
function detectStatus(game: RawGame): "live" | "completed" | "scheduled" {
  const elapsed = game.time_elapsed?.toLowerCase() ?? "";
  if (game.finished === "TRUE" || elapsed === "finished") return "completed";
  if (elapsed === "notstarted" || elapsed === "") return "scheduled";
  return "live"; // anything else (e.g. "45'" "HT") means live
}

/** Parse a live minute from time_elapsed (e.g. "45+2'" → 47) */
function parseMinute(elapsed: string | null | undefined): number {
  if (!elapsed) return 1;
  const match = elapsed.match(/^(\d+)(?:\+(\d+))?/);
  if (!match) return 1;
  return parseInt(match[1]) + (match[2] ? parseInt(match[2]) : 0);
}

/** Transform a single raw game into a domain Match */
export function mapGameToMatch(game: RawGame): Match {
  const home = buildTeam(game.home_team_name_en, game.home_team_label);
  const away = buildTeam(game.away_team_name_en, game.away_team_label);
  const stage = mapType(game.type);
  const status = detectStatus(game);
  const kickoff = parseLocalDate(game.local_date);
  const venue = STADIUM_MAP[game.stadium_id] ?? "FIFA 2026 Venue";
  const homeScore = game.home_score === "null" || game.home_score == null
    ? 0
    : parseInt(game.home_score) || 0;
  const awayScore = game.away_score === "null" || game.away_score == null
    ? 0
    : parseInt(game.away_score) || 0;

  const base = { id: `g-${game.id}`, stage, home, away, venue, kickoff, homeScore, awayScore };

  if (status === "live") {
    const minute = parseMinute(game.match_minute ?? game.time_elapsed);
    // Build last event from scorers
    const scorers = [game.home_scorers, game.away_scorers]
      .filter(s => s && s !== "null")
      .join(" · ");
    return {
      ...base,
      status: "live",
      minute,
      lastEvent: scorers || undefined,
    } satisfies LiveMatch;
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
// Public fetch function
// ---------------------------------------------------------------------------

/** Cached raw games to avoid redundant network calls within the same session. */
let _cachedGames: RawGame[] | null = null;
let _cacheTime = 0;
const CACHE_TTL_MS = 30_000; // 30 seconds

/**
 * Fetch all 104 FIFA 2026 matches from worldcup26.ir.
 * Caches results for 30s. Falls back to empty array on network error.
 */
export async function fetchFIFAGames(): Promise<RawGame[]> {
  const now = Date.now();
  if (_cachedGames && now - _cacheTime < CACHE_TTL_MS) return _cachedGames;

  const apiUrl = (import.meta.env.VITE_FIFA_API_URL as string | undefined)
    ?? "https://worldcup26.ir/get/games";

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
