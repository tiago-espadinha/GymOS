import { useEffect, useRef, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, getNiceTickValues } from "recharts";
import { formatDate } from "../../../utils/date";
import type { ProgressPoint } from "../../../utils/progress";
import { lineStart, type Box } from "./chartLayout";

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

// The y labels sit inside the plot, above their grid lines, at the content edge. The line runs
// under them wherever it keeps clear (see lineStart). The ticks are computed here, not left to
// the axis, so the labels drawn are the ones measured. The floor line stays unlabelled: the start
// of a rising line usually sits there.
const TICK_COUNT = 3;
const LABEL_X = 16;
const LABEL_FONT_PX = 13; // the minimum text size
const LABEL_RISE = 10; // label centre above its grid line
const LABEL_HALF_HEIGHT = 8;
const CHAR_PX = 9; // fallback width of a 13px digit where text cannot be measured
const CLEARANCE = 4;
const LAST_DOT_R = 8;
const STROKE = 3;
const MARGIN = { top: 28, bottom: 8 };
// Where the chart does not bleed, the grid stops short of its box and the last dot clears the edge.
const WIDE_MARGIN = { left: 8, right: 10 };

function yTicks(points: ProgressPoint[]) {
  const values = points.map((p) => p.value);
  return getNiceTickValues([Math.min(...values), Math.max(...values)], TICK_COUNT);
}

let measureCtx: CanvasRenderingContext2D | null | undefined;

function labelWidth(text: string, fontFamily: string) {
  if (measureCtx === undefined) measureCtx = document.createElement("canvas").getContext("2d");
  if (!measureCtx) return text.length * CHAR_PX;
  measureCtx.font = `${LABEL_FONT_PX}px ${fontFamily}`;
  return measureCtx.measureText(text).width;
}

interface Size {
  width: number;
  height: number;
  /** How far the chart bleeds past the content edge (CSS --chart-bleed), 0 on wide screens. */
  bleed: number;
  fontFamily: string;
}

function chartMargin(bleed: number) {
  return { ...MARGIN, ...(bleed ? { left: 0, right: 0 } : WIDE_MARGIN) };
}

/**
 * The x-axis padding that puts the first point where lineStart says and the last one at the
 * content edge (or clear of the chart's edge where it does not bleed).
 */
function linePadding(points: ProgressPoint[], ticks: number[], formatTick: (value: number) => string, size: Size) {
  const margin = chartMargin(size.bleed);
  const endX = size.width - (size.bleed || margin.right);
  const [low, high] = [ticks[0], ticks[ticks.length - 1]];
  const plotHeight = size.height - MARGIN.top - MARGIN.bottom;
  const toY = (v: number) => MARGIN.top + (high === low ? plotHeight / 2 : ((high - v) / (high - low)) * plotHeight);
  const labels: Box[] = ticks.slice(1).map((t) => {
    const mid = toY(t) - LABEL_RISE;
    const right = LABEL_X + labelWidth(formatTick(t), size.fontFamily);
    return { left: LABEL_X, top: mid - LABEL_HALF_HEIGHT, right, bottom: mid + LABEL_HALF_HEIGHT };
  });
  const startX = lineStart({
    ys: points.map((p) => toY(p.value)),
    minX: LABEL_X,
    endX,
    labels,
    radius: LAST_DOT_R,
    halfStroke: STROKE / 2,
    clearance: CLEARANCE,
  });
  return { left: startX - margin.left, right: size.width - margin.right - endX };
}

interface TickProps {
  y?: number;
  payload?: { value: number };
  floor: number;
  formatTick: (value: number) => string;
}

function YLabel({ y, payload, floor, formatTick }: TickProps) {
  if (y === undefined || !payload || payload.value === floor) return null;
  return (
    <text x={LABEL_X} y={y - LABEL_RISE} dominantBaseline="central" className="progressChartTick">
      {formatTick(payload.value)}
    </text>
  );
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
  const [size, setSize] = useState<Size | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const ticks = yTicks(points);
  const bleed = size?.bleed ?? 0;
  const pad = size ? linePadding(points, ticks, formatTick, size) : { left: LABEL_X, right: 0 };

  // Labels are measured at render; a web font that loads later changes their width.
  useEffect(() => {
    let live = true;
    document.fonts?.ready.then(() => live && setSize((s) => s && { ...s }));
    return () => {
      live = false;
    };
  }, []);

  function measure(width: number, height: number) {
    if (!box.current) return;
    const style = getComputedStyle(box.current);
    const bleed = parseFloat(style.getPropertyValue("--chart-bleed")) || 0;
    setSize({ width, height, bleed, fontFamily: style.fontFamily });
  }

  return (
    <div className="progressChart" role="img" aria-label={description} ref={box}>
      <ResponsiveContainer width="100%" height="100%" onResize={measure}>
        <LineChart data={points} margin={chartMargin(bleed)}>
          <CartesianGrid stroke="var(--color-line)" vertical={false} />
          <XAxis dataKey="date" hide padding={pad} />
          <YAxis
            mirror
            axisLine={false}
            tickLine={false}
            ticks={ticks}
            interval={0}
            domain={[ticks[0], ticks[ticks.length - 1]]}
            tick={<YLabel floor={ticks[0]} formatTick={formatTick} />}
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
