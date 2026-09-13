import TopNav from "./TopNav.jsx";
import KpiStrip from "../dashboard/KpiStrip.jsx";

export default function AppShell({ overview, overviewLoading, leftPanel, rightPanel, agentDrawer }) {
  return (
    <div className="flex h-screen flex-col bg-bg">
      <TopNav overview={overview} />

      <div className="border-b border-border bg-surface px-5 py-4">
        <KpiStrip overview={overview} loading={overviewLoading} />
      </div>

      <main className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden p-4 lg:grid-cols-[65fr_35fr]">
        <section className="min-h-0 overflow-hidden">{leftPanel}</section>
        <section className="min-h-0 overflow-hidden">{rightPanel}</section>
      </main>

      {agentDrawer}
    </div>
  );
}
