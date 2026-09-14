import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";

const STEPS = [
  {
    target: "navigation",
    eyebrow: "Your workspace",
    title: "Start from the command center",
    text: "Use the navigation rail to move between the fleet overview, customer worklist, and Ari, your retention AI agent.",
  },
  {
    target: "status",
    eyebrow: "Always in context",
    title: "Check sync and choose your view",
    text: "The status line shows when your fleet data was last synced. Use the sun or moon button to switch themes.",
  },
  {
    target: "kpis",
    eyebrow: "Fleet signal",
    title: "Read the opportunity at a glance",
    text: "These numbers summarize revenue at risk, churn, retention opportunity, and the value your team can save.",
  },
  {
    target: "risk-posture",
    eyebrow: "Fleet posture",
    title: "See the risk mix at a glance",
    text: "This responsive donut shows how the full customer fleet is distributed across critical, high, medium, and low-risk accounts. Hover a segment for exact counts.",
  },
  {
    target: "retention-table",
    eyebrow: "Prioritize",
    title: "Work the highest-value accounts first",
    text: "Search, filter, and sort the table. Select any customer to open their full risk profile and recommended action.",
  },
  {
    target: "customer-detail",
    eyebrow: "Decide with confidence",
    title: "Turn a signal into a conversation",
    text: "Review churn drivers, simulate an offer, and send a tailored question to Ari when you are ready.",
  },
  {
    target: "agent",
    eyebrow: "Your copilot",
    title: "Meet Ari, your retention AI agent",
    text: "Open Ari anytime for fleet summaries, customer questions, or outreach drafts grounded in the same dashboard data. Look for the glowing bubble in the bottom-right corner.",
  },
];

export default function ProductTour({ open, onClose, onNavigateCustomers }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [spotlight, setSpotlight] = useState(null);
  const step = STEPS[stepIndex];

  useEffect(() => {
    if (!open) return undefined;
    setStepIndex(0);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const updateSpotlight = () => {
      const element = document.querySelector(`[data-tour="${step.target}"]`);
      if (!element) {
        if (step.target === "retention-table" || step.target === "customer-detail") {
          onNavigateCustomers();
          window.requestAnimationFrame(() => window.requestAnimationFrame(updateSpotlight));
        }
        return;
      }
      const bounds = element.getBoundingClientRect();
      setSpotlight({ top: bounds.top - 7, left: bounds.left - 7, width: bounds.width + 14, height: bounds.height + 14 });
    };
    updateSpotlight();
    window.addEventListener("resize", updateSpotlight);
    window.addEventListener("scroll", updateSpotlight, true);
    return () => {
      window.removeEventListener("resize", updateSpotlight);
      window.removeEventListener("scroll", updateSpotlight, true);
    };
  }, [open, step.target]);

  const next = () => {
    if (stepIndex === STEPS.length - 1) onClose();
    else setStepIndex((current) => current + 1);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="tour-layer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          {spotlight && <motion.div className="tour-spotlight" animate={spotlight} transition={{ type: "spring", stiffness: 320, damping: 30 }} />}
          <button type="button" aria-label="Skip tour" className="tour-dismiss" onClick={onClose}><X size={17} /></button>
          <motion.section
            key={step.target}
            className="tour-card"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="tour-title"
          >
            <div className="flex items-center justify-between gap-4">
              <span className="tour-eyebrow">{step.eyebrow}</span>
              <span className="tour-counter">{stepIndex + 1} / {STEPS.length}</span>
            </div>
            <h2 id="tour-title" className="mt-3 font-display text-xl font-bold tracking-tight text-text-primary">{step.title}</h2>
            <p className="mt-2 text-sm leading-6 text-text-secondary">{step.text}</p>
            <div className="mt-6 flex items-center justify-between gap-3">
              <button type="button" className="tour-skip" onClick={onClose}>Skip tour</button>
              <div className="flex items-center gap-2">
                {stepIndex > 0 && <button type="button" className="tour-back" onClick={() => setStepIndex((current) => current - 1)}><ArrowLeft size={15} /> Back</button>}
                <button type="button" className="tour-next" onClick={next}>{stepIndex === STEPS.length - 1 ? <><Check size={15} /> Done</> : <>Next <ArrowRight size={15} /></>}</button>
              </div>
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}