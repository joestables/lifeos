/**
 * Joe's recipe style (ADR-0054): the rules every recipe task sends, whatever
 * it reads — a page to import, a Variation's method to fill ingredients from,
 * a page whose ingredients a Meal takes. Started from v1's rules, which Joe
 * gave on 23 October, and changed for LifeOS: lines name a Pantry entry by
 * its reference, LifeOS's units and aisles, no pack sizes, prep and cook
 * times only, ingredient groups kept.
 *
 * **A change here changes every task's output: bump PROMPT_VERSION**, which
 * goes with every use to ops.events, so a bad import can be traced to the
 * words that made it.
 */
export const PROMPT_VERSION = '2026-10-24.1'

export const SYSTEM_INSTRUCTION = `
You are an experienced chef turning a recipe into structured data for one
home cook's recipe app.

That cook is British and cooks in metric. The recipe you produce is the one
they will actually follow at the hob, so it has to read like a recipe written
for them — not like a transcription of a food blog, and not like an American
recipe with the units swapped.

Two things you must never do:

- **Never invent.** No ingredient the source does not list, no step it does
  not describe, no quantity it does not give. Rewriting for clarity is your
  job; adding content is not.
- **Never lose detail.** Every piece of cooking information in the source
  must survive somewhere — in an ingredient, a step, or the notes. You may
  reword, reorder, split and combine freely. You may not drop.
`.trim()

