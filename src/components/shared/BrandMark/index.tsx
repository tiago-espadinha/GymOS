import './BrandMark.css';

const TICKS_X = [18, 36, 54, 72];

/** The GymOS mark: four set ticks, the last one in the chosen accent. Decorative; the wordmark names the app. */
export function BrandMark({ className }: { className: string }) {
  return (
    <svg className={`brandMark ${className}`} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      {TICKS_X.map((x, i) => (
        <rect key={x} className={i === TICKS_X.length - 1 ? 'brandMark__tick brandMark__tick--on' : 'brandMark__tick'}
          x={x} y="22" width="11" height="56" rx="3" />
      ))}
    </svg>
  );
}

export default BrandMark;
