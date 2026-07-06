// Simulated live sports API. Pure functions + a small in-memory stream.
// TEST MOUNTING POINT: unit-test advanceMinute, buildBracket, updateCrowd.

import type {
  Match,
  LiveState,
  Team,
  CompletedMatch,
  LiveMatch,
  ScheduledMatch,
  CrowdMetric,
  TransitLine,
  HighlightVideo,
  Stage,
} from "@/types/domain";

const T = (code: string, name: string, flag: string): Team => ({ code, name, flag });

const TEAMS = {
  ARG: T("ARG", "Argentina", "🇦🇷"),
  BRA: T("BRA", "Brazil", "🇧🇷"),
  FRA: T("FRA", "France", "🇫🇷"),
  ENG: T("ENG", "England", "🏴󠁧󠁢󠁥󠁮󠁧󠁿"),
  ESP: T("ESP", "Spain", "🇪🇸"),
  GER: T("GER", "Germany", "🇩🇪"),
  POR: T("POR", "Portugal", "🇵🇹"),
  NED: T("NED", "Netherlands", "🇳🇱"),
  USA: T("USA", "USA", "🇺🇸"),
  MEX: T("MEX", "Mexico", "🇲🇽"),
  CAN: T("CAN", "Canada", "🇨🇦"),
  JPN: T("JPN", "Japan", "🇯🇵"),
  KOR: T("KOR", "South Korea", "🇰🇷"),
  MAR: T("MAR", "Morocco", "🇲🇦"),
  CRO: T("CRO", "Croatia", "🇭🇷"),
  BEL: T("BEL", "Belgium", "🇧🇪"),
} as const;

const iso = (offsetMin: number) =>
  new Date(Date.now() + offsetMin * 60_000).toISOString();

// --- Static base fixtures (Round of 16 + a few completed group results) ---
const R16: Array<[keyof typeof TEAMS, keyof typeof TEAMS]> = [
  ["ARG", "MEX"],
  ["FRA", "KOR"],
  ["ESP", "JPN"],
  ["BRA", "CAN"],
  ["ENG", "MAR"],
  ["GER", "USA"],
  ["POR", "BEL"],
  ["NED", "CRO"],
];

const VENUES = [
  "MetLife Stadium, NJ",
  "SoFi Stadium, LA",
  "AT&T Stadium, Dallas",
  "Estadio Azteca, Mexico City",
  "BMO Field, Toronto",
  "Mercedes-Benz Stadium, Atlanta",
];

function buildInitialMatches(): Match[] {
  const matches: Match[] = [];

  // Two live R16, three scheduled R16, three completed R16
  R16.forEach(([h, a], idx) => {
    const base = {
      id: `r16-${idx}`,
      stage: "round_of_16" as Stage,
      home: TEAMS[h],
      away: TEAMS[a],
      venue: VENUES[idx % VENUES.length],
    };
    if (idx < 2) {
      matches.push({
        ...base,
        kickoff: iso(-85 + idx * 3),
        status: "live",
        minute: 78 + idx * 5,
        homeScore: idx === 0 ? 2 : 1,
        awayScore: idx === 0 ? 1 : 1,
        lastEvent: idx === 0 ? "Goal! 78' Messi" : "Yellow card 82'",
      } satisfies LiveMatch);
    } else if (idx < 5) {
      matches.push({
        ...base,
        kickoff: iso(60 + idx * 120),
        status: "scheduled",
        homeScore: 0,
        awayScore: 0,
      } satisfies ScheduledMatch);
    } else {
      matches.push({
        ...base,
        kickoff: iso(-60 * 24 * (idx - 4)),
        status: "completed",
        homeScore: 3,
        awayScore: 1,
      } satisfies CompletedMatch);
    }
  });

  // A handful of archived group stage completed matches
  const groupPairs: Array<[keyof typeof TEAMS, keyof typeof TEAMS, number, number]> = [
    ["ARG", "USA", 2, 0],
    ["FRA", "CAN", 3, 1],
    ["ESP", "GER", 1, 1],
    ["BRA", "JPN", 2, 2],
  ];
  groupPairs.forEach(([h, a, hs, as_], idx) => {
    matches.push({
      id: `grp-${idx}`,
      stage: "group",
      home: TEAMS[h],
      away: TEAMS[a],
      venue: VENUES[idx % VENUES.length],
      kickoff: iso(-60 * 24 * (idx + 6)),
      status: "completed",
      homeScore: hs,
      awayScore: as_,
    });
  });

  return matches;
}

