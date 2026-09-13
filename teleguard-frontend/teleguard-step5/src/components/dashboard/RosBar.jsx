function tone(score) {
  if (score >= 70) return "bg-risk-critical";
  if (score >= 40) return "bg-risk-high";
  return "bg-indigo";
}

export default function RosBar({ score }) {
  const clamped = Math.max(0, Math.min(100, score));
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-raised">
        <div
          className={`h-full rounded-full ${tone(clamped)}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="num w-6 text-right text-sm font-medium text-text-primary">{clamped}</span>
    </div>
  );
}
