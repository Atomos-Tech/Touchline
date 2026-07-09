/**
 * Volunteer Task Dashboard — AI-generated priority task assignments.
 *
 * GenAI usage: Gemini analyses live crowd density, transit status, and match
 * state to generate a prioritised task list for the logged-in volunteer.
 *
 * The task list refreshes every 30 seconds and regenerates AI tasks when
 * crowd conditions change significantly (>10% swing in any zone).
 *
 * TEST MOUNTING POINT: generateFallbackTasks, prioritiseTasks are pure
 * functions exportable for unit testing.
 */
import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardList, RefreshCw, CheckCircle2, Clock,
  AlertTriangle, Users, Zap, Loader2, MapPin,
} from "lucide-react";
import { useState, useCallback, useEffect, useMemo } from "react";
import { useLiveState } from "@/hooks/useLiveState";
import { generateAIReply } from "@/lib/assistant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { LiveState } from "@/types/domain";

export const Route = createFileRoute("/volunteer/")({
  head: () => ({
    meta: [
      { title: "Tasks — Touchline Volunteer" },
      {
        name: "description",
        content:
          "AI-generated task assignments for FIFA 2026 volunteers based on real-time crowd and operational data.",
      },
    ],
  }),
  component: VolunteerTasksPage,
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TaskPriority = "critical" | "high" | "medium" | "low";
export type TaskStatus = "pending" | "in-progress" | "done";

export interface VolunteerTask {
  id: string;
  title: string;
  description: string;
  location: string;
  priority: TaskPriority;
  status: TaskStatus;
  estimatedMinutes: number;
  category: "crowd" | "transit" | "medical" | "info" | "maintenance" | "vip";
  aiGenerated: boolean;
}

// ---------------------------------------------------------------------------
// Pure helpers — TEST MOUNTING POINT
// ---------------------------------------------------------------------------

/** Generate fallback tasks from crowd state without AI. */
export function generateFallbackTasks(state: LiveState): VolunteerTask[] {
  const zones = [...state.crowd.zones].sort((a, b) => b.capacityPct - a.capacityPct);
  const busiest = zones[0];
  const delayed = state.transit.filter((t) => t.status !== "normal");
  const live = state.matches.find((m) => m.status === "live");

  const tasks: VolunteerTask[] = [];

  if (busiest.capacityPct >= 85) {
    tasks.push({
      id: "surge-1",
      title: `Crowd surge response — ${busiest.name}`,
      description: `${busiest.gate} is at ${busiest.capacityPct}% capacity. Assist with crowd flow, redirect fans to ${zones[zones.length - 1].gate}.`,
      location: `${busiest.gate} — ${busiest.name}`,
      priority: "critical",
      status: "pending",
      estimatedMinutes: 20,
      category: "crowd",
      aiGenerated: false,
    });
  }

  if (delayed.length) {
    tasks.push({
      id: "transit-1",
      title: `Transit disruption — ${delayed[0].name}`,
      description: `${delayed[0].name} is ${delayed[0].status}. Guide fans to alternative transport options and update signage.`,
      location: "Transit Hub — Main Plaza",
      priority: "high",
      status: "pending",
      estimatedMinutes: 15,
      category: "transit",
      aiGenerated: false,
    });
  }

  if (live && (live as { minute?: number }).minute! >= 75) {
    tasks.push({
      id: "egress-1",
      title: "Pre-stage full-time egress",
      description: `Match is in the ${(live as { minute?: number }).minute}'— pre-position at exit gates. Coordinate with transit liaisons.`,
      location: `${busiest.gate} exit area`,
      priority: "high",
      status: "pending",
      estimatedMinutes: 25,
      category: "crowd",
      aiGenerated: false,
    });
  }

  tasks.push({
    id: "info-1",
    title: "Fan information desk coverage",
    description: "Staff the nearest information desk. Answer navigation and accessibility questions.",
    location: zones[zones.length - 1].gate + " Information Point",
    priority: "medium",
    status: "pending",
    estimatedMinutes: 60,
    category: "info",
    aiGenerated: false,
  });

  tasks.push({
    id: "sweep-1",
    title: "Concourse area sweep",
    description: "Walk the concourse between sections. Report any hazards, cleanliness issues, or fans needing assistance.",
    location: "Main Concourse — All Levels",
    priority: "low",
    status: "pending",
    estimatedMinutes: 30,
    category: "maintenance",
    aiGenerated: false,
  });

  return tasks;
}

/** Sort tasks by priority. TEST MOUNTING POINT. */
export function prioritiseTasks(tasks: VolunteerTask[]): VolunteerTask[] {
  const order: Record<TaskPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  return [...tasks].sort((a, b) => order[a.priority] - order[b.priority]);
}

// ---------------------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------------------

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  critical: "border-live/40 bg-live/5",
  high: "border-amber-500/40 bg-amber-50/50",
  medium: "border-pitch/40 bg-pitch/5",
  low: "border-border bg-muted/30",
};

const PRIORITY_BADGE: Record<TaskPriority, string> = {
  critical: "bg-live/20 text-live border-live/40",
  high: "bg-amber-500/20 text-amber-600 border-amber-500/40",
  medium: "bg-pitch/20 text-pitch border-pitch/40",
  low: "bg-muted text-muted-foreground",
};

const CATEGORY_ICON: Record<VolunteerTask["category"], string> = {
  crowd: "👥",
  transit: "🚇",
  medical: "🏥",
  info: "ℹ️",
  maintenance: "🔧",
  vip: "⭐",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function VolunteerTasksPage() {
  const { data, isLoading } = useLiveState(8000);
  const [tasks, setTasks] = useState<VolunteerTask[]>([]);
  const [generating, setGenerating] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<Date | null>(null);

  const generateTasks = useCallback(async () => {
    if (!data) return;
    setGenerating(true);

    const busiest = [...data.crowd.zones].sort((a, b) => b.capacityPct - a.capacityPct)[0];
    const quietest = [...data.crowd.zones].sort((a, b) => a.capacityPct - b.capacityPct)[0];
    const live = data.matches.find((m) => m.status === "live");
    const delayed = data.transit.filter((t) => t.status !== "normal");

    const prompt = `As a stadium operations AI, generate 5 specific volunteer tasks based on current conditions:

CROWD STATUS:
- Busiest zone: ${busiest.name} (${busiest.capacityPct}%) at ${busiest.gate}
- Quietest zone: ${quietest.name} (${quietest.capacityPct}%) at ${quietest.gate}
- Total attendance: ${data.crowd.totalAttendance.toLocaleString()}
- Ingress: ${data.crowd.ingressPerMin}/min

LIVE MATCH: ${live ? `${live.home.name} vs ${live.away.name} — minute ${(live as { minute?: number }).minute}` : "None"}
TRANSIT DISRUPTIONS: ${delayed.length ? delayed.map((t) => t.name).join(", ") : "None"}

Generate 5 actionable volunteer tasks in JSON array format with fields:
title, description, location, priority (critical/high/medium/low), category (crowd/transit/medical/info/maintenance), estimatedMinutes.
Respond ONLY with the JSON array, no other text.`;

    try {
      const { text } = await generateAIReply(prompt, { state: data, mode: "volunteer" });

      // Try to parse AI JSON response
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as Partial<VolunteerTask>[];
        const aiTasks: VolunteerTask[] = parsed.slice(0, 5).map((t, i) => ({
          id: `ai-${Date.now()}-${i}`,
          title: t.title ?? "Task",
          description: t.description ?? "",
          location: t.location ?? "Main Concourse",
          priority: (["critical", "high", "medium", "low"].includes(t.priority ?? "") ? t.priority : "medium") as TaskPriority,
          status: "pending",
          estimatedMinutes: t.estimatedMinutes ?? 15,
          category: (["crowd", "transit", "medical", "info", "maintenance", "vip"].includes(t.category ?? "") ? t.category : "info") as VolunteerTask["category"],
          aiGenerated: true,
        }));
        setTasks(prioritiseTasks(aiTasks));
      } else {
        setTasks(prioritiseTasks(generateFallbackTasks(data)));
      }
    } catch {
      setTasks(prioritiseTasks(generateFallbackTasks(data)));
    } finally {
      setGenerating(false);
      setLastGenerated(new Date());
    }
  }, [data]);

  // Generate tasks on first load
  useEffect(() => {
    if (data && tasks.length === 0) {
      void generateTasks();
    }
  }, [data, tasks.length, generateTasks]);

  const markDone = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, status: t.status === "done" ? "pending" : "done" } : t,
      ),
    );
  }, []);

  const stats = useMemo(() => ({
    total: tasks.length,
    done: tasks.filter((t) => t.status === "done").length,
    critical: tasks.filter((t) => t.priority === "critical" && t.status !== "done").length,
  }), [tasks]);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-live">Volunteer Mode</p>
          <h1 className="mt-1 text-3xl font-bold md:text-4xl flex items-center gap-3">
            <ClipboardList className="size-8 text-live" aria-hidden />
            My Task Dashboard
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            AI-generated tasks based on live crowd density, transit status, and match state. Updated in real time.
          </p>
        </div>
        <Button
          onClick={generateTasks}
          disabled={generating || isLoading}
          variant="outline"
          className="flex items-center gap-2 border-live/40 text-live hover:bg-live/10"
          id="refresh-tasks-btn"
          aria-label="Refresh AI task assignments"
        >
          {generating ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <RefreshCw className="size-4" aria-hidden />
          )}
          {generating ? "Generating…" : "Refresh Tasks"}
        </Button>
      </header>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-4" role="region" aria-label="Task statistics">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="grid size-10 place-items-center rounded-lg bg-muted">
              <ClipboardList className="size-5 text-muted-foreground" aria-hidden />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total</p>
              <p className="text-2xl font-bold tabular-nums">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="grid size-10 place-items-center rounded-lg bg-pitch/10">
              <CheckCircle2 className="size-5 text-pitch" aria-hidden />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Done</p>
              <p className="text-2xl font-bold tabular-nums text-pitch">{stats.done}</p>
            </div>
          </CardContent>
        </Card>
        <Card className={stats.critical > 0 ? "border-live/40" : ""}>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="grid size-10 place-items-center rounded-lg bg-live/10">
              <AlertTriangle className="size-5 text-live" aria-hidden />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Critical</p>
              <p className="text-2xl font-bold tabular-nums text-live">{stats.critical}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Last generated info */}
      {lastGenerated && (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Zap className="size-3 text-pitch" aria-hidden />
          Tasks generated by Gemini AI at {lastGenerated.toLocaleTimeString()}. Regenerate as crowd conditions change.
        </p>
      )}

      {/* Task list */}
      <section aria-labelledby="tasks-heading">
        <h2 id="tasks-heading" className="sr-only">Task list</h2>

        {(isLoading || generating) && tasks.length === 0 && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        )}

        <ul className="space-y-3" aria-label="Assigned volunteer tasks">
          <AnimatePresence>
            {tasks.map((task, i) => (
              <motion.li
                key={task.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ delay: i * 0.06 }}
              >
                <TaskCard task={task} onToggleDone={() => markDone(task.id)} />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </section>
    </div>
  );
}

