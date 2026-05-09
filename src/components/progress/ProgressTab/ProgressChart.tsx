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
  payload?: ProgressPoint;
  lastIndex: number;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ payload: ProgressPoint }>;
}

/** Lime dot on the latest point, labelled PR when it is one; a lime ring on earlier PRs. */
function PointDot({ cx, cy, index, lastIndex, payload }: DotProps) {
  if (cx === undefined || cy === undefined) return null;
  if (index === lastIndex) {
    return (
      <g>
        <circle cx={cx} cy={cy} r={8} fill="var(--color-accent)" />
        {payload?.pr && (
          <text x={cx} y={cy - 20} textAnchor="end" className="progressChartPR">
            PR
          </text>
        )}
      </g>
    );
  }
  if (!payload?.pr) return null;
  return <circle cx={cx} cy={cy} r={6} fill="var(--color-bg)" stroke="var(--color-accent)" strokeWidth={3} />;
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
        <LineChart data={points} margin={{ top: 28, right: 10, bottom: 8, left: 8 }}>
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
            dot={<PointDot lastIndex={points.length - 1} />}
            activeDot={{ r: 6, fill: "var(--color-text)", stroke: "var(--color-bg)", strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
