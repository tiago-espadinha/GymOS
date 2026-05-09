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

// "SUN 15 NOV", the kicker on the Finish screen.
export const formatDateKicker = (d: string): string => {
  return new Date(d + 'T12:00:00')
    .toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
    .replace(',', '')
    .toUpperCase();
};

// "Sun 15 Nov", the meta line above the session list.
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

// "4 MAY": the Progress last/best labels.
export const formatDateStat = (d: string, todayStr: string): string => formatDayMonth(d, todayStr).toUpperCase();

export default {
  today,
  formatDate,
  formatDateShort,
  formatDateKicker,
  formatDateMeta,
  formatDayMonth,
  formatDateStat,
  formatDateFull,
  dayBefore,
};
