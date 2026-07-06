import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useLiveState } from "@/hooks/useLiveState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LiveMatchCard } from "@/components/LiveMatchCard";
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
          "Live FIFA World Cup 2026 knockout bracket from Round of 16 to the Final, plus archived group stage results.",
      },
    ],
  }),
  component: Tournament,
});

function Tournament() {
  const { data } = useLiveState();

  const { r16, group } = useMemo(() => {
    const matches = data?.matches ?? [];
    return {
      r16: matches.filter((m) => m.stage === "round_of_16"),
      group: matches.filter((m) => m.stage === "group"),
    };
  }, [data]);

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-widest text-pitch">Tournament</p>
        <h1 className="mt-1 text-3xl font-bold md:text-4xl">FIFA World Cup 2026 Bracket</h1>
        <p className="mt-2 text-muted-foreground">
          Round of 16 in progress. Group stage results archived below.
        </p>
      </header>

      <Tabs defaultValue="r16">
        <TabsList>
          <TabsTrigger value="r16">Round of 16</TabsTrigger>
          <TabsTrigger value="qf">Quarter-finals</TabsTrigger>
          <TabsTrigger value="sf">Semi-finals</TabsTrigger>
          <TabsTrigger value="final">Final</TabsTrigger>
        </TabsList>

        <TabsContent value="r16" className="mt-4">
          <Bracket matches={r16} />
        </TabsContent>
        <TabsContent value="qf" className="mt-4">
          <EmptyStage label="Quarter-finals begin after Round of 16 concludes." />
        </TabsContent>
        <TabsContent value="sf" className="mt-4">
          <EmptyStage label="Semi-finals TBD." />
        </TabsContent>
        <TabsContent value="final" className="mt-4">
          <EmptyStage label="Final TBD." />
        </TabsContent>
      </Tabs>

      <section aria-labelledby="group-heading" className="space-y-3">
        <h2 id="group-heading" className="text-xl font-semibold">
          Group stage results (archived)
        </h2>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {group.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-muted-foreground">
                      {new Date(m.kickoff).toLocaleDateString()}
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
                    <TableCell className="text-muted-foreground">{m.venue}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function Bracket({ matches }: { matches: Match[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {matches.map((m) => (
        <LiveMatchCard key={m.id} match={m} />
      ))}
    </div>
  );
}

function EmptyStage({ label }: { label: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base text-muted-foreground">{label}</CardTitle>
      </CardHeader>
    </Card>
  );
}
