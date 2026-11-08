import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { validateQuestions } from '../src/lib/validate'

const file = resolve(import.meta.dirname, '../public/questions.json')
const data = JSON.parse(readFileSync(file, 'utf8'))
const errors = validateQuestions(data)

if (errors.length) {
  console.error(`✗ ${errors.length} problem(s) in public/questions.json:`)
  for (const e of errors) console.error(`  - ${e}`)
  process.exit(1)
}
const calc = data.filter((q: { sourceType: string }) => q.sourceType === 'calculated').length
console.log(`✓ ${data.length} questions valid (${data.length - calc} reported, ${calc} calculated)`)
