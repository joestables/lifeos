import { convertsTo } from './conversions.ts'
import { LINK_TYPES } from './links.ts'
import { hasTrait, TYPES } from './types.ts'

const text = (s: string) => `'${s.replaceAll("'", "''")}'`
const textArray = (items: readonly string[]) =>
  items.length ? `array[${items.map(text).join(', ')}]` : `'{}'::text[]`
const ends = (end: readonly string[] | 'any') => (end === 'any' ? 'null' : textArray(end))

/**
 * The lookup-table migration: copies the Types and link types into
 * core.item_types and core.link_types, so the database can enforce them
 * (ADR-0008). Upserts only; retiring a Type follows ADR-0036.
 */
export function lookupMigrationSql(): string {
  const types = TYPES.map((t) =>
    [
      text(t.key),
      text(t.module),
      text(t.label),
      hasTrait(t, 'schedulable'),
      hasTrait(t, 'completable'),
      hasTrait(t, 'shareable'),
      hasTrait(t, 'capturable'),
      textArray(t.statuses),
      text(t.defaultSpace),
      textArray(t.timeFields),
      textArray(convertsTo(t)),
    ].join(', '),
  )
  const links = LINK_TYPES.map((l) =>
    [text(l.key), text(l.label), text(l.inverseLabel), ends(l.from), ends(l.to), l.symmetric].join(
      ', ',
    ),
  )
  return `-- Generated from packages/ontology (npm run ontology:sql). Do not edit by hand.

insert into core.item_types
  (key, module, label, schedulable, completable, shareable, capturable,
   statuses, default_space, time_fields, converts_to)
values
${types.map((r) => `  (${r})`).join(',\n')}
on conflict (key) do update set
  module = excluded.module,
  label = excluded.label,
  schedulable = excluded.schedulable,
  completable = excluded.completable,
  shareable = excluded.shareable,
  capturable = excluded.capturable,
  statuses = excluded.statuses,
  default_space = excluded.default_space,
  time_fields = excluded.time_fields,
  converts_to = excluded.converts_to;

insert into core.link_types
  (key, label, inverse_label, from_types, to_types, symmetric)
values
${links.map((r) => `  (${r})`).join(',\n')}
on conflict (key) do update set
  label = excluded.label,
  inverse_label = excluded.inverse_label,
  from_types = excluded.from_types,
  to_types = excluded.to_types,
  symmetric = excluded.symmetric;
`
}
