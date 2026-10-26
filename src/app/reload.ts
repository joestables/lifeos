/**
 * Reloads once for new code, at `href` when given: the page being opened
 * when its code was found gone, not the one being left. A second failure
 * within a minute is a crash.
 */
export function reloadForNewCode(href?: string): boolean {
  try {
    const last = Number(sessionStorage.getItem('reloaded-for-code') ?? 0)
    if (Date.now() - last < 60_000) return false
    sessionStorage.setItem('reloaded-for-code', String(Date.now()))
  } catch {
    return false
  }
  if (href && href !== window.location.pathname + window.location.search + window.location.hash)
    window.location.assign(href)
  else window.location.reload()
  return true
}
