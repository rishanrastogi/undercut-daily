import { useMemo, useState } from 'react'
import type { Question } from './lib/types'
import { dateForPuzzle, questionsFor } from './lib/puzzle'
import { averageFactor, finishFor, formatFactor, offFactor } from './lib/scoring'
import type { Progress } from './lib/storage'
import { Link } from './Link'
import { Tyre } from './Tyre'
import { FinishIcon } from './Icons'

type Status = 'complete' | 'started' | 'unplayed'
type Filter = 'all' | 'completed' | 'toplay'
type View = 'list' | 'calendar'

interface Row {
  n: number
  iso: string
  questions: Question[]
  guesses: Record<string, number>
  status: Status
  avg: number | null
}

const shortDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
const monthName = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
const fmtDay = (iso: string) => shortDate.format(new Date(`${iso}T00:00:00Z`))

function buildRows(today: number, progress: Progress, bank: Question[]): Row[] {
  return Array.from({ length: today }, (_, i) => {
    const n = today - i
    const rec = progress.puzzles[String(n)]
    const questions = questionsFor(n, bank, progress)
    const guesses = rec?.guesses ?? {}
    const answered = questions.filter((q) => q.id in guesses)
    const status: Status = answered.length === questions.length ? 'complete' : answered.length ? 'started' : 'unplayed'
    const avg = status === 'complete' ? averageFactor(questions.map((q) => offFactor(guesses[q.id], q.answer))) : null
    return { n, iso: dateForPuzzle(n), questions, guesses, status, avg }
  })
}

const puzzlePath = (n: number, today: number) => (n === today ? '/' : `/p/${n}`)

export function Archive({ today, progress, bank }: { today: number; progress: Progress; bank: Question[] }) {
  const [filter, setFilter] = useState<Filter>('all')
  const [view, setView] = useState<View>('list')
  const rows = useMemo(() => (today >= 1 ? buildRows(today, progress, bank) : []), [today, progress, bank])

  if (today < 1) {
    return (
      <div className="state">
        <h2>No puzzles yet</h2>
        <p>The first puzzle unlocks on {dateForPuzzle(1)} (UTC).</p>
      </div>
    )
  }

  const done = rows.filter((r) => r.status === 'complete')
  const avgs = done.map((r) => r.avg!)
  const shown = rows.filter((r) => (filter === 'all' ? true : filter === 'completed' ? r.status === 'complete' : r.status !== 'complete'))

  return (
    <section className="arch" aria-labelledby="arch-title">
      <h1 id="arch-title" className="arch-title">Archive</h1>
      <p className="arch-sub">Every puzzle since day one. Your locked-in guesses stay as they are, and you can finish any you missed.</p>

      <div className="arch-stats">
        <div>
          <span className="lbl">Puzzles played</span>
          <strong>{done.length} / {today}</strong>
        </div>
        <div>
          <span className="lbl">Average multiple</span>
          <strong>{avgs.length ? formatFactor(averageFactor(avgs)) : '—'}</strong>
        </div>
        <div>
          <span className="lbl">Best day</span>
          <strong>{avgs.length ? formatFactor(Math.min(...avgs)) : '—'}</strong>
        </div>
      </div>

      <div className="arch-controls">
        <div className="chips" role="group" aria-label="Filter puzzles">
          {(
            [
              ['all', 'All'],
              ['completed', 'Completed'],
              ['toplay', 'To play'],
            ] as const
          ).map(([key, label]) => (
            <button key={key} className={`chip ${filter === key ? 'on' : ''}`} aria-pressed={filter === key} onClick={() => setFilter(key)}>
              {label}
            </button>
          ))}
        </div>
        <div className="viewtoggle" role="group" aria-label="View">
          <button className={view === 'list' ? 'on' : ''} aria-pressed={view === 'list'} aria-label="List view" onClick={() => setView('list')}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M9 6h11M9 12h11M9 18h11" />
              <circle cx="4.5" cy="6" r="1" fill="currentColor" />
              <circle cx="4.5" cy="12" r="1" fill="currentColor" />
              <circle cx="4.5" cy="18" r="1" fill="currentColor" />
            </svg>
          </button>
          <button className={view === 'calendar' ? 'on' : ''} aria-pressed={view === 'calendar'} aria-label="Calendar view" onClick={() => setView('calendar')}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
              <path d="M3.5 10h17M8 3v4M16 3v4" />
              <rect x="7" y="13" width="3" height="3" rx="0.5" fill="currentColor" stroke="none" />
            </svg>
          </button>
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="arch-empty">
          {filter === 'completed' ? "You haven't finished a puzzle yet. Today's is a good place to start." : "You're all caught up. Nothing left to play."}
        </p>
      ) : view === 'list' ? (
        <ListView rows={shown} today={today} />
      ) : (
        <CalendarView rows={rows} shown={new Set(shown.map((r) => r.n))} today={today} />
      )}
    </section>
  )
}

