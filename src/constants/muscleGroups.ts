export const MUSCLE_GROUPS = [
  'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps',
  'Legs', 'Glutes', 'Core', 'Cardio', 'Other'
];

export const MUSCLE_GROUP_COLORS: Record<string, string> = Object.fromEntries(
  MUSCLE_GROUPS.map((group) => [group, 'var(--color-text-muted)']),
);

export default {
  MUSCLE_GROUPS,
  MUSCLE_GROUP_COLORS,
};
