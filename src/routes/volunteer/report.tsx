/**
 * Volunteer Incident Reporter — one-tap incident logging with AI triage.
 *
 * Submits incidents to in-memory log. In production, this would POST to
 * a backend API. AI (Gemini) classifies severity and suggests response.
 *
 * TEST MOUNTING POINT: classifyIncident, formatIncidentLog are pure functions.
 */
import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileWarning, AlertTriangle, CheckCircle2, Clock,
  MapPin, Send, Loader2,
} from "lucide-react";
import { useState, useCallback } from "react";
import { generateAIReply } from "@/lib/assistant";
import { useLiveState } from "@/hooks/useLiveState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/volunteer/report")({
  head: () => ({
    meta: [
      { title: "Report Incident — Touchline Volunteer" },
      { name: "description", content: "Report stadium incidents with AI-powered severity classification and response recommendations." },
    ],
  }),
  component: ReportPage,
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Severity = "low" | "medium" | "high" | "critical";
type IncidentCategory =
  | "medical"
  | "security"
  | "crowd"
  | "infrastructure"
  | "fire"
  | "lost-person"
  | "other";

interface Incident {
  id: string;
  title: string;
  description: string;
  location: string;
  category: IncidentCategory;
  severity: Severity;
  timestamp: string;
  aiTriage?: string;
  status: "open" | "escalated" | "resolved";
}

// ---------------------------------------------------------------------------
// Pure helpers — TEST MOUNTING POINT
// ---------------------------------------------------------------------------

/** Classify incident severity from description keywords. TEST MOUNTING POINT. */
export function classifyIncident(description: string, category: IncidentCategory): Severity {
  const d = description.toLowerCase();
  if (category === "fire") return "critical";
  if (category === "medical" && /(unconscious|cardiac|breathing|severe|blood)/.test(d)) return "critical";
  if (/(fight|weapon|threat|attack|dangerous)/.test(d)) return "critical";
  if (category === "medical") return "high";
  if (category === "security" || category === "crowd") return "high";
  if (/(lost.*child|missing)/.test(d)) return "high";
  if (/(blocked|stuck|overflow)/.test(d)) return "medium";
  return "low";
}

/** Format an incident for the log display. TEST MOUNTING POINT. */
export function formatIncidentLog(incident: Incident): string {
  return `[${incident.severity.toUpperCase()}] ${incident.category}: ${incident.title} at ${incident.location} — ${incident.timestamp}`;
}

const LOCATIONS = [
  "Gate A — North Concourse",
  "Gate B — East Concourse",
  "Gate C — South Concourse",
  "Gate D — West Concourse",
  "Gate V — VIP Area",
  "Gate F — Family Zone",
  "Section 101-120",
  "Section 201-230",
  "Section 301-340",
  "North Concourse Food Court",
  "South Concourse Food Court",
  "Level 1 Corridor",
  "Level 2 Corridor",
  "Parking Lot A",
  "Parking Lot B",
  "Transit Hub — Main Plaza",
  "First Aid Station (North)",
  "First Aid Station (South)",
  "Staff Area",
];

const CATEGORIES: { value: IncidentCategory; label: string; icon: string }[] = [
  { value: "medical", label: "Medical Emergency", icon: "🏥" },
  { value: "security", label: "Security Issue", icon: "🛡️" },
  { value: "crowd", label: "Crowd Issue", icon: "👥" },
  { value: "fire", label: "Fire / Smoke", icon: "🔥" },
  { value: "lost-person", label: "Lost Person", icon: "🔍" },
  { value: "infrastructure", label: "Infrastructure", icon: "🔧" },
  { value: "other", label: "Other", icon: "📋" },
];

const SEVERITY_STYLES: Record<Severity, string> = {
  critical: "border-red-500/40 bg-red-50/50 text-red-700",
  high: "border-amber-500/40 bg-amber-50/50 text-amber-700",
  medium: "border-pitch/40 bg-pitch/5 text-pitch",
  low: "border-border bg-muted/30 text-muted-foreground",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function ReportPage() {
  const { data } = useLiveState();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState<IncidentCategory>("other");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<Incident | null>(null);
  const [log, setLog] = useState<Incident[]>([]);

  const submit = useCallback(async () => {
    if (!title || !location || !description) return;
    setSubmitting(true);

    const severity = classifyIncident(description, category);
    const incident: Incident = {
      id: `inc-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      location,
      category,
      severity,
      timestamp: new Date().toLocaleTimeString(),
      status: severity === "critical" || severity === "high" ? "escalated" : "open",
    };

    // Get AI triage recommendation
    if (data) {
      try {
        const prompt = `Stadium incident report:
Type: ${category}
Severity: ${severity}
Location: ${location}
Details: ${description}

Provide a brief (1-2 sentence) immediate response recommendation for the volunteer. Be specific and action-oriented.`;

        const { text } = await generateAIReply(prompt, { state: data, mode: "volunteer" });
        incident.aiTriage = text;
      } catch {
        incident.aiTriage = undefined;
      }
    }

    setLog((prev) => [incident, ...prev]);
    setSubmitted(incident);
    setTitle("");
    setDescription("");
    setLocation("");
    setCategory("other");
    setSubmitting(false);
  }, [title, description, location, category, data]);

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-widest text-live">Volunteer Mode</p>
        <h1 className="mt-1 text-3xl font-bold md:text-4xl flex items-center gap-3">
          <FileWarning className="size-8 text-live" aria-hidden />
          Report an Incident
        </h1>
        <p className="mt-2 text-muted-foreground">
          AI classifies severity and suggests an immediate response. Critical incidents are auto-escalated.
        </p>
      </header>

      {/* Submission confirmation */}
      <AnimatePresence>
        {submitted && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className={`rounded-xl border p-4 ${SEVERITY_STYLES[submitted.severity]}`}
            role="alert"
            aria-live="assertive"
          >
            <div className="flex items-start gap-3">
              {submitted.severity === "critical" || submitted.severity === "high" ? (
                <AlertTriangle className="size-5 shrink-0 mt-0.5" aria-hidden />
              ) : (
                <CheckCircle2 className="size-5 shrink-0 mt-0.5" aria-hidden />
              )}
              <div className="space-y-1">
                <p className="font-semibold text-sm">
                  Incident logged — {submitted.status === "escalated" ? "⚡ Escalated to Control" : "Recorded"}
                </p>
                <p className="text-xs opacity-80">ID: {submitted.id} · Severity: {submitted.severity.toUpperCase()}</p>
                {submitted.aiTriage && (
                  <p className="text-xs mt-2 font-medium">
                    <span className="opacity-70">✦ AI recommendation: </span>{submitted.aiTriage}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Report form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">New Incident Report</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Category quick-select */}
          <fieldset>
            <legend className="text-sm font-medium mb-3">Incident Category</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="group">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  aria-pressed={category === cat.value}
                  className={`rounded-lg border p-2.5 text-left text-xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    category === cat.value
                      ? "border-live/50 bg-live/10 text-live font-semibold"
                      : "border-border hover:border-muted-foreground/40"
                  }`}
                >
                  <span className="block text-lg mb-1" aria-hidden>{cat.icon}</span>
                  {cat.label}
                </button>
              ))}
            </div>
          </fieldset>

          {/* Title */}
          <div className="space-y-1.5">
            <label htmlFor="incident-title" className="text-sm font-medium">
              Incident Title <span className="text-live" aria-hidden>*</span>
            </label>
            <input
              id="incident-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief description of the incident…"
              maxLength={100}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              required
              aria-required="true"
            />
          </div>

          {/* Location */}
          <div className="space-y-1.5">
            <label htmlFor="incident-location" className="text-sm font-medium">
              Location <span className="text-live" aria-hidden>*</span>
            </label>
            <select
              id="incident-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              required
              aria-required="true"
            >
              <option value="">Select location…</option>
              {LOCATIONS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label htmlFor="incident-desc" className="text-sm font-medium">
              Description <span className="text-live" aria-hidden>*</span>
            </label>
            <textarea
              id="incident-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what you observed in detail…"
              rows={4}
              maxLength={500}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              required
              aria-required="true"
            />
            <p className="text-xs text-muted-foreground text-right">{description.length}/500</p>
          </div>

          <Button
            type="button"
            onClick={submit}
            disabled={!title || !location || !description || submitting}
            className="w-full bg-live text-live-foreground hover:bg-live/90"
            id="submit-incident-btn"
          >
            {submitting ? (
              <><Loader2 className="size-4 animate-spin mr-2" aria-hidden />Submitting…</>
            ) : (
              <><Send className="size-4 mr-2" aria-hidden />Submit Incident Report</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Recent log */}
      {log.length > 0 && (
        <section aria-labelledby="log-heading">
          <h2 id="log-heading" className="text-xl font-semibold mb-4">
            Session Log
          </h2>
          <ul className="space-y-2" aria-label="Incidents logged this session">
            {log.map((inc) => (
              <li key={inc.id}>
                <Card className={`border ${SEVERITY_STYLES[inc.severity]}`}>
                  <CardContent className="flex items-start justify-between gap-3 p-3">
                    <div>
                      <p className="text-sm font-semibold">{inc.title}</p>
                      <p className="text-xs opacity-70 flex items-center gap-1 mt-0.5">
                        <MapPin className="size-2.5" aria-hidden />
                        {inc.location}
                        <Clock className="size-2.5 ml-2" aria-hidden />
                        {inc.timestamp}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge variant="outline" className={`text-[10px] ${SEVERITY_STYLES[inc.severity]}`}>
                        {inc.severity.toUpperCase()}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {inc.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
