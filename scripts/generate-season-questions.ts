/**
 * Builds season-stat questions from the Jolpica F1 API (an open, Ergast-compatible API).
 *
 *   npx tsx scripts/generate-season-questions.ts 2014 2025 > /tmp/season-questions.json
 *   npx tsx scripts/generate-season-questions.ts 2026 --races-only > /tmp/season-2026.json
 *
 * Output goes to stdout. Review it, then copy the questions you want into
 * public/questions.json (skip facts the bank already covers).
 *
 * Only finished seasons should be passed. For a season still in progress use
 * --races-only, which emits race-level facts (laps, pit stops) for rounds that
 * finished at least 14 days ago, so post-race penalties have settled.
 *
 * Jolpica is volunteer-run and rate limited (about 4 req/s, 500 req/hour), so
 * requests are throttled and retried on 429. The game itself never calls it.
 */
import type { Question } from '../src/lib/types'

const API = 'https://api.jolpi.ca/ergast/f1'
const WIKI = (y: number) => `https://en.wikipedia.org/wiki/${y}_Formula_One_World_Championship`
const SOURCE = 'Jolpica F1 API (Ergast-compatible)'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function get(path: string): Promise<any> {
  for (let attempt = 0; attempt < 6; attempt++) {
    await sleep(350)
    const res = await fetch(API + path)
    if (res.status === 429) {
      await sleep(5000 * (attempt + 1))
      continue
    }
    if (!res.ok) throw new Error(`${res.status} for ${path}`)
    return (await res.json()).MRData
  }
  throw new Error(`Rate limited too many times for ${path}`)
}

interface RaceResult {
  round: string
  raceName: string
  date: string
  Results: { points: string; laps: string; position: string; Driver: { driverId: string } }[]
}

async function seasonResults(y: number): Promise<RaceResult[]> {
  const races: RaceResult[] = []
  let offset = 0
  let total = Infinity
  while (offset < total) {
    const m = await get(`/${y}/results.json?limit=100&offset=${offset}`)
    total = Number(m.total)
    for (const r of m.RaceTable.Races as RaceResult[]) {
      const last = races[races.length - 1]
      if (last && last.round === r.round) last.Results.push(...r.Results)
      else races.push({ ...r, Results: [...r.Results] })
    }
    offset += 100
  }
  return races
}

type Draft = Omit<Question, 'sourceName'> & { sourceName?: string }

function q(d: Draft): Question {
  return { sourceName: SOURCE, ...d } as Question
}

async function season(y: number): Promise<Question[]> {
  const ds = (await get(`/${y}/driverstandings.json`)).StandingsTable.StandingsLists[0]
  const cs = (await get(`/${y}/constructorstandings.json`)).StandingsTable.StandingsLists[0]
  const races = await seasonResults(y)
  if (Number(ds.round) !== races.length) throw new Error(`${y}: standings round ${ds.round} ≠ ${races.length} races`)

  const champ = ds.DriverStandings[0]
  const second = ds.DriverStandings[1]
  const team = cs.ConstructorStandings[0]
  const winners = new Set(races.map((r) => r.Results.find((x) => x.position === '1')!.Driver.driverId))
  const gpPoints = races.reduce((s, r) => s + r.Results.reduce((t, x) => t + Number(x.points), 0), 0)
  const end = `${y}-12-31`
  const dUrl = `${API}/${y}/driverstandings.json`
  const cUrl = `${API}/${y}/constructorstandings.json`
  const gap = Number(champ.points) - Number(second.points)

  return [
    q({
      id: `champion-wins-${y}`,
      prompt: `How many Grands Prix did the ${y} drivers' champion win?`,
      answer: Number(champ.wins),
      unit: 'wins',
      difficulty: 'easy',
      season: y,
      sourceDate: end,
      sourceUrl: dUrl,
      corroborationUrl: WIKI(y),
      sourceType: 'reported',
      definition: `Grand Prix wins for ${champ.Driver.givenName} ${champ.Driver.familyName}, the ${y} drivers' champion. Sprints are not counted.`,
      calculationNotes: `Read directly from the 'wins' field of the final (round ${ds.round}) drivers' standings.`,
      napkin: `There were ${races.length} Grands Prix that year. Champions usually win somewhere between a quarter and three-quarters of them.`,
    }),
    q({
      id: `different-winners-${y}`,
      prompt: `How many different drivers won at least one Grand Prix in ${y}?`,
      answer: winners.size,
      unit: 'drivers',
      difficulty: 'easy',
      season: y,
      sourceDate: end,
      sourceUrl: `${API}/${y}/results/1.json`,
      corroborationUrl: WIKI(y),
      sourceType: 'calculated',
      definition: `Count of distinct drivers classified first in a ${y} Grand Prix. Sprint races are not counted.`,
      calculationNotes: `Took the winner of each of the ${races.length} Grands Prix and counted unique drivers.`,
      napkin: 'Dominant seasons have two or three winners. Open seasons can reach seven or more.',
    }),
    q({
      id: `champion-points-${y}`,
      prompt: `How many championship points did the ${y} drivers' champion score?`,
      answer: Number(champ.points),
      unit: 'points',
      difficulty: 'medium',
      season: y,
      sourceDate: end,
      sourceUrl: dUrl,
      corroborationUrl: WIKI(y),
      sourceType: 'reported',
      definition: `Final drivers' championship points for ${champ.Driver.givenName} ${champ.Driver.familyName} in ${y}, including any sprint and bonus points that season awarded.`,
      calculationNotes: `Read directly from the final (round ${ds.round}) drivers' standings.`,
      napkin: `${races.length} races with 25 points for a win, and ${champ.wins} wins for the champion.`,
    }),
    q({
      id: `constructor-points-${y}`,
      prompt: `How many constructors' championship points did the ${y} champion team score?`,
      answer: Number(team.points),
      unit: 'points',
      difficulty: 'medium',
      season: y,
      sourceDate: end,
      sourceUrl: cUrl,
      corroborationUrl: WIKI(y),
      sourceType: 'reported',
      definition: `Final constructors' championship points for ${team.Constructor.name} in ${y}.`,
      calculationNotes: "Read directly from the final constructors' standings.",
      napkin: `Both cars score. A one-two finish is worth 43 points, and there were ${races.length} races.`,
    }),
    q({
      id: `title-gap-${y}`,
      prompt: `How many points separated the ${y} drivers' champion from the runner-up?`,
      answer: gap,
      unit: 'points',
      difficulty: 'medium',
      season: y,
      sourceDate: end,
      sourceUrl: dUrl,
      corroborationUrl: WIKI(y),
      sourceType: 'calculated',
      definition: `Difference between the final points of the ${y} champion (${champ.Driver.familyName}) and second place (${second.Driver.familyName}).`,
      calculationNotes: `${champ.points} − ${second.points} = ${gap}, from the final round-${ds.round} drivers' standings.`,
      napkin: 'Title fights can go down to single digits. Runaway seasons stretch into the hundreds.',
    }),
    q({
      id: `gp-points-total-${y}`,
      prompt: `How many points were awarded in total across all ${y} Grands Prix, not counting sprint races?`,
      answer: gpPoints,
      unit: 'points',
      difficulty: 'hard',
      season: y,
      sourceDate: end,
      sourceUrl: `${API}/${y}/results.json?limit=100`,
      sourceType: 'calculated',
      definition: `Sum of championship points given to every driver in the ${races.length} Grand Prix results of ${y}, as recorded in each race result (any fastest-lap bonus included; sprints excluded).`,
      calculationNotes:
        "Summed the 'points' field across all Grand Prix result rows (paged with limit=100)." +
        (y === 2014 ? ' The 2014 finale in Abu Dhabi awarded double points, which this total includes.' : '') +
        (y === 2021 ? ' The rain-shortened 2021 Belgian GP awarded half points, which this total includes.' : ''),
      napkin: `The top 10 share 101 points per race, and there were ${races.length} races.`,
    }),
    await pitStops(y, races[0]),
  ]
}

