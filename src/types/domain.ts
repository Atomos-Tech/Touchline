// Domain models for FIFA 2026 NextGen Stadium Hub.
// TEST MOUNTING POINT: unit tests for pure transforms should import these types.

export type Team = {
  code: string; // ISO-like code, e.g. "ARG"
  name: string;
  flag: string; // emoji
};

export type MatchStatus = "scheduled" | "live" | "completed";
export type Stage =
  | "group"
  | "round_of_16"
  | "quarter_final"
  | "semi_final"
  | "final"
  | "third_place";

export interface BaseMatch {
  id: string;
  stage: Stage;
  home: Team;
  away: Team;
  venue: string;
  kickoff: string; // ISO
  status: MatchStatus;
  homeScore: number;
  awayScore: number;
}

export interface LiveMatch extends BaseMatch {
  status: "live";
  minute: number; // 1..90+
  addedTime?: number;
  lastEvent?: string;
}

export interface CompletedMatch extends BaseMatch {
  status: "completed";
  penalties?: { home: number; away: number };
}

export interface ScheduledMatch extends BaseMatch {
  status: "scheduled";
}

export type Match = LiveMatch | CompletedMatch | ScheduledMatch;

export interface StadiumZone {
  id: string;
  name: string;
  capacityPct: number; // 0..100
  trend: "up" | "down" | "flat";
  gate?: string;
}

export interface CrowdMetric {
  timestamp: string;
  totalAttendance: number;
  ingressPerMin: number;
  egressPerMin: number;
  zones: StadiumZone[];
}

export interface TransitLine {
  id: string;
  name: string;
  color: string;
  headwayMin: number;
  status: "normal" | "delayed" | "surge";
}

export interface Prompt {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
}

export interface HighlightVideo {
  id: string;
  title: string;
  channel: string;
  publishedAt: string;
  durationSec: number;
  views: number;
  thumbnail: string; // gradient key
}

export interface LiveState {
  matches: Match[];
  crowd: CrowdMetric;
  transit: TransitLine[];
  updatedAt: string;
}
