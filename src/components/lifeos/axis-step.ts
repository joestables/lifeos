/**
 * A chart's y-axis step for a spread of values, about four steps: a round
 * number (1, 2, 2.5 or 5 times a power of ten) or, given the value's own
 * step (2.5 kg), the smallest round multiple of it that is big enough
 * (2.5, 5, 10, 20…), so every label is a weight that can be lifted.
 */
export function axisStep(spread: number, step?: number): number {
  const raw = spread / 4 || (step ?? 1)
  const mag = 10 ** Math.floor(Math.log10(raw))
  const round = [1, 2, 2.5, 5, 10, 20, 25, 50, 100].map((m) => m * mag)
  if (!step || step <= 0) return round.find((t) => t >= raw) ?? raw
  const whole = (t: number) => Math.abs(t / step - Math.round(t / step)) < 1e-9
  return (
    [step, ...round.filter(whole)].sort((a, b) => a - b).find((t) => t >= raw) ??
    step * Math.ceil(raw / step)
  )
}
