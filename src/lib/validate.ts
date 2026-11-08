import { DIFFICULTIES, type Question } from './types'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/

function isValidDate(s: unknown): boolean {
  if (typeof s !== 'string' || !ISO_DATE.test(s)) return false
  const d = new Date(`${s}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s
}

function isUrl(s: unknown): boolean {
  if (typeof s !== 'string') return false
  try {
    const u = new URL(s)
    return u.protocol === 'https:'
  } catch {
    return false
  }
}

const nonEmpty = (s: unknown) => typeof s === 'string' && s.trim().length > 0

/** Returns a list of human-readable problems; empty means valid. */
export function validateQuestions(data: unknown, now: Date = new Date()): string[] {
  const errors: string[] = []
  if (!Array.isArray(data)) return ['Question file must be a JSON array']
  if (data.length < 3) errors.push('Need at least 3 questions')
  for (const d of DIFFICULTIES) {
    if (!data.some((q) => (q as Partial<Question>)?.difficulty === d)) errors.push(`Need at least one ${d} question`)
  }
  const seen = new Set<string>()
  data.forEach((raw, i) => {
    const q = raw as Partial<Question>
    const at = `#${i} (${q?.id ?? 'no id'})`
    if (!nonEmpty(q.id) || !ID.test(q.id!)) errors.push(`${at}: id must be kebab-case`)
    else if (seen.has(q.id!)) errors.push(`${at}: duplicate id`)
    else seen.add(q.id!)
    for (const f of ['prompt', 'unit', 'sourceName', 'definition', 'calculationNotes'] as const) {
      if (!nonEmpty(q[f])) errors.push(`${at}: missing ${f}`)
    }
    if (typeof q.answer !== 'number' || !Number.isFinite(q.answer) || q.answer < 0) {
      errors.push(`${at}: answer must be a finite, non-negative number`)
    }
    if (!Number.isInteger(q.season) || q.season! < 1950) errors.push(`${at}: season must be a year ≥ 1950`)
    if (!isValidDate(q.sourceDate)) errors.push(`${at}: sourceDate must be a real YYYY-MM-DD date`)
    else if (new Date(`${q.sourceDate}T00:00:00Z`) > now) errors.push(`${at}: sourceDate is in the future`)
    if (!isUrl(q.sourceUrl)) errors.push(`${at}: sourceUrl must be an https URL`)
    if (q.corroborationUrl !== undefined && !isUrl(q.corroborationUrl)) {
      errors.push(`${at}: corroborationUrl must be an https URL`)
    }
    if (!DIFFICULTIES.includes(q.difficulty!)) errors.push(`${at}: difficulty must be "easy", "medium" or "hard"`)
    if (q.sourceType !== 'reported' && q.sourceType !== 'calculated') {
      errors.push(`${at}: sourceType must be "reported" or "calculated"`)
    }
  })
  return errors
}
