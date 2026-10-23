/** Reloads once for new code; a second failure within a minute is a crash. */
export function reloadForNewCode(): boolean {
  try {
    const last = Number(sessionStorage.getItem('reloaded-for-code') ?? 0)
    if (Date.now() - last < 60_000) return false
    sessionStorage.setItem('reloaded-for-code', String(Date.now()))
  } catch {
    return false
  }
  window.location.reload()
  return true
}
