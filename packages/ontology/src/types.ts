import type { Colour, Mark, ModuleKey, SpaceKind, Status, TimeField, Trait } from './traits.ts'

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
  colour: Colour
  /** Whether the Type uses Labels (ADR-0014): Thoughts, Notes and Tasks. */
  labels: boolean
  /** Its per-person mark, if it has one. */
  mark?: Mark
  /** Whether it holds sub-tasks: lines you tick inside it. */
  subtasks: boolean
  /** The time field its default Reminder follows (ADR-0023), if it has one. */
  defaultReminder?: TimeField
  /** The roadmap stage that builds it: the app offers a Type only from then. */
  stage: number
}

/** The core's Types (data-model.md#types). Later Types arrive with their stage. */
export const TYPES = [
  {
    key: 'thought',
    module: 'core',
    label: 'Thought',
    traits: ['completable'],
    statuses: ['active', 'done'],
    defaultSpace: 'personal',
    timeFields: [],
    colour: 'yellow',
    labels: true,
    subtasks: false,
    stage: 2,
  },
  {
    key: 'note',
    module: 'core',
    label: 'Note',
    traits: ['capturable'],
    statuses: ['active'],
    defaultSpace: 'personal',
    timeFields: [],
    colour: 'yellow',
    labels: true,
    mark: 'pinned',
    subtasks: false,
    stage: 2,
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
    colour: 'blue',
    labels: true,
    mark: 'starred',
    subtasks: true,
    defaultReminder: 'do_on',
    stage: 2,
  },
  {
    key: 'event',
    module: 'core',
    label: 'Event',
    traits: ['schedulable', 'shareable', 'capturable'],
    statuses: ['active', 'cancelled'],
    defaultSpace: 'personal',
    timeFields: ['starts_at', 'ends_at', 'all_day'],
    colour: 'blue',
    labels: false,
    subtasks: false,
    stage: 3,
  },
] as const satisfies readonly TypeDefinition[]

export type TypeKey = (typeof TYPES)[number]['key']

export function typeByKey(key: string): TypeDefinition | undefined {
  return TYPES.find((t) => t.key === key)
}

export function hasTrait(type: TypeDefinition, trait: Trait): boolean {
  return type.traits.includes(trait)
}
