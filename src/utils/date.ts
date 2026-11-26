export const today = (): string => {
  return new Date().toISOString().slice(0, 10);
};

export const formatDate = (d: string): string => {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: '2-digit'
  });
};

export const formatDateShort = (d: string): string => {
  const date = new Date(d + 'T12:00:00');
  return `${date.getMonth() + 1}/${date.getDate()}`;
};

// "Sun 15 Nov": every date on the session screens (list, session sheet, Done).
export const formatDateMeta = (d: string): string => {
  return new Date(d + 'T12:00:00')
    .toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
    .replace(',', '');
};

// "4 May", or "27 Nov 2023" outside the current year.
export const formatDayMonth = (d: string, todayStr: string): string => {
  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  if (d.slice(0, 4) !== todayStr.slice(0, 4)) options.year = 'numeric';
  return new Date(d + 'T12:00:00').toLocaleDateString('en-GB', options);
};

// "7 May 2026": a saved session's date on Log home and the editing kicker.
export const formatDateFull = (d: string): string => {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

// The ISO date one day before d ("2026-03-01" gives "2026-02-28").
export const dayBefore = (d: string): string => {
  const date = new Date(d + 'T12:00:00Z');
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
};

// The ISO date n days after d (n may be negative), in UTC so a clock change can't skip a day.
export const addDays = (d: string, n: number): string => {
  const date = new Date(d + 'T12:00:00Z');
  date.setUTCDate(date.getUTCDate() + n);
  return date.toISOString().slice(0, 10);
};

// The same day n months later, kept inside the month: 31 Jan plus one month is 28 or 29 Feb.
export const addMonths = (d: string, n: number): string => {
  const [y, m, day] = d.split('-').map(Number);
  const first = new Date(Date.UTC(y, m - 1 + n, 1));
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  first.setUTCDate(Math.min(day, last));
  return first.toISOString().slice(0, 10);
};

// "25/11/2026": how a date is typed and shown in the date picker.
export const formatDayMonthYear = (d: string): string => {
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
};

// "25/11/2026" gives "2026-11-25"; anything that is not a real DD/MM/YYYY date gives null.
export const parseDayMonthYear = (text: string): string | null => {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (!match) return null;
  const [, day, m, y] = match;
  const iso = `${y}-${m}-${day}`;
  const date = new Date(iso + 'T12:00:00Z');
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === iso ? iso : null;
};

/**
 * Typing into a DD/MM/YYYY field: digits only, slashes added after the day and month.
 * A trailing slash is added only while typing forward, so Backspace can delete past it.
 */
export const maskDayMonthYear = (next: string, previous: string): string => {
  const digits = next.replace(/\D/g, '').slice(0, 8);
  const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)].filter(Boolean);
  let text = parts.join('/');
  const forward = next.length > previous.length;
  if (forward && (digits.length === 2 || digits.length === 4)) text += '/';
  return text;
};

// "November 2026": the month a calendar shows.
export const formatMonthYear = (d: string): string => {
  return new Date(d + 'T12:00:00Z').toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
};

// "Wednesday 25 November 2026": a calendar day's accessible name.
export const formatDateSpoken = (d: string): string => {
  return new Date(d + 'T12:00:00Z')
    .toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    .replace(',', '');
};

/** The weeks of d's month, Monday first, as ISO dates; days of the months either side are null. */
export const monthWeeks = (d: string): (string | null)[][] => {
  const [y, m] = d.split('-').map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lead = (first.getUTCDay() + 6) % 7;
  const cells: (string | null)[] = Array.from({ length: lead }, () => null);
  for (let day = 1; day <= days; day++) cells.push(`${d.slice(0, 7)}-${String(day).padStart(2, '0')}`);
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
};

// "4 MAY": the Stats last/best labels.
export const formatDateStat = (d: string, todayStr: string): string => formatDayMonth(d, todayStr).toUpperCase();

export default {
  today,
  formatDate,
  formatDateShort,
  formatDateMeta,
  formatDayMonth,
  formatDateStat,
  formatDateFull,
  dayBefore,
  addDays,
  addMonths,
  formatDayMonthYear,
  parseDayMonthYear,
  maskDayMonthYear,
  formatMonthYear,
  formatDateSpoken,
  monthWeeks,
};
