/**
 * A step that names a time offers a timer (ADR-0056): "simmer for 20
 * minutes", "10-15 mins" (the lower end), "1 hour", "1½ hours", "90
 * seconds", "1 hr 15 min". The first time named in the step, in seconds.
 */
export interface StepTimer {
  seconds: number
  /** The words as written: "20 minutes". */
  text: string
}

const UNIT_SECONDS: [RegExp, number][] = [
  [/^h(?:ours?|rs?)?$/i, 3600],
  [/^m(?:in(?:ute)?s?)?$/i, 60],
  [/^s(?:ec(?:ond)?s?)?$/i, 1],
]

const NUM = String.raw`(\d+(?:[.,]\d+)?|\d*[½¼¾])`
const PART = new RegExp(
  String.raw`${NUM}(?:\s*(?:-|–|to)\s*${NUM})?\s*(hours?|hrs?|h|minutes?|mins?|m|seconds?|secs?|s)\b`,
  'gi',
)

function toNumber(s: string): number {
  const frac: Record<string, number> = { '½': 0.5, '¼': 0.25, '¾': 0.75 }
  const last = s.slice(-1)
  if (frac[last] !== undefined) return Number(s.slice(0, -1) || 0) + frac[last]!
  return Number(s.replace(',', '.'))
}

function unitSeconds(word: string): number | undefined {
  return UNIT_SECONDS.find(([re]) => re.test(word))?.[1]
}

export function findTimer(step: string): StepTimer | null {
  const parts = [...step.matchAll(PART)]
  if (!parts.length) return null
  // "1 hr 15 min": parts next to each other add up.
  const first = parts[0]!
  let seconds = 0
  let end = first.index
  let text = ''
  for (const p of parts) {
    if (
      p.index !== first.index &&
      step.slice(end, p.index).trim() !== '' &&
      !/^(and)$/i.test(step.slice(end, p.index).trim())
    )
      break
    const per = unitSeconds(p[3]!)
    if (per === undefined) break
    seconds += toNumber(p[1]!) * per
    end = p.index + p[0].length
    text = step.slice(first.index, end)
  }
  return seconds > 0 ? { seconds: Math.round(seconds), text } : null
}

/** 1200 → "20:00"; 3725 → "1:02:05". */
export function formatTimer(seconds: number): string {
  const s = Math.max(0, Math.round(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = String(s % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}