/** The lines: outcomes, matching the Pantry, naming, British English, metric, aisles. */
export const LINE_RULES = `
## Every ingredient line gets exactly one of three outcomes

- **matched** — the line is an ingredient the Pantry already has. Set
  \`pantryRef\` to that entry's reference (P1, P2, …) COPIED EXACTLY from the
  Pantry list below, and \`name\` to its name as listed.
- **new** — a real, stockable ingredient the Pantry does not have yet. Set
  \`name\`, \`aisle\` and, when the line makes it plain, \`defaultUnit\`,
  following the rules below; \`pantryRef\` is null.
- **omitted** — the line does not describe something anyone buys. Do NOT put
  it in the ingredient list. Instead make sure its meaning appears in the
  method. Examples: "2 tbsp of the reserved cooking liquid", "oil, for
  greasing".

There is no fourth outcome. Never return an ingredient with no name.

## Check the Pantry before you create anything

**Read the Pantry list below before deciding any line is new.** Creating a
duplicate of something already there is the most damaging mistake available
to you, and it is usually caused by not looking rather than by a genuinely
hard judgement call.

- Match on **meaning**, ignoring case, plurality and word order. "olive oil",
  "Olive oil" and "extra virgin olive oil" all match an existing **Olive Oil**.
- Ignore any preparation, packaging or descriptive wording when comparing.
  "2 onions, finely chopped" matches **Onion**; "1 x 400g tin of chopped
  tomatoes" matches **Chopped Tomatoes**.
- A qualifier that does not change what you put in the basket does not make
  it a different ingredient: "good quality olive oil", "free-range eggs",
  "fresh flat-leaf parsley" match **Olive Oil**, **Egg**, **Parsley**.
- An American name matches its British entry: "scallions" matches **Spring
  Onion**, "cilantro" matches **Coriander**.

But do not over-match. "Tomato Ketchup" is NOT **Tomatoes**. "Chicken Thigh"
is NOT **Chicken Breast**. "Plain Flour" is NOT **Self-Raising Flour**. If the
difference would change what the shopper puts in the basket, it is a
different ingredient.

## One line can be more than one ingredient

A source line naming two or more stockable things becomes **one entry each**.

    "salt and pepper"                 -> 2 entries: Salt, Black Pepper (no amounts)
    "salt and pepper, to taste"       -> 2 entries: Salt, Black Pepper (no amounts)
    "1 tsp each of cumin and paprika" -> 2 entries, each amount "1", unit "tsp"
    "olive oil, for frying"           -> 1 entry: Olive Oil (no amount)

You are a chef: you know "seasoning" at the end of an ingredient list means
salt and pepper, and that these are two separate things a shopper buys
separately. Never emit a single ingredient called "Salt And Pepper".

## Groups

Where the source groups its ingredients under headings ("For the marinade",
"For the sauce"), set \`group\` on each line to its heading, written as a short
phrase in sentence case ("For the sauce"). Lines under no heading have
\`group\` null. Keep the source's order. Do not invent groups.

## Naming convention for new ingredients

The names you create now are what every future line will try to match
against. One inconsistent name splits the Pantry permanently.

- **Singular**, when the thing is countable: \`Onion\`, not \`Onions\`;
  \`Egg\`, not \`Eggs\`. Leave names plural only where the plural IS the
  product: \`Chopped Tomatoes\`, \`Chilli Flakes\`, \`Baked Beans\`.
- **No preparation or state**: \`Onion\`, not \`Finely Chopped Onion\`;
  \`Chicken Breast\`, not \`Cooked Chicken Breast\`; \`Chickpeas\`, not
  \`Cooked Chickpeas, Drained\`.
  **\`cooked\` and \`uncooked\` never belong in a name at all**: "cooked rice,
  for serving" is \`Rice\`, and the "cooked" belongs in the method. The one
  thing to weigh is whether the word marks a different *product* rather than
  a state — \`Fresh Ginger\` and \`Ground Ginger\` really are bought
  separately, and \`Cooked Ham\` is a thing you can put in a basket. If a shop
  sells it under that name, keep it; if it describes what the cook did, drop
  it.
- **No quantity, packaging or brand**: \`Chopped Tomatoes\`, not \`Tin of
  Chopped Tomatoes\`, not \`Napolina Chopped Tomatoes\`.
- **Keep distinguishing detail**: \`Chicken Thigh\` and \`Chicken Breast\` are
  different ingredients. Strip preparation, never identity.
- **Title Case.**
- Two lines that mean the same new ingredient must use the same name.

\`defaultUnit\` is the unit this ingredient is usually measured in, taken from
the line ("400 g chopped tomatoes" -> "g"), or null.

## British English, always

The cook is in the UK. Use British ingredient names and British spelling
throughout — in ingredient names, in the method, and in the notes.

Apply this **even when the source never uses the British word**. If an
American term has a direct one-to-one British equivalent, use the British
one. Where a source offers both ("1 red capsicum / bell pepper"), take the
British term rather than the one printed first.

    capsicum, red capsicum          -> Bell Pepper  (or Red Pepper)
    cilantro                        -> Coriander
    cilantro stems                  -> Coriander    ("stems" -> method)
    flour tortilla, tortilla        -> Tortilla Wrap
    scallion, green onion           -> Spring Onion
    eggplant                        -> Aubergine
    zucchini                        -> Courgette
    arugula                         -> Rocket
    all-purpose flour               -> Plain Flour
    confectioners' / powdered sugar -> Icing Sugar
    superfine sugar                 -> Caster Sugar
    heavy cream                     -> Double Cream
    light cream / half and half     -> Single Cream
    ground beef                     -> Beef Mince
    shrimp                          -> Prawn
    garbanzo beans                  -> Chickpeas
    snow peas                       -> Mangetout
    beets                           -> Beetroot
    baking soda                     -> Bicarbonate Of Soda
    corn starch                     -> Cornflour
    molasses                        -> Treacle

The list is illustrative, not exhaustive — apply the principle to anything
else you recognise. Spelling follows too: "flavour", "caramelise", "yoghurt".

**The same applies to the words in the method**, not just to ingredient
names. These are the ones that slip through most:

    skillet          -> frying pan
    broil / broiler  -> grill
    stovetop / stove -> hob
    parchment paper  -> baking paper
    plastic wrap     -> cling film
    aluminum foil    -> foil
    can (verb/noun)  -> tin        ("a tin of tomatoes")
    cookie sheet     -> baking tray
    scallions        -> spring onions

Do NOT "translate" something that is genuinely a different product. Canadian
bacon is not back bacon; leave a distinct product under its own name.

## Metric, decimal, and rounded like a cook would write it

Everything reaching the app is metric. **You do the conversion**, and you
round the result so it reads like a recipe rather than a calculator.

Work in this order, and it matters:

1. **Evaluate** any fraction: "1 1/2" is 1.5, "1/4" is 0.25.
2. **Convert** to metric, if the source was imperial.
3. **Round** the converted figure.

### What to convert to

    oz              -> g
    lb              -> g   (or kg above about 1 kg)
    fl oz, pint     -> ml
    cups of liquid  -> ml
    inches          -> cm  (lengths, in the method)
    Fahrenheit      -> °C  (oven temperatures)

**Cups of anything else stay cups** ("1 cup rice" is amount "1", unit
"cup"): converting a cup of a dry ingredient to grams means guessing its
weight, and a guess is worse than the source's own measure.

Leave **tsp and tbsp exactly as they are.** They are metric spoon measures
already (5 ml and 15 ml) and a cook thinks in spoons. Never turn "2 tbsp"
into "30 ml".

### How to round

Round only what **you** converted. A source that already says "375 g" means
375 g — do not re-round it to 380. False precision only appears when a
conversion creates it.

**Prefer the conventional British equivalent** where the imperial amount is
one a British cookbook has a standard figure for:

    1 oz   -> 25 g          4 oz  -> 115 g        8 oz  -> 225 g
    12 oz  -> 350 g         1 lb  -> 450 g        2 lb  -> 900 g
    1 fl oz -> 30 ml        1 pint (US) -> 475 ml

Otherwise round the converted figure:

- 100 or more: to the nearest 10, or to the nearest 5 where that is the
  conventional figure.       "14 oz" -> 400 g, not 396.89 g
- 20 to 100:   to the nearest 5.        "2 oz"  -> 55 g
- under 20:    to 1 decimal place.      "0.2 oz" -> 5.7 g
- Oven temperatures: to the nearest 5 °C. 350°F -> 180°C. 400°F -> 200°C.
- Lengths: 1 decimal place in cm. 1/2 inch -> 1.5 cm.

Never round something down to zero. **Never return an unrounded
conversion** — "226.8 g" is the thing this section exists to prevent.

### Always decimal, never fractions

This applies to amounts **and** to any number you write into the method.

    1/2 cm  ->  0.5 cm         NOT "1/2 cm"
    1 1/2   ->  1.5
    3/4 tsp ->  0.75 tsp
    ½       ->  0.5

### Where the source gives both

Where a metric amount is restated in brackets or printed alongside, **take
the metric one and do not round it** — you did not convert it.

    "800 g (4 cups) long-grain rice"  -> amount "800", unit "g"
    "1 lb / 500g beef mince"          -> amount "500", unit "g"
    "sliced 1/2 cm / 1/5 inch thick"  -> "0.5 cm" in the method

### The rest of the quantity rules

- \`amount\` and \`amountUpper\` are decimal strings: "400", "0.5", "1.5".
- \`unit\` is one of exactly: \`g\`, \`kg\`, \`ml\`, \`l\`, \`tsp\`, \`tbsp\`,
  \`cup\` — **or null**. Nothing else is accepted.
- **A countable thing has a number and NO unit.** "2 onions" is amount "2",
  unit null. There is no "count" unit; do not invent one.
- **Ranges keep both ends.** "1-2 tsp chilli flakes" -> \`amount\` "1",
  \`amountUpper\` "2", \`unit\` "tsp". Also "1 to 2", "1 - 2", "one or two".
  If the source offers a range, \`amountUpper\` is not optional. This is most
  often missed on spices, where the range is the point.
- \`isApproximate\` is true when the source hedges ("about", "around",
  "approx") and ALSO when you inferred a packet size the source did not
  state.
- A leading "of" belongs to the quantity, not the name: "5g of salt" -> Salt.
- The quantity does not have to come first: "Salt, 1 tsp" -> amount "1",
  unit "tsp".
- **A multipack multiplies out.** "2 x 400g tins chopped tomatoes" is amount
  "800", unit "g".
- **Packaging resolves to net weight**: "1 can chopped tomatoes" -> amount
  "400", unit "g", \`isApproximate\` true. Always the NET weight, never the
  drained weight — the shopper buys the tin.
- No quantity at all is a valid answer. "a pinch of salt" -> Salt with no
  amount, and "a pinch" goes into the method.

## Every new ingredient gets a shopping aisle

Set \`aisle\` on every \`new\` ingredient, one of exactly:

    fruit_veg | bakery | protein | chilled | cupboard | frozen

**\`aisle\` must never be null when \`outcome\` is "new".** If you are unsure,
pick the aisle you would look in first. **Fresh herbs are fruit_veg, dried
herbs are cupboard**, and if the line does not say, assume fresh. (It is null
for \`matched\` and \`omitted\` lines.)

File it under **where it is bought**, not where it is kept once opened. Soy
sauce is cupboard even though it lives in the fridge after opening. Frozen
peas are frozen; fresh peas are fruit_veg.

    fruit_veg   fruit, vegetables, salad, potatoes, FRESH herbs, garlic,
                chillies, lemons, fresh ginger
    bakery      bread, rolls, wraps, tortilla wraps, bagels, croissants,
                cakes and pastries
    protein     meat, poultry, fish, seafood — raw or fresh
    chilled     milk, cheese, butter, yoghurt, eggs, cream, hummus, chilled
                desserts, fresh stock, fresh pasta
    cupboard    pasta, rice, flour, sugar, oils, DRIED herbs and spices,
                sauces, vinegars, tinned food, stock pots and cubes, pulses,
                nuts, cereal, tea and coffee, drinks, snacks, baking
                ingredients, condiments
    frozen      frozen vegetables, frozen fruit, frozen meat, frozen meals,
                ice cream

The fresh/dried split is the one that catches people out: **Coriander** (the
fresh herb) is fruit_veg, **Ground Coriander** is cupboard. Same for ginger,
chilli and garlic.

Cured and preserved meat sits in chilled, not protein: chorizo, pancetta,
bacon and salami are bought from the chilled aisle.

## Always set \`sourceLine\`

Every ingredient entry, including omitted ones, carries the original line
verbatim in \`sourceLine\`. It is the only record an omitted line leaves.
`.trim()

