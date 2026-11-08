import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type MouseEvent, type ReactNode, type RefObject } from 'react'
import type { Question } from './lib/types'
import { dateForPuzzle, puzzleNumberFor, questionsForPuzzle } from './lib/puzzle'
import {
  averageFactor,
  direction,
  FINISH,
  finishFor,
  formatFactor,
  offFactor,
  tier,
  TIER_EMOJI,
} from './lib/scoring'
import { loadProgress, recordGuess, saveProgress, streaks, type Progress } from './lib/storage'
import { copyText, shareResult, shareText } from './lib/share'
import { href, navigate, useRoute } from './router'
import { useTheme } from './theme'

type Load = { state: 'loading' } | { state: 'error'; message: string } | { state: 'ready'; bank: Question[] }

const nf = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })
const fmt = (n: number) => nf.format(n)
const MAX_GUESS = 1e12

function useQuestions(): [Load, () => void] {
  const [load, setLoad] = useState<Load>({ state: 'loading' })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let alive = true
    setLoad({ state: 'loading' })
    fetch(`${import.meta.env.BASE_URL}questions.json`, { cache: 'no-cache' })
      .then((r) => {
        if (!r.ok) throw new Error(`Couldn't load today's questions (HTTP ${r.status}).`)
        return r.json() as Promise<Question[]>
      })
      .then((bank) => alive && setLoad({ state: 'ready', bank }))
      .catch((e: Error) =>
        alive && setLoad({ state: 'error', message: e.message || 'Network error while loading questions.' }),
      )
    return () => {
      alive = false
    }
  }, [attempt])
  return [load, () => setAttempt((a) => a + 1)]
}

function Link({ to, children, className }: { to: string; children: ReactNode; className?: string }) {
  const onClick = (e: MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
    e.preventDefault()
    navigate(to)
  }
  return (
    <a href={href(to)} onClick={onClick} className={className}>
      {children}
    </a>
  )
}

export default function App() {
  const route = useRoute()
  const [load, retry] = useQuestions()
  const [progress, setProgress] = useState<Progress>(loadProgress)
  const [storageOk, setStorageOk] = useState(true)
  const [helpOpen, setHelpOpen] = useState(() => !loadProgress().seenHelp)
  const today = puzzleNumberFor()

  const update = useCallback((next: Progress) => {
    setProgress(next)
    setStorageOk(saveProgress(next))
  }, [])

  const closeHelp = () => {
    setHelpOpen(false)
    if (!progress.seenHelp) update({ ...progress, seenHelp: true })
  }

  let body: ReactNode
  if (load.state === 'loading') {
    body = (
      <div className="state" role="status" aria-live="polite">
        <div className="lights" aria-hidden="true">
          <span /><span /><span /><span /><span />
        </div>
        <p>Warming up the tyres…</p>
      </div>
    )
  } else if (load.state === 'error') {
    body = (
      <div className="state" role="alert">
        <h2>Red flag</h2>
        <p>{load.message}</p>
        <button className="btn" onClick={retry}>Try again</button>
      </div>
    )
  } else if (load.bank.length < 3) {
    body = (
      <div className="state">
        <h2>Empty grid</h2>
        <p>No questions are loaded yet. Please check back soon.</p>
      </div>
    )
  } else if (route.name === 'archive') {
    body = <Archive today={today} progress={progress} />
  } else if (route.name === 'notfound') {
    body = (
      <div className="state">
        <h2>Wrong turn</h2>
        <p>That page doesn't exist.</p>
        <Link to="/" className="btn">Go to today's puzzle</Link>
      </div>
    )
  } else {
    const n = route.name === 'puzzle' ? route.n : today
    if (today < 1) {
      body = (
        <div className="state">
          <h2>Lights out soon</h2>
          <p>The first puzzle unlocks on {dateForPuzzle(1)} (UTC).</p>
        </div>
      )
    } else if (n < 1 || n > today) {
      body = (
        <div className="state">
          <h2>Not on the calendar</h2>
          <p>{n > today ? "That puzzle hasn't unlocked yet." : 'Puzzles start at #1.'}</p>
          <Link to="/" className="btn">Go to today's puzzle</Link>
        </div>
      )
    } else {
      body = (
        <Game
          key={n}
          n={n}
          isToday={n === today}
          today={today}
          questions={questionsFor(n, load.bank, progress)}
          progress={progress}
          update={update}
        />
      )
    }
  }

  return (
    <div className="app">
      <header className="top">
        <Link to="/" className="brand">
          <Logo />
          <span>Undercut</span>
        </Link>
        <nav aria-label="Main">
          <ThemeToggle />
          <Link to="/archive" className="iconbtn">Archive</Link>
          <button className="iconbtn" onClick={() => setHelpOpen(true)} aria-haspopup="dialog" aria-label="How to play">
            <span className="long">How to play</span>
            <span className="short">Help</span>
          </button>
        </nav>
      </header>
      {!storageOk && (
        <p className="banner" role="status">
          Your browser is blocking storage, so your progress won't be saved after you leave this page.
        </p>
      )}
      <main id="main">{body}</main>
      <footer className="foot">
        <p>
          A fan-made estimation game built on public historical race data. Not affiliated with, endorsed by or
          connected to any racing series, team or driver.
        </p>
      </footer>
      {helpOpen && <Help onClose={closeHelp} />}
    </div>
  )
}

