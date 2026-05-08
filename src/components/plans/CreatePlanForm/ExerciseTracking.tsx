import { SegmentedControl, Switch } from "../../shared";
import { ExerciseMeta } from "../../../utils/metrics";
import { Exercise } from "../../../types";

interface ExerciseTrackingProps {
  meta: ExerciseMeta;
  set: (changes: Partial<Exercise>) => void;
}

const UNIT_OPTIONS: { value: "km" | "mi"; label: string }[] = [
  { value: "km", label: "km" },
  { value: "mi", label: "mi" },
];
const GOAL_OPTIONS: { value: "longer" | "shorter"; label: string }[] = [
  { value: "longer", label: "Longer" },
  { value: "shorter", label: "Shorter" },
];

/** What else a set records: weight for reps, distance and its unit for cardio, or which time is better. */
export function ExerciseTracking({ meta, set }: ExerciseTrackingProps) {
  const { category, trackWeight, trackDistance } = meta;

  if (meta.trackingType === "reps") {
    return (
      <Switch label="Track weight" description="Log kg with each set" checked={trackWeight}
        onChange={(on) => set({ trackWeight: on })} />
    );
  }

  return (
    <>
      {category === "cardio" && (
        <Switch label="Track distance" description="Log how far with each set" checked={trackDistance}
          onChange={(on) => set({ trackDistance: on })} />
      )}
      {trackDistance ? (
        <div className="exerciseRow">
          <span className="exerciseGroupLabel" aria-hidden="true">Distance unit</span>
          <SegmentedControl label="Distance unit" tone="lime" options={UNIT_OPTIONS}
            value={meta.distanceUnit} onChange={(u) => set({ distanceUnit: u })} />
        </div>
      ) : (
        <div className="exerciseRow">
          <span className="exerciseGroupLabel" aria-hidden="true">Better when the time is</span>
          <SegmentedControl label="Better when the time is" options={GOAL_OPTIONS}
            value={meta.timeGoal} onChange={(g) => set({ timeGoal: g })} />
        </div>
      )}
    </>
  );
}

export default ExerciseTracking;
