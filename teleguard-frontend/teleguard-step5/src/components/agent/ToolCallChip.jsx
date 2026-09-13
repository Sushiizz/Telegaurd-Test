import { useState } from "react";
import { ChevronDown, Users, Gauge, Lightbulb, UserRound, Target, FlaskConical, Wrench } from "lucide-react";

const TOOL_META = {
  list_at_risk_customers: { icon: Users, label: "Searched at-risk customers" },
  get_fleet_overview: { icon: Gauge, label: "Pulled fleet overview" },
  explain_customer_risk: { icon: Lightbulb, label: "Explained churn drivers" },
  get_customer_profile: { icon: UserRound, label: "Looked up customer profile" },
  get_recommended_action: { icon: Target, label: "Fetched recommended action" },
  simulate_retention_offer: { icon: FlaskConical, label: "Simulated an offer" },
};

export default function ToolCallChip({ call }) {
  const [expanded, setExpanded] = useState(false);
  const meta = TOOL_META[call.tool] || { icon: Wrench, label: call.tool };
  const Icon = meta.icon;
  const isError = Boolean(call.output?.error);

  return (
    <div className="w-fit max-w-full">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${
          isError
            ? "border-risk-critical/40 text-risk-critical hover:bg-risk-critical/10"
            : "border-border text-text-secondary hover:bg-surface-raised"
        }`}
      >
        <Icon size={12} />
        {meta.label}
        <ChevronDown size={11} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded && (
        <div className="mt-1.5 max-w-md space-y-1.5 rounded-md border border-border bg-bg p-2.5">
          <div>
            <span className="text-[11px] text-text-tertiary">Input</span>
            <pre className="scroll-slim overflow-x-auto whitespace-pre-wrap break-words font-mono text-[11px] text-text-secondary">
              {JSON.stringify(call.input, null, 2)}
            </pre>
          </div>
          <div>
            <span className="text-[11px] text-text-tertiary">Output</span>
            <pre className="scroll-slim overflow-x-auto whitespace-pre-wrap break-words font-mono text-[11px] text-text-secondary">
              {JSON.stringify(call.output, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
