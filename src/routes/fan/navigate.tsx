/**
 * Fan Navigation — AI-powered crowd-aware wayfinding.
 *
 * Provides step-by-step directions from any gate/entrance to any destination
 * inside the stadium. Routes adapt in real-time based on crowd density.
 *
 * GenAI usage: Gemini generates the optimal route considering live crowd data.
 * Fallback: deterministic rule-based routing using crowd zone data.
 *
 * Accessibility: WCAG 2.1 AA — all interactive elements keyboard-navigable,
 * route steps announced via aria-live.
 */
import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Map, ArrowRight, Navigation, Users, Clock,
  CheckCircle2, Loader2, Accessibility,
} from "lucide-react";
import { useState, useCallback, useMemo } from "react";
import { useLiveState } from "@/hooks/useLiveState";
import { generateAIReply } from "@/lib/assistant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/fan/navigate")({
  head: () => ({
    meta: [
      { title: "Navigate — Touchline FIFA 2026" },
      {
        name: "description",
        content:
          "AI-powered crowd-aware stadium navigation for FIFA World Cup 2026. Find the fastest route to your seat, exit, or concession stand.",
      },
    ],
  }),
  component: NavigatePage,
});

// ---------------------------------------------------------------------------
// Destination options
// ---------------------------------------------------------------------------

const DESTINATIONS = [
  { id: "seat-101", label: "Section 101–120", icon: "🪑", category: "Seating" },
  { id: "seat-201", label: "Section 201–230", icon: "🪑", category: "Seating" },
  { id: "seat-301", label: "Section 301–340", icon: "🪑", category: "Seating" },
  { id: "concession-north", label: "North Concourse Food", icon: "🍔", category: "Concessions" },
  { id: "concession-south", label: "South Concourse Food", icon: "🍕", category: "Concessions" },
  { id: "concession-vip", label: "VIP Lounge", icon: "🥂", category: "Concessions" },
  { id: "restroom-north", label: "North Restrooms", icon: "🚻", category: "Facilities" },
  { id: "restroom-south", label: "South Restrooms", icon: "🚻", category: "Facilities" },
  { id: "medical", label: "First Aid Station", icon: "🏥", category: "Emergency" },
  { id: "exit-metro", label: "Metro Exit", icon: "🚇", category: "Exit" },
  { id: "exit-parking", label: "Parking Exit", icon: "🚗", category: "Exit" },
  { id: "exit-shuttle", label: "Shuttle Bus Stop", icon: "🚌", category: "Exit" },
] as const;

type DestId = (typeof DESTINATIONS)[number]["id"];

const ENTRY_POINTS = [
  { id: "gate-a", label: "Gate A (North)" },
  { id: "gate-b", label: "Gate B (East)" },
  { id: "gate-c", label: "Gate C (South)" },
  { id: "gate-d", label: "Gate D (West)" },
  { id: "gate-v", label: "Gate V (VIP)" },
  { id: "gate-f", label: "Gate F (Family)" },
] as const;

type EntryId = (typeof ENTRY_POINTS)[number]["id"];

interface RouteStep {
  step: number;
  instruction: string;
  landmark?: string;
  crowdLevel?: "low" | "medium" | "high";
  estimatedSeconds: number;
}

interface NavigationRoute {
  from: string;
  to: string;
  totalMinutes: number;
  steps: RouteStep[];
  crowdWarning?: string;
  accessibilityNote?: string;
  aiGenerated: boolean;
}

// ---------------------------------------------------------------------------
// Pure helpers (testable)
// ---------------------------------------------------------------------------

/** Pure: build a fallback rule-based route from crowd data. TEST MOUNTING POINT. */
export function buildFallbackRoute(
  from: EntryId,
  dest: DestId,
  zones: { id: string; name: string; gate?: string; capacityPct: number }[],
): RouteStep[] {
  const fromLabel = ENTRY_POINTS.find((e) => e.id === from)?.label ?? from;
  const destLabel = DESTINATIONS.find((d) => d.id === dest)?.label ?? dest;
  const busiest = [...zones].sort((a, b) => b.capacityPct - a.capacityPct)[0];
  const avoidNote = busiest.capacityPct > 80 ? `Avoid ${busiest.gate} area (${busiest.capacityPct}% full).` : "";

  return [
    {
      step: 1,
      instruction: `Enter through ${fromLabel}.`,
      crowdLevel: "low",
      estimatedSeconds: 30,
    },
    {
      step: 2,
      instruction: `Follow the green wayfinding signs toward your destination. ${avoidNote}`,
      landmark: "Main concourse junction",
      crowdLevel: busiest.capacityPct > 80 ? "high" : "medium",
      estimatedSeconds: 120,
    },
    {
      step: 3,
      instruction: `Proceed to ${destLabel} via the nearest elevator or escalator.`,
      crowdLevel: "medium",
      estimatedSeconds: 60,
    },
    {
      step: 4,
      instruction: "You have arrived at your destination.",
      crowdLevel: "low",
      estimatedSeconds: 0,
    },
  ];
}

