import { formatCurrencyCompact, formatPercent } from "../../utils/format.js";
import RiskMixBar from "./RiskMixBar.jsx";

function Metric({ label, value, valueClassName = "" }) {
  return (
    <div className="flex flex-1 flex-col justify-center px-5 py-1 first:pl-0 last:pr-0">
      <span className="text-xs font-medium text-text-secondary">{label}</span>
      <span className={`num font-display text-[28px] font-semibold leading-tight ${valueClassName}`}>
        {value}
      </span>
    </div>
  );
}

function MetricSkeleton() {
  return (
    <div className="flex flex-1 flex-col justify-center gap-2 px-5 py-1 first:pl-0 last:pr-0">
      <span className="h-3 w-24 animate-pulse rounded bg-surface-raised" />
      <span className="h-7 w-20 animate-pulse rounded bg-surface-raised" />
    </div>
  );
}

export default function KpiStrip({ overview, loading }) {
  if (loading && !overview) {
    return (
      <div className="flex divide-x divide-border">
        {Array.from({ length: 4 }).map((_, i) => (
          <MetricSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:divide-x lg:divide-border">
      <div className="flex flex-1 flex-col divide-y divide-border sm:flex-row sm:divide-x sm:divide-y-0">
        <Metric
          label="Revenue at risk"
          value={formatCurrencyCompact(overview.total_at_risk_revenue)}
          valueClassName="text-risk-high"
        />
        <Metric label="Fleet churn rate" value={formatPercent(overview.fleet_churn_rate, 1)} />
        <Metric label="Avg. retention opportunity" value={overview.average_ros.toFixed(0)} />
        <Metric
          label="Potential value saved"
          value={formatCurrencyCompact(overview.potential_value_saved)}
          valueClassName="text-emerald"
        />
      </div>

      <div className="w-full pt-1 lg:w-64 lg:pl-5">
        <span className="mb-1.5 block text-xs font-medium text-text-secondary">
          Fleet risk mix · {overview.total_customers.toLocaleString()} customers
        </span>
        <RiskMixBar riskDistribution={overview.risk_distribution} />
      </div>
    </div>
  );
}
