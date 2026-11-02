// Weights are exact (ADR-0058): numeric(7,3) kg in the database, whole grams
// on the device, so 0.625 × 3 is 1.875 with no rounding.

/** kg, as a number or the database's numeric string, in whole grams. */
export function toGrams(kg: number | string): number {
  return Math.round(Number(kg) * 1000)
}

/** Whole grams as kg, for the database. */
export function toKg(grams: number): number {
  return grams / 1000
}

/** "62.5", "1.875", "60": kg without trailing zeros. */
export function formatKg(grams: number): string {
  return String(grams / 1000)
}

/** A weight stepped by its equipment's increment, never below nothing (GYM-010 2). */
export function stepWeight(grams: number, incrementGrams: number, steps: number): number {
  return Math.max(0, grams + incrementGrams * steps)
}