/** Prefer the questions a player originally saw, so adding questions later never rewrites past results. */
function questionsFor(n: number, bank: Question[], progress: Progress): Question[] {
  const ids = progress.puzzles[String(n)]?.questionIds
  if (ids?.length) {
    const byId = new Map(bank.map((q) => [q.id, q]))
    const kept = ids.map((id) => byId.get(id))
    if (kept.every(Boolean)) return kept as Question[]
  }
  return questionsForPuzzle(n, bank)
}

function ThemeToggle() {
  const [theme, toggle] = useTheme()
  const next = theme === 'dark' ? 'light' : 'dark'
  return (
    <button className="iconbtn theme-toggle" onClick={toggle} aria-label={`Switch to ${next} mode`} title={`Switch to ${next} mode`}>
      {theme === 'dark' ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4.5" />
          <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M20.5 14.6A8.5 8.5 0 0 1 9.4 3.5a8.5 8.5 0 1 0 11.1 11.1Z" />
        </svg>
      )}
    </button>
  )
}

function Logo() {
  return (
    <svg className="logo" viewBox="0 0 32 32" aria-hidden="true">
      <rect x="1" y="1" width="30" height="30" rx="8" fill="var(--accent)" />
      <path d="M7 22 L15 10 L19 16 L25 8" stroke="var(--on-accent)" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="25" cy="8" r="2.4" fill="var(--on-accent)" />
    </svg>
  )
}

interface GameProps {
  n: number
  isToday: boolean
  today: number
  questions: Question[]
  progress: Progress
  update: (p: Progress) => void
}

function Game({ n, isToday, today, questions, progress, update }: GameProps) {
  const rec = progress.puzzles[String(n)]
  const ids = questions.map((q) => q.id)
  const guesses = rec?.guesses ?? {}
  const answeredCount = ids.filter((id) => id in guesses).length
  const firstOpen = ids.findIndex((id) => !(id in guesses))
  const [viewing, setViewing] = useState(firstOpen === -1 ? ids.length : firstOpen)
  const complete = answeredCount === ids.length

  const submit = (q: Question, value: number) => {
    update(recordGuess(progress, n, ids, q.id, value))
  }

  return (
    <section className="game" aria-labelledby="puzzle-title">
      <div className="puzzle-meta">
        <h1 id="puzzle-title">
          Puzzle #{n}
          {!isToday && <span className="tag">Archive</span>}
        </h1>
        <p>{dateForPuzzle(n)} · UTC</p>
      </div>
      <ol className="steps" aria-label="Questions">
        {questions.map((q, i) => {
          const g = guesses[q.id]
          const done = g !== undefined
          const label = done ? TIER_EMOJI[tier(offFactor(g, q.answer))] : String(i + 1)
          return (
            <li key={q.id}>
              <button
                className={`step ${viewing === i ? 'on' : ''}`}
                aria-current={viewing === i ? 'step' : undefined}
                aria-label={`Question ${i + 1}${done ? ', answered' : ''}`}
                disabled={!done && i !== firstOpen}
                onClick={() => setViewing(i)}
              >
                {label}
              </button>
            </li>
          )
        })}
        <li>
          <button
            className={`step finish ${viewing === ids.length ? 'on' : ''}`}
            disabled={!complete}
            aria-label="Results"
            onClick={() => setViewing(ids.length)}
          >
            🏁
          </button>
        </li>
      </ol>

      {viewing < ids.length ? (
        <QuestionCard
          key={questions[viewing].id}
          index={viewing}
          total={ids.length}
          q={questions[viewing]}
          guess={guesses[questions[viewing].id]}
          onSubmit={(v) => submit(questions[viewing], v)}
          onNext={() => setViewing(viewing + 1)}
          isLast={viewing === ids.length - 1}
        />
      ) : (
        <Results n={n} isToday={isToday} today={today} questions={questions} guesses={guesses} progress={progress} />
      )}
    </section>
  )
}

