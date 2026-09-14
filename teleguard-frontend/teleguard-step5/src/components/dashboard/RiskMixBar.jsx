import { BarChart, Bar, Cell, Pie, PieChart, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const SEGMENTS = [
  { key: "CRITICAL", color: "#f43f5e", label: "Critical" },
  { key: "HIGH", color: "#f59e0b", label: "High" },
  { key: "MEDIUM", color: "#6366f1", label: "Medium" },
  { key: "LOW", color: "#10b981", label: "Low" },
];

function MixTooltip({ active, payload, total }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="risk-tooltip">
      <p className="risk-tooltip-title">Fleet risk mix</p>
      {payload
        .filter((p) => p.value > 0)
        .map((p) => (
          <div key={p.dataKey} className="risk-tooltip-row">
            <span className="risk-tooltip-name"><span className="risk-tooltip-dot" style={{ backgroundColor: p.payload?.fill ?? p.fill }} />{p.name}</span>
            <span className="risk-tooltip-value">{p.value.toLocaleString()} <span className="risk-tooltip-percent">{total ? `${Math.round((p.value / total) * 100)}%` : "0%"}</span></span>
          </div>
        ))}
    </div>
  );
}

export default function RiskMixBar({ riskDistribution, variant = "bar" }) {
  const total = SEGMENTS.reduce((sum, s) => sum + (riskDistribution?.[s.key] ?? 0), 0);
  const data = [
    Object.fromEntries([
      ["name", "fleet"],
      ...SEGMENTS.map((s) => [s.key, riskDistribution?.[s.key] ?? 0]),
    ]),
  ];

  const pieData = SEGMENTS.map((segment) => ({
    name: segment.label,
    value: riskDistribution?.[segment.key] ?? 0,
    fill: segment.color,
  })).filter((segment) => segment.value > 0);

  if (variant === "pie") {
    return (
      <div className="w-full">
        <div className="risk-pie-chart">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius="58%" outerRadius="82%" paddingAngle={3} stroke="var(--color-surface)" strokeWidth={3} isAnimationActive={false}>
                {pieData.map((segment) => <Cell key={segment.name} fill={segment.fill} />)}
              </Pie>
              <Tooltip content={<MixTooltip total={total} />} cursor={false} allowEscapeViewBox={{ x: true, y: true }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="risk-pie-center"><span className="num">{total.toLocaleString()}</span><span>customers</span></div>
        </div>
        <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
          {SEGMENTS.map((segment) => <span key={segment.key} className="flex items-center gap-1 text-[11px] text-text-tertiary"><span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: segment.color }} />{segment.label} {total > 0 ? Math.round(((riskDistribution?.[segment.key] ?? 0) / total) * 100) : 0}%</span>)}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="risk-mix-chart h-4 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" stackOffset="expand" margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <XAxis type="number" hide domain={[0, "dataMax"]} />
            <YAxis type="category" dataKey="name" hide />
            <Tooltip content={<MixTooltip total={total} />} cursor={false} allowEscapeViewBox={{ x: true, y: true }} />
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
