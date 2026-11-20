-- Lists (ADR-0069), after lists_removing: the lists on Shopping → Other
-- become Lists on Notes, keeping their ids, names, Spaces, subheadings,
-- lines and ticks. A line that was a Pantry household item keeps its name,
-- as typed. A done one stays done; none is dated (a List has no date).
-- Shopping lists are food shops from here; shopping.shopping_list's kind
-- and shopping.update_list go once no app still sends them (expand, then
-- contract; migrations.md).

-- A Shopping list isn't converted into a List by anyone (ADR-0018), so the
-- check that refuses it is set aside for this one move.
alter table core.items disable trigger items_check;
update core.items i set
  type = 'list',
  do_on = null,
  status = case when i.status = 'active' then 'active' else 'done' end
from shopping.shopping_list l
where l.item_id = i.id and l.kind = 'list';
alter table core.items enable trigger items_check;

insert into core.list_lines (id, list_id, position, heading, text, checked, created_at, updated_at)
select
  l.id, l.list_id, l.position, l.heading,
  case when l.heading is null then coalesce(nullif(btrim(l.text), ''), p.name) end,
  l.heading is null and l.checked,
  l.created_at, l.updated_at
from shopping.lines l
join shopping.shopping_list s on s.item_id = l.list_id and s.kind = 'list'
left join food.pantry p on p.id = l.pantry_id
where l.heading is not null or coalesce(nullif(btrim(l.text), ''), p.name) is not null;

-- A List takes no Alerts, and its shopping rows have moved.
delete from core.alerts a using shopping.shopping_list s
where a.item_id = s.item_id and s.kind = 'list';
delete from shopping.lines l using shopping.shopping_list s
where l.list_id = s.item_id and s.kind = 'list';
delete from shopping.shopping_list where kind = 'list';