function crowdColor(level: RouteStep["crowdLevel"]) {
  if (level === "high") return "text-live bg-live/10 border-live/30";
  if (level === "medium") return "text-amber-600 bg-amber-50 border-amber-200";
  return "text-pitch bg-pitch/10 border-pitch/30";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function NavigatePage() {
  const { data, isLoading } = useLiveState();
  const [from, setFrom] = useState<EntryId | "">("");
  const [dest, setDest] = useState<DestId | "">("");
  const [accessible, setAccessible] = useState(false);
  const [route, setRoute] = useState<NavigationRoute | null>(null);
  const [generating, setGenerating] = useState(false);

  const zones = useMemo(() => data?.crowd.zones ?? [], [data]);

  const navigate = useCallback(async () => {
    if (!from || !dest || !data) return;
    setGenerating(true);
    setRoute(null);

    const fromLabel = ENTRY_POINTS.find((e) => e.id === from)?.label ?? from;
    const destLabel = DESTINATIONS.find((d) => d.id === dest)?.label ?? dest;
    const busiest = [...zones].sort((a, b) => b.capacityPct - a.capacityPct)[0];
    const quietest = [...zones].sort((a, b) => a.capacityPct - b.capacityPct)[0];

    const prompt = `Generate a detailed step-by-step navigation route from ${fromLabel} to ${destLabel} inside the stadium. ${
      accessible ? "The user needs wheelchair accessible routes — avoid stairs, use lifts only." : ""
    }
Current crowd data:
- Busiest area: ${busiest.name} (${busiest.capacityPct}%) at ${busiest.gate}
- Quietest area: ${quietest.name} (${quietest.capacityPct}%) at ${quietest.gate}

Provide 4-6 numbered steps with specific landmarks, estimated walking time for each step, and avoid congested areas.
Format: numbered list of clear walking directions.`;

    try {
      const { text, usedAI } = await generateAIReply(prompt, { state: data, mode: "fan" });

      // Parse AI response into structured steps
      const lines = text.split("\n").filter((l) => /^\d+\./.test(l.trim()));
      const steps: RouteStep[] =
        lines.length >= 2
          ? lines.map((line, i) => ({
              step: i + 1,
              instruction: line.replace(/^\d+\.\s*/, "").trim(),
              crowdLevel:
                line.toLowerCase().includes("avoid") || line.toLowerCase().includes("busy")
                  ? "high"
                  : i === 0 || i === lines.length - 1
                    ? "low"
                    : "medium",
              estimatedSeconds: 60 + i * 30,
            }))
          : buildFallbackRoute(from as EntryId, dest as DestId, zones);

      const totalSeconds = steps.reduce((acc, s) => acc + s.estimatedSeconds, 0);

      setRoute({
        from: fromLabel,
        to: destLabel,
        totalMinutes: Math.max(1, Math.round(totalSeconds / 60)),
        steps,
        crowdWarning:
          busiest.capacityPct >= 85
            ? `⚠️ High congestion near ${busiest.gate} — route adjusted to avoid this area.`
            : undefined,
        accessibilityNote: accessible
          ? "♿ Wheelchair-accessible route via lifts. Ask blue-vest volunteers for help."
          : undefined,
        aiGenerated: usedAI,
      });
    } catch {
      const steps = buildFallbackRoute(from as EntryId, dest as DestId, zones);
      setRoute({
        from: fromLabel,
        to: destLabel,
        totalMinutes: 5,
        steps,
        aiGenerated: false,
      });
    } finally {
      setGenerating(false);
    }
  }, [from, dest, data, zones, accessible]);

  const categories = useMemo(
    () => [...new Set(DESTINATIONS.map((d) => d.category))],
    [],
  );

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-widest text-pitch">Fan Navigation</p>
        <h1 className="mt-1 text-3xl font-bold md:text-4xl flex items-center gap-3">
          <Map className="size-8 text-pitch" aria-hidden />
          Smart Stadium Navigation
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          AI-powered wayfinding that adapts to live crowd density. Get the fastest route to your destination, avoiding congested areas in real time.
        </p>
      </header>

      {/* Crowd status bar */}
      {data && (
        <div className="flex flex-wrap gap-3">
          {data.crowd.zones.slice(0, 4).map((z) => (
            <Badge
              key={z.id}
              variant="outline"
              className={`text-xs ${z.capacityPct >= 85 ? "border-live/50 text-live" : z.capacityPct >= 60 ? "border-amber-500/50 text-amber-600" : "border-pitch/50 text-pitch"}`}
            >
              {z.gate}: {z.capacityPct}%
            </Badge>
          ))}
          <Badge variant="outline" className="text-xs border-muted-foreground/30 text-muted-foreground">
            <Clock className="size-3 mr-1" aria-hidden />
            Live crowd data
          </Badge>
        </div>
      )}

      {/* Navigation planner */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Navigation className="size-5 text-pitch" aria-hidden />
            Plan Your Route
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* From */}
          <div className="space-y-2">
            <label htmlFor="from-select" className="text-sm font-medium">
              Starting point
            </label>
            <select
              id="from-select"
              value={from}
              onChange={(e) => setFrom(e.target.value as EntryId)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Select your entry gate…</option>
              {ENTRY_POINTS.map((e) => (
                <option key={e.id} value={e.id}>{e.label}</option>
              ))}
            </select>
          </div>

          {/* Destination */}
          <div className="space-y-2">
            <label htmlFor="dest-select" className="text-sm font-medium">
              Destination
            </label>
            <select
              id="dest-select"
              value={dest}
              onChange={(e) => setDest(e.target.value as DestId)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Select destination…</option>
              {categories.map((cat) => (
                <optgroup key={cat} label={cat}>
                  {DESTINATIONS.filter((d) => d.category === cat).map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.icon} {d.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Accessibility toggle */}
          <label className="flex items-center gap-3 cursor-pointer" htmlFor="accessible-toggle">
            <input
              id="accessible-toggle"
              type="checkbox"
              checked={accessible}
              onChange={(e) => setAccessible(e.target.checked)}
              className="size-4 rounded border-input accent-pitch"
            />
            <span className="flex items-center gap-2 text-sm">
              <Accessibility className="size-4 text-pitch" aria-hidden />
              Wheelchair-accessible route (lifts only, no stairs)
            </span>
          </label>

          <Button
            onClick={navigate}
            disabled={!from || !dest || generating || isLoading}
            className="w-full bg-pitch text-pitch-foreground hover:bg-pitch/90"
            id="navigate-btn"
          >
            {generating ? (
              <>
                <Loader2 className="size-4 animate-spin mr-2" aria-hidden />
                Calculating route…
              </>
            ) : (
              <>
                <Navigation className="size-4 mr-2" aria-hidden />
                Get Directions
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Route result */}
      <AnimatePresence>
        {route && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="space-y-4"
          >
            <Card className="border-pitch/30 bg-pitch/5">
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2 text-base">
                  <span className="flex items-center gap-2">
                    <Navigation className="size-4 text-pitch" aria-hidden />
                    Route: {route.from} → {route.to}
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-pitch/20 text-pitch border-pitch/30" variant="outline">
                      <Clock className="size-3 mr-1" aria-hidden />
                      ~{route.totalMinutes} min
                    </Badge>
                    {route.aiGenerated && (
                      <Badge variant="outline" className="text-[10px] border-pitch/30 text-pitch">
                        ✦ AI
                      </Badge>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {route.crowdWarning && (
                  <div className="rounded-lg bg-live/10 border border-live/30 px-3 py-2 text-sm text-live" role="alert">
                    {route.crowdWarning}
                  </div>
                )}
                {route.accessibilityNote && (
                  <div className="rounded-lg bg-pitch/10 border border-pitch/30 px-3 py-2 text-sm text-pitch" role="note">
                    {route.accessibilityNote}
                  </div>
                )}

                <ol
                  className="space-y-3"
                  aria-label="Navigation steps"
                  aria-live="polite"
                >
                  {route.steps.map((step) => (
                    <motion.li
                      key={step.step}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: step.step * 0.08 }}
                      className="flex items-start gap-3"
                    >
                      <div className="grid size-7 shrink-0 place-items-center rounded-full bg-pitch text-pitch-foreground text-xs font-bold">
                        {step.step === route.steps.length ? (
                          <CheckCircle2 className="size-4" aria-hidden />
                        ) : (
                          step.step
                        )}
                      </div>
                      <div className="flex-1 pt-0.5">
                        <p className="text-sm leading-relaxed">{step.instruction}</p>
                        {step.landmark && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            📍 {step.landmark}
                          </p>
                        )}
                      </div>
                      {step.crowdLevel && step.crowdLevel !== "low" && (
                        <Badge
                          variant="outline"
                          className={`shrink-0 text-[10px] ${crowdColor(step.crowdLevel)}`}
                        >
                          <Users className="size-2.5 mr-1" aria-hidden />
                          {step.crowdLevel}
                        </Badge>
                      )}
                    </motion.li>
                  ))}
                </ol>
              </CardContent>
            </Card>

            {/* Continue arrow */}
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <ArrowRight className="size-4" aria-hidden />
              Ask the AI assistant for real-time updates along your route
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Skeleton while loading */}
      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64" />
        </div>
      )}
    </div>
  );
}
