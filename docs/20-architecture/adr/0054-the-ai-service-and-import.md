# ADR-0054: The AI service and recipe import

**Status:** Provisionally agreed · 2026-10-18
**Amended:** 2026-10-23 by Joe's answers for step 9 (import into a Draft Variation, Fill from method replacing the lines, a Meal's ingredients from a link, the method sent, v1's style rules adapted, cups kept).

## Context

Stage 4 brings the core's one AI service
([principles](../../00-foundation/principles.md), 11), first used to import
a recipe from a web page or a video's link — as a new Recipe, into a Draft
Variation, or as a Meal's ingredients — and to fill ingredient lines from
a method ([RCP-007, RCP-014](../../10-requirements/modules/recipes.md#requirements),
[MPL-006](../../10-requirements/modules/meals.md#mpl-006--a-meals-own-ingredients)).
Nothing may depend on it ([ADR-0004](0004-ai-across-the-whole-app.md)).
**Joe will not pay for AI** (18 October): v1 used Gemini's free tier, and it
served well.

## Decision

- **Gemini's free tier, never billed.** The Gemini API key comes from a
  Google AI Studio project with **no billing linked**, since linking billing
  makes all of its use chargeable. LifeOS has no paid fallback: when the
  free quota is used up, AI is unavailable until it resets.
- **One Edge Function, `ai`,** runs named tasks, each with its prompt and
  output schema in code: `recipe.import` (a whole recipe),
  `recipe.fill_lines` and `meal.ingredients` (only a link's ingredients
  and servings, for a Meal) now. The
  browser never calls a model; the key is an Edge Function secret.
- **The model is a free Flash-Lite model, named in one place** (Joe, 23
  October: quick, and enough for reading recipes). Google changes which
  models are free and their limits often, so the name and its fallback (a
  Flash model, when the first is busy or out of quota) are configuration,
  not code. Each call asks for JSON matching the task's
  schema, and the reply is checked against it before use.
- **Import:** a web page is fetched by the Edge Function, giving its
  schema.org Recipe data if it has some, otherwise its readable text. A
  **YouTube** link is given to Gemini as video, which it watches. **TikTok
  and Instagram** give their oEmbed title and what their pages say; too
  little, and the import says so and makes nothing. The model writes the
  Draft in **Joe's recipe style**: v1's rules, which Joe gave on 23
  October, kept in one file of rules that every recipe task sends, so an
  imported Recipe, a Variation's import, a Meal's lines and filled lines
  follow the same rules. Kept from v1: never invent, never lose detail;
  British English; metric, converted by the model and rounded as a cook
  would; decimals, not fractions; a line is an amount, a unit and an
  ingredient, preparation going into the method; the method one action a
  step, quantities at first use, oven °C with the fan figure; notes only
  what helps the cook; category and cuisine always given, a new one
  suggested rather than a near miss (the cuisine is asked for twice: first
  where the dish comes from, then as my list spells it, and `ai` keeps the
  first, so a curry is never filed under Chinese because Chinese was on the
  list; Joe, 26 October); protein and carbs grouped to the
  animal or starch. Changed for LifeOS: the units are LifeOS's (g, kg, ml,
  l, tsp, tbsp, cup); a line names a Pantry entry's id rather than copying
  its name; no standard pack size; prep and cook times, no total; "about"
  becomes "~"; a page of several recipes returns each, and I choose one.
  The prompt's version goes with each use to `ops.events`.
- **Only what's needed is sent.** On the free tier, Google may use what is
  sent to improve its products, and people may read it. So `ai` sends a
  public page or video, the Pantry's ingredients (shared by everyone, so
  nothing personal) and the names on my own lists of categories,
  cuisines, protein and carbs; and, for Fill from method only, that
  Variation's method, which Joe agreed to on 23 October. Never anything
  else of anyone's Items or personal details.
- **The AI matches lines to the Pantry** (Joe, 18 October): each task is
  given the Pantry's entries, names and ids, and judges for each line
  whether an existing entry is meant ("spring onions" for *Scallions*) or a
  new one should be suggested, with its aisle. Code then checks every id
  it returns exists, and a suggested entry with no aisle starts in
  Cupboard. On an import as a new Recipe, nothing is added to the Pantry
  until I keep the Draft, and on checking it I can change any match.
  Lines brought into a Variation or a Meal that match no entry are kept as
  typed, added to the Pantry as any typed line is.
- **Nothing is saved by the AI.** The Draft goes back to the device to
  check; keeping it is one database function that writes the Recipe, its
  Variation, lines, steps and new Pantry entries together
  ([ADR-0009](0009-cross-table-writes-are-database-functions.md)). What
  comes back for a Variation or a Meal is written by the device as
  ordinary edits, with Undo.
- **Sharing the free quota:** a daily allowance per person, so one person
  can't use it all, and a switch to turn AI off. Out of allowance, out of
  quota or unreachable, the features say so before starting. Use and
  failures go to `ops.events`, without content.
- **Link previews aren't AI:** a separate Edge Function, `link-preview`,
  reads oEmbed (TikTok's and, since June 2026, Instagram's without a token;
  Instagram gives no thumbnail) or a page's Open Graph tags, for Ideas
  saved from a link ([ADR-0055](0055-sharing-into-lifeos.md)). Built 23
  October for a typed Meal's picture from its link (MPL-006 6): it answers
  the picture as a data URL, and counts nothing against the allowance. From
  25 October it answers the link's name too, for a shared Idea (RCP-003 1):
  a video's title, a TikTok's caption's first line without its hashtags, or
  a page's Open Graph title.

## Consequences

- The free tier's limits are Google's to change; the allowance per person
  is set from what AI Studio shows for the project when import is built.
- **Joe:** creates the key in AI Studio, with no billing, for the Edge
  Function's secrets ([integration setup](../../40-operations/integration-setup.md)).
- Browser walks use a stand-in for `ai` and `link-preview`; the prompts get
  a small set of saved pages and videos to check against before import
  ships.
- A new AI feature adds a task to `ai`, not a new function.
