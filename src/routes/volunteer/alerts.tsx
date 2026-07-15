/**
 * Volunteer Alert Feed — real-time push-style alerts from organizers.
 *
 * Simulates incoming operational alerts pushed from the command center.
 * In production, this would use WebSockets or SSE for real-time updates.
 *
 * Alerts are auto-classified by severity and displayed with aria-live for
 * screen reader compatibility.
 */
import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, AlertTriangle, CheckCircle2, Info, Radio, BellOff } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useLiveState } from "@/hooks/useLiveState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/volunteer/alerts")({
  head: () => ({
    meta: [
      { title: "Alerts — Touchline Volunteer" },
      { name: "description", content: "Real-time operational alerts from the FIFA 2026 stadium command center." },
    ],
  }),
  component: AlertsPage,
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AlertLevel = "critical" | "warning" | "info";

interface OperationalAlert {
  id: string;
  level: AlertLevel;
  title: string;
  message: string;
  timestamp: string;
  zone?: string;
  read: boolean;
  source: "AI" | "Control" | "System";
}

// ---------------------------------------------------------------------------
// Alert generation from live state
// ---------------------------------------------------------------------------

function generateAlertsFromState(
  zones: { id: string; name: string; gate?: string; capacityPct: number }[],
  transit: { id: string; name: string; status: string }[],
  liveMinute?: number,
): OperationalAlert[] {
  const alerts: OperationalAlert[] = [];
  const now = new Date().toLocaleTimeString();

  const busiest = [...zones].sort((a, b) => b.capacityPct - a.capacityPct)[0];

  if (busiest.capacityPct >= 90) {
    alerts.push({
      id: `alert-surge-${Date.now()}`,
      level: "critical",
      title: "⚠️ CRITICAL: Crowd Surge Alert",
      message: `${busiest.name} (${busiest.gate}) has reached ${busiest.capacityPct}% capacity. IMMEDIATE ACTION REQUIRED: Redirect fans, deploy additional stewards, open overflow areas.`,
      timestamp: now,
      zone: busiest.name,
      read: false,
      source: "AI",
    });
  } else if (busiest.capacityPct >= 80) {
    alerts.push({
      id: `alert-high-${Date.now()}`,
      level: "warning",
      title: "High Crowd Density",
      message: `${busiest.name} approaching capacity (${busiest.capacityPct}%). Monitor and be prepared to redirect. ${busiest.gate} may need additional support.`,
      timestamp: now,
      zone: busiest.name,
      read: false,
      source: "AI",
    });
  }

  const delayed = transit.filter((t) => t.status !== "normal");
  if (delayed.length) {
    alerts.push({
      id: `alert-transit-${Date.now()}`,
      level: "warning",
      title: "Transit Disruption",
      message: `${delayed.map((t) => t.name).join(" and ")} ${delayed.length > 1 ? "are" : "is"} delayed. Guide fans to alternative routes. Extra shuttle buses dispatched.`,
      timestamp: now,
      read: false,
      source: "Control",
    });
  }

  if (liveMinute && liveMinute >= 85) {
    alerts.push({
      id: `alert-egress-${Date.now()}`,
      level: "info",
      title: "Full-time approaching",
      message: `Match in minute ${liveMinute}. Pre-position at exit gates. Coordinate with transit liaisons. Expected egress surge in ~5 minutes.`,
      timestamp: now,
      read: false,
      source: "System",
    });
  }

  return alerts;
}

const LEVEL_STYLES: Record<AlertLevel, { border: string; bg: string; icon: typeof AlertTriangle }> = {
  critical: { border: "border-live/50", bg: "bg-live/5", icon: AlertTriangle },
  warning: { border: "border-amber-500/40", bg: "bg-amber-50/30", icon: AlertTriangle },
  info: { border: "border-pitch/40", bg: "bg-pitch/5", icon: Info },
};

const LEVEL_BADGE: Record<AlertLevel, string> = {
  critical: "bg-live/20 text-live border-live/40",
  warning: "bg-amber-500/20 text-amber-600 border-amber-500/40",
  info: "bg-pitch/20 text-pitch border-pitch/30",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function AlertsPage() {
  const { data } = useLiveState(5000);
  const [alerts, setAlerts] = useState<OperationalAlert[]>([]);
  const [muted, setMuted] = useState(false);

  // Seed initial alerts
  useEffect(() => {
    const initial: OperationalAlert[] = [
      {
        id: "welcome-alert",
        level: "info",
        title: "Volunteer briefing complete",
        message: "Welcome to your shift. All systems operational. Check the Tasks tab for your assignments.",
        timestamp: new Date().toLocaleTimeString(),
        read: true,
        source: "System",
      },
      {
        id: "radio-alert",
        level: "info",
        title: "Radio channel assignment",
        message: "Your assigned radio channel: Channel 2 (Crowd Flow). Control centre on Channel 1. Medical on Channel 3.",
        timestamp: new Date(Date.now() - 120000).toLocaleTimeString(),
        read: true,
        source: "Control",
      },
    ];
    setAlerts(initial);
  }, []);

  // Generate live alerts from state changes
  useEffect(() => {
    if (!data || muted) return;
    const live = data.matches.find((m) => m.status === "live");
    const newAlerts = generateAlertsFromState(
      data.crowd.zones,
      data.transit,
      live && live.status === "live" ? live.minute : undefined,
    );
    if (newAlerts.length > 0) {
      setAlerts((prev) => {
        // De-duplicate by type (only one surge/transit alert at a time)
        const existingIds = new Set(prev.map((a) => a.id.split("-").slice(0, 2).join("-")));
        const fresh = newAlerts.filter(
          (a) => !existingIds.has(a.id.split("-").slice(0, 2).join("-")),
        );
        if (fresh.length === 0) return prev;
        return [...fresh, ...prev].slice(0, 20);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.crowd.zones, data?.transit, muted]);

  const markRead = useCallback((id: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, read: true } : a)));
  }, []);

  const markAllRead = useCallback(() => {
    setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
  }, []);

  const unreadCount = alerts.filter((a) => !a.read).length;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-live">Volunteer Mode</p>
          <h1 className="mt-1 text-3xl font-bold md:text-4xl flex items-center gap-3">
            <Bell className="size-8 text-live" aria-hidden />
            Alert Feed
            {unreadCount > 0 && (
              <Badge className="bg-live text-live-foreground text-sm" aria-label={`${unreadCount} unread alerts`}>
                {unreadCount}
              </Badge>
            )}
          </h1>
          <p className="mt-2 text-muted-foreground">
            Real-time operational alerts from the command center, AI system, and control.
          </p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllRead} id="mark-all-read-btn">
              <CheckCircle2 className="size-4 mr-1.5" aria-hidden />
              Mark all read
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMuted((v) => !v)}
            aria-pressed={muted}
            id="mute-alerts-btn"
            className={muted ? "border-live/40 text-live" : ""}
          >
            {muted ? <BellOff className="size-4 mr-1.5" aria-hidden /> : <Bell className="size-4 mr-1.5" aria-hidden />}
            {muted ? "Unmute" : "Mute"}
          </Button>
        </div>
      </header>

      {muted && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-50/30 px-4 py-3 text-sm text-amber-600" role="status">
          🔇 Alert notifications are muted. Live alerts will not appear until unmuted.
        </div>
      )}

      {/* Alert feed */}
      <section aria-labelledby="alerts-heading" aria-live="polite" aria-atomic="false">
        <h2 id="alerts-heading" className="sr-only">Operational alerts</h2>

        <ul className="space-y-3" aria-label="Operational alert feed">
          <AnimatePresence initial={false}>
            {alerts.map((alert) => {
              const { border, bg, icon: Icon } = LEVEL_STYLES[alert.level];
              return (
                <motion.li
                  key={alert.id}
                  initial={{ opacity: 0, y: -12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 48 }}
                  transition={{ duration: 0.25 }}
                >
                  <Card
                    className={`border ${border} ${bg} ${alert.read ? "opacity-70" : ""}`}
                    aria-live={alert.level === "critical" ? "assertive" : "polite"}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Icon
                          className={`size-5 shrink-0 mt-0.5 ${alert.level === "critical" ? "text-live" : alert.level === "warning" ? "text-amber-600" : "text-pitch"}`}
                          aria-hidden
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className={`font-semibold text-sm ${!alert.read ? "" : "text-muted-foreground"}`}>
                              {alert.title}
                            </p>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Badge variant="outline" className={`text-[10px] ${LEVEL_BADGE[alert.level]}`}>
                                {alert.level.toUpperCase()}
                              </Badge>
                              <Badge variant="outline" className="text-[10px] border-muted-foreground/30 text-muted-foreground">
                                <Radio className="size-2.5 mr-1" aria-hidden />
                                {alert.source}
                              </Badge>
                            </div>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{alert.message}</p>
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <p className="text-[10px] text-muted-foreground">{alert.timestamp}</p>
                            {!alert.read && (
                              <button
                                type="button"
                                onClick={() => markRead(alert.id)}
                                className="text-[10px] text-pitch hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                                aria-label={`Mark "${alert.title}" as read`}
                              >
                                Mark read
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>

        {alerts.length === 0 && (
          <Card>
            <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
              <CheckCircle2 className="size-5 text-pitch" aria-hidden />
              No alerts at this time. All systems nominal.
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
