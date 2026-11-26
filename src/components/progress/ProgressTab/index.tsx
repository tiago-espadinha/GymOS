import { useId, useMemo, useState } from "react";
import { ChevronIcon, ChipGroup, EmptyState, PrimaryButton, SegmentedControl } from "../../shared";
import { TrainingPlan, WorkoutSession, Exercise } from "../../../types";
import { formatClock } from "../../../hooks/useTimer";
import { formatDateStat, formatDayMonth, today } from "../../../utils/date";
import {
  MetricKind,
  DEFAULT_METRIC,
  METRIC_LABELS,
  ExerciseMeta,
  getExerciseMeta,
  withUnits,
  resolveBranch,
  availableMetrics,
  higherIsBetterFor,
  formatMetricNumber,
  metricInfo,
} from "../../../utils/metrics";
import { useUnitPrefs } from "../../../utils/unitPrefs";
import {
  TIME_RANGES,
  TimeRange,
  ProgressPoint,
  analyseProgress,
  filterRange,
  lastAndBest,
  markPRs,
  newPR,
  progressSeries,
  splitLabel,
} from "../../../utils/progress";
import { useMediaQuery, WIDE_QUERY } from "../../../hooks/useMediaQuery";
import { ExercisePicker, ExerciseSearch } from "../ExercisePicker";
import { MetricInfo } from "./MetricInfo";
import { ProgressChart } from "./ProgressChart";
import "./ProgressTab.css";

