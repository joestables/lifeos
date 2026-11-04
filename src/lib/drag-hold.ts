/**
 * Whether a drag holds the page's touches (patterns.md#dragging): while one
 * does, LifeOS's own pull to refresh leaves them alone (Joe, 3 November: a
 * template's exercise dragged down from the top of the page pulled it).
 */
let holds = 0

export function holdDrag(on: boolean) {
  holds = Math.max(0, holds + (on ? 1 : -1))
}

export const dragHeld = () => holds > 0
