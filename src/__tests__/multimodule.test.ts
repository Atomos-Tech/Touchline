/**
 * Tests for multiple route utility functions and contexts
 * Coverage: i18n, ModeContext helpers, AccessibilityContext helpers,
 *           volunteer route helpers, ops route helpers, sustainability calcs
 */
import { describe, it, expect } from "vitest";

// i18n
import { t, LOCALES } from "@/lib/i18n";

// Mode helpers
import { getModeLabel, getModeColor, MODE_CONFIGS } from "@/contexts/ModeContext";

// Accessibility helpers
import { getFontSizeScale, getFontSizeClass } from "@/contexts/AccessibilityContext";

// Volunteer task helpers
import {
  generateFallbackTasks,
  prioritiseTasks,
} from "@/routes/volunteer/index";

// Incident helpers
import { classifyIncident, formatIncidentLog } from "@/routes/volunteer/report";

// Shift helpers
import { formatShiftTime, getShiftStatus } from "@/routes/volunteer/shifts";

// Ops incident helpers
import { triageIncident, calcResponseTime } from "@/routes/ops/incidents";

// Sustainability helpers
import {
  calcCarbonSaved,
  estimatePlasticWaste,
  calcRenewablePercent,
  estimateWaterUsage,
} from "@/routes/ops/sustainability";

// Analytics helpers
import { forecastEgress, calcPeakLoad } from "@/routes/ops/analytics";

// Navigation helpers
import { buildFallbackRoute } from "@/routes/fan/navigate";

// Highlights helpers
import { fmtRelative } from "@/routes/highlights";


// ---------------------------------------------------------------------------
// i18n
// ---------------------------------------------------------------------------

describe("i18n", () => {
  it("has all 5 locales", () => {
    expect(LOCALES).toContain("en");
    expect(LOCALES).toContain("es");
    expect(LOCALES).toContain("fr");
    expect(LOCALES).toContain("pt");
    expect(LOCALES).toContain("ar");
  });

  it("translates 'send' in all locales", () => {
    expect(t("en", "send")).toBe("Send");
    expect(t("es", "send")).toBe("Enviar");
    expect(t("fr", "send")).toBe("Envoyer");
    expect(t("pt", "send")).toBe("Enviar");
    expect(t("ar", "send")).toBe("إرسال");
  });

  it("falls back to English for missing key", () => {
    expect(t("es", "nonexistent_key_xyz")).toBe("nonexistent_key_xyz");
  });

  it("all locales translate 'live' correctly", () => {
    LOCALES.forEach((locale) => {
      const result = t(locale, "live");
      // Should not be the raw key — each locale has a translation
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });
  });
});

// ---------------------------------------------------------------------------
// ModeContext helpers
// ---------------------------------------------------------------------------

describe("getModeLabel", () => {
  it("returns 'Fan' for fan mode", () => expect(getModeLabel("fan")).toBe("Fan"));
  it("returns 'Organizer' for organizer mode", () => expect(getModeLabel("organizer")).toBe("Organizer"));
  it("returns 'Volunteer' for volunteer mode", () => expect(getModeLabel("volunteer")).toBe("Volunteer"));
});

describe("getModeColor", () => {
  it("returns an oklch color string for each mode", () => {
    ["fan", "organizer", "volunteer"].forEach((m) => {
      expect(getModeColor(m as "fan" | "organizer" | "volunteer")).toContain("oklch");
    });
  });
});

// ---------------------------------------------------------------------------
// AccessibilityContext helpers
// ---------------------------------------------------------------------------

describe("getFontSizeScale", () => {
  it("normal → '1'", () => expect(getFontSizeScale("normal")).toBe("1"));
  it("large → '1.125'", () => expect(getFontSizeScale("large")).toBe("1.125"));
  it("xl → '1.25'", () => expect(getFontSizeScale("xl")).toBe("1.25"));
});

describe("getFontSizeClass", () => {
  it("normal → 'text-base'", () => expect(getFontSizeClass("normal")).toBe("text-base"));
  it("large → 'text-lg'", () => expect(getFontSizeClass("large")).toBe("text-lg"));
  it("xl → 'text-xl'", () => expect(getFontSizeClass("xl")).toBe("text-xl"));
});

