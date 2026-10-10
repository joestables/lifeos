import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { toast } from '@/components/ui/sonner'
import { authReady, signInWithGoogle } from '@/data'

/** Google is the only way in; there is no email sign-up (ACC-001, patterns.md#sign-in-page). */
export const Route = createFileRoute('/sign-in')({
  beforeLoad: async () => {
    if ((await authReady()).status === 'signed-in') throw redirect({ to: '/inbox' })
  },
  component: SignIn,
})

function SignIn() {
  const [busy, setBusy] = useState(false)
  const start = async () => {
    setBusy(true)
    try {
      await signInWithGoogle()
    } catch {
      setBusy(false)
      toast.error("Couldn't reach Google. Check your connection and try again")
    }
  }
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background px-3.5">
      <div className="flex items-center gap-2.5 text-h2">
        <span className="grid size-6 place-items-center rounded-sm bg-ink text-xs font-extrabold text-ink-foreground">
          L
        </span>
        LifeOS
      </div>
      <Card className="w-full max-w-90 items-stretch">
        <h1 className="text-h2">Sign in</h1>
        <Button variant="outline" onClick={() => void start()} disabled={busy}>
          <img src="/google-g.svg" alt="" className="size-4" />
          Continue with Google
        </Button>
      </Card>
    </div>
  )
}
