import type { ReactNode } from 'react';

// One set on a 24 grid, cut like the display type: a single heavy stroke (--stroke-icon),
// flat ends and sharp corners, tall narrow forms, currentColor.
// Dots, the funnel and the info and warning badges are filled shapes (icon__fill),
// the badges with their marks cut out.
export const PATHS = {
  'chevron-down': <path d="M3.5 8L12 15.5 20.5 8" />,
  'chevron-left': <path d="M15.5 3.5L8 12l7.5 8.5" />,
  'chevron-right': <path d="M8.5 3.5L16 12l-7.5 8.5" />,
  'arrow-right': <path d="M2.5 12h15.5M12.5 4.5l7 7.5-7 7.5" />,
  check: <path d="M3 13l6 6L21 4.5" />,
  close: <path d="M6 3.5l12 17M18 3.5l-12 17" />,
  plus: <path d="M12 3v18M3.5 12h17" />,
  minus: <path d="M3.5 12h17" />,
  search: (
    <>
      <circle cx="10" cy="10" r="6.5" />
      <path d="M14.8 14.8L21.5 21.5" />
    </>
  ),
  // A unit below centre: the wide cone carries the weight, so a centred box reads high.
  filter: <path className="icon__fill" d="M3 4h18l-7 9v9l-4-2.5V13z" />,
  more: <path className="icon__fill" d="M2.5 9.75h4.5v4.5H2.5zM9.75 9.75h4.5v4.5h-4.5zM17 9.75h4.5v4.5H17z" />,
  info: (
    <path
      className="icon__fill"
      fillRule="evenodd"
      d="M8 2h8a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zM10.25 10h3.5v8h-3.5zM10.25 5h3.5v3.5h-3.5z"
    />
  ),
  warning: <path className="icon__fill" fillRule="evenodd" d="M12 1.5l11 20H1zM10.25 8.5h3.5v6h-3.5zM10.25 16h3.5v3.5h-3.5z" />,
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof PATHS;
export const ICON_NAMES = Object.keys(PATHS) as IconName[];
