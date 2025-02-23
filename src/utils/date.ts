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

export default {
  today,
  formatDate,
};
