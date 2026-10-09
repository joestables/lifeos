import type { ModuleKey, SpaceKind, Status, TimeField, Trait } from './traits.ts'

export interface TypeDefinition {
  /** Stored in core.items.type. Never renamed without an ADR (ADR-0036). */
  key: string
  module: ModuleKey
  /** The name people see. */
  label: string
  traits: readonly Trait[]
  /** The statuses this Type uses, in order, with any Type-specific labels. */
  statuses: readonly Status[]
  statusLabels?: Partial<Record<Status, string>>
  defaultSpace: SpaceKind
  /** The time fields this Type may set; the database refuses the others. */
  timeFields: readonly TimeField[]
}

/** The core's Types (data-model.md#types). Later Types arrive with their stage. */
export const TYPES = [
  {
    key: 'thought',
    module: 'core',
    label: 'Thought',
    traits: [],
    statuses: ['active'],
    defaultSpace: 'personal',
    timeFields: [],
  },
  {
    key: 'note',
    module: 'core',
    label: 'Note',
    traits: ['capturable'],
    statuses: ['idea', 'active'],
    defaultSpace: 'personal',
    timeFields: [],
  },
  {
    key: 'task',
    module: 'core',
    label: 'Task',
    traits: ['schedulable', 'completable', 'shareable', 'capturable'],
    statuses: ['idea', 'active', 'done', 'cancelled'],
    statusLabels: { idea: 'Someday' },
    defaultSpace: 'personal',
    timeFields: ['do_on', 'do_at', 'due_on'],
  },
  {
    key: 'event',
    module: 'core',
    label: 'Event',
    traits: ['schedulable', 'shareable', 'capturable'],
    statuses: ['active', 'cancelled'],
    defaultSpace: 'personal',
    timeFields: ['starts_at', 'ends_at', 'all_day'],
  },
] as const satisfies readonly TypeDefinition[]

export type TypeKey = (typeof TYPES)[number]['key']

export function typeByKey(key: string): TypeDefinition | undefined {
  return TYPES.find((t) => t.key === key)
}

export function hasTrait(type: TypeDefinition, trait: Trait): boolean {
  return type.traits.includes(trait)
}
