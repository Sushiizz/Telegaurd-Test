import { motion } from "framer-motion";
import { Radio } from "lucide-react";
import { formatTimestamp } from "../../utils/format.js";

/**
 * Fleet health reads directly off risk_distribution from /api/overview —
 * never a fabricated status. If overview hasn't loaded yet, the pill shows
 * a neutral "Syncing" state rather than guessing.
 */
function fleetHealthCopy(overview) {
  if (!overview) return { label: "Syncing fleet status", tone: "text-text-tertiary" };

  const critical = overview.risk_distribution?.CRITICAL ?? 0;
  if (critical === 0) {
    return { label: "Fleet healthy", tone: "text-emerald" };
  }
  return {
    label: `${critical.toLocaleString()} account${critical === 1 ? "" : "s"} critical`,
    tone: "text-risk-critical",
  };
}

export default function TopNav({ overview }) {
  const health = fleetHealthCopy(overview);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface px-5">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo">
          <span className="font-display text-sm font-semibold text-white">T</span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="font-display text-[15px] font-semibold tracking-tight text-text-primary">
            TeleGuard
          </span>
          <span className="font-display text-[15px] font-semibold tracking-tight text-indigo">
            AI
          </span>
        </div>
      </div>

      <div className="flex items-center gap-5">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <motion.span
              className={`absolute inline-flex h-full w-full rounded-full ${
                health.tone === "text-risk-critical" ? "bg-risk-critical" : "bg-emerald"
              }`}
              animate={{ opacity: [0.9, 0.25, 0.9], scale: [1, 1.6, 1] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            />
            <span
              className={`relative inline-flex h-2 w-2 rounded-full ${
                health.tone === "text-risk-critical" ? "bg-risk-critical" : "bg-emerald"
              }`}
            />
          </span>
          <span className={`text-sm font-medium ${health.tone}`}>{health.label}</span>
        </div>

        <div className="hidden items-center gap-1.5 text-xs text-text-tertiary sm:flex">
          <Radio size={13} strokeWidth={2} />
          <span>Live · synced {formatTimestamp()}</span>
        </div>
      </div>
    </header>
  );
}
