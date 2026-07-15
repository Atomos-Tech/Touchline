/**
 * Server-side Gemini AI proxy.
 *
 * Uses TanStack Start's createServerFn so that the GEMINI_API_KEY
 * lives only in process.env and is NEVER bundled into client JS.
 *
 * The client sends only the prompt + context; the server makes the
 * actual Gemini API call and returns the text.
 *
 * Security hardening:
 *  - Key read from process.env (never VITE_*)
 *  - Prompt length capped at 500 chars server-side (defence in depth)
 *  - Structured error response — no internal details leaked to client
 *  - Rate-limit header checked (Gemini 429 → graceful fallback)
 */
import { createServerFn } from "@tanstack/react-start";

export interface AIRequest {
  systemPrompt: string;
  userPrompt: string;
}

export interface AIResponse {
  text: string;
  usedAI: boolean;
  error?: string;
}

// ---------------------------------------------------------------------------
// Server-side rate limiter — token bucket, 20 req/min per process instance.
// Protects Gemini quota from runaway clients.
// ---------------------------------------------------------------------------

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 20;
let _rateBucket = RATE_LIMIT_MAX;
let _rateWindowStart = Date.now();

function checkRateLimit(): boolean {
  const now = Date.now();
  if (now - _rateWindowStart >= RATE_LIMIT_WINDOW_MS) {
    _rateBucket = RATE_LIMIT_MAX;
    _rateWindowStart = now;
  }
  if (_rateBucket <= 0) return false;
  _rateBucket -= 1;
  return true;
}

export const callGeminiServer = createServerFn({ method: "POST" })
  .validator((data: AIRequest) => {
    if (!data.userPrompt || typeof data.userPrompt !== "string") {
      throw new Error("Invalid request: userPrompt required");
    }
    return {
      systemPrompt: String(data.systemPrompt ?? "").slice(0, 4000),
      userPrompt: String(data.userPrompt).slice(0, 500),
    };
  })
  .handler(async ({ data }): Promise<AIResponse> => {
    // Rate-limit check before touching the API key
    if (!checkRateLimit()) {
      return { text: "", usedAI: false, error: "RATE_LIMITED" };
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return { text: "", usedAI: false, error: "AI_UNAVAILABLE" };
    }

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

      const body = {
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `${data.systemPrompt}\n\nUser question: ${data.userPrompt}`,
              },
            ],
          },
        ],
        generationConfig: {
          maxOutputTokens: 200,
          temperature: 0.4,
          topP: 0.85,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
          },
        ],
      };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.status === 429) {
        return { text: "", usedAI: false, error: "RATE_LIMITED" };
      }

      if (!res.ok) {
        throw new Error(`Gemini HTTP ${res.status}`);
      }

      const responseData = (await res.json()) as {
        candidates?: Array<{
          content?: { parts?: Array<{ text?: string }> };
        }>;
      };

      const text =
        responseData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";

      if (!text) throw new Error("Empty Gemini response");

      return { text, usedAI: true };
    } catch (err) {
      // Log server-side only — never expose stack to client
      console.error("[ai.server] Gemini call failed:", err);
      return { text: "", usedAI: false, error: "AI_ERROR" };
    }
  });
