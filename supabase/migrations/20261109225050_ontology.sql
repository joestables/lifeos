-- Generated from packages/ontology (npm run ontology:sql). Do not edit by hand.

insert into core.item_types
  (key, module, label, schedulable, completable, shareable, capturable,
   statuses, default_space, time_fields, converts_to, colour, uses_labels,
   mark, has_subtasks, default_alert, has_place)
values
  ('thought', 'core', 'Thought', false, true, false, false, array['active', 'done'], 'personal', '{}'::text[], array['event', 'note', 'recipe', 'shopping_list', 'task'], 'yellow', true, null, false, null, false),
  ('note', 'core', 'Note', false, false, false, true, array['active'], 'personal', '{}'::text[], array['event', 'recipe', 'shopping_list', 'task'], 'yellow', true, 'pinned', false, null, false),
  ('task', 'core', 'Task', true, true, true, true, array['idea', 'active', 'done', 'cancelled'], 'personal', array['do_on', 'do_at', 'due_on'], array['event'], 'blue', true, 'starred', true, 'do_on', false),
  ('event', 'core', 'Event', true, false, true, true, array['active', 'cancelled'], 'personal', array['starts_at', 'ends_at', 'all_day'], array['task'], 'blue', true, null, false, 'starts_at', true),
  ('recipe', 'food', 'Recipe', false, false, true, true, array['idea', 'active', 'done', 'cancelled'], 'personal', '{}'::text[], '{}'::text[], 'green', false, 'favourited', false, null, false),
  ('variation', 'food', 'Variation', false, false, true, false, array['idea', 'active', 'done', 'cancelled'], 'personal', '{}'::text[], '{}'::text[], 'green', false, null, false, null, false),
  ('meal', 'food', 'Meal', true, true, true, false, array['active', 'done', 'cancelled'], 'household', array['do_on', 'slot'], '{}'::text[], 'green', false, null, false, null, false),
  ('shopping_list', 'shopping', 'Shopping list', true, true, true, true, array['active', 'done', 'cancelled'], 'household', array['do_on'], '{}'::text[], 'yellow', false, null, false, null, false),
  ('exercise', 'fitness', 'Exercise', false, false, false, false, array['active', 'cancelled'], 'personal', '{}'::text[], '{}'::text[], 'coral', false, null, false, null, false),
  ('workout_template', 'fitness', 'Workout template', false, false, false, false, array['active'], 'personal', '{}'::text[], '{}'::text[], 'coral', false, null, false, null, false),
  ('workout', 'fitness', 'Workout', true, true, false, false, array['active', 'done'], 'personal', array['do_on'], '{}'::text[], 'coral', false, null, false, null, false)
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
  default_alert = excluded.default_alert,
  has_place = excluded.has_place;

insert into core.link_types
  (key, label, inverse_label, from_types, to_types, is_symmetric)
values
  ('for', 'for', 'to do for', array['task', 'shopping_list'], array['event'], false),
  ('uses', 'uses', 'used in', array['meal'], array['variation'], false),
  ('variation_of', 'variation of', 'variations', array['variation'], array['recipe'], false),
  ('follows', 'follows', 'followed by', array['workout'], array['workout_template'], false),
  ('became', 'became', 'came from', null, null, false),
  ('relates_to', 'relates to', 'relates to', null, null, true)
on conflict (key) do update set
  label = excluded.label,
  inverse_label = excluded.inverse_label,
  from_types = excluded.from_types,
  to_types = excluded.to_types,
  is_symmetric = excluded.is_symmetric;
