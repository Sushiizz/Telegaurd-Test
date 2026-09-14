import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, ChevronDown, Loader2, MessageSquare, RotateCcw, Send, Sparkles, X } from "lucide-react";
import { useAgentChat } from "../../hooks/useAgentChat.js";
import AgentMessage from "./AgentMessage.jsx";

const SUGGESTED_PROMPTS = [
  "Give me the fleet health summary",
  "Draft SMS for the top 5 fiber customers at risk",
  "Which critical-risk customers are on month-to-month contracts?",
];

export default function AgentDrawer({ prefillQuery, open: controlledOpen, onOpenChange }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const [input, setInput] = useState("");
  const { messages, loading, sendQuery, resetConversation } = useAgentChat();
  const scrollRef = useRef(null);

  const setOpen = (nextOpen) => {
    if (onOpenChange) onOpenChange(nextOpen);
    else setInternalOpen(nextOpen);
  };

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
    <div data-tour="agent" className="ari-agent">
      <AnimatePresence initial={false}>
        {!open && (
          <motion.div className="ari-greeting" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
            <span>Hi, I&apos;m Ari, your retention AI agent.</span>
            <Sparkles size={13} className="text-indigo" />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.96 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="ari-panel flex flex-col overflow-hidden"
          >
            <div className="ari-panel-header flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5"><span className="ari-mini-mark"><Bot size={16} /></span><div><p className="text-sm font-bold text-text-primary">Ari</p><p className="text-[11px] text-text-tertiary">Retention AI agent</p></div></div>
              <div className="flex items-center gap-1">
                {messages.length > 0 && <button type="button" onClick={resetConversation} className="ari-icon-button" title="Start a new chat" aria-label="Start a new chat"><RotateCcw size={14} /></button>}
                <button type="button" onClick={() => setOpen(false)} className="ari-icon-button" title="Close Ari" aria-label="Close Ari"><X size={16} /></button>
              </div>
            </div>
            <div className="px-4 py-2"><p className="text-xs leading-5 text-text-tertiary">Ask about fleet risk, customers, or outreach drafts. I&apos;ll show the work behind the answer.</p></div>
            <div ref={scrollRef} className="scroll-slim min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-2">
              {messages.length === 0 && <div className="flex h-full flex-col items-center justify-center gap-3 py-4"><p className="text-sm text-text-tertiary">How can I help?</p><div className="flex flex-wrap justify-center gap-2">{SUGGESTED_PROMPTS.map((prompt) => <button key={prompt} type="button" onClick={() => sendQuery(prompt)} className="rounded-full border border-border px-3 py-1.5 text-xs text-text-secondary hover:border-indigo hover:text-text-primary">{prompt}</button>)}</div></div>}
              {messages.map((m) => <AgentMessage key={m.id} message={m} />)}
              {loading && <div className="flex items-center gap-2 text-sm text-text-tertiary"><Loader2 size={14} className="animate-spin" /> Working...</div>}
            </div>
            <div className="flex items-center gap-2 border-t border-border p-3"><input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }} placeholder="Ask Ari anything..." className="flex-1 rounded-md border border-border bg-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-indigo" /><button type="button" onClick={handleSend} disabled={!input.trim() || loading} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-indigo text-white hover:bg-indigo-dim disabled:cursor-not-allowed disabled:opacity-40"><Send size={15} /></button></div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button type="button" onClick={() => setOpen(!open)} className={`ari-bubble ${open ? "ari-bubble-open" : ""}`} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} aria-label={open ? "Close Ari" : "Open Ari, retention AI agent"}>
        <span className="ari-pulse" /><span className="ari-avatar"><Bot size={23} /></span><span className="ari-bubble-label">{open ? "Ari" : "Ask Ari"}</span>{open ? <ChevronDown size={15} /> : <MessageSquare size={15} />}
      </motion.button>
    </div>
  );
}
