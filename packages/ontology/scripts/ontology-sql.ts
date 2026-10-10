/**
 * Prints the lookup-table migration, or with --check fails when the newest
 * *_ontology.sql migration differs from it (ADR-0036: CI fails if a
 * generated file is out of date).
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { lookupMigrationSql } from '../src/sql.ts'

const sql = lookupMigrationSql()

if (!process.argv.includes('--check')) {
  process.stdout.write(sql)
} else {
  const dir = join(import.meta.dirname, '../../../supabase/migrations')
  const latest = readdirSync(dir)
    .filter((f) => f.endsWith('_ontology.sql'))
    .sort()
    .at(-1)
  if (!latest) {
    console.error('No *_ontology.sql migration yet. Generate one with npm run ontology:sql.')
    process.exit(1)
  }
  if (readFileSync(join(dir, latest), 'utf8') !== sql) {
    console.error(
      `${latest} is out of date with packages/ontology. Add a new *_ontology.sql migration.`,
    )
    process.exit(1)
  }
  console.log(`${latest} matches packages/ontology.`)
}
