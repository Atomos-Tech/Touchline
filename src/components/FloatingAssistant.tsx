/**
 * FloatingAssistant — AI-powered chat panel, mode-aware.
 *
 * - Fan mode:       Friendly, helpful, covers navigation/scores/food/accessibility
 * - Organizer mode: Operational, terse, covers crowd/transit/incident directives
 * - Volunteer mode: Direct task-focused directives
 *
 * Security: Gemini calls go via server function (src/services/ai.ts).
 *           No API key is read client-side.
 *
 * Accessibility:
 *   - Focus trapped inside the panel when open (WCAG 2.1.2)
 *   - Keyboard shortcut: Ctrl+/ to toggle (announced via aria-label)
 *   - role="dialog" with aria-modal and aria-label
 *   - aria-live="polite" on message thread for screen readers
 *   - Escape key closes the panel
 */
import { AnimatePresence, motion } from "framer-motion";
import {
  MessageSquare, Send, X, Sparkles, Bot, Loader2,
  ClipboardList, Radio,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLiveState } from "@/hooks/useLiveState";
import { useLocale } from "@/hooks/useLocale";
import { generateAIReply, sanitizePrompt } from "@/lib/assistant";
import { useMode } from "@/contexts/ModeContext";
import type { AppMode } from "@/contexts/ModeContext";
import type { Prompt } from "@/types/domain";

// ---------------------------------------------------------------------------
// Mode-specific quick suggestions
// ---------------------------------------------------------------------------

const SUGGESTIONS: Record<AppMode, string[]> = {
  fan: [
    "Which gate is fastest right now?",
    "What's the current score?",
    "How's the metro looking?",
    "Where's the closest food stand?",
    "Wheelchair accessible entrance?",
  ],
  organizer: [
    "What's the crowd situation?",
    "Any transit disruptions?",
    "Recommend staff redeployment",
    "What are the critical zones?",
    "Give me an egress plan",
  ],
  volunteer: [
    "What's my next task?",
    "Where should I go right now?",
    "How do I report an incident?",
    "Which zone needs help?",
    "What's the crowd status?",
  ],
};

const WELCOME: Record<AppMode, string> = {
  fan: "Hi! I'm your FIFA 2026 stadium assistant. Ask me about live scores, gate directions, transit, food, or accessibility features.",
  organizer: "Operational AI online. Crowd, transit, and incident data loaded. Request a situation report or specific directive.",
  volunteer: "Volunteer AI ready. I can assign tasks, guide you to priority zones, or help you report incidents. What do you need?",
};

const PLACEHOLDER: Record<AppMode, string> = {
  fan: "Ask about gates, transit, scores, food…",
  organizer: "Request operational intel or directives…",
  volunteer: "Ask for your next task or zone assignment…",
};

interface ChatMessage extends Prompt {
  usedAI?: boolean;
}

// ---------------------------------------------------------------------------
// Focus trap utility
// ---------------------------------------------------------------------------

const FOCUSABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