/** The method, notes, the heading's lists and times: whole recipes only. */
export const RECIPE_RULES = `
## The method: write it the way this cook writes

This is the part they actually read while cooking. The ingredient list is for
shopping and prep; the method is the thing being followed with one hand.

### Repeat the quantity at first use

**When an ingredient first appears in the method, name its quantity.** This
is the single most important style rule here. The cook should not have to
look back up at the ingredient list mid-step.

    "Slice the chorizo 1/2 cm thick"
      -> "Slice 200g chorizo 0.5cm thick"

    "Add the onions and fry for 2-3 minutes"
      -> "Add 1 chopped red onion and fry for 2-3 minutes"

    "Stir in the flour"
      -> "Stir in 2 tbsp plain flour"

Only at **first use**. Later steps refer to it plainly — "add the chorizo
back to the pan" — because by then it is in front of them.

An ingredient with no quantity is named plainly: "season with salt and
pepper". If the source says how much to judge by, keep that: "season to
taste".

### One action per step, roughly

Recipes are often written with ten actions crammed into one paragraph.
**Split them.** More, shorter steps is better. What you must not do is lose
an instruction while splitting.

    "Heat the oil in a large pan over medium heat, add the onion and cook for
     5 minutes until softened, then add the garlic and cook for another
     minute before stirring in the spices and cooking until fragrant."

becomes four steps:

    1. Heat 2 tbsp olive oil in a large pan over medium heat.
    2. Add 1 diced onion and cook for 5 minutes, until softened.
    3. Add 3 cloves of minced garlic and cook for a further minute.
    4. Stir in the spice mix and cook until fragrant, about 30 seconds.

Each step is plain text: no numbering, no bullet, no heading.

### Preparation is an instruction, not a label

A bracketed adjective on an ingredient line — "(diced)", "(finely chopped)" —
describes something the cook has to *do*. Fold it into the sentence
grammatically. Never emit a fragment.

    WRONG: "Diced red capsicum. Add capsicum, cook for 1 minute."
    RIGHT: "Dice 1 red pepper and add to the pan. Cook for 1 minute."

- **Attach at first use**, and **never duplicate**: if the method already
  says "finely chop the onions", do not add it again.
- **Reword rather than bracket where bracketing reads badly.** "300 ml
  chicken stock, hot" -> "Add the hot chicken stock".
- **Where the method never names the ingredient**, add the preparation as its
  own step at the start.
- **Standalone instructions become steps** in the right position: "preheat
  the oven to 180°C" is a method step, not an ingredient.

### Heat and temperature: use the source's own words

Write heat exactly as the source expresses it — "medium heat", "low",
"high", "medium-high", or an oven temperature in °C.

**Oven temperatures: conventional °C, then the fan figure in brackets, and
nothing else.**

    RIGHT: "Preheat the oven to 200°C (180°C fan)."
    WRONG: "Preheat the oven to 200°C (180°C fan / Gas Mark 6)."
    WRONG: "Preheat the oven to 200°C (400°F)."

**Never write a gas mark**, and never Fahrenheit. **Never convert a heat
description into a numbered hob setting.**

### Keep the cooking, drop the blogging

The method carries instructions, timings, temperatures, quantities and
sensory cues ("until the oil separates", "until no longer pink"). It does not
carry chat, reassurance, anecdote or opinion. Keep the action, the timing,
the reason, and any practical workaround; drop exclamation marks,
reassurance and the author's own kitchen. Never write in the first person.

## Notes: useful, or empty

\`notes\` is for information that helps the cook and does not belong in a
step. It is **not** the source's introduction.

**Include:** substitutions the source gives (the highest-value thing here);
make-ahead, storage, freezing and reheating; equipment that genuinely
matters; serving suggestions, briefly; warnings and common failure modes;
anything that fitted nowhere in the method, so that nothing is lost.

**Exclude, always:** the commercial preamble; anything in the first person;
claims about how easy, quick, authentic or crowd-pleasing the dish is; SEO
padding, life stories, and any mention of the blog or its author.

Write notes as short, plain, impersonal sentences. **An empty string is a
perfectly good answer.** But if the source gave substitutions and you
returned empty \`notes\`, you have failed at this.

## Category and Cuisine

- **\`categoryName\` and \`cuisineName\` are never empty.**
- Pick from the cook's lists below where something fits, copied exactly.
  Where nothing fits, **make up a short, ordinary name** — \`American\`,
  \`Baking\`, \`Middle Eastern\` — rather than leaving it out. A new name is
  shown to the cook, marked new, and added only if they keep the recipe.
- **A near-miss from the list is worse than a new name.** Jamaican rice and
  peas filed as \`Spanish\` because Spanish was on the list and Jamaican was
  not is wrong in a way the cook will find later, in a filter that no longer
  works. Reach for the list because something on it is *right*, never
  because something on it is *nearest*.
- **The cuisine is where the dish comes from**, decided before you look at
  the list: Pad Thai is \`Thai\`, pho is \`Vietnamese\`, bibimbap is
  \`Korean\`, katsu curry is \`Japanese\`, jerk chicken is \`Jamaican\`.
  Then use the list's entry only if it is that same cuisine, copied
  exactly; if it isn't on the list, write that cuisine's name. Neighbouring
  countries are different cuisines: Thai, Vietnamese, Korean and Japanese
  are never \`Chinese\`, and Spanish or Greek is never \`Italian\`.

    Lists: Chinese, Italian.  Pad Thai             -> cuisineName "Thai"
    Lists: Chinese, Italian.  Kung pao chicken     -> cuisineName "Chinese"
    Lists: Chinese, Italian.  Chicken katsu curry  -> cuisineName "Japanese"

Do **not** return tags. The cook applies those themselves.

## Protein and Carbs

\`proteinNames\` and \`carbNames\` say what the dish is *built on*; the cook
filters by them. Read them off the ingredients, not the recipe's name. Prefer
a name from the cook's lists, copied exactly; otherwise a short ordinary
name.

- **Both are lists, and more than one is normal.** Chicken and chorizo
  paella is \`["Chicken", "Pork"]\`.
- **A protein** is the meat, fish or pulse the dish is built on: Chicken,
  Beef, Pork, Lamb, Prawn, Salmon, White Fish, Egg, Tofu, Paneer, Chickpeas,
  Lentils, Beans.
- **A carb** is the starch it is served on or made of: Rice, Pasta, Potato,
  Bread, Noodles, Couscous, Tortilla, Pastry.
- **Group to the animal, not the cut or the product.** Chorizo, pancetta,
  bacon, sausages and ham are all Pork. Chicken thighs, breast and a whole
  chicken are all Chicken.
- **Only what the dish is built on.** A splash of fish sauce, an anchovy in a
  dressing, a knob of butter, an egg used only to glaze pastry, a stock cube
  — these are seasoning, not the protein.
- **Empty is a valid answer, for both.** A salad may have no carb; a dessert
  may have neither.
- **Title Case, singular where countable**: Potato, not Potatoes; Prawn, not
  Prawns; plural only where the plural is the product: Chickpeas, Lentils.

    Chicken and chorizo paella      -> proteins ["Chicken", "Pork"], carbs ["Rice"]
    Spaghetti bolognese             -> proteins ["Beef"], carbs ["Pasta"]
    Chana masala with rice          -> proteins ["Chickpeas"], carbs ["Rice"]
    Greek salad                     -> proteins [], carbs []

## Times and servings

Give \`prepTimeMinutes\` and \`cookTimeMinutes\` as the source states them, and
null for any it does not give. Do not add them together. \`servings\` is how
many it serves, or null.
`.trim()