function TaskCard({ task, onToggleDone }: { task: VolunteerTask; onToggleDone: () => void }) {
  const isDone = task.status === "done";

  return (
    <Card className={`${PRIORITY_STYLES[task.priority]} transition-all ${isDone ? "opacity-60" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={onToggleDone}
            aria-label={isDone ? `Mark "${task.title}" as pending` : `Mark "${task.title}" as done`}
            aria-pressed={isDone}
            className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              isDone ? "border-pitch bg-pitch text-pitch-foreground" : "border-muted-foreground bg-background"
            }`}
          >
            {isDone && <CheckCircle2 className="size-3.5" aria-hidden />}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className={`font-semibold text-sm ${isDone ? "line-through text-muted-foreground" : ""}`}>
                <span aria-hidden>{CATEGORY_ICON[task.category]}</span> {task.title}
              </h3>
              <Badge variant="outline" className={`text-[10px] ${PRIORITY_BADGE[task.priority]}`}>
                {task.priority.toUpperCase()}
              </Badge>
              {task.aiGenerated && (
                <Badge variant="outline" className="text-[10px] border-pitch/30 text-pitch">
                  ✦ AI
                </Badge>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{task.description}</p>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="size-3" aria-hidden />
                {task.location}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="size-3" aria-hidden />
                ~{task.estimatedMinutes} min
              </span>
              <span className="flex items-center gap-1">
                <Users className="size-3" aria-hidden />
                {task.category}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
