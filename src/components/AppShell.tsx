import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Activity, Trophy, Video, Radio } from "lucide-react";
import type { ReactNode } from "react";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { FloatingAssistant } from "./FloatingAssistant";

const NAV = [
  { to: "/", label: "Command", icon: Activity },
  { to: "/tournament", label: "Tournament", icon: Trophy },
  { to: "/highlights", label: "Highlights", icon: Video },
  { to: "/operations", label: "Operations", icon: Radio },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        Skip to main content
      </a>

      <header className="sticky top-0 z-40 border-b border-border/60 bg-deep text-deep-foreground backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span
              aria-hidden
              className="grid size-8 place-items-center rounded-lg bg-pitch text-pitch-foreground font-black"
            >
              26
            </span>
            <span className="text-lg">
              FIFA <span className="text-pitch">2026</span> Stadium Hub
            </span>
          </Link>

          <nav aria-label="Primary" className="hidden md:block">
            <ul className="flex items-center gap-1">
              {NAV.map(({ to, label, icon: Icon }) => {
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

          <div className="flex items-center gap-3">
            <LocaleSwitcher />
          </div>
        </div>

        <nav aria-label="Primary mobile" className="md:hidden border-t border-white/10">
          <ul className="mx-auto flex max-w-7xl items-center justify-around px-2 py-1">
            {NAV.map(({ to, label, icon: Icon }) => {
              const active = pathname === to;
              return (
                <li key={to}>
                  <Link
                    to={to}
                    className={`flex flex-col items-center gap-0.5 rounded-md px-3 py-1.5 text-xs ${
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
