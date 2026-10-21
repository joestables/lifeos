# ADR-0054: The AI service and recipe import

**Status:** Provisionally agreed · 2026-10-18

## Context

Stage 4 brings the core's one AI service
([principles](../../00-foundation/principles.md), 11), first used to import
a recipe from a web page or a video's link and to fill ingredient lines from
a method ([RCP-007, RCP-014](../../10-requirements/modules/recipes.md#requirements)).
Nothing may depend on it ([ADR-0004](0004-ai-across-the-whole-app.md)).
**Joe will not pay for AI** (18 October): v1 used Gemini's free tier, and it
served well.

## Decision

- **Gemini's free tier, never billed.** The Gemini API key comes from a
  Google AI Studio project with **no billing linked**, since linking billing
  makes all of its use chargeable. LifeOS has no paid fallback: when the
  free quota is used up, AI is unavailable until it resets.
- **One Edge Function, `ai`,** runs named tasks, each with its prompt and
  output schema in code: `recipe.import` and `recipe.fill_lines` now. The
  browser never calls a model; the key is an Edge Function secret.
- **The model is a free Flash model, named in one place.** Google changes
  which models are free and their limits often, so the name and its
  fallback (a Flash-Lite model, when the first is out of quota) are
  configuration, not code. Each call asks for JSON matching the task's
  schema, and the reply is checked against it before use.
- **Import:** a web page is fetched by the Edge Function, giving its
  schema.org Recipe data if it has some, otherwise its readable text. A
  **YouTube** link is given to Gemini as video, which it watches. **TikTok
  and Instagram** give their oEmbed title and what their pages say; too
  little, and the import says so and makes nothing. The model writes the
  Draft in **Joe's recipe style**, a prompt kept in code (ported from v1's
  code when built, Joe to say where), metric, imperial converted.
- **Only what's needed is sent.** On the free tier, Google may use what is
  sent to improve its products, and people may read it. So `ai` sends a
  public page or video and the Pantry's entries (shared by everyone, so
  nothing personal), and never anyone's Items or personal details.
- **The AI matches lines to the Pantry** (Joe, 18 October): each task is
  given the Pantry's entries, names and ids, and judges for each line
  whether an existing entry is meant ("spring onions" for *Scallions*) or a
  new one should be suggested. Code then checks every id it returns
  exists; a suggested new entry starts in Cupboard. Nothing is added to the
  Pantry until I keep the Draft, and on checking it I can change any
  match.
- **Nothing is saved by the AI.** The Draft goes back to the device to
  check; keeping it is one database function that writes the Recipe, its
  Variation, lines, steps and new Pantry entries together
  ([ADR-0009](0009-cross-table-writes-are-database-functions.md)).
- **Sharing the free quota:** a daily allowance per person, so one person
  can't use it all, and a switch to turn AI off. Out of allowance, out of
  quota or unreachable, the features say so before starting. Use and
  failures go to `ops.events`, without content.
- **Link previews aren't AI:** a separate Edge Function, `link-preview`,
  reads oEmbed (TikTok's and, since June 2026, Instagram's without a token;
  Instagram gives no thumbnail) or a page's Open Graph tags, for Ideas
  saved from a link ([ADR-0055](0055-sharing-into-lifeos.md)).

## Consequences

- The free tier's limits are Google's to change; the allowance per person
  is set from what AI Studio shows for the project when import is built.
- **Joe:** creates the key in AI Studio, with no billing, for the Edge
  Function's secrets ([integration setup](../../40-operations/integration-setup.md)).
- Browser walks use a stand-in for `ai` and `link-preview`; the prompts get
  a small set of saved pages and videos to check against before import
  ships.
- A new AI feature adds a task to `ai`, not a new function.
