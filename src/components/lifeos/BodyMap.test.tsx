import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import manifest from '@/assets/body-map/manifest.json'
import { BodyMap } from './BodyMap'

/** The twenty built-in groups, as the schema seeds them (fitness.muscle_groups). */
const BUILT_IN = [
  'Chest',
  'Front delts',
  'Lateral delts',
  'Triceps',
  'Lats',
  'Traps',
  'Rear delts',
  'Biceps',
  'Brachialis',
  'Forearms',
  'Abs',
  'Obliques',
  'Erectors',
  'Glutes',
  'Quads',
  'Hamstrings',
  'Adductors',
  'Abductors',
  'Calves',
  'Tibialis',
]

/** Every image the pipeline wrote. */
const FILES = new Set(Object.keys(import.meta.glob('/src/assets/body-map/*/*.webp')))
const has = (view: string, name: string) => FILES.has(`/src/assets/body-map/${view}/${name}.webp`)

afterEach(cleanup)

describe('the body map (GYM-016, ADR-0060)', () => {
  it('has every layer the pipeline writes, and every built-in group a home and an outline there', () => {
    const groups = manifest.groups as Record<
      string,
      { home: 'front' | 'back'; paths: Record<string, string> }
    >
    expect(Object.keys(groups)).toHaveLength(20)
    for (const view of ['front', 'back'] as const) {
      for (const layer of ['shade', 'gloss', 'silhouette', 'lines'])
        expect(has(view, layer), `${view}/${layer}`).toBe(true)
      for (const part of manifest.views[view].masks)
        expect(has(view, part), `${view}/${part}`).toBe(true)
    }
    for (const [part, g] of Object.entries(groups)) {
      expect(g.paths[g.home], part).toMatch(/^M[\d.,LMZ-]+Z$/)
      expect(manifest.views[g.home].masks, part).toContain(part)
    }
  })

  it('names one button for each built-in group, with its readiness', () => {
    render(<BodyMap readiness={{ Chest: 12, Quads: 80 }} />)
    const names = screen.getAllByRole('button').map((b) => b.getAttribute('aria-label'))
    expect(names).toHaveLength(20)
    expect(names).toContain('Chest 12 %')
    expect(names).toContain('Quads 80 %')
    // A group not given is fully recovered.
    expect(names).toContain('Calves 100 %')
    expect(new Set(names.map((n) => n!.replace(/ \d+ %$/, '')))).toEqual(new Set(BUILT_IN))
  })

  it('chooses a group by its button, by the keyboard and by its shape on the other view', () => {
    const onSelect = vi.fn()
    render(<BodyMap readiness={{}} onSelect={onSelect} />)
    fireEvent.click(screen.getByRole('button', { name: 'Chest 100 %' }))
    fireEvent.keyDown(screen.getByRole('button', { name: 'Glutes 100 %' }), { key: 'Enter' })
    expect(onSelect.mock.calls).toEqual([['Chest'], ['Glutes']])
    // Quads show from behind too: a shape to tap, not a second button.
    const behind = screen.getByRole('group', { name: 'Back' })
    const quads = [...behind.querySelectorAll('g[aria-hidden="true"] title')].find((t) =>
      t.textContent?.startsWith('Quads'),
    )
    fireEvent.click(quads!.parentElement!)
    expect(onSelect).toHaveBeenLastCalledWith('Quads')
  })
})
