/** Puts the caret at the end of step `n` (1 on), as the step after it goes. */
export function focusStep(n: number) {
  requestAnimationFrame(() => {
    const box = document.querySelector<HTMLTextAreaElement>(`textarea[aria-label="Step ${n}"]`)
    if (!box) return
    box.focus()
    box.setSelectionRange(box.value.length, box.value.length)
  })
}
