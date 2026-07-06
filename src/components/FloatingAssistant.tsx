import { AnimatePresence, motion } from "framer-motion";
import { MessageSquare, Send, X, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLiveState } from "@/hooks/useLiveState";
import { useLocale } from "@/hooks/useLocale";
import { generateReply, sanitizePrompt } from "@/lib/assistant";
import type { Prompt } from "@/types/domain";

const SUGGESTIONS = [
  "Which gate is fastest right now?",
  "How's the metro looking?",
  "What's the current score?",
  "When is the next match?",
];

export function FloatingAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Prompt[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi! I'm your live stadium assistant. Ask me about gates, transit, live scores, or crowd density.",
      timestamp: new Date().toISOString(),
    },
  ]);
  const { data: state } = useLiveState();
  const { t } = useLocale();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  const send = useCallback(
    (text: string) => {
      const cleaned = sanitizePrompt(text);
      if (!cleaned || !state) return;
      const userMsg: Prompt = {
        id: `u-${Date.now()}`,
        role: "user",
        content: cleaned,
        timestamp: new Date().toISOString(),
      };
      const replyText = generateReply(cleaned, { state });
      const aiMsg: Prompt = {
        id: `a-${Date.now() + 1}`,
        role: "assistant",
        content: replyText,
        timestamp: new Date().toISOString(),
      };
      setMessages((m) => [...m, userMsg, aiMsg]);
      setInput("");
    },
    [state],
  );

  const onSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      send(input);
    },
    [input, send],
  );

  const suggestions = useMemo(() => SUGGESTIONS, []);

  return (
    <>
      <motion.button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close stadium assistant" : "Open stadium assistant"}
        aria-expanded={open}
        aria-controls="stadium-assistant-panel"
        className="fixed bottom-5 right-5 z-50 grid size-14 place-items-center rounded-full bg-pitch text-pitch-foreground shadow-lg shadow-pitch/40 ring-2 ring-white/40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-pitch/40"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {open ? <X className="size-6" aria-hidden /> : <MessageSquare className="size-6" aria-hidden />}
        <span className="absolute -top-1 -right-1 grid size-5 place-items-center rounded-full bg-live text-live-foreground text-[10px] font-bold">
          AI
        </span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.aside
            id="stadium-assistant-panel"
            role="dialog"
            aria-label="Stadium AI assistant"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="fixed bottom-24 right-5 z-50 flex h-[32rem] w-[min(24rem,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
          >
            <header className="flex items-center gap-2 border-b border-border bg-deep px-4 py-3 text-deep-foreground">
              <div className="grid size-8 place-items-center rounded-full bg-pitch text-pitch-foreground">
                <Sparkles className="size-4" aria-hidden />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">{t("ask_assistant")}</p>
                <p className="text-xs text-deep-foreground/70">Context-aware • Live data</p>
              </div>
              <span className="live-dot" aria-hidden />
            </header>

            <div
              ref={scrollRef}
              className="flex-1 space-y-3 overflow-y-auto p-4"
              aria-live="polite"
              aria-atomic="false"
            >
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                      m.role === "user"
                        ? "rounded-br-sm bg-primary text-primary-foreground"
                        : "rounded-bl-sm bg-muted text-foreground"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}

              {messages.length <= 1 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => send(s)}
                      className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-pitch hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <form
              onSubmit={onSubmit}
              className="flex items-center gap-2 border-t border-border bg-background p-3"
            >
              <label htmlFor="assistant-input" className="sr-only">
                {t("placeholder_chat")}
              </label>
              <Input
                id="assistant-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t("placeholder_chat")}
                maxLength={500}
                autoComplete="off"
              />
              <Button
                type="submit"
                size="icon"
                aria-label={t("send")}
                disabled={!input.trim()}
                className="bg-pitch text-pitch-foreground hover:bg-pitch/90"
              >
                <Send className="size-4" aria-hidden />
              </Button>
            </form>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
