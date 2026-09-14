import { motion } from "framer-motion";
import { Moon, Radio, Sun } from "lucide-react";
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

export default function TopNav({ overview, activeView, theme, onToggleTheme }) {
  const health = fleetHealthCopy(overview);

  return (
    <header data-tour="status" className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-surface/90 px-5 backdrop-blur sm:px-7">
      <div className="flex items-center gap-2 text-xs font-medium text-text-secondary"><span className="hidden sm:inline">Workspace</span><span className="text-text-tertiary">/</span><span className="text-text-primary">{activeView === "Ari Agent" ? "Ari Agent" : activeView}</span></div>
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

        <div className="hidden items-center gap-1.5 text-xs text-text-tertiary md:flex">
          <Radio size={13} strokeWidth={2} />
          <span>Live · synced {formatTimestamp()}</span>
        </div>
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          className="theme-toggle flex h-9 w-9 items-center justify-center rounded-lg border border-border text-text-secondary transition-colors hover:border-indigo hover:text-indigo"
        >
          {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
        </button>
      </div>
    </header>
  );
}
