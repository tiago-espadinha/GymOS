import { useState, useMemo, useRef, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Label, Select, Button, Search } from "../../shared";
import { formatDate, formatDateShort } from "../../../utils/date";
import { TrainingPlan, WorkoutSession, Exercise } from "../../../types";
import { exportToCSV, importFromCSV } from "../../../utils/csv";
import {
  MetricKind,
  DEFAULT_METRIC,
  METRIC_LABELS,
  getExerciseMeta,
  resolveBranch,
  availableMetrics,
  computeMetric,
  higherIsBetterFor,
  formatMetricNumber,
} from "../../../utils/metrics";
import "./ProgressTab.css";

interface ProgressTabProps {
  plans: TrainingPlan[];
  sessions: WorkoutSession[];
  setPlans: (plans: TrainingPlan[]) => void;
  setSessions: (sessions: WorkoutSession[]) => void;
  selectedExName: string;
  setSelectedExName: (name: string) => void;
}

interface ChartPoint {
  date: string;
  shortDate: string;
  rawDate: string;
  value: number;
  label: string;
}

interface AnalyzedPoint extends ChartPoint {
  status: "baseline" | "improvement" | "stagnation" | "neutral";
}

type TimeRange = "all" | "5" | "10" | "1m" | "3m";

interface ChartPoint {
  date: string;
  label: string;
  status: "improvement" | "stagnation" | "baseline" | "neutral";
}

interface DotProps {
  cx?: number;
  cy?: number;
  payload?: ChartPoint;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ payload: ChartPoint }>;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

const CustomDot = ({ cx, cy, payload }: DotProps) => {
  if (!payload) return null;
  const col =
    payload.status === "improvement"
      ? "var(--color-accent)"
      : payload.status === "stagnation"
        ? "var(--color-text)"
        : "var(--color-text-muted)";
  const r =
    payload.status === "improvement" || payload.status === "stagnation"
      ? 7
      : 5;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={r}
      fill={col}
      stroke={"var(--color-surface)"}
      strokeWidth={2}
    />
  );
};

const CustomTooltip = ({ active, payload }: TooltipProps) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const statusMap: Record<string, { color: string; label: string }> = {
    improvement: { color: "var(--color-accent)", label: "↑ New PR" },
    stagnation: { color: "var(--color-text)", label: "⟳ Stagnation" },
    baseline: { color: "var(--color-text-muted)", label: "◎ Baseline" },
    neutral: { color: "var(--color-text-muted)", label: "→ Maintained" },
  };
  const st = statusMap[d.status];
  return (
    <div className="customTooltip">
      <div className="tooltipDate">{d.date}</div>
      <div className="tooltipValue">{d.label}</div>
      <div className="tooltipStatus">{st.label}</div>
    </div>
  );
};

