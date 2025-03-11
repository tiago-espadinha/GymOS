import { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Label, Select } from "../../shared";
import Colors from "../../../constants/colors";
import { formatDate } from "../../../utils/date";
import { TrainingPlan, WorkoutSession } from "../../../types";
import "./ProgressTab.css";

interface ProgressTabProps {
  plans: TrainingPlan[];
  sessions: WorkoutSession[];
}

interface ChartPoint {
  date: string;
  rawDate: string;
  maxWeight: number;
  volume: number;
}

interface AnalyzedPoint extends ChartPoint {
  value: number;
  status: "baseline" | "improvement" | "stagnation" | "neutral";
}

interface Stats {
  maxVal: number;
  lastVal: number;
  firstVal: number;
  delta: number;
  improvements: number;
  stagnations: number;
  total: number;
}

export function ProgressTab({ plans, sessions }: ProgressTabProps) {
  const [selectedExId, setSelectedExId] = useState("");
  const [metric, setMetric] = useState<"maxWeight" | "volume">("maxWeight");

  const allExercises = useMemo(() => {
    const map = new Map();
    plans.forEach((plan) =>
      plan.exercises.forEach((ex) => {
        if (!map.has(ex.id)) {
          map.set(ex.id, { ...ex, planName: plan.name });
        }
      }),
    );
    return Array.from(map.values());
  }, [plans]);

  useMemo(() => {
    if (allExercises.length > 0 && !selectedExId) {
      setSelectedExId(allExercises[0].id);
    }
  }, [allExercises, selectedExId]);

  const { chartData, stats } = useMemo(() => {
    if (!selectedExId) return { chartData: [], stats: null };

    const relevant = sessions
      .filter((s) => s.exercises.some((e) => e.id === selectedExId))
      .sort((a, b) => a.date.localeCompare(b.date));

    if (relevant.length === 0) return { chartData: [], stats: null };

    const points: ChartPoint[] = relevant.map((s) => {
      const ex = s.exercises.find((e) => e.id === selectedExId);
      const maxWeight = ex
        ? ex.sets.reduce((m, st) => Math.max(m, parseFloat(st.weight) || 0), 0)
        : 0;
      const volume = ex
        ? ex.sets.reduce(
            (sum, st) =>
              sum + (parseFloat(st.weight) || 0) * (parseInt(st.reps) || 0),
            0,
          )
        : 0;
      return { date: formatDate(s.date), rawDate: s.date, maxWeight, volume };
    });

    const analyzed: AnalyzedPoint[] = [];
    let allTimeMax = 0;

    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const val = metric === "maxWeight" ? p.maxWeight : p.volume;
      let status: "baseline" | "improvement" | "stagnation" | "neutral" =
        "neutral";

      if (i === 0) {
        status = "baseline";
        allTimeMax = val;
      } else {
        const prev = analyzed[i - 1].value;
        if (val > prev) {
          status = "improvement";
          if (val > allTimeMax) allTimeMax = val;
        } else if (i >= 2 && val <= prev && prev <= analyzed[i - 2].value) {
          status = "stagnation";
        }
      }
      analyzed.push({ ...p, value: val, status });
    }

    const vals = analyzed.map((p) => p.value);
    const lastVal = vals[vals.length - 1];
    const firstVal = vals[0];

    return {
      chartData: analyzed,
      stats: {
        maxVal: allTimeMax,
        lastVal,
        firstVal,
        delta: lastVal - firstVal,
        improvements: analyzed.filter((p) => p.status === "improvement").length,
        stagnations: analyzed.filter((p) => p.status === "stagnation").length,
        total: analyzed.length,
      },
    };
  }, [selectedExId, sessions, metric]);

  const selected = allExercises.find((e) => e.id === selectedExId);

  const CustomDot = ({ cx, cy, payload }: any) => {
    const col =
      payload.status === "improvement"
        ? Colors.success
        : payload.status === "stagnation"
          ? Colors.warn
          : Colors.accent;
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
        stroke={Colors.card}
        strokeWidth={2}
      />
    );
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    const statusMap: Record<string, { color: string; label: string }> = {
      improvement: { color: Colors.success, label: "↑ New PR" },
      stagnation: { color: Colors.warn, label: "⟳ Stagnation" },
      baseline: { color: Colors.muted, label: "◎ Baseline" },
      neutral: { color: Colors.muted, label: "→ Maintained" },
    };
    const st = statusMap[d.status];
    return (
      <div className="customTooltip">
        <div className="tooltipDate">{d.date}</div>
        <div className="tooltipValue">
          {metric === "maxWeight"
            ? `${d.value} kg`
            : `${d.value.toFixed(0)} kg·r`}
        </div>
        <div className="tooltipStatus">{st.label}</div>
      </div>
    );
  };

  const metricLabel = metric === "maxWeight" ? "kg" : "kg·rep";

  return (
    <div>
      <div className="progressHeader">Progress Analysis</div>

      {allExercises.length === 0 ? (
        <div className="noExercises">
          No exercises found. Create a training plan first.
        </div>
      ) : (
        <>
          <div className="progressFilters">
            <div className="progressFilter">
              <Label>Exercise</Label>
              <Select value={selectedExId} onChange={setSelectedExId}>
                {allExercises.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name} — {ex.planName}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Metric</Label>
              <div className="progressMetric">
                {[
                  ["maxWeight", "Max Weight"],
                  ["volume", "Volume"],
                ].map(([m, label]) => (
                  <button
                    key={m}
                    onClick={() => setMetric(m as "maxWeight" | "volume")}
                    className={`metricButton ${metric === m ? "active" : ""}`}
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
                      value:
                        metric === "maxWeight"
                          ? `${stats.maxVal} kg`
                          : stats.maxVal.toFixed(0),
                      color: Colors.accent,
                    },
                    {
                      label: "Last Session",
                      value:
                        metric === "maxWeight"
                          ? `${stats.lastVal} kg`
                          : stats.lastVal.toFixed(0),
                      color: Colors.text,
                    },
                    {
                      label: "Improvements",
                      value: stats.improvements,
                      color: Colors.success,
                    },
                    {
                      label: "Stagnations",
                      value: stats.stagnations,
                      color: stats.stagnations > 0 ? Colors.warn : Colors.dim,
                    },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="statCard">
                      <div className="statLabel">{label}</div>
                      <div className="statValue" style={{ color }}>{value}</div>
                    </div>
                  ))}
                </div>
              )}

              <div className="chartContainer">
                <div className="legend">
                  {[
                    { color: Colors.success, label: "Improvement (new PR)" },
                    { color: Colors.warn, label: "Stagnation (3+ sessions)" },
                    { color: Colors.accent, label: "Neutral / Baseline" },
                  ].map(({ color, label }) => (
                    <div key={label} className="legendItem">
                      <div className="legendColor" style={{ backgroundColor: color }} />
                      {label}
                    </div>
                  ))}
                </div>

                <div className="chartArea">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chartData}
                      margin={{ top: 10, right: 20, bottom: 5, left: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={Colors.border}
                        vertical={false}
                      />
                      <XAxis
                        dataKey="date"
                        tick={{
                          fill: Colors.muted,
                          fontSize: 11,
                          fontFamily: "inherit",
                        }}
                        axisLine={{ stroke: Colors.border }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{
                          fill: Colors.muted,
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
                        cursor={{ stroke: Colors.borderHov, strokeWidth: 1 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke={Colors.accent}
                        strokeWidth={2}
                        dot={<CustomDot />}
                        activeDot={{
                          r: 8,
                          fill: Colors.accent,
                          stroke: Colors.bg,
                          strokeWidth: 2,
                        }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {stats && stats.total > 1 && (
                <div className="analysisSummary">
                  <span className="analysisLabel">Analysis · </span>
                  {selected?.name} tracked across {stats.total} session
                  {stats.total !== 1 ? "s" : ""}.
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
                        {stats.stagnations !== 1 ? "s" : ""} detected — consider
                        varying intensity, rep range, or rest periods.
                      </span>
                    </>
                  )}
                  {stats.delta > 0 && (
                    <>
                      {" "}
                      <span className="gainStat">
                        Overall gain: +
                        {metric === "maxWeight"
                          ? `${stats.delta.toFixed(1)} kg`
                          : `${stats.delta.toFixed(0)} ${metricLabel}`}
                        .
                      </span>
                    </>
                  )}
                  {stats.delta < 0 && (
                    <>
                      {" "}
                      <span className="declineStat">
                        Overall decline of{" "}
                        {metric === "maxWeight"
                          ? `${Math.abs(stats.delta).toFixed(1)} kg`
                          : `${Math.abs(stats.delta).toFixed(0)} ${metricLabel}`}{" "}
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
