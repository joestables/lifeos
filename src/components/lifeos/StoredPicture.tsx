import { useState, type ComponentProps } from 'react'

/**
 * A picture from Storage, in whichever component shows one: asked for so
 * that the service worker may keep it for offline (ADR-0052), and plainly
 * if that is refused; loaded as it nears the screen, and decoded off the
 * page's own thread, so a library of them scrolls freely. Never dragged
 * on its own: pressed inside a card that drags, the card goes (Joe, 22
 * November: an outfit's pictures dragged themselves, not the outfit).
 */
export function StoredPicture({ src, onError, ...props }: ComponentProps<'img'>) {
  const [plain, setPlain] = useState<string>()
  return (
    <img
      draggable={false}
      {...props}
      src={src}
      crossOrigin={plain === src ? undefined : 'anonymous'}
      loading="lazy"
      decoding="async"
      onError={(e) => {
        if (plain === src) onError?.(e)
        else setPlain(src)
      }}
    />
  )
}
