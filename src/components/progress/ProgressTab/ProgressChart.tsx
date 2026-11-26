import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, getNiceTickValues } from "recharts";
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

// Beyond this many points the session dots shrink, so a long range still reads as a line.
const DENSE_POINTS = 24;

// The y labels sit inside the plot (mirrored), so the line starts past the widest one. The ticks
// are computed here, not left to the axis, so the gutter is measured on the labels actually drawn.
const TICK_COUNT = 3;
const TICK_CHAR_PX = 9; // a 13px digit measures about 8.5px
const TICK_INSET_PX = 8; // a mirrored label starts this far in (Recharts tick size 6 + margin 2)
const TICK_GAP_PX = 8;

function yTicks(points: ProgressPoint[]) {
  const values = points.map((p) => p.value);
  return getNiceTickValues([Math.min(...values), Math.max(...values)], TICK_COUNT);
}

function labelGutter(ticks: number[], formatTick: (value: number) => string) {
  return TICK_INSET_PX + Math.max(...ticks.map((t) => formatTick(t).length)) * TICK_CHAR_PX + TICK_GAP_PX;
}

/**
 * A node per session: a white dot, a hollow accent ring on a PR, and a filled accent dot on the
 * latest point (labelled PR when it is one). data-kind names which, for tests.
 */
function PointDot({ cx, cy, index, lastIndex, payload }: DotProps) {
  if (cx === undefined || cy === undefined) return null;
  if (index === lastIndex) {
    return (
      <g data-kind="last">
        <circle cx={cx} cy={cy} r={8} fill="var(--color-accent)" />
        {payload?.pr && (
          <text x={cx} y={cy - 20} textAnchor="end" className="progressChartPR">
            PR
          </text>
        )}
      </g>
    );
  }
  if (payload?.pr) {
    return (
      <circle data-kind="pr" cx={cx} cy={cy} r={6} fill="var(--color-bg)" stroke="var(--color-accent)" strokeWidth={3} />
    );
  }
  return <circle data-kind="session" cx={cx} cy={cy} r={lastIndex >= DENSE_POINTS ? 3 : 4} fill="var(--color-text)" />;
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
  const ticks = yTicks(points);
  return (
    <div className="progressChart" role="img" aria-label={description}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 28, right: 10, bottom: 8, left: 8 }}>
          <CartesianGrid stroke="var(--color-line)" vertical={false} />
          <XAxis dataKey="date" hide padding={{ left: labelGutter(ticks, formatTick), right: 0 }} />
          <YAxis
            mirror
            axisLine={false}
            tickLine={false}
            ticks={ticks}
            domain={[ticks[0], ticks[ticks.length - 1]]}
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
