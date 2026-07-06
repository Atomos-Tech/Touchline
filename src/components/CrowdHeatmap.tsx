import { motion } from "framer-motion";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import type { StadiumZone } from "@/types/domain";

function tone(pct: number) {
  if (pct >= 85) return "bg-live/15 text-live border-live/30";
  if (pct >= 65) return "bg-gold/20 text-foreground border-gold/40";
  return "bg-pitch/15 text-pitch border-pitch/30";
}

export function CrowdHeatmap({ zones }: { zones: StadiumZone[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {zones.map((z) => {
        const Icon = z.trend === "up" ? ArrowUp : z.trend === "down" ? ArrowDown : Minus;
        return (
          <li key={z.id}>
            <div
              className={`rounded-xl border p-3 ${tone(z.capacityPct)}`}
              role="group"
              aria-label={`${z.name} at ${z.capacityPct} percent capacity`}
            >
              <div className="flex items-center justify-between text-xs font-medium">
                <span>{z.name}</span>
                <Icon className="size-3.5" aria-hidden />
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <motion.span
                  key={z.capacityPct}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-2xl font-bold tabular-nums"
                >
                  {z.capacityPct}%
                </motion.span>
                {z.gate && <span className="text-xs opacity-70">{z.gate}</span>}
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/10">
                <motion.div
                  className="h-full rounded-full bg-current"
                  animate={{ width: `${z.capacityPct}%` }}
                  transition={{ type: "spring", stiffness: 120, damping: 20 }}
                />
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
