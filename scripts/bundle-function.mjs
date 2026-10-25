// Bundles an Edge Function into one file for Claude to deploy through the
// Supabase MCP (runbook: link-preview): only the code it uses, so the `ai`
// function's prompts and schemas stay out of `link-preview`.
// Usage: node scripts/bundle-function.mjs link-preview out.js
import { build } from 'rolldown'

const [name, out] = process.argv.slice(2)
if (!name || !out) throw new Error('Usage: node scripts/bundle-function.mjs <function> <out.js>')
await build({
  input: `supabase/functions/${name}/index.ts`,
  platform: 'neutral',
  // Nothing in the shared files runs on import, so what isn't used is left out.
  treeshake: { moduleSideEffects: false },
  output: { file: out, format: 'esm' },
  logLevel: 'warn',
})
