import { UserRoundSearch, AlertTriangle } from "lucide-react";
import { useCustomerDetail } from "../../hooks/useCustomerDetail.js";
import { useSimulator } from "../../hooks/useSimulator.js";
import CustomerHeader from "./CustomerHeader.jsx";
import DriverChart from "./DriverChart.jsx";
import RecommendedActionCard from "./RecommendedActionCard.jsx";
import WhatIfSimulator from "./WhatIfSimulator.jsx";

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 rounded-lg border border-border bg-surface px-6 text-center">
      <UserRoundSearch size={28} strokeWidth={1.5} className="text-text-tertiary" />
      <p className="text-sm font-medium text-text-primary">No customer selected</p>
      <p className="max-w-[26ch] text-sm text-text-tertiary">
        Select a row in the retention table to inspect a customer.
      </p>
    </div>
  );
}

function ErrorState({ message }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 rounded-lg border border-border bg-surface px-6 text-center">
      <AlertTriangle size={24} strokeWidth={1.5} className="text-risk-high" />
      <p className="text-sm font-medium text-text-primary">Couldn't load this customer</p>
      <p className="max-w-[30ch] text-sm text-text-tertiary">{message}</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex h-full flex-col gap-4 rounded-lg border border-border bg-surface p-4">
      <div className="space-y-2">
        <span className="block h-4 w-32 animate-pulse rounded bg-surface-raised" />
        <span className="block h-3 w-20 animate-pulse rounded bg-surface-raised" />
      </div>
      <span className="block h-32 w-full animate-pulse rounded bg-surface-raised" />
      <span className="block h-40 w-full animate-pulse rounded bg-surface-raised" />
    </div>
  );
}

export default function Customer360Panel({ customerId, onAskAgent }) {
  const { detail, loading, error } = useCustomerDetail(customerId);
  const simulator = useSimulator(customerId);

  if (!customerId) return <EmptyState />;
  if (loading && !detail) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!detail) return null;

  return (
    <div className="scroll-slim flex h-full flex-col overflow-y-auto rounded-lg border border-border bg-surface">
      <CustomerHeader customer={detail} />

      <div className="space-y-4 p-4">
        <div>
          <h3 className="mb-2 text-xs font-medium text-text-secondary">Top churn drivers</h3>
          <DriverChart drivers={detail.top_drivers} />
        </div>

        <RecommendedActionCard
          customerId={detail.customer_id}
          action={detail.recommended_action}
          onAskAgent={onAskAgent}
        />

        <WhatIfSimulator simulator={simulator} />
      </div>
    </div>
  );
}
