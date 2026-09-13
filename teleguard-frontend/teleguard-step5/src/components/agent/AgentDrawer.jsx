import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, ChevronUp, ChevronDown, RotateCcw, Send, Loader2 } from "lucide-react";
import { useAgentChat } from "../../hooks/useAgentChat.js";
import AgentMessage from "./AgentMessage.jsx";

const SUGGESTED_PROMPTS = [
  "Give me the fleet health summary",
  "Draft SMS for the top 5 fiber customers at risk",
  "Which critical-risk customers are on month-to-month contracts?",
];

export default function AgentDrawer({ prefillQuery }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const { messages, loading, sendQuery, resetConversation } = useAgentChat();
  const scrollRef = useRef(null);

  // A "prefillQuery" arriving from elsewhere in the app (e.g. the Customer
  // 360 panel's "Ask agent to personalize" button) opens the drawer and
  // loads the text into the input, ready for the user to review and send.
  useEffect(() => {
    if (!prefillQuery) return;
    setOpen(true);
    setInput(prefillQuery.text);
  }, [prefillQuery]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = () => {
    if (!input.trim() || loading) return;
    sendQuery(input);
    setInput("");
  };

  return (
    <div className="border-t border-border bg-surface">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 w-full shrink-0 items-center gap-2 px-5 text-sm text-text-secondary hover:text-text-primary"
      >
        <MessageSquare size={15} strokeWidth={2} className="text-indigo" />
        <span className="font-medium">Retention Agent</span>
        {messages.length > 0 && !open && (
          <span className="rounded-full bg-indigo/15 px-1.5 py-0.5 text-[11px] text-indigo">
            {messages.filter((m) => m.role === "assistant").length}
          </span>
        )}
        <span className="ml-auto flex items-center gap-1 text-xs text-text-tertiary">
          {open ? "Collapse" : "Expand"}
          {open ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 380, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="flex flex-col overflow-hidden border-t border-border"
          >
            <div className="flex items-center justify-between px-4 py-2">
              <p className="text-xs text-text-tertiary">
                Ask about fleet risk, specific customers, or drafting outreach — the agent calls the same
                deterministic tools the dashboard uses, and shows its work.
              </p>
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={resetConversation}
                  className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs text-text-secondary hover:bg-surface-raised hover:text-text-primary"
                >
                  <RotateCcw size={12} />
                  New chat
                </button>
              )}
            </div>

            <div ref={scrollRef} className="scroll-slim min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-2">
              {messages.length === 0 && (
                <div className="flex h-full flex-col items-center justify-center gap-3 py-4">
                  <p className="text-sm text-text-tertiary">Try one of these, or ask your own question.</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {SUGGESTED_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => sendQuery(prompt)}
                        className="rounded-full border border-border px-3 py-1.5 text-xs text-text-secondary hover:border-indigo hover:text-text-primary"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m) => (
                <AgentMessage key={m.id} message={m} />
              ))}

              {loading && (
                <div className="flex items-center gap-2 text-sm text-text-tertiary">
                  <Loader2 size={14} className="animate-spin" />
                  Working…
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 border-t border-border p-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask the retention agent…"
                className="flex-1 rounded-md border border-border bg-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-indigo"
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-indigo text-white hover:bg-indigo-dim disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Send size={15} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
