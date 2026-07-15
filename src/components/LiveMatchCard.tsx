/**
 * LiveMatchCard — rich match card with real scorer timeline, venue, and live weather.
 *
 * Shows:
 * - Match status (LIVE · minute, FT, or kickoff time)
 * - Teams + flags + score (animated on change)
 * - Penalty shootout result if applicable
 * - Goal timeline: scorer name + minute, with ⚽/🤦 for OG
 * - Venue: full stadium name + city
 * - Real current weather via Open-Meteo (no API key needed)
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, MapPin } from "lucide-react";
import type { Match, GoalEvent } from "@/types/domain";
import { Card } from "@/components/ui/card";
import { WeatherBadge } from "@/components/WeatherBadge";
import { STADIUM_COORDS } from "@/services/weatherApi";

export function LiveMatchCard({ match }: { match: Match }) {
  const [expanded, setExpanded] = useState(false);
  const isLive = match.status === "live";
  const isCompleted = match.status === "completed";
  const isScheduled = match.status === "scheduled";
  const hasGoals = match.goals.length > 0;
  const venue = STADIUM_COORDS[match.stadiumId];
  const penalties = isCompleted ? match.penalties : undefined;

  return (
    <Card className="overflow-hidden p-0 transition-all hover:shadow-md">
      {/* Status bar */}
      <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2 text-xs uppercase tracking-wide text-muted-foreground">
        <div className="flex items-center gap-1.5 truncate">
          <MapPin className="size-3 shrink-0 text-pitch" aria-hidden />
          <span className="truncate font-medium">
            {venue ? `${venue.name}, ${venue.city}` : match.venue}
          </span>
        </div>

        {isLive ? (
          <span className="flex shrink-0 items-center gap-1.5 font-bold text-live">
            <span className="live-dot" aria-hidden />
            <span aria-live="polite">
              LIVE · {isLive && match.minute}&prime;
            </span>
          </span>
        ) : isCompleted ? (
          <span className="shrink-0 font-semibold">FT</span>
        ) : (
          <span className="shrink-0">
            {new Date(match.kickoff).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              timeZone: venue?.timezone,
            })}
          </span>
        )}
      </div>

      {/* Score row */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 py-4">
        <TeamCell flag={match.home.flag} name={match.home.name} />

        <div className="text-center whitespace-nowrap">
          <motion.div
            key={`${match.homeScore}-${match.awayScore}`}
            initial={{ scale: 0.88, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="font-mono text-2xl font-bold tabular-nums"
            aria-live={isLive ? "polite" : "off"}
          >
            {match.homeScore}{" "}
            <span className="text-muted-foreground">–</span>{" "}
            {match.awayScore}
          </motion.div>

          {/* Penalty result */}
          {penalties && (
            <div className="mt-0.5 text-[11px] font-semibold text-gold tabular-nums">
              ({penalties.home} – {penalties.away}) pens
            </div>
          )}

          {/* Match time for scheduled */}
          {isScheduled && (
            <div className="mt-1 text-[10px] text-muted-foreground">
              {new Date(match.kickoff).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: venue?.timezone,
              })}{" "}
              local
            </div>
          )}
        </div>

        <TeamCell
          flag={match.away.flag}
          name={match.away.name}
          align="right"
        />
      </div>

      {/* Weather row — always visible */}
      <div className="px-4 pb-3">
        <WeatherBadge stadiumId={match.stadiumId} compact />
      </div>

      {/* Goal timeline toggle — only if there are goals */}
      {hasGoals && (
        <>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex w-full items-center justify-between border-t border-border bg-muted/20 px-4 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-expanded={expanded}
            aria-controls={`goals-${match.id}`}
            aria-label={expanded ? "Collapse goal timeline" : "Show goal scorers"}
          >
            <span className="flex items-center gap-1.5">
              ⚽ {match.goals.length} goal{match.goals.length !== 1 ? "s" : ""}
              {!expanded && (
                <span className="text-foreground/70">
                  · {match.goals.map((g) => `${g.scorer} ${g.minute}`).join(", ")}
                </span>
              )}
            </span>
            {expanded ? (
              <ChevronUp className="size-3.5" aria-hidden />
            ) : (
              <ChevronDown className="size-3.5" aria-hidden />
            )}
          </button>

          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                id={`goals-${match.id}`}
                key="goals"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="overflow-hidden"
                role="list"
                aria-label="Goal timeline"
              >
                <GoalTimeline
                  goals={match.goals}
                  homeName={match.home.name}
                  awayName={match.away.name}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* Live last event */}
      {isLive && "lastEvent" in match && match.lastEvent && !hasGoals && (
        <div className="border-t border-border bg-pitch/5 px-4 py-2 text-xs text-muted-foreground">
          <span className="font-medium text-pitch">●</span> {match.lastEvent}
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TeamCell({
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
      <span className="text-2xl leading-none" aria-hidden>
        {flag}
      </span>
      <span className="truncate text-sm font-semibold">{name}</span>
    </div>
  );
}

function GoalTimeline({
  goals,
  homeName,
  awayName,
}: {
  goals: GoalEvent[];
  homeName: string;
  awayName: string;
}) {
  return (
    <div className="divide-y divide-border/50 px-4">
      {goals.map((g, i) => (
        <div
          key={i}
          role="listitem"
          className={`flex items-center gap-3 py-2 ${g.team === "away" ? "flex-row-reverse text-right" : ""}`}
        >
          {/* Minute badge */}
          <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums text-foreground">
            {g.minute}
          </span>

          {/* Goal icon */}
          <span className="text-base" aria-hidden>
            {g.isOwnGoal ? "🤦" : g.isPenalty ? "🎯" : "⚽"}
          </span>

          {/* Scorer */}
          <div className="flex-1 min-w-0">
            <p className="truncate text-xs font-medium">
              {g.scorer}
              {g.isOwnGoal && (
                <span className="ml-1 text-[10px] text-muted-foreground">(OG)</span>
              )}
              {g.isPenalty && (
                <span className="ml-1 text-[10px] text-muted-foreground">(pen.)</span>
              )}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {g.team === "home" ? homeName : awayName}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
