/**
 * AccessibilityContext — WCAG 2.1 AA compliance controls.
 *
 * Provides:
 *  - highContrast: boolean — activates a high-contrast CSS class on <html>
 *  - fontSize: "normal" | "large" | "xl" — scales root font via CSS custom property
 *  - reduceMotion: boolean — respects prefers-reduced-motion + manual override
 *
 * All preferences persist to localStorage and are read on first render.
 * The context also auto-reads the OS-level prefers-reduced-motion media query.
 *
 * TEST MOUNTING POINT: pure helpers getFontSizeClass, getFontSizeScale testable.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type FontSize = "normal" | "large" | "xl";

interface A11yPrefs {
  highContrast: boolean;
  fontSize: FontSize;
  reduceMotion: boolean;
}

interface A11yContextValue extends A11yPrefs {
  setHighContrast: (v: boolean) => void;
  setFontSize: (v: FontSize) => void;
  setReduceMotion: (v: boolean) => void;
}

const STORAGE_KEY = "touchline_a11y";

function loadPrefs(): A11yPrefs {
  if (typeof window === "undefined") {
    return { highContrast: false, fontSize: "normal", reduceMotion: false };
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<A11yPrefs>;
      return {
        highContrast: parsed.highContrast ?? false,
        fontSize: (["normal", "large", "xl"].includes(parsed.fontSize ?? "") ? parsed.fontSize : "normal") as FontSize,
        reduceMotion:
          parsed.reduceMotion ??
          window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      };
    }
  } catch {
    /* ignore */
  }
  return {
    highContrast: false,
    fontSize: "normal",
    reduceMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  };
}

/** Pure: map FontSize to CSS rem scale value. TEST MOUNTING POINT. */
export function getFontSizeScale(size: FontSize): string {
  switch (size) {
    case "large": return "1.125";
    case "xl":    return "1.25";
    default:      return "1";
  }
}

/** Pure: map FontSize to display label. TEST MOUNTING POINT. */
export function getFontSizeClass(size: FontSize): string {
  switch (size) {
    case "large": return "text-lg";
    case "xl":    return "text-xl";
    default:      return "text-base";
  }
}

const A11yContext = createContext<A11yContextValue | null>(null);

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<A11yPrefs>(loadPrefs);

  const save = useCallback((next: A11yPrefs) => {
    setPrefs(next);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
  }, []);

  // Apply preferences to <html> element
  useEffect(() => {
    const root = document.documentElement;
    // High contrast
    root.classList.toggle("high-contrast", prefs.highContrast);
    // Font size
    root.style.setProperty("--font-scale", getFontSizeScale(prefs.fontSize));
    // Reduce motion
    root.classList.toggle("reduce-motion", prefs.reduceMotion);
  }, [prefs]);

  const setHighContrast = useCallback(
    (v: boolean) => save({ ...prefs, highContrast: v }),
    [prefs, save],
  );
  const setFontSize = useCallback(
    (v: FontSize) => save({ ...prefs, fontSize: v }),
    [prefs, save],
  );
  const setReduceMotion = useCallback(
    (v: boolean) => save({ ...prefs, reduceMotion: v }),
    [prefs, save],
  );

  return (
    <A11yContext.Provider
      value={{ ...prefs, setHighContrast, setFontSize, setReduceMotion }}
    >
      {children}
    </A11yContext.Provider>
  );
}

export function useA11y() {
  const ctx = useContext(A11yContext);
  if (!ctx) throw new Error("useA11y must be used within AccessibilityProvider");
  return ctx;
}
