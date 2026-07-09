/**
 * Tests for operations.tsx recommend() function
 * Coverage: all severity branches — critical, warn, info
 */
import { describe, it, expect } from "vitest";
import { recommend } from "@/routes/operations";
import type { LiveState } from "@/types/domain";

function makeOpsState(overrides: Partial<LiveState> = {}): LiveState {
  return {
    matches: [],
    crowd: {
      timestamp: new Date().toISOString(),
      totalAttendance: 74000,
      ingressPerMin: 45,
      egressPerMin: 120,
      zones: [
        { id: "z1", name: "North Concourse", gate: "Gate A", capacityPct: 70, trend: "up" },
        { id: "z2", name: "East Concourse", gate: "Gate B", capacityPct: 68, trend: "flat" },
        { id: "z3", name: "South Concourse", gate: "Gate C", capacityPct: 40, trend: "down" },
        { id: "z4", name: "West Concourse", gate: "Gate D", capacityPct: 55, trend: "flat" },
      ],
    },
    transit: [
      { id: "blue", name: "Blue Line Metro", color: "#2563eb", headwayMin: 3, status: "normal" },
      { id: "red", name: "Red Line Metro", color: "#dc2626", headwayMin: 6, status: "normal" },
    ],
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("recommend()", () => {
  it("returns 'ok' info when all zones are below 85%", () => {
    const recs = recommend(makeOpsState());
    expect(recs).toHaveLength(1);
    expect(recs[0].severity).toBe("info");
    expect(recs[0].id).toBe("ok");
  });

  it("returns 'critical' surge alert when a zone hits 85%+", () => {
    const state = makeOpsState();
    state.crowd.zones[0].capacityPct = 92;
    const recs = recommend(state);
    const surge = recs.find((r) => r.id === "surge");
    expect(surge).toBeDefined();
    expect(surge?.severity).toBe("critical");
    expect(surge?.title).toMatch(/North Concourse/);
  });

  it("surge recommendation mentions the quietest zone for redirection", () => {
    const state = makeOpsState();
    state.crowd.zones[0].capacityPct = 90;
    const recs = recommend(state);
    const surge = recs.find((r) => r.id === "surge");
    expect(surge?.detail).toMatch(/South Concourse/);
  });

  it("returns 'warn' egress recommendation when live match is in minute 80+", () => {
    const state = makeOpsState({
      matches: [
        {
          id: "g-1",
          stage: "final",
          home: { code: "ARG", name: "Argentina", flag: "🇦🇷" },
          away: { code: "FRA", name: "France", flag: "🇫🇷" },
          venue: "MetLife",
          stadiumId: "1",
          kickoff: new Date().toISOString(),
          status: "live",
          minute: 85,
          homeScore: 1,
          awayScore: 0,
          goals: [],
        } as LiveState["matches"][0],
      ],
    });
    const recs = recommend(state);
    const egress = recs.find((r) => r.id === "egress");
    expect(egress).toBeDefined();
    expect(egress?.severity).toBe("warn");
    expect(egress?.detail).toMatch(/85/);
  });

  it("no egress warning if match is in minute 79", () => {
    const state = makeOpsState({
      matches: [
        {
          id: "g-1",
          stage: "final",
          home: { code: "ARG", name: "Argentina", flag: "🇦🇷" },
          away: { code: "FRA", name: "France", flag: "🇫🇷" },
          venue: "MetLife",
          stadiumId: "1",
          kickoff: new Date().toISOString(),
          status: "live",
          minute: 79,
          homeScore: 1,
          awayScore: 0,
          goals: [],
        } as LiveState["matches"][0],
      ],
    });
    const recs = recommend(state);
    const egress = recs.find((r) => r.id === "egress");
    expect(egress).toBeUndefined();
  });

  it("returns 'warn' transit disruption when a transit line is delayed", () => {
    const state = makeOpsState({
      transit: [
        { id: "blue", name: "Blue Line Metro", color: "#2563eb", headwayMin: 3, status: "normal" },
        { id: "red", name: "Red Line Metro", color: "#dc2626", headwayMin: 6, status: "delayed" },
      ],
    });
    const recs = recommend(state);
    const transit = recs.find((r) => r.id === "transit");
    expect(transit).toBeDefined();
    expect(transit?.severity).toBe("warn");
    expect(transit?.detail).toMatch(/Red Line|delay/i);
  });

  it("can return multiple recommendations simultaneously", () => {
    const state = makeOpsState({
      matches: [
        {
          id: "g-1",
          stage: "final",
          home: { code: "ARG", name: "Argentina", flag: "🇦🇷" },
          away: { code: "FRA", name: "France", flag: "🇫🇷" },
          venue: "MetLife",
          stadiumId: "1",
          kickoff: new Date().toISOString(),
          status: "live",
          minute: 88,
          homeScore: 1,
          awayScore: 0,
          goals: [],
        } as LiveState["matches"][0],
      ],
      transit: [
        { id: "red", name: "Red Line", color: "#dc2626", headwayMin: 6, status: "delayed" },
        { id: "blue", name: "Blue Line", color: "#2563eb", headwayMin: 3, status: "surge" },
      ],
    });
    state.crowd.zones[0].capacityPct = 91;
    const recs = recommend(state);
    expect(recs.length).toBeGreaterThanOrEqual(2);
    expect(recs.some((r) => r.id === "egress")).toBe(true);
    expect(recs.some((r) => r.id === "transit")).toBe(true);
  });
});
