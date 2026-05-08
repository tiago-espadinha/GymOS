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

// "4 MAY", or "27 NOV 2023" outside the current year: the Progress last/best labels.
export const formatDateStat = (d: string, todayStr: string): string => {
  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  if (d.slice(0, 4) !== todayStr.slice(0, 4)) options.year = 'numeric';
  return new Date(d + 'T12:00:00').toLocaleDateString('en-GB', options).toUpperCase();
};

export default {
  today,
  formatDate,
  formatDateShort,
  formatDateKicker,
  formatDateStat,
};