function trapFocus(container: HTMLElement, event: KeyboardEvent) {
  const focusable = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.hasAttribute("disabled"),
  );
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (event.key === "Tab") {
    if (event.shiftKey) {
      if (document.activeElement === first) {
        event.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FloatingAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const { mode, config } = useMode();
  const { locale } = useLocale();

  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Reset messages and show mode-appropriate welcome when mode changes
  useEffect(() => {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: WELCOME[mode],
        timestamp: new Date().toISOString(),
        usedAI: false,
      },
    ]);
  }, [mode]);

  const { data: state } = useLiveState();
  const { t } = useLocale();
  const scrollRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open, isTyping]);

  // Focus first element when panel opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Keyboard shortcut: Ctrl+/ toggles assistant
  // Escape closes it
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "/" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
      // Focus trap inside open panel
      if (open && panelRef.current) {
        trapFocus(panelRef.current, e);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const send = useCallback(
    async (text: string) => {
      const cleaned = sanitizePrompt(text);
      if (!cleaned || !state) return;

      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        role: "user",
        content: cleaned,
        timestamp: new Date().toISOString(),
      };

      setMessages((m) => [...m, userMsg]);
      setInput("");
      setIsTyping(true);

      try {
        const { text: replyText, usedAI } = await generateAIReply(cleaned, {
          state,
          mode,
          locale,
        });

        const aiMsg: ChatMessage = {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: replyText,
          timestamp: new Date().toISOString(),
          usedAI,
        };
        setMessages((m) => [...m, aiMsg]);
      } catch {
        setMessages((m) => [
          ...m,
          {
            id: `e-${Date.now()}`,
            role: "assistant",
            content: "Sorry, I couldn't process that. Please try again.",
            timestamp: new Date().toISOString(),
            usedAI: false,
          },
        ]);
      } finally {
        setIsTyping(false);
      }
    },
    [state, mode, locale],
  );

  const onSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      send(input);
    },
    [input, send],
  );

  const suggestions = useMemo(() => SUGGESTIONS[mode], [mode]);

  // Mode-specific icons and colors
  const ModeIcon = mode === "organizer" ? Radio : mode === "volunteer" ? ClipboardList : Sparkles;
  const fabBg =
    mode === "organizer"
      ? "bg-amber-500 shadow-amber-500/40"
      : mode === "volunteer"
        ? "bg-live shadow-live/40"
        : "bg-pitch shadow-pitch/40";
  const fabText =
    mode === "organizer" ? "text-white" : "text-pitch-foreground";

  return (
    <>
      {/* FAB toggle button */}
      <motion.button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={
          open
            ? "Close AI assistant (Ctrl+/)"
            : `Open ${config.label} AI assistant (Ctrl+/)`
        }
        aria-expanded={open}
        aria-controls="stadium-assistant-panel"
        className={`fixed bottom-5 right-5 z-50 grid size-14 place-items-center rounded-full shadow-lg ring-2 ring-white/40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-pitch/40 transition-colors ${fabBg} ${fabText}`}
        whileHover={{ scale: 1.07 }}
        whileTap={{ scale: 0.93 }}
      >
        {open ? (
          <X className="size-6" aria-hidden />
        ) : (
          <MessageSquare className="size-6" aria-hidden />
        )}
        <span className="absolute -top-1 -right-1 grid size-5 place-items-center rounded-full bg-white text-deep text-[9px] font-bold">
          AI
        </span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.aside
            ref={panelRef}
            id="stadium-assistant-panel"
            role="dialog"
            aria-modal="true"
            aria-label={`${config.label} AI assistant`}
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
            className="fixed bottom-24 right-5 z-50 flex h-[34rem] w-[min(26rem,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
          >
            {/* Header */}
            <header className="flex items-center gap-2 border-b border-border bg-deep px-4 py-3 text-deep-foreground">
              <div className={`grid size-8 place-items-center rounded-full ${fabBg} ${fabText}`}>
                <ModeIcon className="size-4" aria-hidden />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">{config.label} Assistant</p>
                <p className="text-xs text-deep-foreground/70">
                  Gemini AI · Live stadium context · Ctrl+/ to toggle
                </p>
              </div>
              <span className="live-dot" aria-hidden />
            </header>

            {/* Message thread */}
            <div
              ref={scrollRef}
              className="flex-1 space-y-3 overflow-y-auto p-4"
              aria-live="polite"
              aria-atomic="false"
              aria-label="Chat messages"
            >
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {m.role === "assistant" && (
                    <div className="mr-2 mt-1 grid size-6 shrink-0 place-items-center rounded-full bg-pitch/15 text-pitch">
                      <Bot className="size-3.5" aria-hidden />
                    </div>
                  )}
                  <div
                    className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                      m.role === "user"
                        ? "rounded-br-sm bg-primary text-primary-foreground"
                        : "rounded-bl-sm bg-muted text-foreground"
                    }`}
                  >
                    {m.content}
                    {m.role === "assistant" && m.usedAI && (
                      <span className="mt-1 block text-[10px] text-pitch opacity-70">
                        ✦ Gemini AI
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              <AnimatePresence>
                {isTyping && (
                  <motion.div
                    key="typing"
                    className="flex items-center gap-2"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    aria-label="Assistant is thinking"
                  >
                    <div className="grid size-6 shrink-0 place-items-center rounded-full bg-pitch/15 text-pitch">
                      <Bot className="size-3.5" aria-hidden />
                    </div>
                    <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm bg-muted px-3 py-2">
                      <Loader2 className="size-3.5 animate-spin text-pitch" aria-hidden />
                      <span className="text-xs text-muted-foreground">Thinking…</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Quick suggestions (shown only on welcome / first message) */}
              {messages.length <= 1 && (
                <div className="flex flex-wrap gap-2 pt-2" role="list" aria-label="Quick question suggestions">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      role="listitem"
                      onClick={() => send(s)}
                      className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-pitch hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Input form */}
            <form
              onSubmit={onSubmit}
              className="flex items-center gap-2 border-t border-border bg-background p-3"
            >
              <label htmlFor="assistant-input" className="sr-only">
                {PLACEHOLDER[mode]}
              </label>
              <Input
                ref={inputRef}
                id="assistant-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={PLACEHOLDER[mode]}
                maxLength={500}
                autoComplete="off"
                disabled={isTyping}
                className="focus-visible:ring-2 focus-visible:ring-pitch focus-visible:ring-offset-1"
              />
              <Button
                type="submit"
                size="icon"
                aria-label={t("send")}
                disabled={!input.trim() || isTyping}
                className={`shrink-0 ${fabBg} ${fabText} hover:opacity-90`}
              >
                {isTyping ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Send className="size-4" aria-hidden />
                )}
              </Button>
            </form>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
