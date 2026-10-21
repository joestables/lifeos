/**
 * Rewrites the generated parts of docs/20-architecture/data-model.md from the
 * ontology, or with --check fails when they are stale (ADR-0036).
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { dataModel } from '../src/docs.ts'

const path = join(import.meta.dirname, '../../../docs/20-architecture/data-model.md')
const doc = readFileSync(path, 'utf8')
const next = dataModel(doc)

if (!process.argv.includes('--check')) {
  writeFileSync(path, next)
} else if (next !== doc) {
  console.error('data-model.md is out of date with packages/ontology. Run npm run data-model.')
  process.exit(1)
} else {
  console.log('data-model.md matches packages/ontology.')
}
