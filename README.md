# Touchline 2026 — GenAI Stadium Hub for FIFA World Cup 2026

> **An AI-powered, real-time platform that enhances stadium operations and the tournament experience for fans, organizers, volunteers, and venue staff — powered by Google Gemini 2.0 Flash.**

[![Live Demo](https://img.shields.io/badge/Live_Demo-touchline--ebon--kappa.vercel.app-success?style=for-the-badge)](https://touchline-ebon-kappa.vercel.app/)
[![Tests](https://img.shields.io/badge/Tests-163%2F163_Passing-brightgreen?style=for-the-badge)](./src/__tests__)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue?style=for-the-badge)](./tsconfig.json)

---

## 🎯 Problem Statement Alignment

The FIFA World Cup 2026 spans **16 host cities, 104 matches, and millions of fans**. Touchline 2026 addresses every dimension of the challenge using Generative AI as its operational core.

| Problem Area | Touchline Solution | Mode |
|---|---|---|
| **Navigation** | AI Wayfinding — real-time gate routing cross-referenced with live crowd density | Fan |
| **Crowd Management** | Live heatmaps, capacity alerts at ≥85%, AI-directed steward redeployment | Organizer |
| **Accessibility** | Dedicated accessibility route finder, WCAG 2.1 AA, wheelchair gate guidance | Fan |
| **Transportation** | Live metro/shuttle/bus status, best-transit recommendations per zone | Fan / Organizer |
| **Sustainability** | Real-time carbon offset, renewable energy usage, and waste diversion tracking | Organizer |
| **Multilingual Assistance** | 5-language AI assistant (EN, ES, FR, AR, HI) with automatic RTL layout for Arabic | Fan |
| **Operational Intelligence** | Proactive Gemini situational briefing auto-generated on dashboard load | Organizer |
| **Real-Time Decision Support** | AI-derived redeployment directives, egress plans, and incident escalation routing | Organizer / Volunteer |

---

## 🏗️ Three-Mode Architecture

Touchline dynamically adapts its entire UI, navigation, and AI persona to the active user's role. No separate apps — one platform, three lenses.

```
┌─────────────────────────────────────────────────────┐
│                  Touchline 2026                      │
├──────────────┬──────────────────┬───────────────────┤
│  Fan Mode    │  Organizer Mode  │  Volunteer Mode   │
│              │                  │                   │
│ Navigation   │ Crowd Heatmaps   │ Task Assignment   │
│ Live Scores  │ AI Situation     │ Incident Reports  │
│ Transit      │   Brief          │ Shift Management  │
│ Highlights   │ Incident Triage  │ Zone Alerts       │
│ Accessibility│ Sustainability   │                   │
│ AI Assistant │ Analytics        │ AI Assistant      │
│ (friendly)   │ AI Assistant     │ (task-focused)    │
│              │ (operational)    │                   │
└──────────────┴──────────────────┴───────────────────┘
```

---

## 🧠 Generative AI — Deep Integration

Touchline does not bolt on a chatbot. Gemini 2.0 Flash is woven into the operational loop at multiple layers:

### 1. Floating AI Assistant (All Modes)
- **Intent Classification Pipeline:** A zero-latency local classifier triages every user query and routes it to either the deterministic rule engine (instant) or Gemini (rich contextual answer). This means the assistant is always responsive even under load or API failure.
- **Live Context Injection:** Before every Gemini call, a real-time data payload is injected into the system prompt — live scores, zone capacity percentages, transit delays, and crowd ingress rates.
- **Role-Based AI Personas:**
  - *Fan:* Warm, practical, enthusiastic — answers about gates, food, transit, scores, accessibility
  - *Organizer:* Terse, authoritative, action-oriented — crowd directives, egress plans, staff numbers
  - *Volunteer:* Direct, task-focused — "Proceed to Gate A, assist with crowd flow"

### 2. Proactive AI Situational Briefing (Organizer Dashboard)
On every page load, Gemini **automatically** generates a 2-sentence situation report synthesizing crowd density, transit disruptions, and live match state — without the organizer having to ask anything. This is genuine proactive AI, not reactive chat.

### 3. AI-Powered Navigation (Fan Mode)
When a fan requests directions, the AI doesn't just give a static route. It cross-references the request with live zone capacity data and routes the fan away from congested gates in real time.

### 4. Prompt Security
Every user prompt is sanitized server-side for XSS vectors, template injection patterns, and role-hijack attempts (`ignore previous instructions`, `you are now`, etc.) before reaching the LLM.

---

## ✨ Feature Deep-Dive

### Fan Mode

#### 🗺️ Navigation & Wayfinding
- **Step-by-step gate routing** with AI-generated directions that account for real-time crowd density
- **Fastest gate selector** — always recommends the least-congested entrance
- Dedicated **`/fan/navigate`** page with entry point selector and destination picker

#### ♿ Accessibility
- **Wheelchair-accessible route finder** — dedicated `/fan/accessibility` page
- Routes to accessible entrances, lift locations, and accessible restroom positions
- AI assistant answers accessibility queries with specific gate numbers and volunteer guidance
- Full **WCAG 2.1 AA** compliance across all interactive elements

#### 🚇 Transportation
- Live status for **metro lines, stadium shuttles, and bus services**
- AI assistant surfaces best transit option based on current headway and zone proximity
- Delayed/surge transit lines flagged with alternatives

#### 🌍 Multilingual Assistance
- AI responds in the **fan's language** — English, Spanish (ES), French (FR), Arabic (AR), Hindi (HI)
- **Automatic RTL layout** switches the entire UI direction for Arabic users
- Language selector persists across sessions via `AccessibilityContext`

#### 📺 Live Match Center & Highlights
- Real-time scores from the **FIFA 2026 official API** (`worldcup26.ir`)
- Goal timelines with scorer names, minutes, OG/penalty annotations
- Integrated **YouTube official FIFA highlights** feed with view counts and duration

---

### Organizer Mode

#### 📊 Crowd Management & Heatmaps
- **Live zone capacity heatmap** — 6 zones rendered with color-coded density indicators
- **Automated surge alerts** at ≥85% capacity with specific steward redeployment directives (e.g., "Redirect 4 stewards from West Concourse to Gate A")
- AI recommendation cards with severity levels (info / warn / critical) updated every 3 seconds

#### 🚨 Incident Management
- Live incident feed at `/ops/incidents` — medical, security, infrastructure, crowd categories
- **AI-assisted triage** — Gemini suggests escalation level and recommended action for each incident
- Status tracking: open → escalated → resolved with response time logging

#### 🌱 Sustainability
- **Carbon offset tracker** — real-time kg CO₂ saved metric
- **Renewable energy percentage** of venue power consumption
- **Waste diversion rate** — recycling vs landfill tracking
- All metrics at `/ops/sustainability` as live animated charts

#### 📈 Analytics
- Historical crowd flow charts, transit utilization, ingress/egress rates at `/ops/analytics`
- Recharts-powered area and line charts with live data refresh

---

### Volunteer Mode

#### 📋 Task Assignment
- Prioritized task queue at `/volunteer` driven by live crowd density — busiest zones surface highest-priority tasks automatically
- AI assistant provides specific directives: zone, gate, and action type

#### 📣 Alerts
- Real-time operational alerts at `/volunteer/alerts` — crowd surges, transit disruptions, full-time egress warnings
- Mute toggle for non-critical shifts

#### 📁 Shift Management
- Upcoming, active, and completed shifts at `/volunteer/shifts`
- Role-based check-in tracking

#### 🚩 Incident Reporting
- `/volunteer/report` — structured form with category, severity, and location
- AI triage suggestion before submission

---

## 🛡️ Security Architecture

| Layer | Implementation |
|---|---|
| **API Key Protection** | Gemini key is server-side only — never bundled in client JS. Uses `createServerFn()` (Nitro edge function). |
| **Prompt Sanitization** | Regex-based XSS, injection, and role-hijack filtering on every user input |
| **Rate Limiting** | Token-bucket limiter (20 req/min) server-side — prevents quota exhaustion |
| **HTTP Security Headers** | CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy via `vercel.json` |
| **Input Validation** | Server-side validator on every AI call — userPrompt capped at 500 chars, systemPrompt at 4000 |

---

## ⚡ Efficiency & Performance

- **Deterministic fallback engine** — all intents have a rule-based response path. Zero LLM latency for common queries.
- **30-second FIFA API cache** — prevents redundant network calls
- **DNS prefetch + preconnect** hints for Google Fonts, YouTube API, and FIFA API
- **Edge SSR** via Nitro/Vercel — first byte delivered from the nearest edge node worldwide
- **Intent classification** runs locally in < 1ms before deciding whether to invoke Gemini

---

## ✅ Testing

163 tests across 6 test suites — all passing:

```
✓ assistant.test.ts    (55 tests) — classify, sanitize, generateReply, buildSystemPrompts
✓ fifaApi.test.ts      (25 tests) — parseLocalDate, parseScorers, parseGoalEvent, mapGameToMatch
✓ multimodule.test.ts  (50 tests) — cross-module integration, formatters, operations recommend()
✓ liveApi.test.ts      (12 tests) — advanceMinute, updateCrowd simulation helpers
✓ highlights.test.ts   (14 tests) — fmtDuration, fmtViews, fmtRelative
✓ operations.test.ts   ( 7 tests) — recommend() severity tiers
```

Run with: `npm test`

---

## 🚀 Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TanStack Router (file-based, SSR) |
| Server | Nitro (Edge Functions via Vercel) |
| Styling | Tailwind CSS + shadcn/ui + Framer Motion |
| AI | Google Gemini 2.0 Flash (`gemini-2.0-flash`) |
| Charts | Recharts |
| Data | TanStack Query (server state), React Context (client state) |
| Testing | Vitest + happy-dom |
| Deployment | Vercel (Edge, global CDN) |

---

## 🛠️ Local Development

```bash
# 1. Clone
git clone https://github.com/Atomos-Tech/Touchline.git
cd Touchline

# 2. Install
npm install

# 3. Configure environment
cp .env.example .env
# Fill in your keys — see .env.example for all required variables

# 4. Run dev server
npm run dev

# 5. Run tests
npm test
```

### Required Environment Variables

| Variable | Description | Exposure |
|---|---|---|
| `GEMINI_API_KEY` | Google Gemini API key | Server-only (never client) |
| `SPORTMONKS_TOKEN` | Sportmonks Football API | Server-only |
| `VITE_YOUTUBE_API_KEY` | YouTube Data API v3 | Client (safe, quota-limited) |
| `VITE_FIFA_API_URL` | FIFA 2026 game data endpoint | Client (public endpoint) |

---

*Built for the FIFA World Cup 2026 GenAI Hackathon. Targeting fans, organizers, volunteers, and venue staff across all 16 host cities.*
