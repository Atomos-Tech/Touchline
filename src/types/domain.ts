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
  | "round_of_32"
  | "round_of_16"
  | "quarter_final"
  | "semi_final"
  | "final"
  | "third_place";

/** A single goal event with scorer name and minute */
export interface GoalEvent {
  scorer: string; // e.g. "Kylian Mbappé"
  minute: string; // e.g. "45'" or "90+2'" or "67'(p)"
  isOwnGoal: boolean;
  isPenalty: boolean;
  team: "home" | "away";
}

export interface BaseMatch {
  id: string;
  stage: Stage;
  home: Team;
  away: Team;
  /** Full venue string: "MetLife Stadium, NJ" */
  venue: string;
  /** Stadium ID — used to look up coordinates and weather */
  stadiumId: string;
  kickoff: string; // ISO
  status: MatchStatus;
  homeScore: number;
  awayScore: number;
  /** All goals scored in this match */
  goals: GoalEvent[];
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
  /** YouTube maxres thumbnail URL */
  thumbnail: string;
}

export interface LiveState {
  matches: Match[];
  crowd: CrowdMetric;
  transit: TransitLine[];
  updatedAt: string;
}
