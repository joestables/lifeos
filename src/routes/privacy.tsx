import { createFileRoute, Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'

/** The privacy policy Google asks for: the app's one page of paragraphs (patterns.md#privacy-page). */
export const Route = createFileRoute('/privacy')({
  component: Privacy,
})

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-h2">{title}</h2>
      {children}
    </section>
  )
}

function Privacy() {
  return (
    <div className="min-h-svh bg-background px-3.5 py-10">
      <article className="mx-auto flex max-w-180 flex-col gap-6 text-base">
        <header className="flex flex-col gap-1">
          <h1 className="text-h1">Privacy</h1>
          <p className="text-sm text-muted-foreground">Updated 9 October 2026</p>
        </header>
        <p>
          LifeOS is a personal organiser run privately by Joe Stables. It is not a business, and it
          shows no ads.
        </p>
        <Section title="What LifeOS keeps">
          <p>
            When you sign in with Google, LifeOS receives your name, email address and profile
            picture, and uses them only to sign you in and show who you are. Everything you put into
            LifeOS is kept so that you can use it.
          </p>
        </Section>
        <Section title="Who can see it">
          <p>
            Only you. If you choose to join a Household with someone, the things you share with it
            are visible to its members. Nobody else can see your data.
          </p>
        </Section>
        <Section title="Where it is kept">
          <p>In a Supabase database in London. The app itself is served by Vercel.</p>
        </Section>
        <Section title="What LifeOS doesn't do">
          <p>It doesn't sell or share your data, show ads, or use tracking or analytics.</p>
          <p>
            LifeOS's use of information received from Google APIs adheres to the Google API Services
            User Data Policy, including the Limited Use requirements.
          </p>
        </Section>
        <Section title="Deleting your data">
          <p>
            Ask, and your account and everything in it will be deleted. Contact the support email
            shown on Google's sign-in screen for LifeOS.
          </p>
        </Section>
        <Link to="/sign-in" className="text-sm text-muted-foreground hover:text-foreground">
          Back to sign in
        </Link>
      </article>
    </div>
  )
}
