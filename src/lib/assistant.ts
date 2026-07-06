// GenAI-style rule-based assistant. Pure function of live state + user prompt.
// Context-aware logic: reads live match minutes, gate capacity, transit status.
// TEST MOUNTING POINT: assert responses across canonical prompt categories.

import type { LiveState } from "@/types/domain";

/** Basic sanitization to prevent XSS / obvious prompt injection. */
export function sanitizePrompt(raw: string): string {
  return raw
    .replace(/[<>]/g, "") // strip angle brackets
    .replace(/\b(system|assistant)\s*:/gi, "") // strip role hijack
    .replace(/ignore (all|previous) instructions/gi, "")
    .slice(0, 500)
    .trim();
}

type Intent =
  | "gate"
  | "transit"
  | "score"
  | "next_match"
  | "crowd"
  | "concessions"
  | "greeting"
  | "unknown";

function classify(prompt: string): Intent {
  const p = prompt.toLowerCase();
  if (/(hi|hello|hey|hola|bonjour)/.test(p)) return "greeting";
  if (/(gate|exit|entry|entrance|leave)/.test(p)) return "gate";
  if (/(metro|shuttle|transit|train|subway|transport)/.test(p)) return "transit";
  if (/(score|goal|who.*winning|result|minute)/.test(p)) return "score";
  if (/(next|upcoming|when.*play|kickoff)/.test(p)) return "next_match";
  if (/(crowd|density|busy|capacity)/.test(p)) return "crowd";
  if (/(food|drink|concession|water|beer|snack)/.test(p)) return "concessions";
  return "unknown";
}

export interface AssistantContext {
  state: LiveState;
}

export function generateReply(rawPrompt: string, ctx: AssistantContext): string {
  const prompt = sanitizePrompt(rawPrompt);
  if (!prompt) return "Please enter a question about the stadium or tournament.";

  const intent = classify(prompt);
  const { state } = ctx;
  const live = state.matches.find((m) => m.status === "live");
  const zonesByLoad = [...state.crowd.zones].sort((a, b) => b.capacityPct - a.capacityPct);
  const busiest = zonesByLoad[0];
  const quietest = zonesByLoad[zonesByLoad.length - 1];
  const blue = state.transit.find((t) => t.id === "blue")!;

  switch (intent) {
    case "greeting":
      return `Hi! I'm your stadium assistant. ${
        live
          ? `${live.home.code} ${live.homeScore}-${live.awayScore} ${live.away.code} is in the ${live.minute}'.`
          : "No live matches right now."
      } Ask me about gates, transit, or scores.`;

    case "gate":
      if (live && live.minute >= 80) {
        return `${busiest.gate} (${busiest.name}) is currently at ${busiest.capacityPct}% capacity as fans prepare to exit. I recommend taking ${quietest.gate} (${quietest.name}) at ${quietest.capacityPct}%, and the ${blue.name} has trains arriving every ${blue.headwayMin} minutes.`;
      }
      return `Right now ${quietest.gate} is the fastest at ${quietest.capacityPct}% capacity. ${busiest.gate} is the busiest at ${busiest.capacityPct}%.`;

    case "transit": {
      const delayed = state.transit.filter((t) => t.status !== "normal");
      const rec = state.transit.find((t) => t.status === "normal") ?? state.transit[0];
      if (delayed.length) {
        return `Heads up: ${delayed
          .map((d) => `${d.name} is ${d.status}`)
          .join(", ")}. Best option right now is the ${rec.name} (every ${rec.headwayMin} min).`;
      }
      return `All transit lines are running normally. ${rec.name} arrives every ${rec.headwayMin} minutes.`;
    }

    case "score":
      if (!live) return "No matches are live at this moment. Check /tournament for upcoming fixtures.";
      return `${live.home.flag} ${live.home.name} ${live.homeScore} - ${live.awayScore} ${live.away.name} ${live.away.flag} • ${live.minute}' at ${live.venue}.${
        live.lastEvent ? ` Last: ${live.lastEvent}.` : ""
      }`;

    case "next_match": {
      const next = state.matches
        .filter((m) => m.status === "scheduled")
        .sort((a, b) => +new Date(a.kickoff) - +new Date(b.kickoff))[0];
      if (!next) return "No upcoming fixtures in the schedule.";
      return `Next up: ${next.home.name} vs ${next.away.name} at ${next.venue}, kickoff ${new Date(
        next.kickoff,
      ).toLocaleString()}.`;
    }

    case "crowd":
      return `Total attendance: ${state.crowd.totalAttendance.toLocaleString()}. Busiest zone: ${busiest.name} (${busiest.capacityPct}%). Quietest: ${quietest.name} (${quietest.capacityPct}%).`;

    case "concessions":
      return `Concessions are least busy near ${quietest.name}. Expect ~5 min wait. Water refill stations are on every concourse level.`;

    default:
      return `I can help with gates, transit, live scores, upcoming fixtures, and crowd density. Try: "Which gate is fastest right now?"`;
  }
}