export function ProgressTab({
  plans,
  sessions,
  setPlans,
  setSessions,
  selectedExName: storedExName,
  setSelectedExName,
}: ProgressTabProps) {
  const [selectedPlanId, setSelectedPlanId] = useState("all");
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [showExDropdown, setShowExDropdown] = useState(false);
  const [metricChoice, setMetric] = useState<MetricKind>(DEFAULT_METRIC);
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [importState, setImportState] = useState<{
    files: FileList;
    plans: TrainingPlan[];
    sessions: WorkoutSession[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowExDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleExport = () => {
    const csv = exportToCSV(plans, sessions);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `gym_data_${new Date().toISOString().split("T")[0]}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileSelection = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const allImportedPlans: TrainingPlan[] = [];
    const allImportedSessions: WorkoutSession[] = [];

    try {
      const readFiles = Array.from(files).map((file) => {
        return new Promise<void>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            const csv = event.target?.result as string;
            if (csv) {
              try {
                const { plans: p, sessions: s } = importFromCSV(csv);
                allImportedPlans.push(...p);
                allImportedSessions.push(...s);
                resolve();
              } catch (err) {
                reject(new Error(`File "${file.name}":\n${errorMessage(err)}`));
              }
            } else {
              resolve();
            }
          };
          reader.readAsText(file);
        });
      });

      await Promise.all(readFiles);
      setImportState({
        files,
        plans: allImportedPlans,
        sessions: allImportedSessions,
      });
    } catch (err) {
      alert(errorMessage(err));
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const finalizeImport = (mode: "append" | "replace") => {
    if (!importState) return;

    const { plans: importedPlans, sessions: importedSessions } = importState;

    if (mode === "replace") {
      setPlans(importedPlans);
      setSessions(importedSessions);
    } else {
      // Append Mode: Merge logic
      const newPlans = [...plans];
      importedPlans.forEach((imp) => {
        const existing = newPlans.find((p) => p.name === imp.name);
        if (existing) {
          // Merge exercises into existing plan
          imp.exercises.forEach((impEx) => {
            if (!existing.exercises.find((e) => e.name === impEx.name)) {
              existing.exercises.push(impEx);
            }
          });
        } else {
          newPlans.push(imp);
        }
      });

      const newSessions = [...sessions];
      importedSessions.forEach((imp) => {
        // Deduplicate sessions: check for same date, plan, and notes
        const isDuplicate = newSessions.some(
          (s) =>
            s.date === imp.date &&
            s.planName === imp.planName &&
            s.notes === imp.notes,
        );
        if (!isDuplicate) {
          newSessions.push(imp);
        }
      });

      setPlans(newPlans);
      setSessions(newSessions);
    }

    // Reset
    setImportState(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const cancelImport = () => {
    setImportState(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const allExercises = useMemo(() => {
    const map = new Map<string, Exercise>();

    const filteredPlans = selectedPlanId === "all" 
      ? plans.filter(p => !p.isArchived)
      : plans.filter(p => p.id === selectedPlanId);

    filteredPlans.forEach((plan) =>
      plan.exercises.forEach((ex) => {
        if (!map.has(ex.name)) map.set(ex.name, ex);
      }),
    );

    // Also include exercises from sessions that might not be in plans, 
    // but only if "All Plans" is selected or the session matches the selected plan name
    const selectedPlanName = plans.find(p => p.id === selectedPlanId)?.name;
    sessions.forEach((session) => {
      if (selectedPlanId === "all" || session.planName === selectedPlanName) {
        session.exercises.forEach((ex) => {
          if (!map.has(ex.name)) map.set(ex.name, ex);
        });
      }
    });

    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [plans, sessions, selectedPlanId]);

  const filteredExercises = useMemo(() => {
    if (!exerciseSearch) return allExercises;
    return allExercises.filter(ex => 
      ex.name.toLowerCase().includes(exerciseSearch.toLowerCase())
    );
  }, [allExercises, exerciseSearch]);

  // Fall back to the first exercise when the stored selection no longer exists.
  const selectedExName = allExercises.some((ex) => ex.name === storedExName)
    ? storedExName
    : (allExercises[0]?.name ?? "");

  const selected = allExercises.find((e) => e.name === selectedExName);
  const meta = useMemo(() => (selected ? getExerciseMeta(selected) : null), [selected]);
  const branch = meta ? resolveBranch(meta) : null;
  const metricOptions = branch ? availableMetrics(branch) : [];

  // Fall back to the default when the chosen metric doesn't apply to this exercise.
  const metric = metricOptions.includes(metricChoice) ? metricChoice : DEFAULT_METRIC;

  const { chartData, stats } = useMemo(() => {
    if (!selectedExName || !meta) return { chartData: [], stats: null };

    const relevant = sessions
      .filter((s) => s.exercises.some((e) => e.name === selectedExName))
      .sort((a, b) => a.date.localeCompare(b.date));

    if (relevant.length === 0) return { chartData: [], stats: null };

    let points: ChartPoint[] = relevant
      .map((s) => {
        const ex = s.exercises.find((e) => e.name === selectedExName);
        const result = ex ? computeMetric(ex.sets, meta, metric) : null;
        if (!result) return null;
        return {
          date: formatDate(s.date),
          shortDate: formatDateShort(s.date),
          rawDate: s.date,
          value: result.value,
          label: result.label,
        };
      })
      .filter((p): p is ChartPoint => p !== null);

    if (points.length === 0) return { chartData: [], stats: null };

    // Time range filtering
    if (timeRange === "5") points = points.slice(-5);
    else if (timeRange === "10") points = points.slice(-10);
    else if (timeRange === "1m" || timeRange === "3m") {
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - (timeRange === "1m" ? 1 : 3));
      const cutoffStr = cutoff.toISOString().slice(0, 10);
      points = points.filter(p => p.rawDate >= cutoffStr);
    }

    const branchForMetric = resolveBranch(meta);
    const higherIsBetter = higherIsBetterFor(branchForMetric, metric, meta.timeGoal);
    const isBetter = (a: number, b: number) => (higherIsBetter ? a > b : a < b);

    const analyzed: AnalyzedPoint[] = [];
    let allTimeBest = 0;
    let allTimeBestLabel = points[0].label;

    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const val = p.value;
      let status: "baseline" | "improvement" | "stagnation" | "neutral" =
        "neutral";

      if (i === 0) {
        status = "baseline";
        allTimeBest = val;
        allTimeBestLabel = p.label;
      } else {
        const prev = analyzed[i - 1].value;
        if (isBetter(val, prev)) {
          status = "improvement";
          if (isBetter(val, allTimeBest)) {
            allTimeBest = val;
            allTimeBestLabel = p.label;
          }
        } else if (i >= 2 && !isBetter(val, prev) && !isBetter(prev, analyzed[i - 2].value)) {
          status = "stagnation";
        }
      }
      analyzed.push({ ...p, status });
    }

    const vals = analyzed.map((p) => p.value);
    const lastVal = vals[vals.length - 1];
    const firstVal = vals[0];

    return {
      chartData: analyzed,
      stats: {
        maxVal: allTimeBest,
        maxLabel: allTimeBestLabel,
        lastVal,
        lastLabel: analyzed[analyzed.length - 1].label,
        firstVal,
        delta: lastVal - firstVal,
        higherIsBetter,
        improvements: analyzed.filter((p) => p.status === "improvement").length,
        stagnations: analyzed.filter((p) => p.status === "stagnation").length,
        total: analyzed.length,
      },
    };
  }, [selectedExName, sessions, metric, timeRange, meta]);

  return (
    <div>
      <div className="progressHeader">
        <span>Progress Analysis</span>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ display: "flex", gap: "8px" }}>
            <Button variant="ghost" small onClick={handleExport}>
              Export
            </Button>
            <Button
              variant="primary"
              small
              onClick={() => fileInputRef.current?.click()}
            >
              Import CSV
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelection}
              accept=".csv"
              multiple
              style={{ display: "none" }}
            />
          </div>
        </div>
      </div>

      {importState && (
        <div className="modalOverlay">
          <div className="importModal">
            <h3>Import Options</h3>
            <p>
              You are about to import {importState.files.length} file(s)
              containing {importState.plans.length} plan(s) and{" "}
              {importState.sessions.length} session(s).
            </p>
            <p className="modalQuestion">
              Do you want to erase existing data or append to it?
            </p>
            <div className="modalActions">
              <Button variant="ghost" onClick={cancelImport}>
                Cancel
              </Button>
              <div style={{ display: "flex", gap: "12px" }}>
                <Button
                  variant="ghost"
                  onClick={() => finalizeImport("append")}
                >
                  Append
                </Button>
                <Button
                  variant="danger"
                  onClick={() => finalizeImport("replace")}
                >
                  Erase & Replace
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {allExercises.length === 0 && selectedPlanId === "all" ? (
        <div className="noExercises">
          No exercises found. Create a training plan first.
        </div>
      ) : (
        <>
          <div className="progressFilters">
            <div className="planFilter">
              <Label>Filter by Plan</Label>
              <Select value={selectedPlanId} onChange={setSelectedPlanId}>
                <option value="all">All Plans</option>
                {plans
                  .filter((p) => !p.isArchived || p.id === selectedPlanId)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.isArchived ? "(Archived)" : ""}
                    </option>
                  ))}
              </Select>
            </div>

            <div className="exerciseFilter" ref={dropdownRef}>
              <Label>Exercise</Label>
              <Search
                value={exerciseSearch}
                onChange={setExerciseSearch}
                onFocus={() => setShowExDropdown(true)}
                isOpen={showExDropdown}
                placeholder={selectedExName || "Select exercise..."}
              >
                {filteredExercises.length > 0 ? (
                  filteredExercises.map((ex) => (
                    <div
                      key={ex.name}
                      className={`searchSelectOption ${selectedExName === ex.name ? "active" : ""}`}
                      onClick={() => {
                        setSelectedExName(ex.name);
                        setExerciseSearch("");
                        setShowExDropdown(false);
                      }}
                    >
                      {ex.name}
                    </div>
                  ))
                ) : (
                  <div className="searchSelectNoResults">No results found</div>
                )}
              </Search>
          </div>

            <div className="metricFilter">
              <Label>Metric</Label>
              <div className="progressMetric">
                {metricOptions.map((m) => (
                  <button
                    key={m}
                    onClick={() => setMetric(m)}
                    className={`metricButton ${metric === m ? "active" : ""}`}
                  >
                    {METRIC_LABELS[m]}
                  </button>
                ))}
              </div>
            </div>

            <div className="timeRangeFilter">
              <Label>Time Range</Label>
              <div className="progressMetric">
                {[
                  ["all", "All"],
                  ["5", "5S"],
                  ["10", "10S"],
                  ["1m", "1M"],
                  ["3m", "3M"],
                ].map(([r, label]) => (
                  <button
                    key={r}
                    onClick={() => setTimeRange(r as TimeRange)}
                    className={`metricButton ${timeRange === r ? "active" : ""}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {chartData.length === 0 ? (
            <div className="noSessions">
              No sessions logged for{" "}
              <span className="exerciseName">{selected?.name}</span>
              .
              <br />
              Log a session on the Log tab to start tracking.
            </div>
          ) : (
            <>
              {stats && (
                <div className="statsGrid">
                  {[
                    {
                      label: "Personal Record",
                      value: stats.maxLabel,
                      color: "var(--color-accent)",
                    },
                    {
                      label: "Last Session",
                      value: stats.lastLabel,
                      color: "var(--color-text)",
                    },
                    {
                      label: "Improvements",
                      value: stats.improvements,
                      color: "var(--color-accent)",
                    },
                    {
                      label: "Stagnations",
                      value: stats.stagnations,
                      color: stats.stagnations > 0 ? "var(--color-text)" : "var(--color-text-muted)",
                    },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="statCard">
                      <div className="statLabel">{label}</div>
                      <div className="statValue" style={{ color }}>
                        {value}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="chartContainer">
                <div className="legend">
                  {[
                    { color: "var(--color-accent)", label: "Improvement (new PR)" },
                    { color: "var(--color-text)", label: "Stagnation (3+ sessions)" },
                    { color: "var(--color-text-muted)", label: "Neutral / Baseline" },
                  ].map(({ color, label }) => (
                    <div key={label} className="legendItem">
                      <div
                        className="legendColor"
                        style={{ backgroundColor: color }}
                      />
                      {label}
                    </div>
                  ))}
                </div>

                <div className="chartWrapper">
                  <div 
                    className="chartArea" 
                    style={{ minWidth: chartData.length > 15 ? `${chartData.length * 28}px` : "100%" }}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={chartData}
                        margin={{ top: 10, right: 20, bottom: 5, left: 0 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke={"var(--color-line)"}
                          vertical={false}
                        />
                        <XAxis
                          dataKey="date"
                          tick={{
                            fill: "var(--color-text-muted)",
                            fontSize: 10,
                            fontFamily: "inherit",
                          }}
                          tickFormatter={(v) => {
                            const point = chartData.find(d => d.date === v);
                            return point ? point.shortDate : v;
                          }}
                          minTickGap={15}
                          axisLine={{ stroke: "var(--color-line)" }}
                          tickLine={false}
                        />

                        <YAxis
                          tick={{
                            fill: "var(--color-text-muted)",
                            fontSize: 11,
                            fontFamily: "inherit",
                          }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(v) => `${v}`}
                          width={45}
                        />
                        <Tooltip
                          content={<CustomTooltip />}
                          cursor={{ stroke: "var(--color-line-strong)", strokeWidth: 1 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke={"var(--color-accent)"}
                          strokeWidth={2}
                          dot={<CustomDot />}
                          activeDot={{
                            r: 8,
                            fill: "var(--color-accent)",
                            stroke: "var(--color-bg)",
                            strokeWidth: 2,
                          }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {stats && stats.total > 1 && (
                <div className="analysisSummary">
                  <div>
                    <span className="analysisLabel">Analysis · </span>
                    {selected?.name} tracked across {stats.total} session
                    {stats.total !== 1 ? "s" : ""}.
                  </div>
                  {stats.improvements > 0 && (
                    <>
                      {" "}
                      <span className="improvementStat">
                        ↑ {stats.improvements} personal record
                        {stats.improvements !== 1 ? "s" : ""} achieved.
                      </span>
                    </>
                  )}
                  {stats.stagnations > 0 && (
                    <>
                      {" "}
                      <span className="stagnationStat">
                        ⟳ {stats.stagnations} stagnation point
                        {stats.stagnations !== 1 ? "s" : ""} detected.
                      </span>
                    </>
                  )}
                  {stats.delta !== 0 && (stats.higherIsBetter ? stats.delta > 0 : stats.delta < 0) && (
                    <>
                      {" "}
                      <span className="gainStat">
                        Overall gain: {formatMetricNumber(Math.abs(stats.delta), meta!, metric)}.
                      </span>
                    </>
                  )}
                  {stats.delta !== 0 && (stats.higherIsBetter ? stats.delta < 0 : stats.delta > 0) && (
                    <>
                      {" "}
                      <span className="declineStat">
                        Overall decline of {formatMetricNumber(Math.abs(stats.delta), meta!, metric)}{" "}
                        from first session.
                      </span>
                    </>
                  )}
                  {stats.delta === 0 && <> Performance has remained stable.</>}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

export default ProgressTab;
