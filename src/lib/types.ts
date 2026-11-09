export type SourceType = 'reported' | 'calculated'
export type Difficulty = 'easy' | 'medium' | 'hard'
export const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']

export interface Question {
  id: string
  prompt: string
  answer: number
  unit: string
  /** Each day serves one easy, one medium and one hard question, in that order. */
  difficulty: Difficulty
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
  /** A short, sourced fact about that Grand Prix or season, shown after the reveal. Written in our own words. */
  fact: string
  factSourceUrl: string
}
