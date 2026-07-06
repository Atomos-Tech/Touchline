import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Users, Activity, TrendingUp } from "lucide-react";
import { useMemo } from "react";
import { useLiveState } from "@/hooks/useLiveState";
import { LiveMatchCard } from "@/components/LiveMatchCard";
import { CrowdHeatmap } from "@/components/CrowdHeatmap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Live Command Center — FIFA 2026 Stadium Hub" },
      {
        name: "description",
        content:
          "Real-time knockout matches, crowd density heatmaps, and AI-powered stadium operations for FIFA World Cup 2026.",
      },
    ],
  }),
  component: CommandCenter,
});

function CommandCenter() {
  const { data, isLoading } = useLiveState();

  const { live, upcoming } = useMemo(() => {
    const matches = data?.matches ?? [];
    return {
      live: matches.filter((m) => m.status === "live"),
      upcoming: matches
        .filter((m) => m.status === "scheduled")
        .sort((a, b) => +new Date(a.kickoff) - +new Date(b.kickoff))
        .slice(0, 3),
    };
  }, [data]);

  return (
    <div className="space-y-8">
      <section aria-labelledby="hero-heading">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-deep p-6 text-deep-foreground md:p-10"
        >
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-widest text-pitch">
            <span className="live-dot" aria-hidden />
            Knockout Stage • Round of 16
          </div>
          <h1 id="hero-heading" className="mt-3 text-3xl font-bold md:text-5xl">
            Live Command Center
          </h1>
          <p className="mt-2 max-w-2xl text-deep-foreground/80">
            Real-time knockout scores, stadium crowd flow, and AI-driven operational
            intelligence — all in one place.
          </p>
        </motion.div>
      </section>

      <section aria-labelledby="live-heading" className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 id="live-heading" className="text-xl font-semibold">
            Live now
          </h2>
          <span className="text-sm text-muted-foreground">
            Auto-refreshing every 4s
          </span>
        </div>
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        ) : live.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {live.map((m) => (
              <LiveMatchCard key={m.id} match={m} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No matches currently live.</p>
        )}
      </section>

      <section aria-labelledby="stadium-heading" className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle id="stadium-heading" className="flex items-center gap-2">
              <Activity className="size-5 text-pitch" aria-hidden />
              Stadium crowd density
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data && <CrowdHeatmap zones={data.crowd.zones} />}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <StatCard
            icon={Users}
            label="Total attendance"
            value={data ? data.crowd.totalAttendance.toLocaleString() : "—"}
          />
          <StatCard
            icon={TrendingUp}
            label="Ingress / min"
            value={data ? data.crowd.ingressPerMin.toString() : "—"}
          />
          <StatCard
            icon={TrendingUp}
            label="Egress / min"
            value={data ? data.crowd.egressPerMin.toString() : "—"}
          />
        </div>
      </section>

      <section aria-labelledby="upcoming-heading" className="space-y-3">
        <h2 id="upcoming-heading" className="text-xl font-semibold">
          Upcoming today
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {upcoming.map((m) => (
            <LiveMatchCard key={m.id} match={m} />
          ))}
        </div>
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="grid size-10 place-items-center rounded-lg bg-pitch/10 text-pitch">
          <Icon className="size-5" aria-hidden />
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="text-2xl font-bold tabular-nums">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}
