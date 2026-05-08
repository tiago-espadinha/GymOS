import { useId, useMemo, useState } from "react";
import { ChipGroup, SegmentedControl } from "../../shared";
import { TrainingPlan, WorkoutSession, Exercise } from "../../../types";
import { formatClock } from "../../../hooks/useTimer";
import { formatDateStat, today } from "../../../utils/date";
import {
  MetricKind,
  DEFAULT_METRIC,
  METRIC_LABELS,
  ExerciseMeta,
  getExerciseMeta,
  resolveBranch,
  availableMetrics,
  higherIsBetterFor,
  formatMetricNumber,
} from "../../../utils/metrics";
import {
  TIME_RANGES,
  TimeRange,
  ProgressPoint,
  analyseProgress,
  filterRange,
  lastAndBest,
  progressSeries,
  splitLabel,
} from "../../../utils/progress";
import { DataTools } from "./DataTools";
import { ProgressChart } from "./ProgressChart";
import "./ProgressTab.css";

interface ProgressTabProps {
  plans: TrainingPlan[];
  sessions: WorkoutSession[];
  setPlans: (plans: TrainingPlan[]) => void;
  setSessions: (sessions: WorkoutSession[]) => void;
  selectedExName: string;
  setSelectedExName: (name: string) => void;
}

/** Exercises from active plans and from logged sessions, by name. */
function exercisesOf(plans: TrainingPlan[], sessions: WorkoutSession[]): Exercise[] {
  const byName = new Map<string, Exercise>();
  const add = (ex: Exercise) => {
    if (!byName.has(ex.name)) byName.set(ex.name, ex);
  };
  plans.filter((p) => !p.isArchived).forEach((p) => p.exercises.forEach(add));
  sessions.forEach((s) => s.exercises.forEach(add));
  return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name));
}

const monthYear = (d: string) =>
  new Date(d + "T12:00:00").toLocaleDateString("en-GB", { month: "short", year: "numeric" });

function Stat({ kicker, point, todayStr, best }: { kicker: string; point: ProgressPoint; todayStr: string; best?: boolean }) {
  const { figure, unit } = splitLabel(point.label);
  return (
    <div className={`progressStat${best ? " progressStat--best" : ""}`}>
      <span className="progressStatKicker">
        {kicker} · {formatDateStat(point.date, todayStr)}
      </span>
      <span className="progressStatValue">
        {/* 112px, shrunk so long figures such as a five-digit total fit their column. */}
        <span
          className="progressStatFigure"
          style={{ fontSize: `min(var(--text-stat), calc(100cqi / ${figure.length * 0.5}))` }}
        >
          {figure}
        </span>
        {unit && <span className="progressStatUnit">{unit}</span>}
      </span>
    </div>
  );
}

function analysisText(name: string, points: ProgressPoint[], higherIsBetter: boolean, describe: (n: number) => string) {
  const { total, improvements, stagnations, delta } = analyseProgress(points, higherIsBetter);
  const parts = [`${name} tracked across ${total} sessions.`];
  if (improvements > 0) parts.push(`${improvements} personal record${improvements !== 1 ? "s" : ""} achieved.`);
  if (stagnations > 0) parts.push(`${stagnations} stagnation point${stagnations !== 1 ? "s" : ""} detected.`);
  const gained = higherIsBetter ? delta > 0 : delta < 0;
  if (delta === 0) parts.push("Performance has remained stable.");
  else if (gained) parts.push(`Overall gain: ${describe(Math.abs(delta))}.`);
  else parts.push(`Overall decline of ${describe(Math.abs(delta))} from first session.`);
  return parts.join(" ");
}

const tickFormatter = (meta: ExerciseMeta) => (v: number) =>
  resolveBranch(meta) === "time" ? formatClock(v * 1000) : `${Math.round(v * 10) / 10}`;

