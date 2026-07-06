import { motion } from "framer-motion";
import type { Match } from "@/types/domain";
import { Card } from "@/components/ui/card";

export function LiveMatchCard({ match }: { match: Match }) {
  const isLive = match.status === "live";
  const isCompleted = match.status === "completed";

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-border bg-muted/50 px-4 py-2 text-xs uppercase tracking-wide text-muted-foreground">
        <span>{match.venue}</span>
        {isLive ? (
          <span className="flex items-center gap-1.5 font-bold text-live">
            <span className="live-dot" aria-hidden />
            <span aria-live="polite">LIVE • {(match as { minute?: number }).minute}'</span>
          </span>
        ) : isCompleted ? (
          <span className="font-semibold text-muted-foreground">FT</span>
        ) : (
          <span>{new Date(match.kickoff).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
        )}
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 py-4">
        <TeamRow flag={match.home.flag} name={match.home.name} />
        <motion.div
          key={`${match.homeScore}-${match.awayScore}`}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center font-mono text-2xl font-bold tabular-nums"
          aria-live={isLive ? "polite" : "off"}
        >
          {match.homeScore} <span className="text-muted-foreground">–</span> {match.awayScore}
        </motion.div>
        <TeamRow flag={match.away.flag} name={match.away.name} align="right" />
      </div>

      {isLive && "lastEvent" in match && match.lastEvent && (
        <div className="border-t border-border bg-pitch/5 px-4 py-2 text-xs text-muted-foreground">
          <span className="font-medium text-pitch">●</span> {match.lastEvent}
        </div>
      )}
    </Card>
  );
}

function TeamRow({
  flag,
  name,
  align = "left",
}: {
  flag: string;
  name: string;
  align?: "left" | "right";
}) {
  return (
    <div
      className={`flex items-center gap-2 ${align === "right" ? "flex-row-reverse text-right" : ""}`}
    >
      <span className="text-2xl" aria-hidden>
        {flag}
      </span>
      <span className="truncate font-semibold">{name}</span>
    </div>
  );
}
