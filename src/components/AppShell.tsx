/**
 * AppShell — Root layout with 3-mode toggle and mode-aware navigation.
 *
 * Fan mode:       Command, Tournament, Highlights, Navigate, Guide
 * Organizer mode: Operations, Incidents, Resources, Sustainability, Analytics
 * Volunteer mode: Tasks, Report, Shifts, Alerts
 *
 * The mode toggle in the header persists to localStorage via ModeContext.
 */
import { Link, useRouterState } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, Trophy, Video, Radio, Map, Accessibility,
  ClipboardList, FileWarning, Calendar, Bell, Leaf,
  BarChart3, ChevronDown, Users, Zap,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { FloatingAssistant } from "./FloatingAssistant";
import { useMode, MODE_CONFIGS, type AppMode } from "@/contexts/ModeContext";

// ---------------------------------------------------------------------------
// Navigation configs per mode
// ---------------------------------------------------------------------------

type NavItem = { to: string; label: string; icon: typeof Activity };

const FAN_NAV: NavItem[] = [
  { to: "/", label: "Command", icon: Activity },
  { to: "/tournament", label: "Tournament", icon: Trophy },
  { to: "/highlights", label: "Highlights", icon: Video },
  { to: "/fan/navigate", label: "Navigate", icon: Map },
  { to: "/fan/accessibility", label: "Accessibility", icon: Accessibility },
];

const ORGANIZER_NAV: NavItem[] = [
  { to: "/operations", label: "Operations", icon: Radio },
  { to: "/ops/incidents", label: "Incidents", icon: FileWarning },
  { to: "/ops/sustainability", label: "Sustainability", icon: Leaf },
  { to: "/ops/analytics", label: "Analytics", icon: BarChart3 },
];

const VOLUNTEER_NAV: NavItem[] = [
  { to: "/volunteer", label: "My Tasks", icon: ClipboardList },
  { to: "/volunteer/report", label: "Report", icon: FileWarning },
  { to: "/volunteer/shifts", label: "Shifts", icon: Calendar },
  { to: "/volunteer/alerts", label: "Alerts", icon: Bell },
];

function getNav(mode: AppMode): NavItem[] {
  if (mode === "organizer") return ORGANIZER_NAV;
  if (mode === "volunteer") return VOLUNTEER_NAV;
  return FAN_NAV;
}

// ---------------------------------------------------------------------------
// Mode toggle pill component
// ---------------------------------------------------------------------------

function ModeToggle() {
  const { mode, setMode, config } = useMode();
  const [open, setOpen] = useState(false);

  const modes: AppMode[] = ["fan", "organizer", "volunteer"];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`Current mode: ${config.label}. Click to switch.`}
        className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-deep-foreground transition-all hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
      >
        <span aria-hidden>{config.icon}</span>
        {config.label}
        <ChevronDown
          className={`size-3 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-border bg-card p-2 shadow-2xl"
            role="menu"
            aria-label="Switch mode"
          >
            {modes.map((m) => {
              const cfg = MODE_CONFIGS[m];
              const isActive = m === mode;
              return (
                <button
                  key={m}
                  type="button"
                  role="menuitemradio"
                  onClick={() => { setMode(m); setOpen(false); }}
                  aria-checked={isActive}
                  aria-current={isActive ? "true" : undefined}
                  className={`flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                    isActive
                      ? "bg-pitch/10 text-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <span className="mt-0.5 text-lg" aria-hidden>{cfg.icon}</span>
                  <div>
                    <p className="text-sm font-semibold">{cfg.label} Mode</p>
                    <p className="text-xs opacity-75">{cfg.description}</p>
                  </div>
                  {isActive && (
                    <span className="ml-auto mt-1 size-2 rounded-full bg-pitch" aria-hidden />
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click-away backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          aria-hidden
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mode indicator banner (subtle colored stripe below header)
// ---------------------------------------------------------------------------

function ModeBanner() {
  const { mode, config } = useMode();

  const bannerStyles: Record<AppMode, string> = {
    fan: "bg-pitch/20 text-pitch border-pitch/30",
    organizer: "bg-amber-500/20 text-amber-600 border-amber-500/30",
    volunteer: "bg-live/20 text-live border-live/30",
  };

  const descriptions: Record<AppMode, string> = {
    fan: "Fan Experience — Navigation, Live Scores & Assistance",
    organizer: "Organizer Command Center — Ops Intelligence & Resource Management",
    volunteer: "Volunteer Dashboard — Tasks, Reports & Shift Management",
  };

  return (
    <div
      className={`border-b px-4 py-1.5 text-center text-[11px] font-semibold uppercase tracking-widest ${bannerStyles[mode]}`}
      role="status"
      aria-live="polite"
    >
      <span aria-hidden>{config.icon}</span> {descriptions[mode]}
    </div>
  );
}

// ---------------------------------------------------------------------------
// AppShell
// ---------------------------------------------------------------------------

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { mode } = useMode();
  const nav = getNav(mode);

  return (
    <div className="min-h-dvh bg-background text-foreground" style={{ fontSize: "calc(1rem * var(--font-scale, 1))" }}>
      {/* Skip link — WCAG 2.4.1 */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground focus:shadow-lg"
      >
        Skip to main content
      </a>

      <header className="sticky top-0 z-40 border-b border-border/60 bg-deep text-deep-foreground backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span
              aria-hidden
              className="grid size-8 place-items-center rounded-lg bg-pitch text-pitch-foreground font-black text-sm"
            >
              TL
            </span>
            <span className="text-lg">
              Touchline <span className="text-pitch">2026</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav aria-label="Primary navigation" className="hidden md:block">
            <ul className="flex items-center gap-1">
              {nav.map(({ to, label, icon: Icon }) => {
                const active = pathname === to;
                return (
                  <li key={to}>
                    <Link
                      to={to}
                      className={`relative flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                        active
                          ? "text-deep-foreground"
                          : "text-deep-foreground/70 hover:text-deep-foreground"
                      }`}
                      aria-current={active ? "page" : undefined}
                    >
                      <Icon className="size-4" aria-hidden />
                      {label}
                      {active && (
                        <motion.span
                          layoutId="nav-underline"
                          className="absolute inset-x-2 -bottom-0.5 h-0.5 rounded-full bg-pitch"
                        />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            <LocaleSwitcher />
            <ModeToggle />
          </div>
        </div>

        {/* Mode indicator banner */}
        <ModeBanner />

        {/* Mobile bottom nav */}
        <nav aria-label="Mobile navigation" className="md:hidden border-t border-white/10">
          <ul className="mx-auto flex max-w-7xl items-center justify-around px-2 py-1 overflow-x-auto">
            {nav.map(({ to, label, icon: Icon }) => {
              const active = pathname === to;
              return (
                <li key={to} className="shrink-0">
                  <Link
                    to={to}
                    className={`flex flex-col items-center gap-0.5 rounded-md px-3 py-1.5 text-xs transition-colors ${
                      active ? "text-pitch" : "text-deep-foreground/70"
                    }`}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon className="size-4" aria-hidden />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>

      <main id="main" className="mx-auto max-w-7xl px-4 py-6 md:py-10">
        {children}
      </main>

      <FloatingAssistant />
    </div>
  );
}
