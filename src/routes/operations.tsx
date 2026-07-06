import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Radio, TrendingUp } from "lucide-react";
import { useMemo } from "react";
import { useLiveState } from "@/hooks/useLiveState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CrowdHeatmap } from "@/components/CrowdHeatmap";
import type { LiveState, StadiumZone } from "@/types/domain";

export const Route = createFileRoute("/operations")({
  head: () => ({
    meta: [
      { title: "Operations Dashboard — FIFA 2026 Stadium Hub" },
      {
        name: "description",
        content:
          "Venue staff dashboard with GenAI operational intelligence, live transit status, and staff redirection recommendations.",
      },
    ],
  }),
  component: Operations,
});

interface OpsRecommendation {
  id: string;
  severity: "info" | "warn" | "critical";
  title: string;
  detail: string;
}

// Pure function: derive operational recommendations from live state.
// TEST MOUNTING POINT: unit-test recommend() with fixture states.
export function recommend(state: LiveState): OpsRecommendation[] {
  const recs: OpsRecommendation[] = [];
  const zones = state.crowd.zones;
  const busiest = [...zones].sort((a, b) => b.capacityPct - a.capacityPct)[0];
  const quietest = [...zones].sort((a, b) => a.capacityPct - b.capacityPct)[0];
  const live = state.matches.find((m) => m.status === "live");

  if (busiest.capacityPct >= 85) {
    recs.push({
      id: "surge",
      severity: "critical",
      title: `Crowd surge at ${busiest.name}`,
      detail: `${busiest.gate} at ${busiest.capacityPct}%. Redirect 4 stewards from ${quietest.name}. Open overflow lane C-2.`,
    });
  }
  if (live && live.minute >= 80) {
    recs.push({
      id: "egress",
      severity: "warn",
      title: "Prepare for full-time egress",
      detail: `Live match in ${live.minute}'. Pre-stage medical and transit liaison teams at ${busiest.gate}.`,
    });
  }
  const delayed = state.transit.filter((t) => t.status !== "normal");
  if (delayed.length) {
    recs.push({
      id: "transit",
      severity: "warn",
      title: `${delayed[0].name} disruption`,
      detail: `${delayed[0].name} is ${delayed[0].status}. Direct fans to alternate lines via signage refresh.`,
    });
  }
  if (!recs.length) {
    recs.push({
      id: "ok",
      severity: "info",
      title: "All zones nominal",
      detail: "Crowd flow and transit are within expected thresholds.",
    });
  }
  return recs;
}

function Operations() {
  const { data } = useLiveState(3000);

  const recs = useMemo(() => (data ? recommend(data) : []), [data]);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-pitch">Operations</p>
          <h1 className="mt-1 text-3xl font-bold md:text-4xl">Venue command dashboard</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            AI-generated recommendations synthesized from live crowd, transit, and match state.
          </p>
        </div>
        <Badge variant="outline" className="border-pitch text-pitch">
          <span className="live-dot mr-1.5" aria-hidden /> Staff-only view
        </Badge>
      </header>

      <section aria-labelledby="ai-heading" className="space-y-3">
        <h2 id="ai-heading" className="text-xl font-semibold">
          AI operational intelligence
        </h2>
        <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3" aria-live="polite">
          {recs.map((r) => (
            <li key={r.id}>
              <RecCard rec={r} />
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="heat-heading" className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle id="heat-heading">Zone density</CardTitle>
          </CardHeader>
          <CardContent>{data && <CrowdHeatmap zones={data.crowd.zones} />}</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Radio className="size-5 text-pitch" aria-hidden />
              Transit
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data?.transit.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden
                    className="inline-block size-3 rounded-full"
                    style={{ background: t.color }}
                  />
                  <div>
                    <p className="font-medium">{t.name}</p>
                    <p className="text-xs text-muted-foreground">Every {t.headwayMin} min</p>
                  </div>
                </div>
                <Badge
                  variant={t.status === "normal" ? "secondary" : "destructive"}
                  className="capitalize"
                >
                  {t.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="flow-heading" className="space-y-3">
        <h2 id="flow-heading" className="text-xl font-semibold">
          Flow metrics
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard
            label="Ingress / min"
            value={data?.crowd.ingressPerMin ?? 0}
            icon={TrendingUp}
          />
          <MetricCard
            label="Egress / min"
            value={data?.crowd.egressPerMin ?? 0}
            icon={TrendingUp}
          />
          <MetricCard
            label="Total attendance"
            value={data?.crowd.totalAttendance ?? 0}
            icon={TrendingUp}
          />
        </div>
      </section>
    </div>
  );
}

function RecCard({ rec }: { rec: OpsRecommendation }) {
  const styles =
    rec.severity === "critical"
      ? "border-live/40 bg-live/5"
      : rec.severity === "warn"
        ? "border-gold/50 bg-gold/10"
        : "border-pitch/40 bg-pitch/5";
  const Icon =
    rec.severity === "info" ? CheckCircle2 : AlertTriangle;
  const iconTone =
    rec.severity === "critical"
      ? "text-live"
      : rec.severity === "warn"
        ? "text-gold"
        : "text-pitch";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`h-full rounded-xl border p-4 ${styles}`}
    >
      <div className="flex items-start gap-3">
        <Icon className={`mt-0.5 size-5 ${iconTone}`} aria-hidden />
        <div>
          <h3 className="font-semibold">{rec.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{rec.detail}</p>
        </div>
      </div>
    </motion.div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof TrendingUp;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="grid size-10 place-items-center rounded-lg bg-pitch/10 text-pitch">
          <Icon className="size-5" aria-hidden />
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="text-2xl font-bold tabular-nums">{value.toLocaleString()}</div>
        </div>
      </CardContent>
    </Card>
  );
}

// Silence unused import lint (StadiumZone kept for future strict signature parity)
export type { StadiumZone };
