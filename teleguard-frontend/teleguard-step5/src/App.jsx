import { useState } from "react";
import AppShell from "./components/layout/AppShell.jsx";
import RetentionTable from "./components/dashboard/RetentionTable.jsx";
import Customer360Panel from "./components/customer360/Customer360Panel.jsx";
import AgentDrawer from "./components/agent/AgentDrawer.jsx";
import { useOverview } from "./hooks/useOverview.js";
import { useCustomers } from "./hooks/useCustomers.js";

export default function App() {
  const { overview, loading: overviewLoading, isMock: overviewIsMock } = useOverview();
  const {
    result,
    filters,
    loading: customersLoading,
    isMock: customersIsMock,
    updateFilters,
    toggleSort,
    clearFilters,
  } = useCustomers();

  const [selectedCustomerId, setSelectedCustomerId] = useState(null);

  // { text, requestId } — requestId always changes so the drawer's effect
  // fires even if the same customer's text is requested twice in a row.
  const [agentPrefill, setAgentPrefill] = useState(null);
  const askAgent = (text) => setAgentPrefill({ text, requestId: Date.now() });

  const showMockBanner = overviewIsMock || customersIsMock;

  return (
    <>
      {showMockBanner && (
        <div className="border-b border-border bg-risk-high/10 px-5 py-1.5 text-center text-xs text-risk-high">
          API unreachable — showing sample data. Start the backend from Step 2/3 and set VITE_API_BASE_URL to connect it.
        </div>
      )}
      <AppShell
        overview={overview}
        overviewLoading={overviewLoading}
        leftPanel={
          <RetentionTable
            result={result}
            filters={filters}
            loading={customersLoading}
            updateFilters={updateFilters}
            toggleSort={toggleSort}
            clearFilters={clearFilters}
            onSelectCustomer={setSelectedCustomerId}
            selectedCustomerId={selectedCustomerId}
          />
        }
        rightPanel={<Customer360Panel customerId={selectedCustomerId} onAskAgent={askAgent} />}
        agentDrawer={<AgentDrawer prefillQuery={agentPrefill} />}
      />
    </>
  );
}
