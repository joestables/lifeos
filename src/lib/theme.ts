/**
 * Light, dark, or the system's (Settings' Appearance; Joe, 15 November):
 * kept on this device, and applied before the first paint by index.html,
 * which reads the same key.
 */
export type Theme = 'system' | 'light' | 'dark'

const KEY = 'lifeos.theme'
export function getTheme(): Theme {
  try {
    const kept = localStorage.getItem(KEY)
    return kept === 'light' || kept === 'dark' ? kept : 'system'
  } catch {
    return 'system'
  }
}

/** Whether a theme is dark now: the system's follows the device. */
export const isDark = (theme: Theme) =>
  theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)

/**
 * Draws the theme: the `dark` class, and the browser's own colour round the
 * page, which index.html gives once for light and once for dark (as hex,
 * the theme's --background): a chosen theme puts its one in both.
 */
export function applyTheme(theme: Theme = getTheme()) {
  const dark = isDark(theme)
  document.documentElement.classList.toggle('dark', dark)
  const metas = [...document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')]
  // Each one's own colour, kept before the first change.
  for (const meta of metas) meta.dataset.own ??= meta.content
  const chosen = metas.find((m) => m.media.includes('dark') === dark)?.dataset.own
  for (const meta of metas)
    meta.content = (theme === 'system' ? meta.dataset.own : chosen) ?? meta.content
}

export function setTheme(theme: Theme) {
  try {
    if (theme === 'system') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, theme)
  } catch {
    // Without storage, the choice lasts until the page is closed.
  }
  applyTheme(theme)
}
