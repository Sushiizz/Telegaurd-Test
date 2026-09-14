import { ArrowUpRight, ShieldCheck, Sparkles, UsersRound } from "lucide-react";
import { formatCurrencyCompact, formatPercent } from "../../utils/format.js";
import RiskMixBar from "./RiskMixBar.jsx";

const RISK_ROWS = [
  { key: "CRITICAL", label: "Critical", color: "var(--color-risk-critical)", action: "Immediate outreach" },
  { key: "HIGH", label: "High", color: "var(--color-risk-high)", action: "Review this week" },
  { key: "MEDIUM", label: "Medium", color: "var(--color-risk-medium)", action: "Nurture" },
  { key: "LOW", label: "Low", color: "var(--color-risk-low)", action: "Monitor" },
];

export default function OverviewHome({ overview, onOpenCustomers }) {
  if (!overview) return <div className="overview-empty">Loading fleet intelligence...</div>;

  const critical = overview.risk_distribution?.CRITICAL ?? 0;
  const high = overview.risk_distribution?.HIGH ?? 0;
  const priorityAccounts = critical + high;

  return (
    <section className="overview-home scroll-slim" aria-label="Fleet overview">
      <div className="overview-hero">
        <div>
          <p className="tour-eyebrow">Signal to action</p>
          <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-text-primary">Know where to act next.</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-text-secondary">Your fleet is being scored continuously so the retention team can spend time on the accounts with the clearest path to saved value.</p>
        </div>
        <div className="overview-hero-mark"><Sparkles size={22} /></div>
      </div>

      <div className="overview-grid mt-4">
        <article className="overview-card overview-card-accent">
          <div className="overview-card-icon"><UsersRound size={17} /></div>
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.12em] text-text-tertiary">Priority accounts</p>
          <p className="num mt-1 font-display text-3xl font-bold text-text-primary">{priorityAccounts.toLocaleString()}</p>
          <p className="mt-2 text-xs text-text-secondary">Critical and high-risk customers ready for action.</p>
          <button type="button" onClick={onOpenCustomers} className="mt-5 flex items-center gap-1 text-xs font-semibold text-indigo hover:text-indigo-dim">Open customer worklist <ArrowUpRight size={13} /></button>
        </article>

        <article data-tour="risk-posture" className="overview-card">
          <div className="overview-card-icon overview-card-icon-green"><ShieldCheck size={17} /></div>
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.12em] text-text-tertiary">Value opportunity</p>
          <p className="num mt-1 font-display text-3xl font-bold text-emerald">{formatCurrencyCompact(overview.potential_value_saved)}</p>
          <p className="mt-2 text-xs text-text-secondary">Estimated value protected by timely retention action.</p>
          <div className="mt-5 text-xs font-semibold text-text-secondary">Fleet churn at {formatPercent(overview.fleet_churn_rate, 1)}</div>
        </article>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="overview-card">
          <div className="flex items-center justify-between gap-3">
            <div><p className="text-sm font-bold text-text-primary">Fleet risk posture</p><p className="mt-1 text-xs text-text-secondary">{overview.total_customers.toLocaleString()} customers across four action bands.</p></div>
            <span className="overview-status-dot" aria-hidden="true" />
          </div>
          <div className="mt-5"><RiskMixBar riskDistribution={overview.risk_distribution} variant="pie" /></div>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {RISK_ROWS.map((row) => (
              <div key={row.key} className="risk-summary-row">
                <span className="risk-summary-dot" style={{ backgroundColor: row.color }} />
                <div><p className="text-xs font-semibold text-text-primary">{row.label}</p><p className="num mt-0.5 text-xs text-text-tertiary">{(overview.risk_distribution?.[row.key] ?? 0).toLocaleString()}</p></div>
              </div>
            ))}
          </div>
        </article>

        <article className="overview-card">
          <p className="text-sm font-bold text-text-primary">Recommended rhythm</p>
          <p className="mt-1 text-xs text-text-secondary">A simple operating loop for the retention team.</p>
          <div className="mt-5 space-y-4">
            {RISK_ROWS.slice(0, 3).map((row, index) => (
              <div key={row.key} className="flex items-start gap-3">
                <span className="overview-step-number">0{index + 1}</span>
                <div><p className="text-sm font-semibold text-text-primary">{row.action}</p><p className="mt-0.5 text-xs leading-5 text-text-secondary">Start with {row.label.toLowerCase()} accounts and use the customer detail panel to tailor the next touch.</p></div>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}