function ListView({ rows, today }: { rows: Row[]; today: number }) {
  return (
    <div className="arch-table" role="table" aria-label="Puzzles">
      <div className="arch-head" role="row">
        <span role="columnheader">No.</span>
        <span role="columnheader">Date</span>
        <span role="columnheader">
          <span className="sr-only">Questions</span>
        </span>
        <span role="columnheader">Score</span>
        <span role="columnheader" className="arch-status-h">Status</span>
      </div>
      <div className="arch-rows">
        {rows.map((r) => (
          <div key={r.n} className="arch-row" role="row">
            <span role="cell" className="arch-no">{r.n}</span>
            <span role="cell" className="arch-date">
              <strong>{fmtDay(r.iso)}</strong>
              {r.n === today && <small>today</small>}
            </span>
            <span role="cell" className="arch-icons">
              {r.questions.map((q) =>
                q.id in r.guesses ? (
                  <FinishIcon key={q.id} finish={finishFor(offFactor(r.guesses[q.id], q.answer))} size={22} />
                ) : (
                  <span key={q.id} className="dim">
                    <Tyre difficulty={q.difficulty} size={22} />
                  </span>
                ),
              )}
            </span>
            <span role="cell" className="arch-score">{r.avg !== null ? formatFactor(r.avg) : '—'}</span>
            <span role="cell" className="arch-status">
              <Link
                to={puzzlePath(r.n, today)}
                className={`status-pill ${r.status}`}
                aria-label={`Puzzle ${r.n}: ${r.status === 'complete' ? 'complete, view results' : r.status === 'started' ? 'in progress, continue' : 'not played, play'}`}
              >
                {r.status === 'complete' ? 'Complete ✓' : r.status === 'started' ? 'Continue' : 'Play'}
              </Link>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function CalendarView({ rows, shown, today }: { rows: Row[]; shown: Set<number>; today: number }) {
  const byIso = new Map(rows.map((r) => [r.iso, r]))
  const first = new Date(`${rows[rows.length - 1].iso}T00:00:00Z`)
  const last = new Date(`${rows[0].iso}T00:00:00Z`)
  const months: Date[] = []
  for (let m = new Date(Date.UTC(last.getUTCFullYear(), last.getUTCMonth(), 1)); m >= new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), 1)); m = new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth() - 1, 1))) {
    months.push(m)
  }
  return (
    <div className="cal-wrap">
      {months.map((m) => {
        const y = m.getUTCFullYear()
        const mo = m.getUTCMonth()
        const days = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate()
        const lead = (m.getUTCDay() + 6) % 7 // Monday-first
        return (
          <div key={m.toISOString()} className="cal">
            <h2 className="cal-month">{monthName.format(m)}</h2>
            <div className="cal-grid" role="grid">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                <span key={d} className="cal-dow" aria-hidden="true">{d}</span>
              ))}
              {Array.from({ length: lead }, (_, i) => <span key={`pad${i}`} />)}
              {Array.from({ length: days }, (_, i) => {
                const iso = new Date(Date.UTC(y, mo, i + 1)).toISOString().slice(0, 10)
                const r = byIso.get(iso)
                if (!r || !shown.has(r.n)) {
                  return <span key={iso} className="cal-day off">{i + 1}</span>
                }
                return (
                  <Link key={iso} to={puzzlePath(r.n, today)} className={`cal-day ${r.status}`} aria-label={`Puzzle ${r.n}, ${fmtDay(iso)}: ${r.avg !== null ? formatFactor(r.avg) : r.status === 'started' ? 'in progress' : 'not played'}`}>
                    <span className="cal-num">{i + 1}</span>
                    <span className="cal-score">{r.avg !== null ? formatFactor(r.avg) : r.status === 'started' ? '…' : '•'}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
