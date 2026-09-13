import { ArrowUp, ArrowDown, ArrowUpDown, Search, X, ChevronLeft, ChevronRight, ArrowUpRight } from "lucide-react";
import RiskPill from "./RiskPill.jsx";
import RosBar from "./RosBar.jsx";
import { formatCurrency, formatPercent, formatTenure } from "../../utils/format.js";

const RISK_OPTIONS = [
  { value: "", label: "All risk levels" },
  { value: "CRITICAL", label: "Critical" },
  { value: "HIGH", label: "High" },
  { value: "MEDIUM", label: "Medium" },
  { value: "LOW", label: "Low" },
];

const CONTRACT_OPTIONS = [
  { value: "", label: "All contracts" },
  { value: "Month-to-month", label: "Month-to-month" },
  { value: "One year", label: "One year" },
  { value: "Two year", label: "Two year" },
];

function SortHeader({ label, field, activeField, activeDir, onSort, align = "right" }) {
  const isActive = field === activeField;
  const Icon = isActive ? (activeDir === "desc" ? ArrowDown : ArrowUp) : ArrowUpDown;
  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className={`group flex items-center gap-1 text-xs font-medium text-text-secondary hover:text-text-primary ${
        align === "right" ? "ml-auto" : ""
      }`}
    >
      {label}
      <Icon
        size={12}
        strokeWidth={2.25}
        className={isActive ? "text-indigo" : "text-text-tertiary opacity-0 group-hover:opacity-100"}
      />
    </button>
  );
}

function RowSkeleton() {
  return (
    <tr className="border-b border-border-subtle">
      {Array.from({ length: 7 }).map((_, i) => (
        <td key={i} className="px-3 py-3">
          <span className="block h-4 animate-pulse rounded bg-surface-raised" style={{ width: `${60 + (i % 3) * 15}%` }} />
        </td>
      ))}
    </tr>
  );
}

export default function RetentionTable({
  result,
  filters,
  loading,
  updateFilters,
  toggleSort,
  clearFilters,
  onSelectCustomer,
  selectedCustomerId,
}) {
  const hasActiveFilters = Boolean(filters.riskLevel || filters.contractType || filters.search);
  const { items, page, total_pages: totalPages, total_items: totalItems } = result;
  const showSkeleton = loading && items.length === 0;
  const showEmpty = !loading && items.length === 0;

  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-surface">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
        <h2 className="mr-2 font-display text-sm font-semibold text-text-primary">
          Prioritized Retention Table
        </h2>

        <div className="relative">
          <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => updateFilters({ search: e.target.value })}
            placeholder="Search customer ID…"
            className="w-44 rounded-md border border-border bg-bg py-1.5 pl-7 pr-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-indigo"
          />
        </div>

        <select
          value={filters.riskLevel ?? ""}
          onChange={(e) => updateFilters({ riskLevel: e.target.value || undefined })}
          className="rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-text-primary focus:border-indigo"
        >
          {RISK_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <select
          value={filters.contractType ?? ""}
          onChange={(e) => updateFilters({ contractType: e.target.value || undefined })}
          className="rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-text-primary focus:border-indigo"
        >
          {CONTRACT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="flex items-center gap-1 rounded-md px-2 py-1.5 text-sm text-text-secondary hover:text-text-primary"
          >
            <X size={13} />
            Clear
          </button>
        )}

        <span className="ml-auto text-xs text-text-tertiary">
          {totalItems.toLocaleString()} customer{totalItems === 1 ? "" : "s"} matched
        </span>
      </div>

      {/* Table */}
      <div className="scroll-slim min-h-0 flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10 bg-surface">
            <tr className="border-b border-border text-left">
              <th className="px-3 py-2.5 text-xs font-medium text-text-secondary">Customer</th>
              <th className="px-3 py-2.5">
                <SortHeader label="Risk" field="churn_probability" activeField={filters.sortBy} activeDir={filters.sortDir} onSort={toggleSort} align="left" />
              </th>
              <th className="px-3 py-2.5 text-xs font-medium text-text-secondary">Contract</th>
              <th className="px-3 py-2.5">
                <SortHeader label="Tenure" field="tenure_months" activeField={filters.sortBy} activeDir={filters.sortDir} onSort={toggleSort} />
              </th>
              <th className="px-3 py-2.5">
                <SortHeader label="Monthly" field="monthly_charges" activeField={filters.sortBy} activeDir={filters.sortDir} onSort={toggleSort} />
              </th>
              <th className="px-3 py-2.5">
                <SortHeader label="CLTV" field="cltv" activeField={filters.sortBy} activeDir={filters.sortDir} onSort={toggleSort} />
              </th>
              <th className="px-3 py-2.5">
                <SortHeader label="Opportunity" field="retention_opportunity_score" activeField={filters.sortBy} activeDir={filters.sortDir} onSort={toggleSort} />
              </th>
              <th className="w-9 px-2 py-2.5" />
            </tr>
          </thead>
          <tbody className={loading && items.length > 0 ? "opacity-60 transition-opacity" : "transition-opacity"}>
            {showSkeleton && Array.from({ length: 8 }).map((_, i) => <RowSkeleton key={i} />)}

            {!showSkeleton &&
              items.map((row) => {
                const isSelected = row.customer_id === selectedCustomerId;
                return (
                  <tr
                    key={row.customer_id}
                    onClick={() => onSelectCustomer(row.customer_id)}
                    className={`group cursor-pointer border-b border-border-subtle transition-colors hover:bg-surface-raised ${
                      isSelected ? "bg-surface-raised" : ""
                    }`}
                    style={{
                      boxShadow: `inset 3px 0 0 0 var(--color-risk-${row.risk_level.toLowerCase()})`,
                    }}
                  >
                    <td className="px-3 py-2.5 font-mono text-sm text-text-primary">{row.customer_id}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <RiskPill riskLevel={row.risk_level} />
                        <span className="num text-xs text-text-tertiary">{formatPercent(row.churn_probability)}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-sm text-text-secondary">{row.contract_type}</td>
                    <td className="num px-3 py-2.5 text-right text-sm text-text-secondary">{formatTenure(row.tenure_months)}</td>
                    <td className="num px-3 py-2.5 text-right text-sm text-text-primary">{formatCurrency(row.monthly_charges)}</td>
                    <td className="num px-3 py-2.5 text-right text-sm text-text-primary">{formatCurrency(row.cltv)}</td>
                    <td className="px-3 py-2.5">
                      <RosBar score={row.retention_opportunity_score} />
                    </td>
                    <td className="px-2 py-2.5">
                      <ArrowUpRight
                        size={15}
                        className="text-text-tertiary opacity-0 transition-opacity group-hover:opacity-100"
                      />
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>

        {showEmpty && (
          <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
            <p className="text-sm font-medium text-text-primary">No customers match these filters</p>
            <p className="text-sm text-text-tertiary">Try a different risk level, contract type, or search term.</p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-2 rounded-md border border-border px-3 py-1.5 text-sm text-text-primary hover:bg-surface-raised"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between border-t border-border px-4 py-2.5">
        <span className="text-xs text-text-tertiary">
          Page {page} of {totalPages}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => updateFilters({ page: page - 1 })}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-text-secondary hover:bg-surface-raised disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => updateFilters({ page: page + 1 })}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-text-secondary hover:bg-surface-raised disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