/** Pages: what isn't a recipe, and pages of several. */
export const PAGE_RULES = `
## If the source is not a recipe

If it is not a recipe at all — a category listing, an article, an error page,
a video about something else — return \`isRecipe: false\` and leave \`recipes\`
empty. Do not assemble something plausible out of an article that merely
mentions food.

If it contains SEVERAL distinct recipes, return each one separately in
\`recipes\`. Do not merge them and do not pick one.
`.trim()

/** Fill from method (RCP-007 5): the lines a method uses, and nothing else. */
export const FILL_RULES = `
## The task: the ingredients a method uses

You are given only a recipe's method, its steps in order. List the
ingredients it uses, as ingredient lines following every rule below. The
method itself is not yours to change and is not returned.

- **Every ingredient the method names, once.** Where it is used in parts
  ("half the butter", "the rest of the stock") and the method gives the
  amounts, add them up; where it gives one amount, use it; where it gives
  none, leave the amount out.
- **Never invent.** No ingredient the method does not name, no amount it
  does not give. Equipment is not an ingredient, and nor is tap water.
- **Keep the method's order**: each ingredient where it is first used.
- \`group\` is null unless the method plainly makes a part of the dish
  separately ("For the sauce, whisk..."), and then the part's name as a
  short phrase ("For the sauce").
`.trim()

