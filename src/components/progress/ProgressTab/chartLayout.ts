/** A rectangle in chart pixels. */
export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface LineStartInput {
  /** Each point's y in chart pixels, in order. */
  ys: number[];
  /** Leftmost x the first point may take. */
  minX: number;
  /** x of the last point (a single point sits midway between the start and this). */
  endX: number;
  /** The y labels' boxes, which no node or segment may come near. */
  labels: Box[];
  /** Largest node radius, the latest point's dot. */
  radius: number;
  /** Half the line's stroke width. */
  halfStroke: number;
  /** Minimum gap between the line or a node and a label. */
  clearance: number;
}

function grow(box: Box, by: number): Box {
  return { left: box.left - by, top: box.top - by, right: box.right + by, bottom: box.bottom + by };
}

function pointInBox(x: number, y: number, b: Box) {
  return x >= b.left && x <= b.right && y >= b.top && y <= b.bottom;
}

/** Liang–Barsky: does the segment from (x1, y1) to (x2, y2) cross the box? */
function segmentHitsBox(x1: number, y1: number, x2: number, y2: number, b: Box) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let t0 = 0;
  let t1 = 1;
  const edges: Array<[number, number]> = [
    [-dx, x1 - b.left],
    [dx, b.right - x1],
    [-dy, y1 - b.top],
    [dy, b.bottom - y1],
  ];
  for (const [p, q] of edges) {
    if (p === 0) {
      if (q < 0) return false;
      continue;
    }
    const t = q / p;
    if (p < 0) t0 = Math.max(t0, t);
    else t1 = Math.min(t1, t);
    if (t0 > t1) return false;
  }
  return true;
}

function pointXs(start: number, end: number, count: number) {
  if (count === 1) return [(start + end) / 2];
  const step = (end - start) / (count - 1);
  return Array.from({ length: count }, (_, i) => start + i * step);
}

function clears(xs: number[], ys: number[], nodeZones: Box[], lineZones: Box[]) {
  for (let i = 0; i < xs.length; i++) {
    if (nodeZones.some((b) => pointInBox(xs[i], ys[i], b))) return false;
    if (i > 0 && lineZones.some((b) => segmentHitsBox(xs[i - 1], ys[i - 1], xs[i], ys[i], b))) return false;
  }
  return true;
}

/**
 * The leftmost x for the first point at which no node or segment comes within `clearance` of a
 * y label, so the line uses the width under the labels wherever it does not run into them. The
 * points spread evenly from that x to `endX`, as Recharts' point scale lays them out. Past the
 * labels' right edge everything clears, so that is the fallback.
 */
export function lineStart({ ys, minX, endX, labels, radius, halfStroke, clearance }: LineStartInput): number {
  if (ys.length === 0 || labels.length === 0) return minX;
  // Nodes are circles; a box grown by the radius is close enough and errs on the safe side.
  const nodeZones = labels.map((b) => grow(b, radius + clearance));
  const lineZones = labels.map((b) => grow(b, halfStroke + clearance));
  const fallback = Math.max(minX, ...nodeZones.map((b) => b.right));
  for (let x = minX; x < fallback; x++) {
    if (clears(pointXs(x, endX, ys.length), ys, nodeZones, lineZones)) return x;
  }
  return fallback;
}
