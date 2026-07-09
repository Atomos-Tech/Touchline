/**
 * Tests for src/services/liveApi.ts
 * Coverage: advanceMinute, updateCrowd (pure simulation helpers)
 */
import { describe, it, expect } from "vitest";
import { advanceMinute, updateCrowd } from "@/services/liveApi";
import type { LiveMatch, CrowdMetric } from "@/types/domain";

function makeLiveMatch(overrides: Partial<LiveMatch> = {}): LiveMatch {
  return {
    id: "g-1",
    stage: "semi_final",
    home: { code: "ARG", name: "Argentina", flag: "🇦🇷" },
    away: { code: "FRA", name: "France", flag: "🇫🇷" },
    venue: "MetLife Stadium",
    stadiumId: "1",
    kickoff: new Date().toISOString(),
    status: "live",
    minute: 45,
    homeScore: 1,
    awayScore: 0,
    goals: [],
    ...overrides,
  };
}

function makeCrowd(overrides: Partial<CrowdMetric> = {}): CrowdMetric {
  return {
    timestamp: new Date().toISOString(),
    totalAttendance: 74000,
    ingressPerMin: 45,
    egressPerMin: 120,
    zones: [
      { id: "z1", name: "North", gate: "Gate A", capacityPct: 80, trend: "up" },
      { id: "z2", name: "South", gate: "Gate C", capacityPct: 40, trend: "down" },
    ],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// advanceMinute
// ---------------------------------------------------------------------------

describe("advanceMinute", () => {
  it("increments minute by 1", () => {
    const match = makeLiveMatch({ minute: 45 });
    const result = advanceMinute(match);
    expect(result.minute).toBe(46);
  });

  it("caps at minute 95", () => {
    const match = makeLiveMatch({ minute: 95 });
    const result = advanceMinute(match);
    expect(result.minute).toBe(95);
  });

  it("never decrements score", () => {
    const match = makeLiveMatch({ homeScore: 3, awayScore: 2 });
    // Run many times to catch any random negative path
    for (let i = 0; i < 50; i++) {
      const result = advanceMinute(match);
      expect(result.homeScore).toBeGreaterThanOrEqual(3);
      expect(result.awayScore).toBeGreaterThanOrEqual(2);
    }
  });

  it("preserves other fields", () => {
    const match = makeLiveMatch({ venue: "MetLife Stadium" });
    const result = advanceMinute(match);
    expect(result.venue).toBe("MetLife Stadium");
    expect(result.id).toBe("g-1");
  });

  it("returns a new object (immutable)", () => {
    const match = makeLiveMatch();
    const result = advanceMinute(match);
    expect(result).not.toBe(match);
  });
});

// ---------------------------------------------------------------------------
// updateCrowd
// ---------------------------------------------------------------------------

describe("updateCrowd", () => {
  it("returns a new CrowdMetric object (immutable)", () => {
    const crowd = makeCrowd();
    const result = updateCrowd(crowd);
    expect(result).not.toBe(crowd);
  });

  it("keeps capacity within 15–99 bounds", () => {
    const crowd = makeCrowd();
    // Run many times to verify bounds hold
    for (let i = 0; i < 30; i++) {
      const result = updateCrowd(crowd);
      result.zones.forEach((z) => {
        expect(z.capacityPct).toBeGreaterThanOrEqual(15);
        expect(z.capacityPct).toBeLessThanOrEqual(99);
      });
    }
  });

  it("attendance never exceeds 82000", () => {
    const crowd = makeCrowd({ totalAttendance: 81999 });
    for (let i = 0; i < 20; i++) {
      const result = updateCrowd(crowd);
      expect(result.totalAttendance).toBeLessThanOrEqual(82000);
    }
  });

  it("trend is always 'up', 'down', or 'flat'", () => {
    const crowd = makeCrowd();
    const result = updateCrowd(crowd);
    result.zones.forEach((z) => {
      expect(["up", "down", "flat"]).toContain(z.trend);
    });
  });

  it("preserves zone count", () => {
    const crowd = makeCrowd();
    const result = updateCrowd(crowd);
    expect(result.zones).toHaveLength(crowd.zones.length);
  });

  it("updates timestamp", () => {
    const crowd = makeCrowd({ timestamp: "1970-01-01T00:00:00.000Z" });
    const result = updateCrowd(crowd);
    expect(result.timestamp).not.toBe("1970-01-01T00:00:00.000Z");
  });

  it("ingress and egress are non-negative", () => {
    const crowd = makeCrowd({ ingressPerMin: 0, egressPerMin: 0 });
    for (let i = 0; i < 20; i++) {
      const result = updateCrowd(crowd);
      expect(result.ingressPerMin).toBeGreaterThanOrEqual(0);
      expect(result.egressPerMin).toBeGreaterThanOrEqual(0);
    }
  });
});
