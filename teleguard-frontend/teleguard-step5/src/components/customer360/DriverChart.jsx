import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ReferenceLine, Tooltip, Cell, ResponsiveContainer } from "recharts";
import { humanizeCategory } from "../../utils/format.js";

function DriverTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const pushesToward = d.impact > 0 ? "Pushes toward churn" : "Protective factor";
  return (
    <div className="max-w-[220px] rounded-md border border-border bg-surface-raised px-3 py-2 text-xs shadow-lg">
      <p className="font-medium text-text-primary">{d.feature}</p>
      <p className="mt-0.5 text-text-tertiary">{humanizeCategory(d.category)}</p>
      <p className={`mt-1 font-medium ${d.impact > 0 ? "text-risk-critical" : "text-emerald"}`}>
        {pushesToward} ({d.impact > 0 ? "+" : ""}
        {d.impact.toFixed(3)})
      </p>
    </div>
  );
}

export default function DriverChart({ drivers }) {
  if (!drivers?.length) {
    return <p className="py-6 text-center text-sm text-text-tertiary">No driver data available.</p>;
  }

  const maxAbs = Math.max(...drivers.map((d) => Math.abs(d.impact)), 0.01);
  const domainPad = maxAbs * 1.25;
  const chartHeight = drivers.length * 34 + 16;

  return (
    <div style={{ height: chartHeight }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={drivers}
          layout="vertical"
          margin={{ top: 4, right: 12, bottom: 4, left: 4 }}
        >
          <CartesianGrid horizontal={false} stroke="var(--color-border-subtle)" />
          <XAxis
            type="number"
            domain={[-domainPad, domainPad]}
            tick={{ fill: "var(--color-text-tertiary)", fontSize: 10 }}
            tickFormatter={(v) => v.toFixed(2)}
            axisLine={{ stroke: "var(--color-border)" }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="feature"
            width={132}
            tick={{ fill: "var(--color-text-secondary)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <ReferenceLine x={0} stroke="var(--color-border)" />
          <Tooltip content={<DriverTooltip />} cursor={{ fill: "var(--color-surface-raised)" }} />
          <Bar dataKey="impact" radius={2} isAnimationActive={false} barSize={14}>
            {drivers.map((d) => (
              <Cell key={d.feature} fill={d.impact > 0 ? "#f43f5e" : "#10b981"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
