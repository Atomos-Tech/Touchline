/**
 * ModeContext — global app mode provider.
 *
 * Three modes:
 *   "fan"        — attendee-facing: navigation, scores, food, accessibility
 *   "organizer"  — command & control: ops, incidents, resources, sustainability
 *   "volunteer"  — field staff: tasks, reports, shifts, alerts
 *
 * Persisted to localStorage so the selected mode survives page refreshes.
 * Each mode gets its own AI persona, nav items, and feature set.
 *
 * TEST MOUNTING POINT: pure helpers (getModeLabel, getModeColor) are testable.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type AppMode = "fan" | "organizer" | "volunteer";

export interface ModeConfig {
  mode: AppMode;
  label: string;
  description: string;
  color: string;
  bgClass: string;
  icon: string;
}

export const MODE_CONFIGS: Record<AppMode, ModeConfig> = {
  fan: {
    mode: "fan",
    label: "Fan",
    description: "Navigate, scores, food & accessibility",
    color: "oklch(0.62 0.16 155)",
    bgClass: "bg-pitch",
    icon: "⚽",
  },
  organizer: {
    mode: "organizer",
    label: "Organizer",
    description: "Command center, incidents & resources",
    color: "oklch(0.82 0.14 85)",
    bgClass: "bg-gold",
    icon: "🏟️",
  },
  volunteer: {
    mode: "volunteer",
    label: "Volunteer",
    description: "Tasks, reports, shifts & alerts",
    color: "oklch(0.65 0.24 25)",
    bgClass: "bg-live",
    icon: "🦺",
  },
};

const STORAGE_KEY = "touchline_mode";

interface ModeContextValue {
  mode: AppMode;
  config: ModeConfig;
  setMode: (mode: AppMode) => void;
}

const ModeContext = createContext<ModeContextValue | null>(null);

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<AppMode>(() => {
    if (typeof window === "undefined") return "fan";
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "fan" || stored === "organizer" || stored === "volunteer") {
      return stored;
    }
    return "fan";
  });

  const setMode = useCallback((next: AppMode) => {
    setModeState(next);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, next);
    }
  }, []);

  // Keep localStorage in sync if changed from another tab
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY && (e.newValue === "fan" || e.newValue === "organizer" || e.newValue === "volunteer")) {
        setModeState(e.newValue);
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <ModeContext.Provider value={{ mode, config: MODE_CONFIGS[mode], setMode }}>
      {children}
    </ModeContext.Provider>
  );
}

/** Access the current app mode and its config. */
export function useMode() {
  const ctx = useContext(ModeContext);
  if (!ctx) throw new Error("useMode must be used within ModeProvider");
  return ctx;
}

/** Pure helper — used in tests without React. */
export function getModeLabel(mode: AppMode): string {
  return MODE_CONFIGS[mode].label;
}

/** Pure helper — used in tests without React. */
export function getModeColor(mode: AppMode): string {
  return MODE_CONFIGS[mode].color;
}
