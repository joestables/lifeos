import { useEffect } from 'react'
import { toast } from '@/components/ui/sonner'
import { changeTimer, useCookTimers, type CookTimer } from './cooking-store'

/** Three short tones (ADR-0056); where the browser won't play yet, the toast still shows. */
function chime() {
  try {
    const audio = new AudioContext()
    for (let i = 0; i < 3; i++) {
      const tone = audio.createOscillator()
      const gain = audio.createGain()
      tone.frequency.value = 880
      gain.gain.setValueAtTime(0.2, audio.currentTime + i * 0.4)
      gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + i * 0.4 + 0.3)
      tone.connect(gain).connect(audio.destination)
      tone.start(audio.currentTime + i * 0.4)
      tone.stop(audio.currentTime + i * 0.4 + 0.3)
    }
  } catch {
    // No sound here.
  }
}

async function notify(t: CookTimer) {
  chime()
  navigator.vibrate?.([300, 150, 300])
  toast(`${t.label} is done`, { description: t.title })
  if (!document.hidden || !('Notification' in window) || Notification.permission !== 'granted')
    return
  try {
    const sw = await navigator.serviceWorker?.ready
    await sw?.showNotification(`${t.label} is done`, { body: t.title, tag: t.key })
  } catch {
    // The toast is there on return.
  }
}

/**
 * Alerts when a timer ends, whichever page is open (RCP-011 3): mounted
 * once in the app.
 */
export function CookTimerAlerts() {
  const { timers: list, now } = useCookTimers()
  useEffect(() => {
    for (const t of list) {
      if (t.done || t.endsAt === null || t.endsAt > now) continue
      changeTimer(t.key, (x) => ({ ...x, done: true, endsAt: null, left: 0 }))
      void notify(t)
    }
  }, [list, now])
  return null
}
