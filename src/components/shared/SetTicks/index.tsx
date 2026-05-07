import './SetTicks.css';

interface SetTicksProps {
  total: number;
  done: number;
}

export function SetTicks({ total, done }: SetTicksProps) {
  return (
    <span
      role="img"
      aria-label={`${done} of ${total} sets done`}
      className="set-ticks"
    >
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`set-ticks__tick${i < done ? ' set-ticks__tick--done' : ''}`}
        />
      ))}
    </span>
  );
}

export default SetTicks;
