/**
 * Organizer Analytics — crowd flow predictions and capacity forecasting.
 *
 * Uses Recharts (already a dependency) for live data visualization.
 * GenAI generates forward-looking crowd flow predictions.
 *
 * TEST MOUNTING POINT: forecastEgress, calcPeakLoad are pure functions.
 */
import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { BarChart3, Users, TrendingUp, Activity, Loader2, RefreshCw } from "lucide-react";
import { useState, useMemo, useCallback, useEffect } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend,
} from "recharts";
import { useLiveState } from "@/hooks/useLiveState";
import { generateAIReply } from "@/lib/assistant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/ops/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — Touchline Organizer" },
      { name: "description", content: "Real-time crowd analytics and AI-powered capacity forecasting for FIFA 2026 venues." },
    ],
  }),
  component: AnalyticsPage,
});

// ---------------------------------------------------------------------------
// Pure helpers — TEST MOUNTING POINT
// ---------------------------------------------------------------------------

/** Forecast egress fan count per minute after full-time. TEST MOUNTING POINT. */
export function forecastEgress(attendance: number, minutesAfterFT: number): number {
  // Approximate normal distribution: peak at 5 min, tail at 30 min
  const peak = attendance * 0.08; // 8% of fans leave per min at peak
  const x = minutesAfterFT - 5;
  return Math.max(0, Math.round(peak * Math.exp(-(x * x) / 50)));
}

/** Calculate peak load factor for a zone. TEST MOUNTING POINT. */
export function calcPeakLoad(capacityPct: number): "normal" | "elevated" | "critical" {
  if (capacityPct >= 85) return "critical";
  if (capacityPct >= 70) return "elevated";
  return "normal";
}

// ---------------------------------------------------------------------------
// Chart data builders
// ---------------------------------------------------------------------------

function buildIngressChart(baseIngress: number) {
  const hours = Array.from({ length: 8 }, (_, i) => i + 12); // 12pm to 7pm
  return hours.map((h) => {
    const label = `${h}:00`;
    const peak = h === 16 || h === 17;
    const value = peak ? baseIngress * 1.8 : baseIngress * (0.4 + Math.random() * 0.6);
    return { time: label, ingress: Math.round(value), capacity: Math.round(value * 0.7) };
  });
}