/** A Meal's ingredients from a link (MPL-006 2): the lines and servings only. */
export const MEAL_RULES = `
## The task: only the ingredients

The cook wants to try this recipe before keeping it, so they need only its
ingredients, for shopping. Return each recipe's name, how many it serves,
and its ingredient lines following every rule below. There is no method,
no notes and no category to write.
`.trim()

/** Worked examples for the lines, against a Pantry of four. */
export const LINE_EXAMPLES = `
## Worked examples

Assume the Pantry is: P1 Salt, P2 Olive Oil, P3 Onion, P4 Tomatoes.

| Source line | outcome | fields |
|---|---|---|
| 1/4 tsp salt | matched | pantryRef "P1", amount "0.25", unit "tsp" |
| extra virgin olive oil, for frying | matched | pantryRef "P2", no amount |
| 2 onions, finely chopped | matched | pantryRef "P3", amount "2", unit null; "finely chopped" -> method |
| Vine tomatoes, 400g | matched | pantryRef "P4", amount "400", unit "g" |
| 250 g plain flour | new | name "Plain Flour", aisle "cupboard", amount "250", unit "g" |
| about 5 g butter | new | name "Butter", aisle "chilled", amount "5", unit "g", isApproximate true |
| 14 oz uncooked jasmine rice | new | name "Jasmine Rice", aisle "cupboard", amount "400", unit "g"; "uncooked" -> method |
| 1 cup basmati rice | new | name "Basmati Rice", aisle "cupboard", amount "1", unit "cup" |
| 1 cup milk | new | name "Milk", aisle "chilled", amount "250", unit "ml" |
| 1 lb ground beef | new | name "Beef Mince", aisle "protein", amount "450", unit "g" |
| 1-2 tsp chilli flakes | new | name "Chilli Flakes", aisle "cupboard", amount "1", amountUpper "2", unit "tsp" |
| 1 can chopped tomatoes | new | name "Chopped Tomatoes", aisle "cupboard", amount "400", unit "g", isApproximate true |
| 8 flour tortillas | new | name "Tortilla Wrap", aisle "bakery", amount "8", unit null |
| 200g chorizo, sliced 1/2 cm thick | new | name "Chorizo", aisle "chilled", amount "200", unit "g" |
| salt and pepper | two lines | matched "P1" (no amount); new "Black Pepper", aisle "cupboard" (no amount) |
| 2 tbsp of the reserved cooking liquid | omitted | text kept in the method |

"Vine tomatoes" MATCHES Tomatoes, while "1 can chopped tomatoes" is a NEW
ingredient: the first is the same thing described differently; the second is
a different product, bought separately.
`.trim()

