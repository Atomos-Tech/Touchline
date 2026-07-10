# Touchline 2026 — GenAI Stadium Hub

> An AI-powered, real-time operational intelligence and fan experience platform built for the **FIFA World Cup 2026**.

Touchline 2026 solves the immense logistical and experiential challenges of hosting the world's largest sporting event by unifying fans, venue organizers, and volunteers into a single, intelligent platform powered by Google Gemini.

[![Live Demo](https://img.shields.io/badge/Live_Demo-Available-success?style=for-the-badge)](https://touchline-ebon-kappa.vercel.app/)

## 🏆 Key Features

Touchline is architected around **three distinct modes**, dynamically adapting the UI, navigation, and AI behavior to the active user's role.

### 1. Fan Experience Mode
* **AI-Powered Wayfinding:** Ask the Floating Assistant for directions to your seat, the nearest concessions, or the fastest exit. The AI cross-references your request with live crowd density data to route you away from congestion.
* **Live Match Center:** Real-time scores, match events, and upcoming fixture schedules.
* **Transit Integration:** Live status of metro lines, shuttle buses, and parking availability to ensure smooth arrivals and departures.
* **Official Highlights:** Integrated feed of the latest World Cup highlights via the official FIFA YouTube channel.

### 2. Organizer Command Center
* **Proactive AI Intelligence:** On load, the dashboard automatically generates a Gemini-powered situational brief, synthesizing thousands of data points into a concise 2-sentence operational summary.
* **Crowd Heatmaps & Analytics:** Real-time visualization of stadium zone capacities. Automated alerts trigger when a zone approaches critical density (≥85%), providing actionable redeployment directives.
* **Incident Triage:** Live feed of reported incidents prioritized by severity, with automated response time tracking.
* **Sustainability Tracking:** Real-time metrics on carbon offset, renewable energy usage, and waste diversion, directly addressing the tournament's eco-goals.

### 3. Volunteer Dashboard
* **Dynamic Task Assignment:** Volunteers receive prioritized tasks based on live stadium needs (e.g., redirecting flow from congested Gate A).
* **Rapid Incident Reporting:** Quick-log medical emergencies, maintenance issues, or crowd disturbances directly to the Organizer Command Center.
* **Shift Management:** Clear view of upcoming, active, and completed shifts.

## 🧠 Generative AI Integration

Touchline doesn't just bolt on a chatbot; it deeply integrates **Gemini 2.0 Flash** into the stadium's operational loop:
* **Context-Aware Prompts:** The AI receives a real-time data payload (live scores, crowd density, transit delays) injected directly into its system prompt.
* **Intent Classification Pipeline:** A robust, zero-latency classifier triages user intents locally before deciding whether to invoke the LLM or use deterministic fallbacks, ensuring instant responses even under heavy load.
* **Role-Based Personalities:** Gemini responds as a friendly guide to fans, a terse operational commander to organizers, and a direct task-manager to volunteers.

## 🛡️ Security & Architecture

* **Zero-Leak Architecture:** The Gemini API key never touches the client. All LLM generation occurs via server-side edge functions (Nitro/TanStack Start).
* **Defense-in-Depth:** Incoming prompts are sanitized for XSS, template injection, and role-hijack patterns before they ever reach the LLM.
* **Rate Limiting:** A server-side token-bucket rate limiter prevents API quota exhaustion and DoS abuse.
* **Strict CSP:** `vercel.json` enforces a strict Content-Security-Policy, HSTS, and frame-denial headers.

## ♿ Accessibility (WCAG 2.1 AA)

* **Multilingual & RTL:** Full support for English, Spanish, French, Arabic (with automatic RTL layout switching), and Hindi.
* **Screen Reader Optimized:** Extensive use of `aria-live`, `aria-pressed`, `role="menuitemradio"`, and hidden skip-links.
* **Visual Adjustments:** High-contrast mode toggle and dynamic font scaling built natively into the context.

## 🚀 Tech Stack

* **Framework:** React 18 + TanStack Router (SSR)
* **Build/Server:** Vite + Nitro (Edge-optimized)
* **Styling:** Tailwind CSS + shadcn/ui + Framer Motion
* **State & Data:** TanStack Query + Zustand-style contexts
* **AI:** Google Gemini 2.0 Flash API
* **Deployment:** Vercel (Edge Functions)

## 🛠️ Local Development

1. **Clone the repository**
2. **Install dependencies:** `npm install`
3. **Configure environment:** Create a `.env` file based on `.env.example`:
   ```env
   # Must remain server-side only
   GEMINI_API_KEY=your_gemini_key
   SPORTMONKS_TOKEN=your_sportmonks_token
   # Safe for client bundling
   VITE_YOUTUBE_API_KEY=your_youtube_key
   VITE_FIFA_API_URL=https://worldcup26.ir/get/games
   ```
4. **Run development server:** `npm run dev`
5. **Run test suite:** `npm test` (163/163 Vitest suite)

---
*Built for the FIFA World Cup 2026 Hackathon / Evaluation.*