function parseGuess(raw: string): number | string {
  const cleaned = raw.replace(/[,\s_]/g, '')
  if (cleaned === '') return 'Enter a number first.'
  if (!/^\d*\.?\d+$|^\d+\.$/.test(cleaned)) return 'Use digits only, like 1250 or 3.5.'
  const v = Number(cleaned)
  if (!Number.isFinite(v)) return "That number isn't valid."
  if (v > MAX_GUESS) return 'That guess is too large.'
  return v
}

interface CardProps {
  index: number
  total: number
  q: Question
  guess: number | undefined
  onSubmit: (v: number) => void
  onNext: () => void
  isLast: boolean
}

function QuestionCard({ index, total, q, guess, onSubmit, onNext, isLast }: CardProps) {
  const [raw, setRaw] = useState('')
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const nextRef = useRef<HTMLButtonElement>(null)
  const answered = guess !== undefined

  useEffect(() => {
    if (!answered) inputRef.current?.focus({ preventScroll: true })
  }, [answered])

  const handle = (e: FormEvent) => {
    e.preventDefault()
    const v = parseGuess(raw)
    if (typeof v === 'string') {
      setError(v)
      return
    }
    setError(null)
    onSubmit(v)
    requestAnimationFrame(() => nextRef.current?.focus())
  }

  const preview = typeof parseGuess(raw) === 'number' ? fmt(parseGuess(raw) as number) : null

  return (
    <article className={`card ${answered ? 'answered' : ''}`} aria-labelledby={`q-${q.id}`}>
      <p className="eyebrow">
        Question {index + 1} of {total} · {q.season} season
      </p>
      <h2 id={`q-${q.id}`} className="prompt">{q.prompt}</h2>

      {!answered ? (
        <form onSubmit={handle} noValidate>
          <label htmlFor="guess" className="sr-only">Your guess in {q.unit}</label>
          <div className={`field ${error ? 'bad' : ''}`}>
            <input
              id="guess"
              ref={inputRef}
              inputMode="decimal"
              autoComplete="off"
              placeholder="Your estimate"
              value={raw}
              onChange={(e) => {
                setRaw(e.target.value)
                setError(null)
              }}
              aria-invalid={!!error}
              aria-describedby="guess-help"
            />
            <span className="unit">{q.unit}</span>
          </div>
          <p id="guess-help" className={error ? 'err' : 'hint'} aria-live="polite">
            {error ?? (preview ? `= ${preview} ${q.unit}` : 'You get one guess. It locks in when you submit.')}
          </p>
          <button className="btn primary" type="submit">Lock it in</button>
        </form>
      ) : (
        <Reveal q={q} guess={guess} nextRef={nextRef} onNext={onNext} nextLabel={isLast ? 'See results' : `Question ${index + 2}`} />
      )}
    </article>
  )
}

interface RevealProps {
  q: Question
  guess: number
  nextRef: RefObject<HTMLButtonElement | null>
  onNext: () => void
  nextLabel: string
}

