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

export default {
  today,
  formatDate,
  formatDateShort,
  formatDateKicker,
};