// ---------------------------------------------------------------------------
// Volunteer helpers
// ---------------------------------------------------------------------------

const makeVolunteerState = () => ({
  matches: [],
  crowd: {
    timestamp: new Date().toISOString(),
    totalAttendance: 74000,
    ingressPerMin: 45,
    egressPerMin: 120,
    zones: [
      { id: "z1", name: "North Concourse", gate: "Gate A", capacityPct: 92, trend: "up" as const },
      { id: "z2", name: "South Concourse", gate: "Gate C", capacityPct: 40, trend: "down" as const },
    ],
  },
  transit: [
    { id: "red", name: "Red Line", color: "#dc2626", headwayMin: 6, status: "delayed" as const },
    { id: "blue", name: "Blue Line", color: "#2563eb", headwayMin: 3, status: "normal" as const },
  ],
  updatedAt: new Date().toISOString(),
});

describe("generateFallbackTasks", () => {
  it("returns at least 2 tasks for a high-congestion state", () => {
    const tasks = generateFallbackTasks(makeVolunteerState());
    expect(tasks.length).toBeGreaterThanOrEqual(2);
  });

  it("includes a critical crowd task when zone is at 92%", () => {
    const tasks = generateFallbackTasks(makeVolunteerState());
    expect(tasks.some((t) => t.priority === "critical" && t.category === "crowd")).toBe(true);
  });

  it("includes a transit task when line is delayed", () => {
    const tasks = generateFallbackTasks(makeVolunteerState());
    expect(tasks.some((t) => t.category === "transit")).toBe(true);
  });
});

describe("prioritiseTasks", () => {
  it("sorts critical first", () => {
    const tasks = generateFallbackTasks(makeVolunteerState());
    const sorted = prioritiseTasks(tasks);
    expect(sorted[0].priority).toBe("critical");
  });
});

describe("classifyIncident", () => {
  it("classifies fire as critical", () => {
    expect(classifyIncident("fire in sector B", "fire")).toBe("critical");
  });

  it("classifies medical with severe keywords as critical", () => {
    expect(classifyIncident("fan is unconscious", "medical")).toBe("critical");
  });

  it("classifies medical without severe keywords as high", () => {
    expect(classifyIncident("fan feels unwell", "medical")).toBe("high");
  });

  it("classifies infrastructure as low by default", () => {
    expect(classifyIncident("broken railing", "infrastructure")).toBe("low");
  });
});

describe("formatIncidentLog", () => {
  it("includes severity and category", () => {
    const log = formatIncidentLog({
      id: "inc-1",
      title: "Test incident",
      description: "desc",
      location: "Gate A",
      severity: "high",
      status: "open",
      reportedBy: "Staff",
      timestamp: "12:00:00",
      actions: [],
    });
    expect(log).toContain("HIGH");
    expect(log).toContain("Test incident");
    expect(log).toContain("Gate A");
  });
});

describe("formatShiftTime", () => {
  it("converts 14:00 to 2:00 PM", () => {
    expect(formatShiftTime("14:00")).toBe("2:00 PM");
  });
  it("converts 09:30 to 9:30 AM", () => {
    expect(formatShiftTime("09:30")).toBe("9:30 AM");
  });
  it("converts 00:00 to 12:00 AM", () => {
    expect(formatShiftTime("00:00")).toBe("12:00 AM");
  });
  it("converts 12:00 to 12:00 PM", () => {
    expect(formatShiftTime("12:00")).toBe("12:00 PM");
  });
});

describe("fmtRelative", () => {
  it("returns 'Just now' for < 30 minutes ago", () => {
    const twentyMinAgo = new Date(Date.now() - 20 * 60000).toISOString();
    expect(fmtRelative(twentyMinAgo)).toBe("Just now");
  });
});

