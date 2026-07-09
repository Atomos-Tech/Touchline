/**
 * AI Stadium Assistant
 *
 * Architecture:
 * 1. `sanitizePrompt`       — strips XSS / prompt injection (ALWAYS runs first)
 * 2. `classify`             — keyword intent detection (no LLM needed)
 * 3. `buildSystemPrompt`    — rich context string from LiveState + mode
 * 4. `generateReply`        — deterministic rule-based fallback (zero-latency)
 * 5. `generateAIReply`      — calls Gemini via server function; falls back to generateReply
 *
 * Security:
 *   - Gemini API key is ONLY in process.env on the server (src/services/ai.ts).
 *   - This client module never reads any API key.
 *   - sanitizePrompt always runs before any LLM call.
 *
 * TEST MOUNTING POINT: sanitizePrompt, classify, generateReply,
 * buildSystemPrompt, buildVolunteerSystemPrompt, buildOrganizerSystemPrompt
 * are all pure functions — unit-test each independently.
 */

import type { LiveState } from "@/types/domain";
import type { AppMode } from "@/contexts/ModeContext";
import { callGeminiServer } from "@/services/ai";

// ---------------------------------------------------------------------------
// Security: prompt sanitization
// TEST MOUNTING POINT
// ---------------------------------------------------------------------------

/**
 * Sanitize user input to prevent XSS and prompt injection.
 * Strips angle brackets, role-hijack patterns, template injection chars,
 * null bytes, and enforces a 500-char maximum.
 */
export function sanitizePrompt(raw: string): string {
  return raw
    .replace(/[\u0000]/g, "")                          // null bytes
    .replace(/[<>]/g, "")                              // XSS angle brackets
    .replace(/\b(system|assistant)\s*:/gi, "")         // role hijack
    .replace(/ignore\s+(all|previous)\s+instructions/gi, "")
    .replace(/[{}[\]]/g, "")                           // template injection
    .replace(/[\r\n]{3,}/g, "\n\n")                    // collapse blank lines
    .slice(0, 500)
    .trim();
}

// ---------------------------------------------------------------------------
// Intent classification
// TEST MOUNTING POINT
// ---------------------------------------------------------------------------

export type Intent =
  | "gate"
  | "transit"
  | "score"
  | "next_match"
  | "crowd"
  | "concessions"
  | "greeting"
  | "teams"
  | "results"
  | "navigation"
  | "accessibility"
  | "sustainability"
  | "task"
  | "incident"
  | "weather"
  | "unknown";

/**
 * Classify a sanitized prompt into a known intent.
 * TEST MOUNTING POINT: enumerate (prompt → intent) pairs.
 */
export function classify(prompt: string): Intent {
  const p = prompt.toLowerCase();
  if (/(hi|hello|hey|hola|bonjour|salut)\b/.test(p)) return "greeting";
  if (/(wheelchair|disabled|accessible|accessibility|ramp|elevator|lift)/.test(p)) return "accessibility";
  // weather before concessions so "what is the weather" doesn't hit anything else
  if (/(weather|rain|hot|cold|temperature|wind|forecast|sunny|fog)/.test(p)) return "weather";
  // task before next_match — "what should i do next" must not hit next_match
  if (/(what should i|my.*task|next task|duty|assignment|where do i go)/.test(p)) return "task";
  if (/(gate|exit|entry|entrance|leave|which way|fastest way out)/.test(p)) return "gate";
  if (/(navigate|direction|how.*get|where.*is|find|map|route|seat|section)/.test(p)) return "navigation";
  // \bbus\b — word boundary prevents "busy" matching this transit pattern
  if (/(metro|shuttle|transit|train|subway|transport|\bbus\b|uber|taxi|parking)/.test(p)) return "transit";
  if (/(score|goal|who.*winning|result|minute|what.*happen|latest|half)/.test(p)) return "score";
  if (/(next|upcoming|when.*play|kickoff|schedule|fixture)/.test(p)) return "next_match";
  if (/(crowd|density|busy|capacity|packed|\bfull\b|congestion|how many people)/.test(p)) return "crowd";
  // water added — "I need water" must resolve to concessions not weather
  if (/(food|drink|water|concession|snack|eat|hungry|restaurant|kiosk|stand)/.test(p)) return "concessions";
  // results before teams — "who got knocked out" has "who" which would hit teams first
  if (/(did.*win|who.*won|who.*beat|knocked out|eliminated|winner|advance)/.test(p)) return "results";
  if (/(who|teams|playing|today|match|game)/.test(p)) return "teams";
  if (/(incident|emergency|report|problem|issue|help|medical|fight|fire)/.test(p)) return "incident";
  if (/(sustain|carbon|eco|green|recycle|recycling|energy|waste|environment)/.test(p)) return "sustainability";
  return "unknown";
}

