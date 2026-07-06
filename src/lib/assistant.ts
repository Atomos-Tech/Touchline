/**
 * AI Stadium Assistant
 *
 * Architecture:
 * 1. `sanitizePrompt` — strips XSS / prompt injection (ALWAYS runs first)
 * 2. `classify` — keyword intent detection (lightweight, no LLM needed)
 * 3. `buildSystemPrompt` — constructs a rich context string from LiveState for Gemini
 * 4. `generateReply` — deterministic rule-based fallback (always available)
 * 5. `generateAIReply` — calls Gemini 2.0 Flash; falls back to generateReply on error
 *
 * TEST MOUNTING POINT: sanitizePrompt, classify, generateReply, buildSystemPrompt
 * are all pure functions — unit-test each against fixture states and prompt strings.
 */

import type { LiveState } from "@/types/domain";

// ---------------------------------------------------------------------------
// Security: prompt sanitization
// ---------------------------------------------------------------------------

/**
 * Sanitize user input to prevent XSS and basic prompt injection.
 * TEST MOUNTING POINT: assert each attack vector is stripped.
 */
export function sanitizePrompt(raw: string): string {
  return raw
    .replace(/[<>]/g, "") // strip angle brackets (XSS)
    .replace(/\b(system|assistant)\s*:/gi, "") // strip role hijack
    .replace(/ignore (all|previous) instructions/gi, "")
    .replace(/[{}[\]]/g, "") // strip template injection chars
    .slice(0, 500)
    .trim();
}

// ---------------------------------------------------------------------------
// Intent classification
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
  | "unknown";

/**
 * Classify a sanitized user prompt into a known intent.
 * TEST MOUNTING POINT: pure function, enumerate expected (prompt → intent) pairs.
 */
export function classify(prompt: string): Intent {
  const p = prompt.toLowerCase();
  if (/(hi|hello|hey|hola|bonjour|salut)/.test(p)) return "greeting";
  if (/(gate|exit|entry|entrance|leave|which way|how do i get)/.test(p)) return "gate";
  if (/(metro|shuttle|transit|train|subway|transport|bus)/.test(p)) return "transit";
  if (/(score|goal|who.*winning|result|minute|what.*happen|latest)/.test(p)) return "score";
  if (/(next|upcoming|when.*play|kickoff|schedule|fixture)/.test(p)) return "next_match";
  if (/(crowd|density|busy|capacity|packed|full)/.test(p)) return "crowd";
  if (/(food|drink|concession|water|beer|snack|eat|hungry)/.test(p)) return "concessions";
  if (/(who|teams|playing|today|match|game)/.test(p)) return "teams";
  if (/(won|beat|knocked out|eliminated|winner|advance)/.test(p)) return "results";
  return "unknown";
}

// ---------------------------------------------------------------------------
// Context builder for Gemini
// ---------------------------------------------------------------------------

export interface AssistantContext {
  state: LiveState;
}

/**
 * Build a system prompt embedding real live state for Gemini inference.
 * TEST MOUNTING POINT: verify the output contains the expected state fields.
 */
export function buildSystemPrompt(state: LiveState): string {
  const live = state.matches.filter((m) => m.status === "live");
  const upcoming = state.matches
    .filter((m) => m.status === "scheduled")
    .sort((a, b) => +new Date(a.kickoff) - +new Date(b.kickoff))
    .slice(0, 3);
  const recentResults = state.matches
    .filter((m) => m.status === "completed")
    .sort((a, b) => +new Date(b.kickoff) - +new Date(a.kickoff))
    .slice(0, 5);

  const busiest = [...state.crowd.zones].sort(
    (a, b) => b.capacityPct - a.capacityPct,
  )[0];
  const quietest = [...state.crowd.zones].sort(
    (a, b) => a.capacityPct - b.capacityPct,
  )[0];
  const delayedTransit = state.transit.filter((t) => t.status !== "normal");

  return `You are a helpful, concise stadium assistant for the FIFA World Cup 2026.
Answer in 2-3 sentences maximum. Be direct and practical.

LIVE MATCHES RIGHT NOW:
${
  live.length
    ? live
        .map(
          (m) =>
            `- ${m.home.name} ${m.homeScore} vs ${m.awayScore} ${m.away.name} (${(m as { minute?: number }).minute}' at ${m.venue})`,
        )
        .join("\n")
    : "No matches currently live."
}

