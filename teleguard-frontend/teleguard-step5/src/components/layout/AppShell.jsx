import { useState } from "react";
import TopNav from "./TopNav.jsx";
import KpiStrip from "../dashboard/KpiStrip.jsx";
import OverviewHome from "../dashboard/OverviewHome.jsx";
import ProductTour from "./ProductTour.jsx";
import { BarChart3, Bot, CircleHelp, LayoutDashboard, Moon, Settings, Sun, X } from "lucide-react";

const NAV_ITEMS = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Customers", icon: BarChart3 },
  { label: "Ari Agent", icon: Bot },
];

export default function AppShell({ overview, overviewLoading, theme, onToggleTheme, onStartTour, onOpenAgent, onCloseAgent, tourOpen, onCloseTour, leftPanel, rightPanel, agentDrawer }) {
  const [activeNav, setActiveNav] = useState("Overview");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const navigateTo = (label) => {
    setActiveNav(label);
    onCloseAgent();
    if (label === "Customers") {
      document.querySelector('[data-tour="retention-table"]')?.scrollIntoView({ behavior: "smooth", block: "start" });
      document.querySelector('[data-tour="retention-table"] .scroll-slim')?.scrollTo({ top: 0, behavior: "smooth" });
    }
    if (label === "Overview") {
      document.querySelector(".dashboard-heading")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    if (label === "Ari Agent") {
      onOpenAgent();
    }
  };

  return (
    <div className="app-frame flex h-screen flex-col bg-bg lg:flex-row">
      <aside data-tour="navigation" className="nav-rail flex shrink-0 flex-row items-center border-b border-border bg-surface px-4 py-3 lg:w-[216px] lg:flex-col lg:items-stretch lg:border-b-0 lg:border-r lg:px-3 lg:py-5">
        <div className="mb-0 flex items-center gap-3 px-2 lg:mb-10">
          <div className="brand-mark flex h-9 w-9 items-center justify-center rounded-xl bg-indigo text-white">
            <span className="font-display text-base font-semibold">T</span>
          </div>
          <div className="hidden lg:block">
            <p className="font-display text-[15px] font-bold tracking-tight text-text-primary">TeleGuard <span className="text-indigo">AI</span></p>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">Customer intelligence</p>
          </div>
        </div>

        <nav className="ml-5 flex flex-1 items-center gap-1 lg:ml-0 lg:flex-col lg:items-stretch" aria-label="Primary navigation">
          <p className="nav-section-label hidden px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-text-tertiary lg:block">Workspace</p>
          {NAV_ITEMS.map(({ label, icon: Icon }) => {
            const active = activeNav === label;
            return (
            <button key={label} type="button" onClick={() => navigateTo(label)} className={`nav-item flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${active ? "nav-item-active text-text-primary" : "text-text-secondary hover:bg-surface-raised hover:text-text-primary"}`}>
              <Icon size={17} strokeWidth={active ? 2.2 : 1.8} />
              <span className="hidden lg:inline">{label}</span>
            </button>
            );
          })}
        </nav>

        <div className="hidden space-y-1 border-t border-border pt-4 lg:block">
          <button type="button" onClick={() => { setActiveNav("Customers"); onStartTour(); }} className="nav-item flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-text-secondary hover:bg-surface-raised hover:text-text-primary">
            <CircleHelp size={17} strokeWidth={1.8} /> Help center
          </button>
          <button type="button" onClick={() => setSettingsOpen(true)} className="nav-item flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-text-secondary hover:bg-surface-raised hover:text-text-primary">
            <Settings size={17} strokeWidth={1.8} /> Settings
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <TopNav overview={overview} activeView={activeNav} theme={theme} onToggleTheme={onToggleTheme} />

        <div className="dashboard-heading flex items-end justify-between gap-4 px-5 pb-1 pt-5 sm:px-7">
          <div>
            <p className="eyebrow text-[11px] font-bold uppercase tracking-[0.18em] text-indigo">{activeNav === "Overview" ? "Fleet command center" : activeNav === "Customers" ? "Customer workspace" : "Your AI copilot"}</p>
            <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-text-primary sm:text-[28px]">{activeNav === "Overview" ? "Retention overview" : activeNav === "Customers" ? "Customer worklist" : "Ari retention agent"}</h1>
            <p className="mt-1 text-sm text-text-secondary">{activeNav === "Overview" ? "Prioritize the accounts where your next conversation creates the most value." : activeNav === "Customers" ? "Search, filter, and inspect customers by retention opportunity." : "Ask questions about fleet risk, customer health, and outreach."}</p>
          </div>
          <div className="hidden text-right sm:block">
            <p className="text-xs font-semibold text-text-secondary">Today&apos;s focus</p>
            <p className="mt-1 text-sm font-medium text-text-primary">At-risk revenue recovery</p>
          </div>
        </div>

        <div data-tour="kpis" className="border-b border-border px-5 py-4 sm:px-7">
          <KpiStrip overview={overview} loading={overviewLoading} />
        </div>

        {activeNav === "Overview" ? (
          <OverviewHome overview={overview} onOpenCustomers={() => navigateTo("Customers")} />
        ) : (
          <main className="dashboard-main grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto p-4 sm:p-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.85fr)] lg:overflow-hidden lg:px-7">
            <section data-tour="retention-table" className="min-h-[520px] overflow-hidden lg:min-h-0">{leftPanel}</section>
            <section data-tour="customer-detail" className="min-h-[520px] overflow-hidden lg:min-h-0">{rightPanel}</section>
          </main>
        )}

        {agentDrawer}
      </div>

      {settingsOpen && (
        <div className="settings-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setSettingsOpen(false)}>
          <section className="settings-panel" role="dialog" aria-modal="true" aria-labelledby="settings-title">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="tour-eyebrow">Workspace preferences</p>
                <h2 id="settings-title" className="mt-1 font-display text-xl font-bold tracking-tight text-text-primary">Settings</h2>
              </div>
              <button type="button" aria-label="Close settings" onClick={() => setSettingsOpen(false)} className="settings-close"><X size={17} /></button>
            </div>
            <div className="settings-option mt-6">
              <div><p className="text-sm font-semibold text-text-primary">Appearance</p><p className="mt-1 text-xs text-text-secondary">Choose the dashboard theme for this device.</p></div>
              <button type="button" aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`} onClick={onToggleTheme} className="settings-choice"><span>{theme === "light" ? <Moon size={15} /> : <Sun size={15} />}</span>Switch to {theme === "light" ? "dark" : "light"} mode</button>
            </div>
            <div className="settings-option mt-3">
              <div><p className="text-sm font-semibold text-text-primary">Guided tour</p><p className="mt-1 text-xs text-text-secondary">Replay the walkthrough for the main workspace.</p></div>
              <button type="button" onClick={() => { setSettingsOpen(false); onStartTour(); }} className="settings-choice">Replay tour</button>
            </div>
            <p className="mt-6 text-[11px] leading-5 text-text-tertiary">Preferences are saved automatically in this browser.</p>
          </section>
        </div>
      )}
      <ProductTour open={tourOpen} onClose={onCloseTour} onNavigateCustomers={() => navigateTo("Customers")} />
    </div>
  );
}
