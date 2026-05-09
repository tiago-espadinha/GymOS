// Typed text keeps its first decimal point; a comma counts as one (European keyboards).
export const decimal = (text: string) => {
  const [whole, ...fraction] = text.replace(/,/g, ".").replace(/[^\d.]/g, "").split(".");
  return fraction.length ? `${whole}.${fraction.join("")}` : whole;
};
export const whole = (text: string) => text.replace(/\D/g, "");