UPCOMING MATCHES:
${upcoming.map((m) => `- ${m.home.name} vs ${m.away.name} at ${new Date(m.kickoff).toLocaleString()} (${m.venue})`).join("\n") || "None"}

RECENT RESULTS:
${recentResults.map((m) => `- ${m.home.name} ${m.homeScore}–${m.awayScore} ${m.away.name}`).join("\n") || "None"}

CROWD STATUS:
- Total attendance: ${state.crowd.totalAttendance.toLocaleString()}
- Busiest zone: ${busiest.name} at ${busiest.capacityPct}% (${busiest.gate})
- Quietest zone: ${quietest.name} at ${quietest.capacityPct}% (${quietest.gate})
- Ingress: ${state.crowd.ingressPerMin}/min | Egress: ${state.crowd.egressPerMin}/min

TRANSIT:
${state.transit.map((t) => `- ${t.name}: ${t.status} (every ${t.headwayMin} min)`).join("\n")}
${delayedTransit.length ? `⚠️ Disruptions: ${delayedTransit.map((t) => t.name).join(", ")}` : "All transit normal."}

Answer the fan's question using this real-time context.`;
}

// ---------------------------------------------------------------------------
// Deterministic rule-based fallback — no LLM required
// ---------------------------------------------------------------------------

/**
 * Generate a rule-based reply from live state. Always available, zero latency.
 * TEST MOUNTING POINT: test every Intent branch with fixture states.
 */
