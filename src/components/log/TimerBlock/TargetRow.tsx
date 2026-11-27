import { TimeField } from "../../shared";
import { getAdjustStepSec } from "../../../constants/timerPresets";
import { TimerButton } from ".";

interface TargetRowProps {
  targetMs: number;
  /** False once a rest is over: a shorter target means nothing, so −step goes and its place stays empty. */
  canShorten?: boolean;
  /** The shortest target −step may leave; by default it can reach zero. */
  keepAStep?: boolean;
  onAdjust: (deltaSeconds: number) => void;
  onType: (seconds: number) => void;
}

// − target + inside a running timer: the steps nudge the target, tapping it types one.
export function TargetRow({ targetMs, canShorten = true, keepAStep = false, onAdjust, onType }: TargetRowProps) {
  const seconds = Math.round(targetMs / 1000);
  const step = getAdjustStepSec(seconds);
  return (
    <>
      {canShorten ? (
        <TimerButton onClick={() => onAdjust(-step)} disabled={keepAStep && seconds <= step}>−{step}s</TimerButton>
      ) : (
        <span />
      )}
      <label className="timerTarget">
        <TimeField label="Timer target" seconds={seconds} onCommit={onType} />
        <span className="timerTargetCaption" aria-hidden="true">Target</span>
      </label>
      <TimerButton onClick={() => onAdjust(step)}>+{step}s</TimerButton>
    </>
  );
}

export default TargetRow;
