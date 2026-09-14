import { useEffect, useState } from "react";
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
  const [theme, setTheme] = useState(() => localStorage.getItem("teleguard-theme") || "light");
  const [tourOpen, setTourOpen] = useState(() => localStorage.getItem("teleguard-tour-seen") !== "true");
  const [agentOpen, setAgentOpen] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("teleguard-theme", theme);
  }, [theme]);

  // { text, requestId } — requestId always changes so the drawer's effect
  // fires even if the same customer's text is requested twice in a row.
  const [agentPrefill, setAgentPrefill] = useState(null);
  const askAgent = (text) => {
    setAgentPrefill({ text, requestId: Date.now() });
    setAgentOpen(true);
  };

  const showMockBanner = overviewIsMock || customersIsMock;
  const closeTour = () => {
    localStorage.setItem("teleguard-tour-seen", "true");
    setTourOpen(false);
  };

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
        theme={theme}
        onToggleTheme={() => setTheme((current) => (current === "light" ? "dark" : "light"))}
        onStartTour={() => setTourOpen(true)}
        onOpenAgent={() => setAgentOpen(true)}
        onCloseAgent={() => setAgentOpen(false)}
        tourOpen={tourOpen}
        onCloseTour={closeTour}
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
        agentDrawer={<AgentDrawer prefillQuery={agentPrefill} open={agentOpen} onOpenChange={setAgentOpen} />}
      />
    </>
  );
}
