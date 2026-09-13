import RiskPill from "../dashboard/RiskPill.jsx";
import RosBar from "../dashboard/RosBar.jsx";
import { formatCurrency, formatPercent, formatTenure } from "../../utils/format.js";

function Stat({ label, children }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] text-text-tertiary">{label}</span>
      <span className="num text-sm font-medium text-text-primary">{children}</span>
    </div>
  );
}

export default function CustomerHeader({ customer }) {
  return (
    <div className="border-b border-border p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-sm text-text-primary">{customer.customer_id}</p>
          <div className="mt-1.5 flex items-center gap-2">
            <RiskPill riskLevel={customer.risk_level} />
            <span className="num text-xs text-text-tertiary">
              {formatPercent(customer.churn_probability)} churn probability
            </span>
          </div>
        </div>
        <div className="text-right">
          <span className="block text-[11px] text-text-tertiary">Retention opportunity</span>
          <RosBar score={customer.retention_opportunity_score} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Tenure">{formatTenure(customer.tenure_months)}</Stat>
        <Stat label="Contract">{customer.contract_type}</Stat>
        <Stat label="Monthly charges">{formatCurrency(customer.monthly_charges)}</Stat>
        <Stat label="Lifetime value">{formatCurrency(customer.cltv)}</Stat>
      </div>
    </div>
  );
}
