-- Generated from packages/ontology (npm run ontology:sql). Do not edit by hand.

insert into core.item_types
  (key, module, label, schedulable, completable, shareable, capturable,
   statuses, default_space, time_fields, converts_to, colour, uses_labels,
   mark, has_subtasks, default_reminder)
values
  ('thought', 'core', 'Thought', false, false, false, false, array['active'], 'personal', '{}'::text[], array['event', 'note', 'task'], 'yellow', false, null, false, null),
  ('note', 'core', 'Note', false, false, false, true, array['active'], 'personal', '{}'::text[], array['event', 'task'], 'yellow', true, 'pinned', false, null),
  ('task', 'core', 'Task', true, true, true, true, array['idea', 'active', 'done', 'cancelled'], 'personal', array['do_on', 'do_at', 'due_on'], array['event'], 'blue', true, 'starred', true, 'do_on'),
  ('event', 'core', 'Event', true, false, true, true, array['active', 'cancelled'], 'personal', array['starts_at', 'ends_at', 'all_day'], array['task'], 'blue', false, null, false, null)
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
  converts_to = excluded.converts_to,
  colour = excluded.colour,
  uses_labels = excluded.uses_labels,
  mark = excluded.mark,
  has_subtasks = excluded.has_subtasks,
  default_reminder = excluded.default_reminder;

insert into core.link_types
  (key, label, inverse_label, from_types, to_types, is_symmetric)
values
  ('for', 'for', 'to do for', array['task'], array['event'], false),
  ('became', 'became', 'came from', null, null, false),
  ('relates_to', 'relates to', 'relates to', null, null, true)
on conflict (key) do update set
  label = excluded.label,
  inverse_label = excluded.inverse_label,
  from_types = excluded.from_types,
  to_types = excluded.to_types,
  is_symmetric = excluded.is_symmetric;
