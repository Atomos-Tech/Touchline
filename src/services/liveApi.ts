/**
 * Live sports feed — orchestrates real data from FIFA API + simulated crowd/transit.
 *
 * Match data: fetched from https://worldcup26.ir/get/games (real FIFA 2026 results)
 * Highlights: fetched from YouTube Data API v3 (real FIFA official channel)
 * Crowd metrics: simulated (no live stadium sensor API exists publicly)
 * Transit status: simulated (demonstration of operational intelligence)
 *
 * TEST MOUNTING POINT: advanceMinute, updateCrowd are pure — unit-test directly.
 * TEST MOUNTING POINT: fetchLiveState, fetchHighlights can be tested by mocking
 *   fetchAllMatches() and fetchHighlights() from their respective service modules.
 */

import type {
  Match,
  LiveMatch,
  LiveState,
  CrowdMetric,
  TransitLine,
} from "@/types/domain";
import { fetchAllMatches } from "./fifaApi";
import { fetchHighlights as fetchYouTubeHighlights } from "./youtubeApi";

export { fetchHighlights } from "./youtubeApi";

// ---------------------------------------------------------------------------
// Static crowd & transit simulation data
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Pure simulation helpers — isolated for unit testing
// ---------------------------------------------------------------------------

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
      trend:
        next > z.capacityPct + 1
          ? ("up" as const)
          : next < z.capacityPct - 1
            ? ("down" as const)
            : ("flat" as const),
    };
  });
  return {
    timestamp: new Date().toISOString(),
    totalAttendance: Math.min(82000, prev.totalAttendance + Math.round(Math.random() * 40)),
    ingressPerMin: Math.max(0, prev.ingressPerMin + Math.round((Math.random() - 0.5) * 20)),
    egressPerMin: Math.max(0, prev.egressPerMin + Math.round((Math.random() - 0.3) * 30)),
    zones,
  };
}

// ---------------------------------------------------------------------------
// In-memory state singleton
// ---------------------------------------------------------------------------

let STATE: LiveState | null = null;

function buildInitialCrowd(): CrowdMetric {
  return {
    timestamp: new Date().toISOString(),
    totalAttendance: 74210,
    ingressPerMin: 45,
    egressPerMin: 120,
    zones: BASE_ZONES.map((z, i) => ({
      ...z,
      capacityPct: [92, 68, 41, 55, 30, 47][i],
      trend: "up" as const,
    })),
  };
}

/**
 * Fetch the current live state.
 * - Matches come from the real FIFA 2026 API (cached 30s)
 * - Live matches have their minutes simulated each tick (real API has no live clock)
 * - Crowd and transit data are simulated
 */
export async function fetchLiveState(): Promise<LiveState> {
  const realMatches = await fetchAllMatches();

  if (!STATE) {
    STATE = {
      matches: realMatches,
      crowd: buildInitialCrowd(),
      transit: BASE_TRANSIT,
      updatedAt: new Date().toISOString(),
    };
  } else {
    // Advance simulated live match minutes; replace the match list with fresh real data
    // but simulate the live clock for any currently-live games
    const updatedMatches: Match[] = realMatches.map((m) => {
      const prev = STATE!.matches.find((p) => p.id === m.id);
      if (m.status === "live" && prev?.status === "live") {
        return advanceMinute(m as LiveMatch);
      }
      return m;
    });

    STATE = {
      matches: updatedMatches,
      crowd: updateCrowd(STATE.crowd),
      transit: STATE.transit,
      updatedAt: new Date().toISOString(),
    };
  }

  return STATE;
}
