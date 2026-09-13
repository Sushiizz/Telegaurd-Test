import { useState } from "react";
import { Copy, Check, Sparkles, MessageCircleMore } from "lucide-react";
import { formatCurrency, formatPercent } from "../../utils/format.js";

export default function RecommendedActionCard({ customerId, action, onAskAgent }) {
  const [copied, setCopied] = useState(false);
  const isPositive = action.expected_net_value > 0;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(action.message_preview);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard API unavailable (e.g. insecure context) — fail silently, copy isn't critical path */
    }
  };

  return (
    <div className="rounded-lg border border-border bg-bg p-4">
      <div className="flex items-center gap-1.5 text-xs font-medium text-indigo">
        <Sparkles size={13} />
        Next Best Action
      </div>

      <p className="mt-2 font-display text-[15px] font-semibold leading-snug text-text-primary">
        {action.title}
      </p>

      <div className="mt-3 grid grid-cols-3 gap-3 border-y border-border py-3">
        <div>
          <span className="block text-[11px] text-text-tertiary">Risk before → after</span>
          <span className="num text-sm font-medium text-text-primary">
            {formatPercent(action.current_risk)} → {formatPercent(action.simulated_risk)}
          </span>
        </div>
        <div>
          <span className="block text-[11px] text-text-tertiary">Offer cost</span>
          <span className="num text-sm font-medium text-text-primary">{formatCurrency(action.cost)}</span>
        </div>
        <div>
          <span className="block text-[11px] text-text-tertiary">Expected net value</span>
          <span className={`num text-sm font-medium ${isPositive ? "text-emerald" : "text-risk-critical"}`}>
            {formatCurrency(action.expected_net_value)}
          </span>
        </div>
      </div>

      <div className="mt-3 rounded-md border border-border-subtle bg-surface p-3">
        <p className="text-sm leading-relaxed text-text-secondary">{action.message_preview}</p>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-raised"
        >
          {copied ? <Check size={13} className="text-emerald" /> : <Copy size={13} />}
          {copied ? "Copied" : "Copy message"}
        </button>
        <button
          type="button"
          onClick={() =>
            onAskAgent(
              `Draft a personalized outreach message for customer ${customerId} based on their recommended action, and suggest the best channel to send it on.`,
            )
          }
          className="flex items-center gap-1.5 rounded-md bg-indigo px-2.5 py-1.5 text-xs font-medium text-white hover:bg-indigo-dim"
        >
          <MessageCircleMore size={13} />
          Ask agent to personalize
        </button>
      </div>
    </div>
  );
}
