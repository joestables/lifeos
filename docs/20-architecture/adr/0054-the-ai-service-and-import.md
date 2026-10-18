# ADR-0054: The AI service and recipe import

**Status:** Proposed · 2026-10-18

## Context

Stage 4 brings the core's one AI service
([principles](../../00-foundation/principles.md), 11), first used to import
a recipe from a web page or a video's link and to fill ingredient lines from
a method ([RCP-007, RCP-014](../../10-requirements/modules/recipes.md#requirements)).
Nothing may depend on it ([ADR-0004](0004-ai-across-the-whole-app.md)).

## Decision

- **One Edge Function, `ai`,** runs named tasks, each with its prompt and
  output schema in code: `recipe.import` and `recipe.fill_lines` now. The
  browser never calls a model; the Anthropic key is an Edge Function secret.
- **The model** is Claude Opus 5.5 (`claude-opus-5-5`) through the
  Anthropic TypeScript SDK, with structured output for each task's schema,
  effort set per task (low to fill lines, medium to import), and the API's
  own fallback if a request is declined. At today's prices an import costs
  about 10p.
- **It reads only what it is sent**: the page or video text, and the
  Pantry's names for matching. It reads no other Items. No food preferences
  in Stage 4: they come with the first feature that needs them.
- **Import:** the Edge Function fetches the link itself. A web page gives
  its schema.org Recipe data if it has some, otherwise its readable text. A
  video (TikTok, YouTube, Instagram) gives its oEmbed title and what its
  page says — description, captions where offered; too little, and the
  import says so and makes nothing. The model writes the Draft in **Joe's
  recipe style**, a prompt kept in code (to be ported from v1's code when
  built, Joe to say where), metric, imperial converted.
- **Matching to the Pantry happens after the model**, in code: each line's
  name is matched by normalised name; the rest are marked new, in Cupboard.
- **Nothing is saved by the AI.** The Draft goes back to the device to
  check; keeping it is one database function that writes the Recipe, its
  Variation, lines, steps and new Pantry entries together
  ([ADR-0009](0009-cross-table-writes-are-database-functions.md)).
- **Limits:** a monthly allowance per person and a monthly ceiling for all
  of LifeOS, counted from the API's reported usage, and a switch to turn AI
  off. Past either, or unreachable, the features say so before starting.
  Use and failures go to `ops.events`, without content.
- **Link previews aren't AI:** a separate Edge Function, `link-preview`,
  reads oEmbed (TikTok's and, since June 2026, Instagram's without a token;
  Instagram gives no thumbnail) or a page's Open Graph tags, for Ideas
  saved from a link ([ADR-0055](0055-sharing-into-lifeos.md)).

## Consequences

- Browser walks use a stand-in for `ai` and `link-preview`; the prompts get
  a small set of saved pages to check against before import ships.
- A new AI feature adds a task to `ai`, not a new function.