function Reveal({ q, guess, nextRef, onNext, nextLabel }: RevealProps) {
  const f = offFactor(guess, q.answer)
  const dir = direction(guess, q.answer)
  const finish = FINISH[finishFor(f)]
  return (
    <div className="reveal" aria-live="polite">
      <div className="duo">
        <div className="guess-card">
          <span className="lbl">You guessed</span>
          <strong className="num">{fmt(guess)}</strong>
        </div>
        <div className="answer-card">
          <span className="lbl">Answer</span>
          <strong className="num">{fmt(q.answer)}</strong>
          <span className="answer-unit">{q.unit}</span>
          <span className="answer-src">
            Source: <a href={q.sourceUrl} target="_blank" rel="noreferrer">{q.sourceName}</a>
          </span>
        </div>
      </div>

      <div className="landed-row">
        <div className="landed">
          <span className="lbl">You landed</span>
          <strong className="factor">{dir === 'exact' ? '1.00×' : formatFactor(f)}</strong>
          <strong className="dir">{dir === 'exact' ? 'Spot on' : dir === 'high' ? 'Too high' : 'Too low'}</strong>
        </div>
        <div className="finish-box" role="img" aria-label={finish.label}>
          <span className="finish-icon" aria-hidden="true">{finish.icon}</span>
          <span className="finish-label">{finish.label}</span>
        </div>
      </div>

      <div className="reveal-foot">
        <details className="napkin-panel">
          <summary>
            <span>Napkin math</span>
            <span className={`badge ${q.sourceType}`}>{q.sourceType === 'reported' ? 'Reported' : 'Calculated'}</span>
          </summary>
          {q.napkin && <p className="napkin">{q.napkin}</p>}
          <dl>
          <dt>What's counted</dt>
          <dd>{q.definition}</dd>
          <dt>How we got it</dt>
          <dd>{q.calculationNotes}</dd>
          <dt>Source</dt>
          <dd>
            <a href={q.sourceUrl} target="_blank" rel="noreferrer">{q.sourceName}</a> · final as of {q.sourceDate}
            {q.corroborationUrl && (
              <>
                {' '}· <a href={q.corroborationUrl} target="_blank" rel="noreferrer">cross-check</a>
              </>
            )}
          </dd>
          </dl>
        </details>
        <button ref={nextRef} className="btn next-btn" onClick={onNext}>
          {nextLabel} <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  )
}

function useCountdown(): string {
  const calc = () => {
    const now = new Date()
    const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
    const s = Math.max(0, Math.floor((next - now.getTime()) / 1000))
    const h = String(Math.floor(s / 3600)).padStart(2, '0')
    const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0')
    const sec = String(s % 60).padStart(2, '0')
    return `${h}:${m}:${sec}`
  }
  const [t, setT] = useState(calc)
  useEffect(() => {
    const id = setInterval(() => setT(calc()), 1000)
    return () => clearInterval(id)
  }, [])
  return t
}

interface ResultsProps {
  n: number
  isToday: boolean
  today: number
  questions: Question[]
  guesses: Record<string, number>
  progress: Progress
}