const BASE_ZONES = [
  { id: "z1", name: "North Concourse", gate: "Gate A" },
  { id: "z2", name: "East Concourse", gate: "Gate B" },
  { id: "z3", name: "South Concourse", gate: "Gate C" },
  { id: "z4", name: "West Concourse", gate: "Gate D" },
  { id: "z5", name: "VIP Lounge", gate: "Gate V" },
  { id: "z6", name: "Family Zone", gate: "Gate F" },
];

const BASE_TRANSIT: TransitLine[] = [
  { id: "blue", name: "Blue Line Metro", color: "#2563eb", headwayMin: 3, status: "normal" },
  { id: "red", name: "Red Line Metro", color: "#dc2626", headwayMin: 6, status: "delayed" },
  { id: "shuttle", name: "Stadium Shuttle", color: "#16a34a", headwayMin: 4, status: "normal" },
];

/** Pure: advance a live match by one simulated minute. */
export function advanceMinute(m: LiveMatch): LiveMatch {
  const goal = Math.random() < 0.04;
  return {
    ...m,
    minute: Math.min(95, m.minute + 1),
    homeScore: goal && Math.random() < 0.5 ? m.homeScore + 1 : m.homeScore,
    awayScore: goal && Math.random() >= 0.5 ? m.awayScore + 1 : m.awayScore,
    lastEvent: goal ? `Goal! ${m.minute}'` : m.lastEvent,
  };
}

/** Pure: update crowd metric with drift + trend. */
export function updateCrowd(prev: CrowdMetric): CrowdMetric {
  const zones = prev.zones.map((z) => {
    const delta = (Math.random() - 0.4) * 6;
    const next = Math.max(15, Math.min(99, z.capacityPct + delta));
    return {
      ...z,
      capacityPct: Math.round(next),
      trend: next > z.capacityPct + 1 ? "up" : next < z.capacityPct - 1 ? "down" : "flat",
    } as const;
  });
  return {
    timestamp: new Date().toISOString(),
    totalAttendance: Math.min(82000, prev.totalAttendance + Math.round(Math.random() * 40)),
    ingressPerMin: Math.max(0, prev.ingressPerMin + Math.round((Math.random() - 0.5) * 20)),
    egressPerMin: Math.max(0, prev.egressPerMin + Math.round((Math.random() - 0.3) * 30)),
    zones,
  };
}

// --- In-memory singleton stream ---
let STATE: LiveState = {
  matches: buildInitialMatches(),
  crowd: {
    timestamp: new Date().toISOString(),
    totalAttendance: 74210,
    ingressPerMin: 45,
    egressPerMin: 120,
    zones: BASE_ZONES.map((z, i) => ({
      ...z,
      capacityPct: [92, 68, 41, 55, 30, 47][i],
      trend: "up" as const,
    })),
  },
  transit: BASE_TRANSIT,
  updatedAt: new Date().toISOString(),
};

function tick(): LiveState {
  STATE = {
    ...STATE,
    matches: STATE.matches.map((m) =>
      m.status === "live" ? advanceMinute(m as LiveMatch) : m,
    ),
    crowd: updateCrowd(STATE.crowd),
    updatedAt: new Date().toISOString(),
  };
  return STATE;
}

/** Simulated fetch. Returns a fresh live snapshot. */
export async function fetchLiveState(): Promise<LiveState> {
  await new Promise((r) => setTimeout(r, 120));
  return tick();
}

/** Simulated YouTube Data API v3 response. */
export async function fetchHighlights(): Promise<HighlightVideo[]> {
  await new Promise((r) => setTimeout(r, 200));
  const seeds = [
    ["Argentina 2-1 Mexico | Extended Highlights | R16", "FIFA", 480, 2_140_000, "g1"],
    ["France vs Korea | All Goals | Round of 16", "FIFA", 512, 1_680_000, "g2"],
    ["Top 10 Saves of the Group Stage", "FIFA", 420, 3_920_000, "g3"],
    ["Brazil 3-1 Canada | Highlights", "FIFA", 495, 2_010_000, "g4"],
    ["Every Goal from Matchday 12", "FIFA", 610, 890_000, "g5"],
    ["Spain vs Japan | Full Match Recap", "FIFA", 545, 1_240_000, "g6"],
  ] as const;
  return seeds.map(([title, channel, dur, views, key], i) => ({
    id: `yt-${i}`,
    title: String(title),
    channel: String(channel),
    publishedAt: iso(-60 * (i + 1) * 4),
    durationSec: Number(dur),
    views: Number(views),
    thumbnail: String(key),
  }));
}
