import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const SEGMENTS = [
  { key: "CRITICAL", color: "#f43f5e", label: "Critical" },
  { key: "HIGH", color: "#f59e0b", label: "High" },
  { key: "MEDIUM", color: "#6366f1", label: "Medium" },
  { key: "LOW", color: "#10b981", label: "Low" },
];

function MixTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-surface-raised px-2.5 py-1.5 text-xs shadow-lg">
      {payload
        .filter((p) => p.value > 0)
        .map((p) => (
          <div key={p.dataKey} className="flex items-center gap-1.5 text-text-secondary">
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: p.fill }} />
            <span>
              {p.name}: <span className="text-text-primary">{p.value.toLocaleString()}</span>
            </span>
          </div>
        ))}
    </div>
  );
}

export default function RiskMixBar({ riskDistribution }) {
  const total = SEGMENTS.reduce((sum, s) => sum + (riskDistribution?.[s.key] ?? 0), 0);
  const data = [
    Object.fromEntries([
      ["name", "fleet"],
      ...SEGMENTS.map((s) => [s.key, riskDistribution?.[s.key] ?? 0]),
    ]),
  ];

  return (
    <div className="w-full">
      <div className="h-4 w-full overflow-hidden rounded-sm">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" stackOffset="expand" margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <XAxis type="number" hide domain={[0, "dataMax"]} />
            <YAxis type="category" dataKey="name" hide />
            <Tooltip content={<MixTooltip />} cursor={false} />
            {SEGMENTS.map((s) => (
              <Bar key={s.key} dataKey={s.key} name={s.label} stackId="mix" fill={s.color} isAnimationActive={false} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
        {SEGMENTS.map((s) => (
          <span key={s.key} className="flex items-center gap-1 text-[11px] text-text-tertiary">
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.color }} />
            {s.label} {total > 0 ? Math.round(((riskDistribution?.[s.key] ?? 0) / total) * 100) : 0}%
          </span>
        ))}
      </div>
    </div>
  );
}
