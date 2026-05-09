import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChipGroup, PrimaryButton, Switch } from "../../shared";
import { formatClock, useTimer } from "../../../hooks/useTimer";
import { DEFAULT_PRESETS, formatPresetLabel } from "../../../constants/timerPresets";
import { holdTimerId } from "../../../utils/restTimers";
import { ExerciseCategory } from "../../../types";
import { HoldTimer } from "./HoldTimer";
import { holdPhase } from "./holdPhase";
import DistanceField from "./DistanceField";
import "./TimedSetBlock.css";

interface TimedSetBlockProps {
  setId: string;
  setNumber: number;
  setTotal: number;
  category: ExerciseCategory;
  initialTargetSec: number;
  // When on, reaching the target ends the hold; when off the hold runs on as overtime.
  chainRest: boolean;
  onChainRestChange: (on: boolean) => void;
  /** Set when the exercise tracks distance. */
  distanceUnit?: "km" | "mi";
  /** A chained rest is on screen: this hold waits under it, ready to start early. */
  resting: boolean;
  /** Hidden while a logged set is edited; the timer keeps going. */
  hidden?: boolean;
  /** Shown between the block and the controls, as on the boards. */
  heading?: ReactNode;
  // The hold is over: the seconds actually held and the distance typed, if any.
  onHoldDone: (seconds: number, distance: string) => void;
  /** Ends the rest so this hold can start now. */
  onEndRest: () => void;
}

// One hold: the block, the target, the rest switch, the distance and the main button.
export function TimedSetBlock(props: TimedSetBlockProps) {
  const { setId, setNumber, setTotal, category, initialTargetSec, chainRest, distanceUnit, resting } = props;
  const timer = useTimer(holdTimerId(setId), initialTargetSec);
  // Written with the set, so a distance alone never logs one; lost on reload.
  const [distance, setDistance] = useState("");

  const heldSec = Math.round(timer.elapsedMs / 1000);
  const doneRef = useRef(false);
  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    timer.reset();
    props.onHoldDone(heldSec, distance);
  };

  // Reaching the target ends the hold when a rest is chained after it.
  useEffect(() => {
    if (chainRest && timer.isComplete) finish();
    // finish reads the current render's values, which these dependencies track.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chainRest, timer.isComplete]);

  const name = category === "cardio" ? "Effort" : "Hold";
  const holdTimer = <HoldTimer timer={timer} name={name} setNumber={setNumber} setTotal={setTotal} onDiscard={timer.reset} />;
  // While a set is edited the phone hides the hold; the wide split keeps it in its timer half.
  if (props.hidden) return resting ? null : <div className="timedSetWideOnly">{holdTimer}</div>;

  const phase = holdPhase(timer);
  const targetSec = Math.round(timer.targetMs / 1000);
  // Past the target there is nothing left to choose; a running effort makes room for its distance.
  const choosing = !timer.isComplete && !(distanceUnit && phase !== "ready");
  const startNow = () => {
    if (resting) props.onEndRest();
    timer.start();
  };

  return (
    <>
      {!resting && holdTimer}
      {props.heading}
      {timer.isComplete && <p className="timedSetHelp">Target reached. Keep going: the extra time counts.</p>}
      {choosing && (
        <div className="timedSetTarget">
          <span className="timedSetLabel" aria-hidden="true">Target</span>
          <ChipGroup
            label="Target time"
            options={DEFAULT_PRESETS[category].work.map((s) => ({ value: String(s), label: formatPresetLabel(s) }))}
            value={String(targetSec)}
            onChange={(v) => timer.setTargetSec(Number(v))}
          />
        </div>
      )}
      {choosing && !resting && (
        <Switch
          label={`Then rest ${formatClock(DEFAULT_PRESETS[category].rest[0] * 1000)}`}
          description={`Rest starts when the ${name.toLowerCase()} ends`}
          checked={chainRest}
          onChange={props.onChainRestChange}
        />
      )}
      {distanceUnit && !resting && <DistanceField setNumber={setNumber} unit={distanceUnit} value={distance} onChange={setDistance} />}
      {phase === "ready" ? (
        <PrimaryButton onClick={startNow}>{`Start ${name.toLowerCase()}${resting ? " now" : ""}`}</PrimaryButton>
      ) : (
        <PrimaryButton onClick={finish} disabled={heldSec < 1}>
          {phase === "running" ? "Stop and log" : `Stop and log ${formatClock(timer.elapsedMs)}`}
        </PrimaryButton>
      )}
    </>
  );
}

export default TimedSetBlock;
