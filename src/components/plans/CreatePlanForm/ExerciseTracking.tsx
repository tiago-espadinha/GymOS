import { SegmentedControl, Switch } from "../../shared";
import { ExerciseMeta } from "../../../utils/metrics";
import { Exercise } from "../../../types";
import { useUnitPrefs } from "../../../utils/unitPrefs";
import { weightLabel } from "../../../utils/units";

interface ExerciseTrackingProps {
  meta: ExerciseMeta;
  set: (changes: Partial<Exercise>) => void;
}

const GOAL_OPTIONS: { value: "longer" | "shorter"; label: string }[] = [
  { value: "longer", label: "Longer" },
  { value: "shorter", label: "Shorter" },
];

/** What else a set records: weight for reps, distance for cardio (in the units chosen in Settings), or which time is better. */
export function ExerciseTracking({ meta, set }: ExerciseTrackingProps) {
  const { category, trackWeight, trackDistance } = meta;
  const units = useUnitPrefs();

  if (meta.trackingType === "reps") {
    return (
      <Switch label="Track weight" description={`Log ${weightLabel(units.weight)} with each set`} checked={trackWeight}
        onChange={(on) => set({ trackWeight: on })} />
    );
  }

  return (
    <>
      {category === "cardio" && (
        <Switch label="Track distance" description={`Log ${units.distance} with each set`} checked={trackDistance}
          onChange={(on) => set({ trackDistance: on })} />
      )}
      {!trackDistance && (
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
