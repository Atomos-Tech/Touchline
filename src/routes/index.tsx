import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Users, Activity, TrendingUp, Swords } from "lucide-react";
import { useMemo } from "react";
import { useLiveState } from "@/hooks/useLiveState";
import { LiveMatchCard } from "@/components/LiveMatchCard";
import { CrowdHeatmap } from "@/components/CrowdHeatmap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { AnalogClock } from "@/components/AnalogClock";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Live Command Center — FIFA 2026 Stadium Hub" },
      {
        name: "description",
        content:
          "Real-time FIFA World Cup 2026 knockout scores, crowd density heatmaps, and AI-powered stadium operations.",
      },
    ],
  }),
  component: CommandCenter,
});

function CommandCenter() {
  const { data, isLoading } = useLiveState();

  const { live, upcoming, recentResults, stageLabel } = useMemo(() => {
    const matches = data?.matches ?? [];
    const liveMatches = matches.filter((m) => m.status === "live");
    const upcomingMatches = matches
      .filter((m) => m.status === "scheduled")
      .sort((a, b) => +new Date(a.kickoff) - +new Date(b.kickoff))
      .slice(0, 3);
    const recentCompleted = matches
      .filter((m) => m.status === "completed")
      .sort((a, b) => +new Date(b.kickoff) - +new Date(a.kickoff))
      .slice(0, 4);

    // Find deepest active stage
    const stageOrder = ["final", "semi_final", "quarter_final", "round_of_16", "round_of_32", "group"] as const;
    const stageNames: Record<string, string> = {
      final: "Final",
      semi_final: "Semi-finals",
      quarter_final: "Quarter-finals",
      round_of_16: "Round of 16",
      round_of_32: "Round of 32",
      group: "Group Stage",
    };
    let activeStage = "Round of 16";
    for (const s of stageOrder) {
      if (matches.some((m) => m.stage === s)) {
        activeStage = stageNames[s];
        break;
      }
    }

    return {
      live: liveMatches,
      upcoming: upcomingMatches,
      recentResults: recentCompleted,
      stageLabel: activeStage,
    };
  }, [data]);

  return (
    <div className="space-y-8">
      {/* Hero banner */}
      <section aria-labelledby="hero-heading">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-2xl bg-deep p-6 text-deep-foreground md:p-10"
        >
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            {/* Left: text content */}
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-widest text-pitch">
                <span className="live-dot" aria-hidden />
                {stageLabel} · FIFA World Cup 2026
              </div>
              <h1 id="hero-heading" className="mt-3 text-3xl font-bold md:text-5xl">
                Live Command Center
              </h1>
              <p className="mt-2 max-w-2xl text-deep-foreground/80">
                Real match data from the FIFA 2026 API · Official YouTube highlights ·
                AI-powered stadium intelligence.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Badge className="border-pitch/50 bg-pitch/20 text-pitch-foreground text-xs" variant="outline">
                  ⚽ {data?.matches.filter(m => m.status === "completed").length ?? "—"} matches played
                </Badge>
                <Badge className="border-gold/50 bg-gold/10 text-xs" variant="outline">
                  {data?.matches.filter(m => m.status === "scheduled").length ?? "—"} upcoming
                </Badge>
              </div>
            </div>

            {/* Right: analog clock */}
            <motion.div
              initial={{ opacity: 0, scale: 0.85, rotate: -8 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 0.6, delay: 0.2, type: "spring", stiffness: 180, damping: 20 }}
              className="flex flex-col items-center gap-2"
              aria-label="Current time clock"
            >
              <AnalogClock size={180} />
              <p className="text-[11px] font-semibold uppercase tracking-widest text-pitch/70">
                Local Time
              </p>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Live now */}
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
          <Card>
            <CardContent className="flex items-center gap-3 p-5 text-sm text-muted-foreground">
              <Swords className="size-5 text-pitch" aria-hidden />
              No matches currently live.{" "}
              {upcoming.length > 0
                ? `Next: ${upcoming[0].home.name} vs ${upcoming[0].away.name}.`
                : "Check the Tournament tab for upcoming fixtures."}
            </CardContent>
          </Card>
        )}
      </section>

      {/* Crowd density + stats */}
      <section
        aria-labelledby="stadium-heading"
        className="grid gap-6 lg:grid-cols-3"
      >
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle
              id="stadium-heading"
              className="flex items-center gap-2"
            >
              <Activity className="size-5 text-pitch" aria-hidden />
              Stadium crowd density
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-48" />
            ) : (
              data && <CrowdHeatmap zones={data.crowd.zones} />
            )}
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

      {/* Recent results */}
      {recentResults.length > 0 && (
        <section aria-labelledby="results-heading" className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 id="results-heading" className="text-xl font-semibold">
              Recent results
            </h2>
            <Link
              to="/tournament"
              className="text-sm text-pitch hover:underline"
            >
              Full bracket →
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {recentResults.map((m) => (
              <LiveMatchCard key={m.id} match={m} />
            ))}
          </div>
        </section>
      )}

      {/* Upcoming today */}
      {upcoming.length > 0 && (
        <section aria-labelledby="upcoming-heading" className="space-y-3">
          <h2 id="upcoming-heading" className="text-xl font-semibold">
            Upcoming fixtures
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {upcoming.map((m) => (
              <LiveMatchCard key={m.id} match={m} />
            ))}
          </div>
        </section>
      )}
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
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            {label}
          </div>
          <div className="text-2xl font-bold tabular-nums">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}
