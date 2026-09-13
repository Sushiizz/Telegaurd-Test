import { riskLabel } from "../../utils/format.js";

const TONE = {
  CRITICAL: "bg-risk-critical/15 text-risk-critical",
  HIGH: "bg-risk-high/15 text-risk-high",
  MEDIUM: "bg-risk-medium/15 text-risk-medium",
  LOW: "bg-risk-low/15 text-risk-low",
};

export default function RiskPill({ riskLevel }) {
  const tone = TONE[riskLevel] ?? "bg-surface-raised text-text-secondary";
  return (
    <span className={`inline-flex w-fit items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ${tone}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {riskLabel(riskLevel)}
    </span>
  );
}
