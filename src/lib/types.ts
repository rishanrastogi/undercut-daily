export type SourceType = 'reported' | 'calculated'

export interface Question {
  id: string
  prompt: string
  answer: number
  unit: string
  /** Season the stat belongs to. */
  season: number
  /** ISO date (YYYY-MM-DD) the stat is final as of. */
  sourceDate: string
  sourceName: string
  sourceUrl: string
  corroborationUrl?: string
  /** 'reported' = read directly from the source; 'calculated' = derived from source data. */
  sourceType: SourceType
  definition: string
  calculationNotes: string
  /** Optional estimation hint shown after reveal. */
  napkin?: string
}
