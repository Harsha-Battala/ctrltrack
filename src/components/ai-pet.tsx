import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useQuery } from "@tanstack/react-query";
import { X, Minus, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";

const IDLE_TIPS = [
  "Psst… want a plan for today?",
  "Need help breaking down a goal?",
  "Ask me what to focus on next!",
  "Any job applications pending?",
];

const QUICK_PROMPTS = [
  "What should I focus on today?",
  "Break down my biggest goal into steps",
  "How is my job search going?",
  "Give me a quick motivation boost",
];

type Pos = { x: number; y: number };

function randomPos(): Pos {
  const w = typeof window === "undefined" ? 1200 : window.innerWidth;
  const h = typeof window === "undefined" ? 800 : window.innerHeight;
  return {
    x: Math.round(40 + Math.random() * Math.max(80, w - 160)),
    y: Math.round(120 + Math.random() * Math.max(80, h - 260)),
  };
}

export function AiPet() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<Pos>({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);
  const [tip, setTip] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const tipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMounted(true);
    const w = window.innerWidth;
    const h = window.innerHeight;
    setPos({ x: w - 130, y: h - 170 });
  }, []);

  // Roam around the screen while the chat is closed.
  useEffect(() => {
    if (!mounted || open) return;
    const id = setInterval(() => setPos(randomPos()), 7000);
    return () => clearInterval(id);
  }, [mounted, open]);

  // Occasional idle tips.
  useEffect(() => {
    if (!mounted || open) return;
    const id = setInterval(() => {
      setTip(IDLE_TIPS[Math.floor(Math.random() * IDLE_TIPS.length)]);
      if (tipTimer.current) clearTimeout(tipTimer.current);
      tipTimer.current = setTimeout(() => setTip(null), 5000);
    }, 16000);
    return () => clearInterval(id);
  }, [mounted, open]);

  // Dock the pet next to the chat panel when open.
  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    setTip(null);
    setPos({ x: window.innerWidth - 130, y: window.innerHeight - 170 });
  }, [open]);

  const { data: snapshot } = useQuery({
    queryKey: ["pet-context", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const [items, cats] = await Promise.all([
        supabase
          .from("items")
          .select("title, completed, priority, category_id, created_at, completed_at")
          .order("created_at", { ascending: false })
          .limit(60),
        supabase.from("categories").select("id, name, description"),
      ]);
      const catMap = new Map((cats.data ?? []).map((c) => [c.id, c.name]));
      const rows = items.data ?? [];
      const open = rows.filter((i) => !i.completed);
      return [
        `Categories: ${(cats.data ?? []).map((c) => c.name).join(", ") || "none yet"}`,
        `Open items (${open.length}): ` +
          (open
            .slice(0, 25)
            .map((i) => `${i.title} [${catMap.get(i.category_id) ?? "?"}, ${i.priority}]`)
            .join("; ") || "none"),
        `Completed recently: ${rows.filter((i) => i.completed).length}`,
      ].join("\n");
    },
  });

  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/pet-chat" }), []);
  const { messages, sendMessage, status, error } = useChat({ transport });

  const busy = status === "submitted" || status === "streaming";

  const send = useCallback(
    (text: string) => {
      const value = text.trim();
      if (!value || busy) return;
      setInput("");
      void sendMessage({ text: value }, { body: { context: snapshot ?? "" } });
    },
    [busy, sendMessage, snapshot],
  );

  const handleSubmit = (message: PromptInputMessage) => {
    send(message.text ?? input);
  };

  if (!mounted || !user) return null;

  return (
    <>
      {/* Roaming pet */}
      <button
        type="button"
        aria-label="Open Ctrl, your AI companion"
        onClick={() => setOpen((v) => !v)}
        className="ai-pet fixed z-40"
        style={{ left: pos.x, top: pos.y }}
      >
        {tip && !open && <span className="ai-pet-tip">{tip}</span>}
        <span className={cn("ai-pet-body", busy && "ai-pet-thinking")}>
          <span className="ai-pet-eye" />
          <span className="ai-pet-eye" />
          <span className="ai-pet-mouth" />
        </span>
        <span className="ai-pet-shadow" />
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-4 right-4 z-50 flex h-[540px] w-[min(94vw,390px)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-black/50 sm:bottom-6 sm:right-24">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <p className="font-display text-sm font-semibold">Ctrl · AI Companion</p>
              <p className="text-[11px] text-muted-foreground">Always here to help you move forward</p>
            </div>
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setOpen(false)}>
                <Minus className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Conversation className="flex-1">
            <ConversationContent className="gap-3 p-3">
              {messages.length === 0 && (
                <div className="space-y-3 py-4">
                  <p className="text-sm text-muted-foreground">
                    Hi! I&apos;m Ctrl. I can see your goals, habits and job pipeline — ask me anything.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_PROMPTS.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => send(q)}
                        className="rounded-full border border-border bg-secondary/40 px-3 py-1.5 text-xs text-foreground transition hover:border-primary hover:text-primary"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m) => {
                const text = m.parts
                  .map((p) => (p.type === "text" ? p.text : ""))
                  .join("");
                return (
                  <Message from={m.role} key={m.id}>
                    <MessageContent
                      className={cn(
                        m.role === "assistant" && "bg-transparent px-0 text-foreground",
                      )}
                    >
                      <MessageResponse>{text}</MessageResponse>
                    </MessageContent>
                  </Message>
                );
              })}

              {status === "submitted" && <Shimmer className="text-sm">Thinking…</Shimmer>}
              {error && (
                <p className="text-xs text-destructive">
                  Ctrl couldn&apos;t answer right now. Please try again in a moment.
                </p>
              )}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>

          <div className="border-t border-border p-3">
            <PromptInput onSubmit={handleSubmit}>
              <PromptInputTextarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Ctrl for help…"
              />
              <PromptInputFooter className="justify-end">
                <PromptInputSubmit status={status} disabled={!input.trim() && !busy}>
                  <Send className="h-4 w-4" />
                </PromptInputSubmit>
              </PromptInputFooter>
            </PromptInput>
          </div>
        </div>
      )}
    </>
  );
}