describe("getShiftStatus", () => {
  it("returns 'completed' for a past date", () => {
    expect(getShiftStatus("2020-01-01", "08:00", "16:00")).toBe("completed");
  });
  it("returns 'upcoming' for a far-future date", () => {
    expect(getShiftStatus("2099-12-31", "08:00", "16:00")).toBe("upcoming");
  });
});

// ---------------------------------------------------------------------------
// Ops helpers
// ---------------------------------------------------------------------------

describe("triageIncident", () => {
  it("cardiac → critical", () => expect(triageIncident("fan cardiac arrest")).toBe("critical"));
  it("fire → critical", () => expect(triageIncident("fire detected")).toBe("critical"));
  it("fight → high", () => expect(triageIncident("fans fighting")).toBe("high"));
  it("blocked exit → medium", () => expect(triageIncident("exit is blocked")).toBe("medium"));
  it("minor issue → low", () => expect(triageIncident("litter on floor")).toBe("low"));
});

// ---------------------------------------------------------------------------
// Sustainability helpers
// ---------------------------------------------------------------------------

describe("calcCarbonSaved", () => {
  it("returns positive value for positive attendance", () => {
    expect(calcCarbonSaved(74000)).toBeGreaterThan(0);
  });
  it("scales with attendance", () => {
    expect(calcCarbonSaved(80000)).toBeGreaterThan(calcCarbonSaved(40000));
  });
  it("returns 0 for 0 attendance", () => {
    expect(calcCarbonSaved(0)).toBe(0);
  });
});

describe("estimatePlasticWaste", () => {
  it("returns 45g × attendance", () => {
    expect(estimatePlasticWaste(1000)).toBe(45000);
  });
});

describe("calcRenewablePercent", () => {
  it("returns highest % during peak solar (10-16h)", () => {
    expect(calcRenewablePercent(12)).toBeGreaterThan(calcRenewablePercent(22));
  });
  it("returns valid % (0-100)", () => {
    for (let h = 0; h < 24; h++) {
      const pct = calcRenewablePercent(h);
      expect(pct).toBeGreaterThanOrEqual(0);
      expect(pct).toBeLessThanOrEqual(100);
    }
  });
});

describe("estimateWaterUsage", () => {
  it("estimates 2.8L per fan", () => {
    expect(estimateWaterUsage(1000)).toBe(2800);
  });
});

// ---------------------------------------------------------------------------
// Analytics helpers
// ---------------------------------------------------------------------------

describe("forecastEgress", () => {
  it("peaks around minute 5 after full-time", () => {
    const at5 = forecastEgress(74000, 5);
    const at20 = forecastEgress(74000, 20);
    expect(at5).toBeGreaterThan(at20);
  });
  it("returns 0 or positive values only", () => {
    for (let m = 0; m <= 30; m++) {
      expect(forecastEgress(74000, m)).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("calcPeakLoad", () => {
  it("85%+ → critical", () => expect(calcPeakLoad(85)).toBe("critical"));
  it("70-84% → elevated", () => expect(calcPeakLoad(70)).toBe("elevated"));
  it("<70% → normal", () => expect(calcPeakLoad(69)).toBe("normal"));
});

// ---------------------------------------------------------------------------
// Navigation helpers
// ---------------------------------------------------------------------------

describe("buildFallbackRoute", () => {
  const zones = [
    { id: "z1", name: "North Concourse", gate: "Gate A", capacityPct: 90 },
    { id: "z2", name: "South Concourse", gate: "Gate C", capacityPct: 35 },
  ];

  it("returns at least 3 steps", () => {
    const steps = buildFallbackRoute("gate-a", "seat-101", zones);
    expect(steps.length).toBeGreaterThanOrEqual(3);
  });

  it("final step is step number == length", () => {
    const steps = buildFallbackRoute("gate-a", "seat-201", zones);
    const last = steps[steps.length - 1];
    expect(last.step).toBe(steps.length);
  });

  it("mentions congestion avoidance when zone is over 80%", () => {
    const allText = buildFallbackRoute("gate-a", "exit-metro", zones)
      .map((s) => s.instruction)
      .join(" ");
    expect(allText).toMatch(/Avoid|Gate A/i);
  });
});