export function generateReply(rawPrompt: string, ctx: AssistantContext): string {
  const prompt = sanitizePrompt(rawPrompt);
  if (!prompt) return "Please enter a question about the stadium or tournament.";

  const intent = classify(prompt);
  const { state } = ctx;
  const live = state.matches.find((m) => m.status === "live");
  const zonesByLoad = [...state.crowd.zones].sort(
    (a, b) => b.capacityPct - a.capacityPct,
  );
  const busiest = zonesByLoad[0];
  const quietest = zonesByLoad[zonesByLoad.length - 1];
  const blue = state.transit.find((t) => t.id === "blue") ?? state.transit[0];

  switch (intent) {
    case "greeting":
      return `Hi! I'm your FIFA 2026 stadium assistant. ${
        live
          ? `${live.home.name} ${live.homeScore}–${live.awayScore} ${live.away.name} is live in the ${(live as { minute?: number }).minute}'.`
          : "No matches are live right now."
      } Ask me about gates, transit, scores, or upcoming fixtures.`;

    case "gate":
      if (live && (live as { minute?: number }).minute! >= 80) {
        return `${busiest.gate} (${busiest.name}) is at ${busiest.capacityPct}% as fans prepare to exit. Use ${quietest.gate} (${quietest.name}) at ${quietest.capacityPct}% — the ${blue.name} runs every ${blue.headwayMin} min.`;
      }
      return `${quietest.gate} is fastest at ${quietest.capacityPct}% capacity. Avoid ${busiest.gate} (${busiest.capacityPct}%). Transit: ${blue.name} every ${blue.headwayMin} min.`;

    case "transit": {
      const delayed = state.transit.filter((t) => t.status !== "normal");
      const rec = state.transit.find((t) => t.status === "normal") ?? state.transit[0];
      if (delayed.length) {
        return `Heads up: ${delayed.map((d) => `${d.name} is ${d.status}`).join(", ")}. Best option: ${rec.name} (every ${rec.headwayMin} min).`;
      }
      return `All transit is running normally. ${rec.name} arrives every ${rec.headwayMin} minutes.`;
    }

    case "score":
      if (!live)
        return "No matches are live right now. Check the Tournament tab for the full bracket and results.";
      return `${live.home.flag} ${live.home.name} ${live.homeScore}–${live.awayScore} ${live.away.name} ${live.away.flag} · ${(live as { minute?: number }).minute}' at ${live.venue}.${(live as { lastEvent?: string }).lastEvent ? ` Last: ${(live as { lastEvent?: string }).lastEvent}.` : ""}`;

    case "next_match": {
      const next = state.matches
        .filter((m) => m.status === "scheduled")
        .sort((a, b) => +new Date(a.kickoff) - +new Date(b.kickoff))[0];
      if (!next)
        return "No upcoming fixtures confirmed yet. Check back for Quarter-final announcements.";
      return `Next: ${next.home.name} vs ${next.away.name} at ${next.venue}, ${new Date(next.kickoff).toLocaleString()}.`;
    }

    case "crowd":
      return `Total attendance: ${state.crowd.totalAttendance.toLocaleString()}. Busiest: ${busiest.name} (${busiest.capacityPct}%). Quietest: ${quietest.name} (${quietest.capacityPct}%).`;

    case "concessions":
      return `Concessions are least busy near ${quietest.name}. Expect ~5 min wait there. Water refill stations on every concourse level.`;

    case "teams": {
      const today = state.matches
        .filter((m) => {
          const d = new Date(m.kickoff);
          const now = new Date();
          return d.toDateString() === now.toDateString();
        });
      if (!today.length) return "No matches confirmed for today. See the Tournament tab for the full schedule.";
      return `Today: ${today.map((m) => `${m.home.name} vs ${m.away.name}`).join(" | ")}.`;
    }

    case "results": {
      const recent = state.matches
        .filter((m) => m.status === "completed")
        .sort((a, b) => +new Date(b.kickoff) - +new Date(a.kickoff))
        .slice(0, 3);
      if (!recent.length) return "No results available yet.";
      return `Recent results: ${recent.map((m) => `${m.home.name} ${m.homeScore}–${m.awayScore} ${m.away.name}`).join(" · ")}.`;
    }

    default:
      return `I can help with gates, transit, live scores, upcoming fixtures, crowd density, and results. Try: "What's the score?" or "Which gate is fastest?"`;
  }
}

// ---------------------------------------------------------------------------
// Gemini-powered reply (async, falls back to rule-based)
// ---------------------------------------------------------------------------

/**
 * Call Gemini 2.0 Flash with rich stadium context.
 * Falls back to generateReply if Gemini is unavailable or errors.
 *
 * NOTE: The Gemini API key is exposed here as VITE_GEMINI_API_KEY.
 * If you want server-side only, move this call to a TanStack Start server function.
 */
export async function generateAIReply(
  rawPrompt: string,
  ctx: AssistantContext,
): Promise<{ text: string; usedAI: boolean }> {
  const prompt = sanitizePrompt(rawPrompt);
  if (!prompt) {
    return {
      text: "Please enter a question about the stadium or tournament.",
      usedAI: false,
    };
  }

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

  if (!apiKey) {
    return { text: generateReply(rawPrompt, ctx), usedAI: false };
  }

  try {
    const systemPrompt = buildSystemPrompt(ctx.state);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const body = {
      contents: [
        {
          role: "user",
          parts: [{ text: `${systemPrompt}\n\nFan question: ${prompt}` }],
        },
      ],
      generationConfig: {
        maxOutputTokens: 150,
        temperature: 0.4,
        topP: 0.8,
      },
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error(`Gemini error ${res.status}`);

    const data = (await res.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };

    const text =
      data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
    if (!text) throw new Error("Empty Gemini response");

    return { text, usedAI: true };
  } catch (err) {
    console.warn("[assistant] Gemini call failed, using rule-based fallback:", err);
    return { text: generateReply(rawPrompt, ctx), usedAI: false };
  }
}