function buildZoneChart(zones: { name: string; capacityPct: number }[]) {
  return zones.map((z) => ({
    zone: z.name.replace(" Concourse", "").replace(" Lounge", " VIP"),
    capacity: z.capacityPct,
    target: 75,
  }));
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function AnalyticsPage() {
  const { data } = useLiveState(10000);
  const [forecast, setForecast] = useState<string>("");
  const [loadingForecast, setLoadingForecast] = useState(false);

  const ingressData = useMemo(
    () => buildIngressChart(data?.crowd.ingressPerMin ?? 45),
    [data?.crowd.ingressPerMin],
  );

  const zoneData = useMemo(
    () => buildZoneChart(data?.crowd.zones ?? []),
    [data?.crowd.zones],
  );

  const egressForecast = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        min: `+${(i + 1) * 2}m`,
        fans: forecastEgress(data?.crowd.totalAttendance ?? 74000, (i + 1) * 2),
      })),
    [data?.crowd.totalAttendance],
  );

  const fetchForecast = useCallback(async () => {
    if (!data) return;
    setLoadingForecast(true);
    const busiest = [...data.crowd.zones].sort((a, b) => b.capacityPct - a.capacityPct)[0];
    const live = data.matches.find((m) => m.status === "live");
    try {
      const { text } = await generateAIReply(
        `Crowd flow prediction for FIFA 2026 match:
- Attendance: ${data.crowd.totalAttendance.toLocaleString()}
- Ingress rate: ${data.crowd.ingressPerMin}/min
- Egress rate: ${data.crowd.egressPerMin}/min  
- Hotspot: ${busiest.name} at ${busiest.capacityPct}%
- Match status: ${live ? `Live — minute ${(live as { minute?: number }).minute}` : "Not live"}

Predict crowd flow over the next 30 minutes and recommend 2 proactive measures.`,
        { state: data, mode: "organizer" },
      );
      setForecast(text);
    } catch {
      setForecast("Unable to generate forecast. Check AI connectivity.");
    } finally {
      setLoadingForecast(false);
    }
  }, [data]);

  useEffect(() => {
    if (data && !forecast) void fetchForecast();
  }, [data, forecast, fetchForecast]);

  const peakZone = useMemo(
    () => data?.crowd.zones.reduce((a, b) => (b.capacityPct > a.capacityPct ? b : a), data.crowd.zones[0]),
    [data],
  );

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-widest text-amber-600">Organizer Mode</p>
        <h1 className="mt-1 text-3xl font-bold md:text-4xl flex items-center gap-3">
          <BarChart3 className="size-8 text-amber-600" aria-hidden />
          Crowd Analytics
        </h1>
        <p className="mt-2 text-muted-foreground">
          Real-time crowd flow data and AI-powered capacity forecasting.
        </p>
      </header>

      {/* Summary KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Attendance", value: (data?.crowd.totalAttendance ?? 0).toLocaleString(), icon: Users },
          { label: "Ingress/min", value: data?.crowd.ingressPerMin?.toString() ?? "—", icon: TrendingUp },
          { label: "Egress/min", value: data?.crowd.egressPerMin?.toString() ?? "—", icon: Activity },
          { label: "Peak Zone", value: `${peakZone?.capacityPct ?? 0}%`, icon: BarChart3 },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="grid size-10 place-items-center rounded-lg bg-amber-500/10">
                <Icon className="size-5 text-amber-600" aria-hidden />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
                <p className="text-2xl font-bold tabular-nums">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Ingress over time */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fan Ingress — Today (Simulated)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={ingressData}>
                <defs>
                  <linearGradient id="ingressGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="ingress"
                  stroke="#f59e0b"
                  fill="url(#ingressGrad)"
                  name="Fans/min"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Zone capacity bar chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            Zone Capacity vs Target
            <div className="flex gap-2">
              {data?.crowd.zones.map((z) => (
                <Badge
                  key={z.id}
                  variant="outline"
                  className={`text-[10px] ${
                    calcPeakLoad(z.capacityPct) === "critical"
                      ? "border-live/40 text-live"
                      : calcPeakLoad(z.capacityPct) === "elevated"
                        ? "border-amber-500/40 text-amber-600"
                        : "border-pitch/30 text-pitch"
                  }`}
                >
                  {z.gate}: {z.capacityPct}%
                </Badge>
              ))}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={zoneData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="zone" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="capacity" fill="#f59e0b" name="Current %" radius={[4, 4, 0, 0]} />
                <Bar dataKey="target" fill="#4ade80" name="Target %" radius={[4, 4, 0, 0]} opacity={0.6} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Egress forecast */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Post-Match Egress Forecast</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={egressForecast}>
                <defs>
                  <linearGradient id="egressGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="min" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="fans"
                  stroke="#ef4444"
                  fill="url(#egressGrad)"
                  name="Fans/min exiting"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Predicted egress wave peaks ~5-7 minutes after full-time. Pre-stage transit and open all exit lanes.
          </p>
        </CardContent>
      </Card>

      {/* AI Crowd Forecast */}
      <Card className="border-amber-500/30 bg-amber-50/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base text-amber-700 flex items-center gap-2">
              <BarChart3 className="size-4" aria-hidden />
              AI Crowd Flow Prediction
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={fetchForecast}
              disabled={loadingForecast}
              className="border-amber-500/40 text-amber-700 hover:bg-amber-50"
              id="refresh-forecast-btn"
            >
              {loadingForecast ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <RefreshCw className="size-3.5" aria-hidden />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingForecast ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-4 animate-pulse rounded bg-amber-200" />
              ))}
            </div>
          ) : (
            <p className="text-sm text-amber-900 leading-relaxed whitespace-pre-wrap" aria-live="polite">
              {forecast || "Generating AI forecast…"}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
