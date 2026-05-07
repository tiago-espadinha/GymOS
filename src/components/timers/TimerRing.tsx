import { CSSProperties, ReactNode } from "react";

interface TimerRingProps {
  size?: number;
  strokeWidth?: number;
  progress: number; // 0..1
  color: string;
  trackColor?: string;
  overtime?: boolean;
  children?: ReactNode;
  style?: CSSProperties;
}

export function TimerRing({
  size = 108,
  strokeWidth = 7,
  progress,
  color,
  trackColor = "var(--color-line)",
  overtime = false,
  children,
  style,
}: TimerRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, progress));
  const offset = circumference * (1 - clamped);

  return (
    <div
      className={`timerRing ${overtime ? "timerRingOvertime" : ""}`}
      style={{ width: size, height: size, ...style }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="timerRingProgress"
        />
      </svg>
      <div className="timerRingContent">{children}</div>
    </div>
  );
}

export default TimerRing;