interface ProgressTabProps {
  plans: TrainingPlan[];
  sessions: WorkoutSession[];
  selectedExName: string;
  setSelectedExName: (name: string) => void;
  /** The empty states' way to log a session. */
  onGoToLog: () => void;
  /** The empty state's way to make a first plan. */
  onNewPlan: () => void;
  /** Opens Settings to import a CSV; passed only while the device holds no data. */
  onImport?: () => void;
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

/** Replaces Best when the latest session is a PR: what it beat, and by how much. */
function NewPRStat({ gain, previous, todayStr }: { gain: string; previous: ProgressPoint; todayStr: string }) {
  return (
    <div className="progressStat">
      <span className="progressStatKicker">New PR</span>
      <span className="progressNewPR">
        {gain} on your previous best ({splitLabel(previous.label).figure}, {formatDayMonth(previous.date, todayStr)}).
      </span>
    </div>
  );
}

function EmptyExercise({
  name,
  planCount,
  onGoToLog,
  subheading,
}: {
  name: string;
  planCount: number;
  onGoToLog: () => void;
  /** Under the wide layout's exercise heading it is one level down. */
  subheading?: boolean;
}) {
  const titleId = useId();
  const Heading = subheading ? "h3" : "h2";
  const where =
    planCount > 0 ? `${name} is in ${planCount} plan${planCount === 1 ? "" : "s"} but has no saved sets.` : `${name} has no saved sets.`;
  return (
    <section className="progressNoSessions" aria-labelledby={titleId}>
      <Heading id={titleId} className="progressNoSessionsTitle">
        Nothing logged yet
      </Heading>
      <p className="progressNoSessionsText">{where} Log it in a session and your last, best and trend show up here.</p>
      <PrimaryButton tone="accent" onClick={onGoToLog}>
        Go to Log
      </PrimaryButton>
    </section>
  );
}

/** A summary sentence split around its figure, so the figure can carry the accent. */
type AnalysisLine = [before: string, figure: string, after: string];

function analysisLines(
  name: string,
  points: ProgressPoint[],
  higherIsBetter: boolean,
  describe: (n: number) => string,
): AnalysisLine[] {
  const { total, improvements, stagnations, delta } = analyseProgress(points, higherIsBetter);
  const lines: AnalysisLine[] = [[`${name} tracked across `, `${total} sessions`, "."]];
  if (improvements > 0) lines.push(["", `${improvements} personal record${improvements !== 1 ? "s" : ""}`, " achieved."]);
  if (stagnations > 0) lines.push(["", `${stagnations} stagnation point${stagnations !== 1 ? "s" : ""}`, " detected."]);
  const gained = higherIsBetter ? delta > 0 : delta < 0;
  if (delta === 0) lines.push(["Performance has remained stable.", "", ""]);
  else if (gained) lines.push(["Overall gain: ", describe(Math.abs(delta)), "."]);
  else lines.push(["Overall decline of ", describe(Math.abs(delta)), " from first session."]);
  return lines;
}

function chartDescription(metricLabel: string, name: string, points: ProgressPoint[], prCount: number) {
  const first = points[0].label;
  const last = points[points.length - 1];
  const prs = prCount === 0 ? "" : `, ${prCount} personal record${prCount === 1 ? "" : "s"}${last.pr ? ", the latest one a PR" : ""}`;
  return `${metricLabel} for ${name} over ${points.length} sessions, from ${first} to ${last.label}${prs}`;
}

const tickFormatter = (meta: ExerciseMeta) => (v: number) =>
  resolveBranch(meta) === "time" ? formatClock(v * 1000) : `${Math.round(v * 10) / 10}`;

export function ProgressTab({
  plans,
  sessions,
  selectedExName: storedExName,
  setSelectedExName,
  onGoToLog,
  onNewPlan,
  onImport,
}: ProgressTabProps) {
  const [metricChoice, setMetric] = useState<MetricKind>(DEFAULT_METRIC);
  const [rangeChoice, setRange] = useState<TimeRange>("all");
  const [picking, setPicking] = useState(false);
  const detailId = useId();
  const wide = useMediaQuery(WIDE_QUERY);

  const exercises = useMemo(() => exercisesOf(plans, sessions), [plans, sessions]);
  // Fall back to the first exercise when the stored selection no longer exists.
  const selected = exercises.find((ex) => ex.name === storedExName) ?? exercises[0];
  const units = useUnitPrefs();
  const meta = useMemo(() => (selected ? withUnits(getExerciseMeta(selected), units) : null), [selected, units]);
  const metricOptions = meta ? availableMetrics(resolveBranch(meta)) : [];
  // Fall back to the default when the chosen metric doesn't apply to this exercise.
  const metric = metricOptions.includes(metricChoice) ? metricChoice : DEFAULT_METRIC;

  const higherIsBetter = meta ? higherIsBetterFor(resolveBranch(meta), metric, meta.timeGoal) : true;
  const series = useMemo(
    () => (selected && meta ? markPRs(progressSeries(sessions, selected.name, meta, metric), higherIsBetter) : []),
    [sessions, selected, meta, metric, higherIsBetter],
  );
  const todayStr = today();
  const ranges = TIME_RANGES.map((r) => ({ ...r, disabled: filterRange(series, r.value, todayStr).length === 0 }));
  const range = ranges.find((r) => r.value === rangeChoice)?.disabled ? "all" : rangeChoice;
  const points = filterRange(series, range, todayStr);
  const figures = lastAndBest(series, higherIsBetter);
  const latestPR = newPR(series, higherIsBetter);
  const prCount = points.filter((p) => p.pr).length;
  // The sheet is phone-only: a window that turns wide closes it, so it does not reopen when it narrows again.
  if (wide && picking) setPicking(false);

  const header = (
    <header className="progressHeader">
      <h1 className="progressTitle">Stats</h1>
    </header>
  );

  // Nothing to chart yet: the block's kicker names the tab, so the title is for screen readers only.
  if (sessions.length === 0 || !selected || !meta) {
    const hasPlans = plans.some((p) => !p.isArchived);
    return (
      <div className="progressTab">
        <h1 className="progressTitle visuallyHidden">Stats</h1>
        <EmptyState
          kicker="Stats"
          title="No stats yet"
          text={
            hasPlans
              ? "Log your first session and the last, best and trend for each exercise show up here."
              : "Log a few sessions and the last, best and trend for each exercise show up here."
          }
          action={hasPlans ? "Go to Log" : "+ New plan"}
          onAction={hasPlans ? onGoToLog : onNewPlan}
          onImport={onImport}
        />
      </div>
    );
  }

  const detail = (
    <>
      {figures && (
        <MetricInfo key={selected.name} label={METRIC_LABELS[metric]} text={metricInfo(resolveBranch(meta), metric, meta.timeGoal)}>
          <SegmentedControl
            label="Metric"
            options={metricOptions.map((m) => ({ value: m, label: METRIC_LABELS[m] }))}
            value={metric}
            onChange={setMetric}
          />
        </MetricInfo>
      )}

      {!figures ? (
        <EmptyExercise
          name={selected.name}
          planCount={plans.filter((p) => !p.isArchived && p.exercises.some((ex) => ex.name === selected.name)).length}
          onGoToLog={onGoToLog}
          subheading={wide}
        />
      ) : (
        <>
          <div className="progressStats">
            <Stat kicker="Last" point={figures.last} todayStr={todayStr} />
            {latestPR ? (
              <NewPRStat
                gain={`${higherIsBetter ? "Up" : "Down"} ${formatMetricNumber(Math.abs(latestPR.last.value - latestPR.previous.value), meta, metric)}`}
                previous={latestPR.previous}
                todayStr={todayStr}
              />
            ) : (
              <Stat kicker="Best" point={figures.best} todayStr={todayStr} best />
            )}
          </div>

          <figure className="progressFigure">
            <ProgressChart
              points={points}
              formatTick={tickFormatter(meta)}
              description={chartDescription(METRIC_LABELS[metric], selected.name, points, prCount)}
            />
            <figcaption className="progressCaption">
              <span className="progressCaptionRow">
                <span>{monthYear(points[0].date)}</span>
                <span className="progressCount">
                  {points.length === series.length
                    ? `${series.length} session${series.length === 1 ? "" : "s"}`
                    : `last ${points.length} of ${series.length} sessions`}
                </span>
                <span>{monthYear(points[points.length - 1].date)}</span>
              </span>
              {/* Its own line, so a partial range's longer count still fits a phone row. */}
              <span className="progressKey">
                <span className="progressLegendSession">
                  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" focusable="false">
                    <circle cx="7" cy="7" r="4" fill="var(--color-text)" />
                  </svg>
                  Session
                </span>
                {prCount > 0 && (
                  <span className="progressLegend">
                    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" focusable="false">
                      <circle cx="7" cy="7" r="5" fill="var(--color-bg)" stroke="var(--color-accent)" strokeWidth="3" />
                    </svg>
                    PR
                  </span>
                )}
              </span>
            </figcaption>
          </figure>

          <div className="progressRanges">
            <ChipGroup label="Time range" options={ranges} value={range} onChange={setRange} />
          </div>

          {points.length > 1 && (
            <div className="progressAnalysis">
              {analysisLines(selected.name, points, higherIsBetter, (n) => formatMetricNumber(n, meta, metric)).map(
                ([before, figure, after]) => (
                  <p key={before + figure}>
                    {before}
                    {figure && <span className="progressAnalysisFigure">{figure}</span>}
                    {after}
                  </p>
                ),
              )}
            </div>
          )}
        </>
      )}
    </>
  );

  // Wide: the search and list sit in a left pane beside the chart, instead of a sheet.
  if (wide) {
    return (
      <div className="progressTab progressTab--wide">
        <div className="progressPane">
          {header}
          <ExerciseSearch
            exercises={exercises}
            sessions={sessions}
            selected={selected.name}
            onPick={setSelectedExName}
            listLabel="Exercises"
            placeholder="Search exercises"
          />
        </div>
        <section className="progressDetail" aria-labelledby={detailId}>
          <h2 id={detailId} className="progressName">
            {selected.name}
          </h2>
          {detail}
        </section>
      </div>
    );
  }

  return (
    <div className="progressTab">
      {header}
      <button
        type="button"
        className="progressPicker"
        aria-haspopup="dialog"
        aria-label={`Exercise: ${selected.name}. Change`}
        onClick={() => setPicking(true)}
      >
        <span className="progressPickerName">{selected.name}</span>
        <ChevronIcon className="progressPickerChevron" />
      </button>
      {picking && (
        <ExercisePicker
          exercises={exercises}
          sessions={sessions}
          selected={selected.name}
          onPick={(name) => {
            setSelectedExName(name);
            setPicking(false);
          }}
          onClose={() => setPicking(false)}
        />
      )}
      {detail}
    </div>
  );
}

export default ProgressTab;
