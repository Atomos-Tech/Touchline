/**
 * Organizer Incidents — AI-powered incident management dashboard.
 *
 * GenAI usage: Gemini analyses incident details and crowd context to
 * provide triage recommendations and escalation decisions.
 *
 * TEST MOUNTING POINT: triageIncident, calcResponseTime are pure functions.
 */
import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileWarning, AlertTriangle, CheckCircle2, Clock,
  MapPin, TrendingUp, Loader2, ShieldAlert, Send,
} from "lucide-react";
import { useState, useCallback, useMemo } from "react";
import { useLiveState } from "@/hooks/useLiveState";
import { generateAIReply } from "@/lib/assistant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/ops/incidents")({
  head: () => ({
    meta: [
      { title: "Incident Management — Touchline Organizer" },
      { name: "description", content: "AI-powered incident triage and management for FIFA 2026 venue organizers." },
    ],
  }),
  component: IncidentsPage,
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Severity = "critical" | "high" | "medium" | "low";
type Status = "open" | "in-progress" | "resolved";

interface ManagedIncident {
  id: string;
  title: string;
  description: string;
  location: string;
  severity: Severity;
  status: Status;
  reportedBy: string;
  timestamp: string;
  responseTime?: number; // minutes
  aiTriage?: string;
  actions: string[];
}

// ---------------------------------------------------------------------------
// Pure helpers — TEST MOUNTING POINT
// ---------------------------------------------------------------------------

/** Classify triage priority based on type keywords. TEST MOUNTING POINT. */
export function triageIncident(description: string): Severity {
  const d = description.toLowerCase();
  if (/(fire|smoke|explosion|weapon|cardiac|unconscious|terror)/.test(d)) return "critical";
  if (/(fight|medical|injury|surge|evacuation|crowd crush)/.test(d)) return "high";
  if (/(delay|blocked|missing|lost|disruptive)/.test(d)) return "medium";
  return "low";
}

/** Calculate response time in minutes from timestamp string. TEST MOUNTING POINT. */
export function calcResponseTime(timestamp: string): number {
  const then = new Date(`1970-01-01T${timestamp}`).getTime();
  const now = new Date().getHours() * 3600000 + new Date().getMinutes() * 60000;
  return Math.max(0, Math.round((now - then) / 60000));
}

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const SAMPLE_INCIDENTS: ManagedIncident[] = [
  {
    id: "inc-001",
    title: "Crowd surge at Gate A",
    description: "North concourse experiencing crowd surge. Estimated 92% capacity. Fans pushing at turnstiles.",
    location: "Gate A — North Concourse",
    severity: "critical",
    status: "in-progress",
    reportedBy: "Volunteer J. Martinez",
    timestamp: new Date(Date.now() - 8 * 60000).toLocaleTimeString(),
    responseTime: 8,
    aiTriage: "Deploy 6 additional stewards from South Concourse. Open emergency overflow route via Service Corridor B. Halt further fan entry at Gate A for 5 minutes. Alert Transit Liaison for early egress staging.",
    actions: ["Stewards deployed", "Overflow corridor opened"],
  },
  {
    id: "inc-002",
    title: "Red Line Metro delayed",
    description: "Red Line Metro experiencing 15-minute delays. Passenger buildup at stadium stop.",
    location: "Transit Hub — Main Plaza",
    severity: "high",
    status: "in-progress",
    reportedBy: "Transit Liaison",
    timestamp: new Date(Date.now() - 22 * 60000).toLocaleTimeString(),
    responseTime: 22,
    aiTriage: "Dispatch 4 additional shuttle buses. Update dynamic signage at Gates A and C to direct fans to Blue Line. Assign 2 volunteers to transit hub for queue management.",
    actions: ["Signage updated", "Shuttle buses dispatched"],
  },
  {
    id: "inc-003",
    title: "Minor medical — Section 201",
    description: "Fan reported fainting. First aid dispatched. Fan is conscious and stable.",
    location: "Section 201 — Tier 2",
    severity: "medium",
    status: "resolved",
    reportedBy: "Section Steward",
    timestamp: new Date(Date.now() - 45 * 60000).toLocaleTimeString(),
    responseTime: 3,
    aiTriage: "First aid response adequate. No further action required. Log for end-of-day medical report.",
    actions: ["First aid dispatched", "Fan treated on-site", "Resolved"],
  },
];

const SEVERITY_STYLES: Record<Severity, string> = {
  critical: "border-live/50 bg-live/5",
  high: "border-amber-500/40 bg-amber-50/30",
  medium: "border-pitch/30 bg-pitch/5",
  low: "border-border bg-muted/20",
};

const STATUS_BADGE: Record<Status, string> = {
  open: "bg-muted text-muted-foreground",
  "in-progress": "bg-amber-500/20 text-amber-600 border-amber-500/40",
  resolved: "bg-pitch/20 text-pitch border-pitch/30",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function IncidentsPage() {
  const { data } = useLiveState(5000);
  const [incidents, setIncidents] = useState<ManagedIncident[]>(SAMPLE_INCIDENTS);
  const [newDesc, setNewDesc] = useState("");
  const [newLoc, setNewLoc] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const stats = useMemo(() => ({
    open: incidents.filter((i) => i.status !== "resolved").length,
    critical: incidents.filter((i) => i.severity === "critical" && i.status !== "resolved").length,
    resolved: incidents.filter((i) => i.status === "resolved").length,
    avgResponse: Math.round(incidents.reduce((a, i) => a + (i.responseTime ?? 5), 0) / incidents.length),
  }), [incidents]);

  const logIncident = useCallback(async () => {
    if (!newTitle || !newDesc || !newLoc) return;
    setSubmitting(true);

    const severity = triageIncident(newDesc);
    const incident: ManagedIncident = {
      id: `inc-${Date.now()}`,
      title: newTitle,
      description: newDesc,
      location: newLoc,
      severity,
      status: "open",
      reportedBy: "Control Room",
      timestamp: new Date().toLocaleTimeString(),
      actions: [],
    };

    if (data) {
      try {
        const { text } = await generateAIReply(
          `Incident: ${newTitle}. Location: ${newLoc}. Details: ${newDesc}. Provide a specific 2-3 sentence operational response directive.`,
          { state: data, mode: "organizer" },
        );
        incident.aiTriage = text;
      } catch {
        incident.aiTriage = undefined;
      }
    }

    setIncidents((prev) => [incident, ...prev]);
    setNewTitle("");
    setNewDesc("");
    setNewLoc("");
    setSubmitting(false);
  }, [newTitle, newDesc, newLoc, data]);

  const resolve = useCallback((id: string) => {
    setIncidents((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: "resolved" as Status } : i)),
    );
  }, []);

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-widest text-amber-600">Organizer Mode</p>
        <h1 className="mt-1 text-3xl font-bold md:text-4xl flex items-center gap-3">
          <ShieldAlert className="size-8 text-amber-600" aria-hidden />
          Incident Management
        </h1>
        <p className="mt-2 text-muted-foreground">
          AI-triaged incident log with real-time severity classification and operational response directives.
        </p>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Active", value: stats.open, color: "text-amber-600" },
          { label: "Critical", value: stats.critical, color: "text-live" },
          { label: "Resolved", value: stats.resolved, color: "text-pitch" },
          { label: "Avg Response", value: `${stats.avgResponse}m`, color: "text-foreground" },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
              <p className="text-xs text-muted-foreground mt-1">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Log new incident */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileWarning className="size-4 text-amber-600" aria-hidden />
            Log New Incident
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="inc-title" className="text-sm font-medium">Incident Title</label>
              <input
                id="inc-title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Brief title…"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="inc-loc" className="text-sm font-medium">Location</label>
              <input
                id="inc-loc"
                value={newLoc}
                onChange={(e) => setNewLoc(e.target.value)}
                placeholder="Zone / Gate / Section…"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="inc-desc" className="text-sm font-medium">Description</label>
            <textarea
              id="inc-desc"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Describe the incident…"
              rows={2}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <Button
            onClick={logIncident}
            disabled={!newTitle || !newDesc || !newLoc || submitting}
            className="bg-amber-500 text-white hover:bg-amber-600"
            id="log-incident-btn"
          >
            {submitting ? <Loader2 className="size-4 animate-spin mr-2" aria-hidden /> : <Send className="size-4 mr-2" aria-hidden />}
            {submitting ? "Triaging…" : "Log Incident + AI Triage"}
          </Button>
        </CardContent>
      </Card>

      {/* Incident list */}
      <section aria-labelledby="incidents-heading">
        <h2 id="incidents-heading" className="text-xl font-semibold mb-4">Active Incidents</h2>
        <ul className="space-y-4" aria-label="Incident log">
          <AnimatePresence>
            {incidents.map((inc, i) => (
              <motion.li
                key={inc.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className={`border ${SEVERITY_STYLES[inc.severity]} ${inc.status === "resolved" ? "opacity-60" : ""}`}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-sm">{inc.title}</h3>
                          <Badge variant="outline" className={`text-[10px] ${inc.severity === "critical" ? "bg-live/20 text-live border-live/40" : inc.severity === "high" ? "bg-amber-500/20 text-amber-600 border-amber-500/40" : "bg-muted text-muted-foreground"}`}>
                            {inc.severity.toUpperCase()}
                          </Badge>
                          <Badge variant="outline" className={`text-[10px] ${STATUS_BADGE[inc.status]}`}>
                            {inc.status.replace("-", " ")}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                          <MapPin className="size-3" aria-hidden /> {inc.location}
                          <Clock className="size-3 ml-1" aria-hidden /> {inc.timestamp}
                          {inc.responseTime && (
                            <><TrendingUp className="size-3 ml-1" aria-hidden /> {inc.responseTime}m response</>
                          )}
                        </p>
                      </div>
                      {inc.status !== "resolved" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => resolve(inc.id)}
                          className="border-pitch/40 text-pitch hover:bg-pitch/10 shrink-0"
                          id={`resolve-${inc.id}`}
                          aria-label={`Mark "${inc.title}" as resolved`}
                        >
                          <CheckCircle2 className="size-3.5 mr-1.5" aria-hidden />
                          Resolve
                        </Button>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground">{inc.description}</p>

                    {inc.aiTriage && (
                      <div className="rounded-lg border border-amber-500/30 bg-amber-50/30 px-3 py-2">
                        <p className="text-xs font-semibold text-amber-700 mb-1">✦ AI Triage Directive</p>
                        <p className="text-xs text-amber-900">{inc.aiTriage}</p>
                      </div>
                    )}

                    {inc.actions.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Actions taken:</p>
                        <ul className="flex flex-wrap gap-1.5">
                          {inc.actions.map((action) => (
                            <li key={action}>
                              <Badge variant="outline" className="text-[10px] border-pitch/30 text-pitch">
                                <CheckCircle2 className="size-2.5 mr-1" aria-hidden /> {action}
                              </Badge>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </section>
    </div>
  );
}
