import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { Trophy, Swords, Users2, Star, Award } from "lucide-react";
import { useLiveState } from "@/hooks/useLiveState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LiveMatchCard } from "@/components/LiveMatchCard";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Match } from "@/types/domain";

export const Route = createFileRoute("/tournament")({
  head: () => ({
    meta: [
      { title: "Tournament Bracket — FIFA 2026 Stadium Hub" },
      {
        name: "description",
        content:
          "Live FIFA World Cup 2026 knockout bracket — Round of 32 through the Final, with real scores from every match.",
      },
    ],
  }),
  component: Tournament,
});

const STAGE_META: Record<
  string,
  { label: string; icon: typeof Trophy; color: string }
> = {
  r16: { label: "Round of 16", icon: Swords, color: "text-pitch" },
  qf: { label: "Quarter-finals", icon: Trophy, color: "text-gold" },
  sf: { label: "Semi-finals", icon: Star, color: "text-amber-400" },
  final: { label: "Final", icon: Award, color: "text-live" },
};

function Tournament() {
  const { data, isLoading } = useLiveState();

  const { r32, r16, qf, sf, final, group } = useMemo(() => {
    const matches = data?.matches ?? [];
    return {
      r32: matches.filter((m) => m.stage === "round_of_32"),
      r16: matches.filter((m) => m.stage === "round_of_16"),
      qf: matches.filter((m) => m.stage === "quarter_final"),
      sf: matches.filter((m) => m.stage === "semi_final"),
      final: matches.filter(
        (m) => m.stage === "final" || m.stage === "third_place",
      ),
      group: matches.filter((m) => m.stage === "group"),
    };
  }, [data]);

  // Figure out the deepest active stage for default tab
  const defaultTab = useMemo(() => {
    if (sf.some((m) => m.status === "live" || m.status === "scheduled")) return "sf";
    if (qf.some((m) => m.status === "live" || m.status === "scheduled")) return "qf";
    if (r16.some((m) => m.status === "live" || m.status === "scheduled")) return "r16";
    if (r16.length > 0) return "r16";
    return "r32";
  }, [r16, qf, sf]);

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-widest text-pitch">
          Tournament
        </p>
        <h1 className="mt-1 text-3xl font-bold md:text-4xl">
          FIFA World Cup 2026 Bracket
        </h1>
        <p className="mt-2 text-muted-foreground">
          Real results from all {(data?.matches ?? []).length} matches — group
          stage through the Final.
        </p>
      </header>

      <Tabs defaultValue={defaultTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="r16">Round of 16</TabsTrigger>
          <TabsTrigger value="qf">Quarter-finals</TabsTrigger>
          <TabsTrigger value="sf">Semi-finals</TabsTrigger>
          <TabsTrigger value="final">Final</TabsTrigger>
          <TabsTrigger value="r32">Round of 32</TabsTrigger>
          <TabsTrigger value="group">Group Stage</TabsTrigger>
        </TabsList>

        <TabsContent value="r16" className="mt-4">
          <KnockoutBracket matches={r16} label="Round of 16" isLoading={isLoading} />
        </TabsContent>
        <TabsContent value="qf" className="mt-4">
          <KnockoutBracket matches={qf} label="Quarter-finals" isLoading={isLoading} />
        </TabsContent>
        <TabsContent value="sf" className="mt-4">
          <KnockoutBracket matches={sf} label="Semi-finals" isLoading={isLoading} />
        </TabsContent>
        <TabsContent value="final" className="mt-4">
          <KnockoutBracket matches={final} label="Final & 3rd Place" isLoading={isLoading} />
        </TabsContent>
        <TabsContent value="r32" className="mt-4">
          <KnockoutBracket matches={r32} label="Round of 32" isLoading={isLoading} />
        </TabsContent>
        <TabsContent value="group" className="mt-4">
          <GroupStageTable matches={group} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KnockoutBracket({
  matches,
  label,
  isLoading,
}: {
  matches: Match[];
  label: string;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    );
  }

  if (!matches.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-muted-foreground">
            {label} fixtures will appear here once confirmed.
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  const live = matches.filter((m) => m.status === "live");
  const scheduled = matches.filter((m) => m.status === "scheduled");
  const completed = matches.filter((m) => m.status === "completed");

  return (
    <div className="space-y-6">
      {live.length > 0 && (
        <section aria-labelledby={`${label}-live`} className="space-y-3">
          <h2
            id={`${label}-live`}
            className="flex items-center gap-2 text-base font-semibold text-live"
          >
            <span className="live-dot" aria-hidden /> Live now
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {live.map((m, i) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <LiveMatchCard match={m} />
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {scheduled.length > 0 && (
        <section aria-labelledby={`${label}-sched`} className="space-y-3">
          <h2
            id={`${label}-sched`}
            className="text-base font-semibold text-muted-foreground"
          >
            Upcoming
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {scheduled.map((m, i) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <LiveMatchCard match={m} />
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {completed.length > 0 && (
        <section aria-labelledby={`${label}-done`} className="space-y-3">
          <h2
            id={`${label}-done`}
            className="text-base font-semibold text-muted-foreground"
          >
            Completed
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {completed.map((m, i) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <LiveMatchCard match={m} />
              </motion.div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function GroupStageTable({ matches }: { matches: Match[] }) {
  if (!matches.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-muted-foreground">
            Loading group stage results…
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  // Group by 'group' label — extract from matches (we don't have direct group field in domain type)
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Home</TableHead>
              <TableHead className="text-center">Score</TableHead>
              <TableHead>Away</TableHead>
              <TableHead>Venue</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {matches
              .sort((a, b) => +new Date(a.kickoff) - +new Date(b.kickoff))
              .map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="text-muted-foreground text-xs">
                    {new Date(m.kickoff).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </TableCell>
                  <TableCell className="font-medium">
                    <span aria-hidden className="mr-2">
                      {m.home.flag}
                    </span>
                    {m.home.name}
                  </TableCell>
                  <TableCell className="text-center font-mono font-bold tabular-nums">
                    {m.homeScore} – {m.awayScore}
                  </TableCell>
                  <TableCell className="font-medium">
                    <span aria-hidden className="mr-2">
                      {m.away.flag}
                    </span>
                    {m.away.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {m.venue.split(",")[0]}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        m.status === "completed"
                          ? "secondary"
                          : m.status === "live"
                            ? "destructive"
                            : "outline"
                      }
                      className="capitalize text-[10px]"
                    >
                      {m.status === "completed" ? "FT" : m.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// Silence unused imports
export type { Stage } from "@/types/domain";
