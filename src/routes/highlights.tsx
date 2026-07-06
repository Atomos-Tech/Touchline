import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Play, Eye, Clock } from "lucide-react";
import { useHighlights } from "@/hooks/useLiveState";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { HighlightVideo } from "@/types/domain";

export const Route = createFileRoute("/highlights")({
  head: () => ({
    meta: [
      { title: "Official Highlights — FIFA 2026 Stadium Hub" },
      {
        name: "description",
        content:
          "Latest official FIFA World Cup 2026 highlights, goals, and top saves, streamed via a YouTube Data API v3 style feed.",
      },
    ],
  }),
  component: Highlights,
});

const GRADIENTS: Record<string, string> = {
  g1: "from-sky-600 via-blue-700 to-indigo-900",
  g2: "from-blue-600 via-indigo-700 to-slate-900",
  g3: "from-emerald-600 via-teal-700 to-slate-900",
  g4: "from-yellow-500 via-emerald-600 to-slate-900",
  g5: "from-rose-600 via-red-700 to-slate-900",
  g6: "from-red-600 via-orange-700 to-slate-900",
};

function fmtDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function fmtViews(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

function fmtRelative(iso: string) {
  const hrs = Math.round((Date.now() - +new Date(iso)) / 3_600_000);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export default function _unused() {}

function Highlights() {
  const { data, isLoading } = useHighlights();

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-widest text-pitch">Highlights</p>
        <h1 className="mt-1 text-3xl font-bold md:text-4xl">Official FIFA highlights</h1>
        <p className="mt-2 text-muted-foreground">
          Most recent goals, saves, and match recaps from the knockout stage.
        </p>
      </header>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data?.map((v, i) => (
            <motion.li
              key={v.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <VideoCard video={v} />
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  );
}

function VideoCard({ video }: { video: HighlightVideo }) {
  return (
    <Card className="group overflow-hidden p-0 transition-shadow hover:shadow-lg">
      <button
        type="button"
        className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`Play highlight: ${video.title}`}
      >
        <div
          className={`relative aspect-video w-full bg-gradient-to-br ${
            GRADIENTS[video.thumbnail] ?? "from-slate-700 to-slate-900"
          }`}
        >
          <div className="absolute inset-0 grid place-items-center opacity-0 transition-opacity group-hover:opacity-100">
            <div className="grid size-14 place-items-center rounded-full bg-white/95 text-deep">
              <Play className="size-6 fill-current" aria-hidden />
            </div>
          </div>
          <div className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-xs font-medium text-white">
            {fmtDuration(video.durationSec)}
          </div>
          <div className="absolute top-2 left-2 rounded bg-live px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-live-foreground">
            FIFA Official
          </div>
        </div>
        <CardContent className="p-4">
          <h3 className="line-clamp-2 font-semibold leading-snug">{video.title}</h3>
          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
            <span>{video.channel}</span>
            <span className="flex items-center gap-1">
              <Eye className="size-3" aria-hidden /> {fmtViews(video.views)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="size-3" aria-hidden /> {fmtRelative(video.publishedAt)}
            </span>
          </div>
        </CardContent>
      </button>
    </Card>
  );
}
