import type { AiRefusal } from '@lifeos/food'

/** Why the AI can't be used, or why an import made nothing, in a few words. */
export const AI_REFUSALS: Record<AiRefusal, string> = {
  off: 'The AI is turned off',
  allowance: 'Today’s AI allowance is used up',
  quota: 'The AI’s free quota is used up for today',
  unreachable: 'The AI needs a connection',
  not_recipe: 'That link isn’t a recipe',
  too_little: 'That post says too little to make a recipe',
  bad_link: 'That isn’t a link to a web page',
  failed: 'The import didn’t work. Try again',
}