export function ProgressTab({
  plans,
  sessions,
  setPlans,
  setSessions,
  selectedExName: storedExName,
  setSelectedExName,
}: ProgressTabProps) {
  const [metricChoice, setMetric] = useState<MetricKind>(DEFAULT_METRIC);
  const [rangeChoice, setRange] = useState<TimeRange>("all");
  const [showData, setShowData] = useState(false);
  const pickerId = useId();
  const dataId = useId();

  const exercises = useMemo(() => exercisesOf(plans, sessions), [plans, sessions]);
  // Fall back to the first exercise when the stored selection no longer exists.
  const selected = exercises.find((ex) => ex.name === storedExName) ?? exercises[0];
  const meta = useMemo(() => (selected ? getExerciseMeta(selected) : null), [selected]);
  const metricOptions = meta ? availableMetrics(resolveBranch(meta)) : [];
  // Fall back to the default when the chosen metric doesn't apply to this exercise.
  const metric = metricOptions.includes(metricChoice) ? metricChoice : DEFAULT_METRIC;

  const series = useMemo(
    () => (selected && meta ? progressSeries(sessions, selected.name, meta, metric) : []),
    [sessions, selected, meta, metric],
  );
  const todayStr = today();
  const ranges = TIME_RANGES.map((r) => ({ ...r, disabled: filterRange(series, r.value, todayStr).length === 0 }));
  const range = ranges.find((r) => r.value === rangeChoice)?.disabled ? "all" : rangeChoice;
  const points = filterRange(series, range, todayStr);
  const higherIsBetter = meta ? higherIsBetterFor(resolveBranch(meta), metric, meta.timeGoal) : true;
  const figures = lastAndBest(series, higherIsBetter);

  return (
    <div className="progressTab">
      <header className="progressHeader">
        <h1 className="progressKicker">Progress</h1>
        <button
          type="button"
          className="progressDataLink"
          aria-expanded={showData}
          aria-controls={dataId}
          onClick={() => setShowData((v) => !v)}
        >
          Import / export
        </button>
      </header>
      <div id={dataId} hidden={!showData}>
        <DataTools plans={plans} sessions={sessions} setPlans={setPlans} setSessions={setSessions} />
      </div>

      {!selected || !meta ? (
        <p className="progressEmpty">No exercises found. Create a training plan first.</p>
      ) : (
        <>
          <div className="progressPicker">
            <label htmlFor={pickerId} className="progressVisuallyHidden">
              Exercise
            </label>
            <select id={pickerId} value={selected.name} onChange={(e) => setSelectedExName(e.target.value)}>
              {exercises.map((ex) => (
                <option key={ex.name} value={ex.name}>
                  {ex.name}
                </option>
              ))}
            </select>
            <svg viewBox="0 0 24 24" aria-hidden="true" className="progressPickerChevron">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>

          <div className="progressMetric">
            <SegmentedControl
              label="Metric"
              options={metricOptions.map((m) => ({ value: m, label: METRIC_LABELS[m] }))}
              value={metric}
              onChange={setMetric}
            />
          </div>

          {!figures ? (
            <p className="progressEmpty">No sessions yet for this exercise</p>
          ) : (
            <>
              <div className="progressStats">
                <Stat kicker="Last" point={figures.last} todayStr={todayStr} />
                <Stat kicker="Best" point={figures.best} todayStr={todayStr} best />
              </div>

              <figure className="progressFigure">
                <ProgressChart
                  points={points}
                  formatTick={tickFormatter(meta)}
                  description={`${METRIC_LABELS[metric]} for ${selected.name} over ${points.length} sessions, from ${points[0].label} to ${points[points.length - 1].label}`}
                />
                <figcaption className="progressCaption">
                  <span>{monthYear(points[0].date)}</span>
                  <span>
                    {points.length === series.length
                      ? `${series.length} session${series.length === 1 ? "" : "s"}`
                      : `last ${points.length} of ${series.length} sessions`}
                  </span>
                  <span>{monthYear(points[points.length - 1].date)}</span>
                </figcaption>
              </figure>

              <div className="progressRanges">
                <ChipGroup label="Time range" options={ranges} value={range} onChange={setRange} />
              </div>

              {points.length > 1 && (
                <p className="progressAnalysis">
                  {analysisText(selected.name, points, higherIsBetter, (n) => formatMetricNumber(n, meta, metric))}
                </p>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

export default ProgressTab;