// ---------------------------------------------------------------------------
// Context builders for Gemini — one per mode
// TEST MOUNTING POINT
// ---------------------------------------------------------------------------

export interface AssistantContext {
  state: LiveState;
  mode?: AppMode;
  locale?: string;
}

/**
 * Build system prompt for FAN mode.
 * TEST MOUNTING POINT: verify all state fields appear correctly.
 */
export function buildFanSystemPrompt(state: LiveState, locale = "en"): string {
  const live = state.matches.filter((m) => m.status === "live");
  const upcoming = state.matches
    .filter((m) => m.status === "scheduled")
    .sort((a, b) => +new Date(a.kickoff) - +new Date(b.kickoff))
    .slice(0, 3);
  const recentResults = state.matches
    .filter((m) => m.status === "completed")
    .sort((a, b) => +new Date(b.kickoff) - +new Date(a.kickoff))
    .slice(0, 5);
  // Sort zones once — reuse for both busiest and quietest
  const zonesByLoad = [...state.crowd.zones].sort((a, b) => b.capacityPct - a.capacityPct);
  const busiest = zonesByLoad[0];
  const quietest = zonesByLoad[zonesByLoad.length - 1];
  const delayedTransit = state.transit.filter((t) => t.status !== "normal");

  return `You are a friendly, helpful stadium assistant for FIFA World Cup 2026 fans.
Respond in the user's language (locale: ${locale}). Be concise — 2-3 sentences max.
Tone: warm, enthusiastic, practical.

LIVE MATCHES:
${live.length ? live.map((m) => `- ${m.home.name} ${m.homeScore} vs ${m.awayScore} ${m.away.name} (${(m as { minute?: number }).minute}' at ${m.venue})`).join("\n") : "No matches live right now."}

UPCOMING:
${upcoming.map((m) => `- ${m.home.name} vs ${m.away.name} — ${new Date(m.kickoff).toLocaleString()} at ${m.venue}`).join("\n") || "None"}

RECENT RESULTS:
${recentResults.map((m) => `- ${m.home.name} ${m.homeScore}–${m.awayScore} ${m.away.name}`).join("\n") || "None"}

CROWD STATUS:
- Fastest gate: ${quietest.gate} (${quietest.name}) — ${quietest.capacityPct}% full
- Busiest gate: ${busiest.gate} (${busiest.name}) — ${busiest.capacityPct}% full
- Total attendance: ${state.crowd.totalAttendance.toLocaleString()}

TRANSIT:
${state.transit.map((t) => `- ${t.name}: ${t.status} (every ${t.headwayMin} min)`).join("\n")}
${delayedTransit.length ? `⚠️ Delays: ${delayedTransit.map((t) => t.name).join(", ")}` : "All transit normal."}

Answer the fan's question using this real-time data. If asked about navigation or accessibility, provide step-by-step directions.`;
}

/**
 * Build system prompt for ORGANIZER mode.
 * TEST MOUNTING POINT
 */
export function buildOrganizerSystemPrompt(state: LiveState): string {
  const live = state.matches.find((m) => m.status === "live");
  const busiest = [...state.crowd.zones].sort((a, b) => b.capacityPct - a.capacityPct)[0];
  const quietest = [...state.crowd.zones].sort((a, b) => a.capacityPct - b.capacityPct)[0];
  const critical = state.crowd.zones.filter((z) => z.capacityPct >= 85);
  const delayed = state.transit.filter((t) => t.status !== "normal");

  return `You are an AI operational intelligence system for FIFA World Cup 2026 venue commanders.
Be direct, authoritative, and action-oriented. Use military/operational language.
Respond in 2-4 sentences. Provide specific, actionable directives.

OPERATIONAL STATUS:
- Live match: ${live ? `${live.home.name} vs ${live.away.name} — ${(live as { minute?: number }).minute}'` : "None"}
- Critical zones (≥85%): ${critical.length ? critical.map((z) => `${z.name} (${z.capacityPct}%)`).join(", ") : "None"}
- Busiest gate: ${busiest.gate} at ${busiest.capacityPct}%
- Quietest gate: ${quietest.gate} at ${quietest.capacityPct}%
- Ingress: ${state.crowd.ingressPerMin}/min | Egress: ${state.crowd.egressPerMin}/min
- Total on-site: ${state.crowd.totalAttendance.toLocaleString()}

TRANSIT DISRUPTIONS:
${delayed.length ? delayed.map((t) => `- ${t.name}: ${t.status}`).join("\n") : "All transit nominal."}

Provide specific operational recommendations, staff deployment numbers, and gate directives.`;
}

/**
 * Build system prompt for VOLUNTEER mode.
 * TEST MOUNTING POINT
 */
export function buildVolunteerSystemPrompt(state: LiveState): string {
  const busiest = [...state.crowd.zones].sort((a, b) => b.capacityPct - a.capacityPct)[0];
  const quietest = [...state.crowd.zones].sort((a, b) => a.capacityPct - b.capacityPct)[0];
  const live = state.matches.find((m) => m.status === "live");

  return `You are an AI assistant for FIFA World Cup 2026 volunteers and support staff.
Be brief, clear, and task-focused. Respond in 1-2 sentences with direct instructions.

CURRENT SITUATION:
- Live match: ${live ? `${live.home.name} vs ${live.away.name} — ${(live as { minute?: number }).minute}'` : "No match live"}
- Highest priority zone: ${busiest.name} at ${busiest.gate} (${busiest.capacityPct}%)
- Lowest priority zone: ${quietest.name} at ${quietest.gate} (${quietest.capacityPct}%)
- Crowd ingress: ${state.crowd.ingressPerMin}/min

Answer the volunteer's question with a clear, actionable directive.`;
}

/**
 * Route to the correct system prompt builder based on mode.
 * TEST MOUNTING POINT
 */
export function buildSystemPrompt(state: LiveState, mode: AppMode = "fan", locale = "en"): string {
  switch (mode) {
    case "organizer": return buildOrganizerSystemPrompt(state);
    case "volunteer": return buildVolunteerSystemPrompt(state);
    default:          return buildFanSystemPrompt(state, locale);
  }
}

// ---------------------------------------------------------------------------
// Deterministic fallback — always available, zero latency
// TEST MOUNTING POINT: test every Intent branch with fixture states.
// ---------------------------------------------------------------------------

/**
 * Generate a rule-based reply from live state.
 * Always available, no LLM required. Handles all known intents.
 */
export function generateReply(rawPrompt: string, ctx: AssistantContext): string {
  const prompt = sanitizePrompt(rawPrompt);
  if (!prompt) return "Please enter a question about the stadium or tournament.";

  const intent = classify(prompt);
  const { state, mode = "fan" } = ctx;
  const live = state.matches.find((m) => m.status === "live");
  const zonesByLoad = [...state.crowd.zones].sort((a, b) => b.capacityPct - a.capacityPct);
  const busiest = zonesByLoad[0];
  const quietest = zonesByLoad[zonesByLoad.length - 1];
  const bestTransit = state.transit.find((t) => t.status === "normal") ?? state.transit[0];

  // Volunteer mode: terse directives
  if (mode === "volunteer") {
    switch (intent) {
      case "task":
        return `Priority: Proceed to ${busiest.gate} (${busiest.name}, ${busiest.capacityPct}%). Assist with crowd flow and fan redirection.`;
      case "incident":
        return `For incidents: use the Report tab to log. For medical emergencies, call Control on radio channel 3 immediately.`;
      case "navigation":
        return `${quietest.gate} (${quietest.name}) is least congested at ${quietest.capacityPct}%. Report to Zone Supervisor upon arrival.`;
      default:
        return `Current priority zone: ${busiest.gate} at ${busiest.capacityPct}%. Check Tasks tab for your assigned duties.`;
    }
  }

  // Organizer mode: operational language
  if (mode === "organizer") {
    switch (intent) {
      case "crowd":
        return `Critical: ${busiest.name} at ${busiest.capacityPct}% (${busiest.gate}). Deploy 4 stewards from ${quietest.name}. ${busiest.capacityPct >= 85 ? "OPEN overflow lane C-2 immediately." : "Monitor closely."}`;
      case "transit": {
        const delayed = state.transit.filter((t) => t.status !== "normal");
        return delayed.length ? `Disruptions on: ${delayed.map((d) => d.name).join(", ")}. Redirect to ${bestTransit.name} (every ${bestTransit.headwayMin} min). Update dynamic signage.` : `All transit nominal. Continue standard monitoring.`;
      }
      case "incident":
        return `Activate incident protocol: notify Control, dispatch medical team to ${busiest.gate}, secure perimeter. Log in Incidents tab.`;
      default:
        return `Attendance: ${state.crowd.totalAttendance.toLocaleString()}. Ingress: ${state.crowd.ingressPerMin}/min. Hotspot: ${busiest.name} (${busiest.capacityPct}%). See Operations dashboard for full intel.`;
    }
  }

  // Fan mode: friendly, helpful
  switch (intent) {
    case "greeting":
      return `Hi! I'm your FIFA 2026 stadium assistant. ${live ? `${live.home.flag} ${live.home.name} ${live.homeScore}–${live.awayScore} ${live.away.name} ${live.away.flag} is live!` : "No matches live right now."} Ask me about gates, transit, scores, food, or accessibility.`;

    case "navigation":
      return `Head to ${quietest.gate} (${quietest.name}) — it's the least crowded at ${quietest.capacityPct}%. Follow the green signage from the main concourse. ${bestTransit.name} stops right outside every ${bestTransit.headwayMin} min.`;

    case "accessibility":
      return `Wheelchair-accessible entrances are at ${quietest.gate} (${quietest.name}, ${quietest.capacityPct}% — currently least busy). Lifts are available on all concourse levels. Accessible restrooms are near Sections 101 and 201. Ask any volunteer in a blue vest for further assistance.`;

    case "gate":
      if (live && (live as { minute?: number }).minute! >= 80) {
        return `Full-time approaching! Use ${quietest.gate} (${quietest.name}) at ${quietest.capacityPct}% for the fastest exit. Avoid ${busiest.gate} (${busiest.capacityPct}%). ${bestTransit.name} runs every ${bestTransit.headwayMin} min.`;
      }
      return `${quietest.gate} is fastest at ${quietest.capacityPct}% capacity. Avoid ${busiest.gate} (${busiest.capacityPct}%). Transit: ${bestTransit.name} every ${bestTransit.headwayMin} min.`;

    case "transit": {
      const delayed = state.transit.filter((t) => t.status !== "normal");
      if (delayed.length) {
        return `Heads-up: ${delayed.map((d) => `${d.name} is ${d.status}`).join(", ")}. Best option right now: ${bestTransit.name} (every ${bestTransit.headwayMin} min).`;
      }
      return `All transit running normally! ${bestTransit.name} arrives every ${bestTransit.headwayMin} minutes from the main plaza.`;
    }

    case "score":
      if (!live) return "No matches are live right now. Check the Tournament tab for full results.";
      return `${live.home.flag} ${live.home.name} ${live.homeScore}–${live.awayScore} ${live.away.name} ${live.away.flag} · ${(live as { minute?: number }).minute}' at ${live.venue}.${(live as { lastEvent?: string }).lastEvent ? ` Last event: ${(live as { lastEvent?: string }).lastEvent}.` : ""}`;

    case "next_match": {
      const next = state.matches.filter((m) => m.status === "scheduled").sort((a, b) => +new Date(a.kickoff) - +new Date(b.kickoff))[0];
      if (!next) return "No upcoming fixtures confirmed yet. Check the Tournament tab.";
      return `Next: ${next.home.flag} ${next.home.name} vs ${next.away.flag} ${next.away.name} at ${next.venue}, ${new Date(next.kickoff).toLocaleString()}.`;
    }

    case "crowd":
      return `Total attendance: ${state.crowd.totalAttendance.toLocaleString()}. Busiest area: ${busiest.name} (${busiest.capacityPct}%). Best bet: ${quietest.name} (${quietest.capacityPct}%).`;

    case "concessions":
      return `Concession stands are least busy near ${quietest.name} — expect ~3 min wait. Water refill stations on every concourse level. Food map available at any information desk.`;

    case "teams": {
      const today = state.matches.filter((m) => { const d = new Date(m.kickoff); const now = new Date(); return d.toDateString() === now.toDateString(); });
      if (!today.length) return "No matches today. See the Tournament tab for the full schedule.";
      return `Today: ${today.map((m) => `${m.home.flag} ${m.home.name} vs ${m.away.flag} ${m.away.name}`).join(" | ")}.`;
    }

    case "results": {
      const recent = state.matches.filter((m) => m.status === "completed").sort((a, b) => +new Date(b.kickoff) - +new Date(a.kickoff)).slice(0, 3);
      if (!recent.length) return "No results yet. Tournament is just getting started!";
      return `Recent: ${recent.map((m) => `${m.home.name} ${m.homeScore}–${m.awayScore} ${m.away.name}`).join(" · ")}.`;
    }

    case "sustainability":
      return `This stadium runs on 40% renewable energy today. Use the clearly marked green recycling bins at every concourse exit. Consider public transit home — it reduces your carbon footprint by up to 80% vs driving.`;

    case "weather":
      return `For the latest venue weather, check the WeatherBadge in the Operations panel or ask about a specific stadium.`;

    default:
      return `I can help with navigation, gates, transit, live scores, upcoming fixtures, crowd density, food, accessibility, and sustainability. Try: "Which gate is fastest?" or "How do I get to Section 201?"`;
  }
}

// ---------------------------------------------------------------------------
// Gemini-powered reply — calls server function (key never leaves server)
// ---------------------------------------------------------------------------

/**
 * Call Gemini via the server-side proxy function.
 * Falls back to generateReply if Gemini is unavailable or errors.
 * The API key is NEVER read on the client.
 */
export async function generateAIReply(
  rawPrompt: string,
  ctx: AssistantContext,
): Promise<{ text: string; usedAI: boolean }> {
  const prompt = sanitizePrompt(rawPrompt);
  if (!prompt) {
    return { text: "Please enter a question about the stadium or tournament.", usedAI: false };
  }

  if (!ctx.state) {
    return { text: generateReply(rawPrompt, ctx), usedAI: false };
  }

  const systemPrompt = buildSystemPrompt(ctx.state, ctx.mode ?? "fan", ctx.locale ?? "en");

  try {
    const result = await callGeminiServer({
      data: { systemPrompt, userPrompt: prompt },
    });

    if (result.text && result.usedAI) {
      return { text: result.text, usedAI: true };
    }

    // AI unavailable — use deterministic fallback
    return { text: generateReply(rawPrompt, ctx), usedAI: false };
  } catch (err) {
    console.warn("[assistant] Server AI call failed, using rule-based fallback:", err);
    return { text: generateReply(rawPrompt, ctx), usedAI: false };
  }
}
