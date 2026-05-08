import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { formatDate } from "../../../utils/date";
import type { ProgressPoint } from "../../../utils/progress";

interface ProgressChartProps {
  points: ProgressPoint[];
  description: string;
  formatTick: (value: number) => string;
}

interface DotProps {
  cx?: number;
  cy?: number;
  index?: number;
  lastIndex: number;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ payload: ProgressPoint }>;
}

function LastPointDot({ cx, cy, index, lastIndex }: DotProps) {
  if (index !== lastIndex) return null;
  return <circle cx={cx} cy={cy} r={7} fill="var(--color-accent)" />;
}

function PointTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="progressTooltip">
      <div className="progressTooltipDate">{formatDate(point.date)}</div>
      <div className="progressTooltipValue">{point.label}</div>
    </div>
  );
}

export function ProgressChart({ points, description, formatTick }: ProgressChartProps) {
  return (
    <div className="progressChart" role="img" aria-label={description}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 24, right: 8, bottom: 8, left: 8 }}>
          <CartesianGrid stroke="var(--color-line)" vertical={false} />
          <YAxis
            mirror
            axisLine={false}
            tickLine={false}
            tickCount={3}
            domain={["auto", "auto"]}
            tickFormatter={formatTick}
            tick={{ fill: "var(--color-text-muted)", fontSize: 13, dy: -10 }}
          />
          <Tooltip
            content={<PointTooltip />}
            cursor={{ stroke: "var(--color-line-strong)", strokeWidth: 1 }}
            isAnimationActive={false}
          />
          <Line
            type="linear"
            dataKey="value"
            stroke="var(--color-text)"
            strokeWidth={3}
            strokeLinejoin="round"
            strokeLinecap="round"
            isAnimationActive={false}
            dot={<LastPointDot lastIndex={points.length - 1} />}
            activeDot={{ r: 6, fill: "var(--color-text)", stroke: "var(--color-bg)", strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