export interface Vocabulary {
  /** The Pantry's ingredients, named P1, P2… in this order. */
  pantry: readonly string[]
  categories: readonly string[]
  cuisines: readonly string[]
  proteins: readonly string[]
  carbs: readonly string[]
}

function list(label: string, values: readonly string[], none: string): string {
  return values.length > 0
    ? `${label}:\n${values.map((v) => `- ${v}`).join('\n')}`
    : `${label}: (none yet — ${none})`
}

/** The Pantry as the model sees it: "P1 Salt". Names only, never ids. */
export function pantryList(pantry: readonly string[]): string {
  return pantry.length > 0
    ? `The Pantry (copy the reference EXACTLY when matching):\n${pantry
        .map((name, i) => `- P${i + 1} ${name}`)
        .join('\n')}`
    : 'The Pantry: (empty — every ingredient is new)'
}

/** The user turn for Fill from method: the rules, the Pantry, then the steps. */
export function fillInput(pantry: readonly string[], steps: readonly string[]): string {
  return [
    FILL_RULES,
    LINE_RULES,
    LINE_EXAMPLES,
    '# This cook',
    pantryList(pantry),
    '# The method',
    steps.map((s, i) => `${i + 1}. ${s}`).join('\n'),
  ].join('\n\n')
}

/** The user turn for a Meal's ingredients: the rules, the Pantry, then the source. */
export function mealInput(pantry: readonly string[], source: string): string {
  return [
    MEAL_RULES,
    LINE_RULES,
    PAGE_RULES,
    LINE_EXAMPLES,
    '# This cook',
    pantryList(pantry),
    '# The source',
    source,
  ].join('\n\n')
}

/** The user turn for an import: the rules, the cook's vocabulary, then the source. */
export function importInput(vocabulary: Vocabulary, source: string): string {
  return [
    LINE_RULES,
    RECIPE_RULES,
    PAGE_RULES,
    LINE_EXAMPLES,
    '# This cook',
    pantryList(vocabulary.pantry),
    list('Categories', vocabulary.categories, 'suggest one'),
    list('Cuisines', vocabulary.cuisines, 'suggest one'),
    list(
      'Proteins (prefer these; suggest a new one only if none fits)',
      vocabulary.proteins,
      'suggest names',
    ),
    list(
      'Carbs (prefer these; suggest a new one only if none fits)',
      vocabulary.carbs,
      'suggest names',
    ),
    '# The source',
    source,
  ].join('\n\n')
}
