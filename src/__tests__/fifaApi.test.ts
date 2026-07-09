/**
 * Tests for src/services/fifaApi.ts
 *
 * All tested functions are pure — no network calls.
 * Coverage: parseLocalDate, parseScorers, parseGoalEvent, detectStatus, mapGameToMatch
 */
import { describe, it, expect } from "vitest";
import {
  parseLocalDate,
  parseScorers,
  parseGoalEvent,
  detectStatus,
  mapGameToMatch,
  type RawGame,
} from "@/services/fifaApi";

// ---------------------------------------------------------------------------
// Fixture builder
// ---------------------------------------------------------------------------

function makeGame(overrides: Partial<RawGame> = {}): RawGame {
  return {
    _id: "abc123",
    id: "101",
    home_team_id: "h1",
    away_team_id: "a1",
    home_score: null,
    away_score: null,
    home_scorers: null,
    away_scorers: null,
    group: "A",
    matchday: "1",
    local_date: "07/04/2026 20:00",
    stadium_id: "1",
    finished: "FALSE",
    time_elapsed: "notstarted",
    type: "group",
    home_team_name_en: "France",
    away_team_name_en: "Argentina",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// parseLocalDate
// ---------------------------------------------------------------------------

describe("parseLocalDate", () => {
  it("converts MM/DD/YYYY HH:MM to ISO 8601", () => {
    const iso = parseLocalDate("07/04/2026 20:00");
    expect(iso).toBe("2026-07-04T20:00:00.000Z");
  });

  it("handles midnight (no time part gracefully)", () => {
    const iso = parseLocalDate("07/04/2026 00:00");
    expect(iso).toContain("2026-07-04");
  });

  it("returns a date string for empty input", () => {
    const iso = parseLocalDate("");
    expect(typeof iso).toBe("string");
  });
});

// ---------------------------------------------------------------------------
// parseScorers
// ---------------------------------------------------------------------------

describe("parseScorers", () => {
  it("returns empty array for null", () => {
    expect(parseScorers(null)).toEqual([]);
  });

  it("returns empty array for 'null' string", () => {
    expect(parseScorers("null")).toEqual([]);
  });

  it("parses single scorer", () => {
    const result = parseScorers('{"Kylian Mbappé 66\'"}');
    expect(result).toHaveLength(1);
    expect(result[0]).toContain("Mbappé");
  });

  it("parses multiple scorers", () => {
    const result = parseScorers('{"Messi 30\'","Di María 75\'"}');
    expect(result).toHaveLength(2);
    expect(result[0]).toContain("Messi");
    expect(result[1]).toContain("Di María");
  });

  it("returns empty for empty braces", () => {
    expect(parseScorers("{}")).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// parseGoalEvent
// ---------------------------------------------------------------------------

describe("parseGoalEvent", () => {
  it("extracts scorer name and minute", () => {
    const event = parseGoalEvent("Kylian Mbappé 66'", "home");
    expect(event.scorer).toBe("Kylian Mbappé");
    expect(event.minute).toBe("66'");
    expect(event.isOwnGoal).toBe(false);
    expect(event.isPenalty).toBe(false);
    expect(event.team).toBe("home");
  });

  it("detects own goal", () => {
    const event = parseGoalEvent("Martinez 45' (OG)", "away");
    expect(event.isOwnGoal).toBe(true);
  });

  it("detects penalty", () => {
    const event = parseGoalEvent("Messi 90' (p)", "home");
    expect(event.isPenalty).toBe(true);
    expect(event.scorer).toBe("Messi");
  });

  it("handles extra time minute", () => {
    const event = parseGoalEvent("Ronaldo 90+3'", "away");
    expect(event.minute).toBe("90+3'");
  });
});

// ---------------------------------------------------------------------------
// detectStatus
// ---------------------------------------------------------------------------

describe("detectStatus", () => {
  it("returns 'scheduled' for notstarted", () => {
    expect(detectStatus(makeGame({ time_elapsed: "notstarted" }))).toBe("scheduled");
  });

  it("returns 'scheduled' for empty time_elapsed", () => {
    expect(detectStatus(makeGame({ time_elapsed: "" }))).toBe("scheduled");
  });

  it("returns 'completed' when finished=TRUE", () => {
    expect(detectStatus(makeGame({ finished: "TRUE" }))).toBe("completed");
  });

  it("returns 'completed' when time_elapsed=finished", () => {
    expect(detectStatus(makeGame({ time_elapsed: "finished", finished: "FALSE" }))).toBe("completed");
  });

  it("returns 'live' for a minute value", () => {
    expect(detectStatus(makeGame({ time_elapsed: "45'", finished: "FALSE" }))).toBe("live");
  });

  it("returns 'live' for HT", () => {
    expect(detectStatus(makeGame({ time_elapsed: "HT", finished: "FALSE" }))).toBe("live");
  });
});

// ---------------------------------------------------------------------------
// mapGameToMatch
// ---------------------------------------------------------------------------

describe("mapGameToMatch", () => {
  it("creates a ScheduledMatch from an unstarted game", () => {
    const match = mapGameToMatch(makeGame());
    expect(match.status).toBe("scheduled");
    expect(match.home.name).toBe("France");
    expect(match.away.name).toBe("Argentina");
    expect(match.stage).toBe("group");
    expect(match.id).toBe("g-101");
  });

  it("creates a LiveMatch with minute field", () => {
    const match = mapGameToMatch(makeGame({ time_elapsed: "67'", finished: "FALSE", match_minute: "67'" }));
    expect(match.status).toBe("live");
    if (match.status === "live") expect(match.minute).toBe(67);
  });

  it("creates a CompletedMatch with scores", () => {
    const match = mapGameToMatch(makeGame({
      finished: "TRUE",
      time_elapsed: "finished",
      home_score: "2",
      away_score: "1",
    }));
    expect(match.status).toBe("completed");
    expect(match.homeScore).toBe(2);
    expect(match.awayScore).toBe(1);
  });

  it("handles penalty shootout data", () => {
    const match = mapGameToMatch(makeGame({
      finished: "TRUE",
      time_elapsed: "finished",
      home_score: "1",
      away_score: "1",
      home_penalty_score: "4",
      away_penalty_score: "3",
    }));
    if (match.status === "completed") {
      expect(match.penalties).toEqual({ home: 4, away: 3 });
    }
  });

  it("uses flag from FLAG_MAP for known teams", () => {
    const match = mapGameToMatch(makeGame({ home_team_name_en: "France" }));
    expect(match.home.flag).toBe("🇫🇷");
  });

  it("falls back to 🏳️ for unknown team", () => {
    const match = mapGameToMatch(makeGame({ home_team_name_en: "Unknown FC" }));
    expect(match.home.flag).toBe("🏳️");
  });

  it("generates goals array from scorer strings", () => {
    const match = mapGameToMatch(makeGame({
      finished: "TRUE",
      time_elapsed: "finished",
      home_score: "2",
      away_score: "0",
      home_scorers: '{"Messi 30\'","Di María 75\'"}',
      away_scorers: null,
    }));
    expect(match.goals).toHaveLength(2);
  });
});