/** Race-level facts for a season in progress, only for rounds finished at least 14 days ago. */
async function racesOnly(y: number, now = new Date()): Promise<Question[]> {
  const cutoff = new Date(now.getTime() - 14 * 86_400_000).toISOString().slice(0, 10)
  const races = (await seasonResults(y)).filter((r) => r.date <= cutoff)
  const out: Question[] = []
  const opener = races.find((r) => r.round === '1')
  if (opener) out.push(await pitStops(y, opener))
  const monaco = races.find((r) => r.raceName === 'Monaco Grand Prix')
  if (monaco) {
    out.push(
      q({
        id: `monaco-laps-${y}`,
        prompt: `How many laps did the ${y} Monaco Grand Prix last?`,
        answer: Number(monaco.Results.find((x) => x.position === '1')!.laps),
        unit: 'laps',
        difficulty: 'easy',
        season: y,
        sourceDate: monaco.date,
        sourceUrl: `${API}/${y}/${monaco.round}/results.json`,
        sourceType: 'reported',
        definition: `Laps completed by the winner of the ${y} Monaco Grand Prix (round ${monaco.round}).`,
        calculationNotes: "Read directly from the winner's 'laps' field in the race result.",
        napkin: 'Races are about 305 km, and a lap of Monaco is about 3.3 km.',
      }),
    )
  }
  return out
}

async function pitStops(y: number, race: RaceResult): Promise<Question> {
  const m = await get(`/${y}/${race.round}/pitstops.json?limit=100`)
  return q({
    id: `pitstops-opener-${y}`,
    prompt: `How many pit stops were recorded at the ${y} season-opening ${race.raceName}?`,
    answer: Number(m.total),
    unit: 'pit stops',
    difficulty: 'hard',
    season: y,
    sourceDate: race.date,
    sourceUrl: `${API}/${y}/${race.round}/pitstops.json`,
    sourceType: 'calculated',
    definition: `Total pit stop entries for the ${y} ${race.raceName} (round 1) in the Jolpica pit stop dataset.`,
    calculationNotes:
      "Read the 'total' field of the race's pit stop list. Limitation: the dataset logs stops from timing data, and tyre changes during red-flag stoppages may not appear, so treat this as the dataset's count, not an official FIA figure.",
    napkin: 'There are about 20 cars, and most make one or two stops in a dry race.',
  })
}

async function main() {
  const args = process.argv.slice(2)
  const only = args.includes('--races-only')
  const [from, to] = args.filter((a) => /^\d{4}$/.test(a)).map(Number)
  if (!from) throw new Error('Usage: generate-season-questions.ts <fromYear> [toYear] [--races-only]')
  const out: Question[] = []
  for (let y = from; y <= (to ?? from); y++) {
    out.push(...(only ? await racesOnly(y) : await season(y)))
    console.error(`✓ ${y}`)
  }
  console.log(JSON.stringify(out, null, 2))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
