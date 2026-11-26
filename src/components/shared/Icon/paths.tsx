import type { ReactNode } from 'react';

// One set on a 24 grid: a single stroke (--stroke-icon), round caps and joins, currentColor.
// Dots are short round-capped strokes, so they take the same weight.
export const PATHS = {
  'chevron-down': <path d="M6 9l6 6 6-6" />,
  'chevron-left': <path d="M15 6l-6 6 6 6" />,
  'chevron-right': <path d="M9 6l6 6-6 6" />,
  'arrow-right': <path d="M4 12h16M14 6l6 6-6 6" />,
  check: <path d="M4 12l5 5L20 6" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4-4" />
    </>
  ),
  filter: <path d="M3 5h18l-7 8.5V20l-4-2v-4.5z" />,
  more: <path className="icon__dot" d="M5 12h.01M12 12h.01M19 12h.01" />,
  info: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 11v6" />
      <path className="icon__dot" d="M12 7h.01" />
    </>
  ),
  warning: (
    <>
      <path d="M12 3l10 18H2z" />
      <path d="M12 10v4" />
      <path className="icon__dot" d="M12 17.5h.01" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof PATHS;
export const ICON_NAMES = Object.keys(PATHS) as IconName[];