function Results({ n, isToday, today, questions, guesses, progress }: ResultsProps) {
  const factors = questions.map((q) => offFactor(guesses[q.id], q.answer))
  const avg = averageFactor(factors)
  const finish = FINISH[finishFor(avg)]
  const s = useMemo(() => streaks(progress, today), [progress, today])
  const [msg, setMsg] = useState('')
  const countdown = useCountdown()

  const run = async (how: 'share' | 'copy') => {
    const text = shareText(n, avg, factors, location.origin + href('/'))
    const r = how === 'share' ? await shareResult(text) : await copyText(text)
    setMsg(
      r === 'copied' ? 'Copied to clipboard!' : r === 'shared' ? 'Shared!' : r === 'cancelled' ? '' : "Couldn't copy. Your browser blocked it.",
    )
  }

  return (
    <article className="card results" aria-labelledby="res-title">
      <div className="res-left">
        <p className="res-lbl" id="res-title">Score</p>
        <p className="res-score" aria-label={`${formatFactor(avg)} average times off`}>{formatFactor(avg)}</p>
        <div className="finish-box" role="img" aria-label={finish.label}>
          <span className="finish-icon" aria-hidden="true">{finish.icon}</span>
          <span className="finish-label">{finish.label}</span>
        </div>
        <div className="res-actions">
          <button className="btn pill solid" onClick={() => run('share')}>Share</button>
          <button className="btn pill outline" onClick={() => run('copy')}>Copy text</button>
        </div>
        <p className="hint" aria-live="polite">{msg}</p>
      </div>

      <div className="res-right">
        <p className="res-lbl">Questions</p>
        <ol className="res-list">
          {questions.map((q, i) => {
            const dir = direction(guesses[q.id], q.answer)
            return (
              <li key={q.id}>
                <span className="res-q">{q.prompt}</span>
                <span className="res-f" aria-label={`${formatFactor(factors[i])} ${dir === 'exact' ? 'exact' : `too ${dir}`}`}>
                  <span aria-hidden="true" className="res-dir">{dir === 'high' ? '↑' : dir === 'low' ? '↓' : '='}</span>
                  {formatFactor(factors[i])}
                </span>
              </li>
            )
          })}
        </ol>
        <div className="stats">
          <div><strong>{s.played}</strong><span>Played</span></div>
          <div><strong>{s.current}</strong><span>Streak</span></div>
          <div><strong>{s.best}</strong><span>Best</span></div>
        </div>
        {isToday ? (
          <p className="next">Next puzzle in <span className="mono">{countdown}</span></p>
        ) : (
          <Link to="/" className="btn">Play today's puzzle</Link>
        )}
      </div>
    </article>
  )
}

function Archive({ today, progress }: { today: number; progress: Progress }) {
  if (today < 1) return <div className="state"><p>No puzzles yet.</p></div>
  const list = Array.from({ length: today }, (_, i) => today - i)
  return (
    <section className="card">
      <h1 className="h1">Archive</h1>
      <p className="hint">Play past puzzles. Your recorded guesses are never changed.</p>
      <ul className="archive">
        {list.map((n) => {
          const rec = progress.puzzles[String(n)]
          const status = rec?.completedAt ? 'Done' : rec ? 'In progress' : 'Not played'
          return (
            <li key={n}>
              <Link to={n === today ? '/' : `/p/${n}`}>
                <span>#{n} <small>{dateForPuzzle(n)}</small></span>
                <span className={`pill ${rec?.completedAt ? 'done' : ''}`}>{status}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function Help({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (d && !d.open) d.showModal()
  }, [])
  return (
    <dialog ref={ref} className="modal" onClose={onClose} aria-labelledby="help-title">
      <h2 id="help-title">How to play</h2>
      <ol>
        <li>Each day brings <b>three race-stat questions</b>, the same for everyone. A new puzzle unlocks at midnight UTC.</li>
        <li>You get <b>one guess per question</b>. Think it through, maybe do some napkin math, then lock it in.</li>
        <li>After each guess you see the real answer, how far off you were, and where the number comes from.</li>
      </ol>
      <h3>Scoring</h3>
      <p>
        We measure how many <i>times</i> off you were, so 2× too high and 2× too low count the same. 1× is perfect.
      </p>
      <p className="formula">times off = bigger number ÷ smaller number</p>
      <ul className="tiers">
        <li>🟩 within 1.25×</li>
        <li>🟨 within 2×</li>
        <li>🟧 within 4×</li>
        <li>🟥 further than that</li>
      </ul>
      <p>
        Your <b>daily score</b> is the average of your three “times off” numbers. Lower is better, and 1× is perfect:
        🏆 2× or better, 🥇 under 5×, 👍 up to 10×, ⚠️ worse than 10×.
      </p>
      <p className="hint">If an answer is 0, both numbers get +1 before comparing, so nothing breaks.</p>
      <p className="hint">Every answer comes from published historical race results, and each one links to its source.</p>
      <button className="btn primary" onClick={() => ref.current?.close()} autoFocus>Let's go</button>
    </dialog>
  )
}
