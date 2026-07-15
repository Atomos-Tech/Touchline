import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Play, Eye, Clock, X, ExternalLink } from "lucide-react";
import { useState } from "react";
import { useHighlights } from "@/hooks/useLiveState";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import type { HighlightVideo } from "@/types/domain";

export const Route = createFileRoute("/highlights")({
  head: () => ({
    meta: [
      { title: "Official Highlights — FIFA 2026 Stadium Hub" },
      {
        name: "description",
        content:
          "Latest official FIFA World Cup 2026 highlights, goals, and top saves from the FIFA YouTube channel.",
      },
    ],
  }),
  component: Highlights,
});

// ---------------------------------------------------------------------------
// Utility formatters — pure functions, unit-testable
// ---------------------------------------------------------------------------

/** Format seconds as M:SS */
export function fmtDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Format view count as 1.2M / 890K */
export function fmtViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

/** Format ISO date as relative string */
export function fmtRelative(iso: string): string {
  const hrs = Math.round((Date.now() - +new Date(iso)) / 3_600_000);
  if (hrs < 1) return "Just now";
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}



// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function Highlights() {
  const { data, isLoading, isError } = useHighlights();
  const [selectedVideo, setSelectedVideo] = useState<HighlightVideo | null>(null);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-widest text-pitch">
          Highlights
        </p>
        <h1 className="mt-1 text-3xl font-bold md:text-4xl">
          Official FIFA highlights
        </h1>
        <p className="mt-2 text-muted-foreground">
          Most recent goals, saves, and match recaps from the FIFA YouTube
          channel — live data via YouTube Data API v3.
        </p>
      </header>

      {isLoading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      )}

      {isError && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Could not load highlights. Check your YouTube API key or network
            connection.
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && data && data.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            No highlights available right now — try again shortly.
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && data && data.length > 0 && (
        <ul
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
          aria-label="FIFA 2026 highlight videos"
        >
          {data.map((v, i) => (
            <motion.li
              key={v.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.3 }}
            >
              <VideoCard video={v} onPlay={() => setSelectedVideo(v)} />
            </motion.li>
          ))}
        </ul>
      )}

      {/* Video Player Modal */}
      <AnimatePresence>
        {selectedVideo && (
          <VideoModal
            video={selectedVideo}
            onClose={() => setSelectedVideo(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function VideoCard({
  video,
  onPlay,
}: {
  video: HighlightVideo;
  onPlay: () => void;
}) {
  const isRealThumbnail = video.thumbnail.startsWith("http");

  return (
    <Card className="group overflow-hidden p-0 transition-all hover:shadow-xl hover:shadow-black/10">
      <button
        type="button"
        className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`Play: ${video.title}`}
        onClick={onPlay}
      >
        {/* Thumbnail */}
        <div className="relative aspect-video w-full overflow-hidden bg-muted">
          {isRealThumbnail ? (
            <img
              src={video.thumbnail}
              alt={`Thumbnail for ${video.title}`}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-deep/80 via-deep to-slate-900" />
          )}

          {/* Play overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
            <div className="grid size-14 place-items-center rounded-full bg-white/95 text-deep shadow-lg">
              <Play className="size-6 fill-current" aria-hidden />
            </div>
          </div>

          {/* Duration badge */}
          <div className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-xs font-medium text-white">
            {fmtDuration(video.durationSec)}
          </div>

          {/* FIFA Official badge */}
          {video.channel === "FIFA" && (
            <div className="absolute top-2 left-2 rounded bg-live px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-live-foreground">
              FIFA Official
            </div>
          )}
        </div>

        {/* Metadata */}
        <CardContent className="p-4">
          <h3 className="line-clamp-2 font-semibold leading-snug">{video.title}</h3>
          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
            <span>{video.channel}</span>
            <span className="flex items-center gap-1">
              <Eye className="size-3" aria-hidden />
              {fmtViews(video.views)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="size-3" aria-hidden />
              {fmtRelative(video.publishedAt)}
            </span>
          </div>
        </CardContent>
      </button>
    </Card>
  );
}

function VideoModal({
  video,
  onClose,
}: {
  video: HighlightVideo;
  onClose: () => void;
}) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      role="dialog"
      aria-modal
      aria-label={`Playing: ${video.title}`}
    >
      <motion.div
        className="relative w-full max-w-4xl rounded-2xl overflow-hidden bg-black shadow-2xl"
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* YouTube embed */}
        <div className="aspect-video w-full">
          <iframe
            src={`https://www.youtube.com/embed/${video.id}?autoplay=1&rel=0`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full border-0"
          />
        </div>

        {/* Footer with title + external link */}
        <div className="flex items-center justify-between gap-3 bg-deep px-4 py-3 text-deep-foreground">
          <div className="flex-1 min-w-0">
            <p className="truncate font-semibold text-sm">{video.title}</p>
            <p className="text-xs text-deep-foreground/60">
              {video.channel} · {fmtViews(video.views)} views ·{" "}
              {fmtRelative(video.publishedAt)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`https://www.youtube.com/watch?v=${video.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-md border border-white/20 px-3 py-1.5 text-xs font-medium text-deep-foreground/80 transition-colors hover:bg-white/10"
              aria-label="Open on YouTube"
            >
              <ExternalLink className="size-3.5" aria-hidden />
              YouTube
            </a>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Close video"
              className="text-deep-foreground/80 hover:bg-white/10 hover:text-deep-foreground"
            >
              <X className="size-5" aria-hidden />
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
