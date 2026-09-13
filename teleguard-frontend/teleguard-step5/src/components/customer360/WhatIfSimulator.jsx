import { SlidersHorizontal, Loader2 } from "lucide-react";
import { formatCurrency, formatPercent } from "../../utils/format.js";

export default function WhatIfSimulator({ simulator }) {
  const { discountPct, setDiscountPct, addTechSupport, setAddTechSupport, result, loading, error } = simulator;
  const isActive = discountPct > 0 || addTechSupport;

  return (
    <div className="rounded-lg border border-border bg-bg p-4">
      <div className="flex items-center gap-1.5 text-xs font-medium text-text-secondary">
        <SlidersHorizontal size={13} />
        What-If Retention Simulator
      </div>

      <div className="mt-3 space-y-4">
        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="discount-slider" className="text-sm text-text-primary">
              Loyalty discount
            </label>
            <span className="num text-sm font-medium text-text-primary">{discountPct}%</span>
          </div>
          <input
            id="discount-slider"
            type="range"
            min={0}
            max={50}
            step={5}
            value={discountPct}
            onChange={(e) => setDiscountPct(Number(e.target.value))}
            className="mt-1.5 w-full accent-indigo"
          />
        </div>

        <label className="flex items-center justify-between rounded-md border border-border-subtle bg-surface px-3 py-2">
          <span className="text-sm text-text-primary">Include 3 months free tech support</span>
          <input
            type="checkbox"
            checked={addTechSupport}
            onChange={(e) => setAddTechSupport(e.target.checked)}
            className="h-4 w-4 accent-indigo"
          />
        </label>
      </div>

      <div className="mt-4 min-h-[86px] rounded-md border border-border-subtle bg-surface p-3">
        {!isActive && (
          <p className="text-sm text-text-tertiary">Adjust a slider or toggle to see the projected effect.</p>
        )}

        {isActive && loading && (
          <div className="flex items-center gap-2 text-sm text-text-tertiary">
            <Loader2 size={14} className="animate-spin" />
            Recalculating…
          </div>
        )}

        {isActive && !loading && error && <p className="text-sm text-risk-critical">{error}</p>}

        {isActive && !loading && !error && result && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="block text-[11px] text-text-tertiary">Risk before → after</span>
              <span className="num text-sm font-medium text-text-primary">
                {formatPercent(result.current_risk)} → {formatPercent(result.simulated_risk)}
              </span>
            </div>
            <div>
              <span className="block text-[11px] text-text-tertiary">Offer cost</span>
              <span className="num text-sm font-medium text-text-primary">{formatCurrency(result.offer_cost)}</span>
            </div>
            <div>
              <span className="block text-[11px] text-text-tertiary">Expected net value</span>
              <span
                className={`num text-sm font-medium ${
                  result.expected_net_value > 0 ? "text-emerald" : "text-risk-critical"
                }`}
              >
                {formatCurrency(result.expected_net_value)}
              </span>
            </div>
            <div>
              <span className="block text-[11px] text-text-tertiary">Worth it?</span>
              <span
                className={`inline-flex w-fit items-center rounded px-1.5 py-0.5 text-xs font-medium ${
                  result.is_worth_it ? "bg-emerald/15 text-emerald" : "bg-risk-critical/15 text-risk-critical"
                }`}
              >
                {result.is_worth_it ? "Yes" : "No"}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
