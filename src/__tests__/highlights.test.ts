/**
 * Tests for highlights.tsx utility functions
 * Coverage: fmtDuration, fmtViews, fmtRelative
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { fmtDuration, fmtViews, fmtRelative } from "@/routes/highlights";

describe("fmtDuration", () => {
  it("formats seconds under a minute", () => {
    expect(fmtDuration(45)).toBe("0:45");
  });

  it("formats exactly 1 minute", () => {
    expect(fmtDuration(60)).toBe("1:00");
  });

  it("formats 3:30", () => {
    expect(fmtDuration(210)).toBe("3:30");
  });

  it("pads seconds with leading zero", () => {
    expect(fmtDuration(65)).toBe("1:05");
  });

  it("handles 0 seconds", () => {
    expect(fmtDuration(0)).toBe("0:00");
  });

  it("formats long highlights (10:00+)", () => {
    expect(fmtDuration(650)).toBe("10:50");
  });
});

describe("fmtViews", () => {
  it("formats views under 1000 as plain number", () => {
    expect(fmtViews(999)).toBe("999");
  });

  it("formats thousands as K", () => {
    expect(fmtViews(890000)).toBe("890K");
  });

  it("formats millions as M with 1 decimal", () => {
    expect(fmtViews(1_250_000)).toBe("1.3M");
  });

  it("formats exactly 1M", () => {
    expect(fmtViews(1_000_000)).toBe("1.0M");
  });

  it("formats 0 as '0'", () => {
    expect(fmtViews(0)).toBe("0");
  });
});

describe("fmtRelative", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns 'Just now' for < 30 minutes ago", () => {
    // fmtRelative uses Math.round(ms/3600000) — 20min = 0.33h → rounds to 0 → 'Just now'
    const twentyMinAgo = new Date(Date.now() - 20 * 60000).toISOString();
    expect(fmtRelative(twentyMinAgo)).toBe("Just now");
  });

  it("returns Nh ago for hours within today", () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 3600000).toISOString();
    expect(fmtRelative(threeHoursAgo)).toBe("3h ago");
  });

  it("returns Nd ago for days", () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 3600000).toISOString();
    expect(fmtRelative(twoDaysAgo)).toBe("2d ago");
  });
});
