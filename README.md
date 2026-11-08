# Undercut

A daily race-stat estimation game. Each day brings three questions about historical Grand Prix results and season statistics. You get one numerical guess per question, then see the verified answer, how close you were, and where the number comes from.

**Play:** https://rishanrastogi.github.io/undercut-daily/

Undercut is a fan project. It is not affiliated with, endorsed by or connected to any racing series, team or driver, and it uses no series, team or driver logos or imagery.

## Features

- Three questions per day, the same for every player. The puzzle number comes from the UTC date (puzzle #1 = 2026-11-08).
- One guess per question. Guesses are saved in `localStorage` and can never be changed, including in the archive.
- A transparent times-off score (see [Scoring](#scoring)) that handles zero answers safely.
- A results screen with the average times-off score, a finish badge, every question with its times-off number, played/streak/best-streak stats and a countdown to the next puzzle.
- A spoiler-free share line with one tyre per question (`🔴🟡⚪` for soft/medium/hard). **Share** uses the Web Share API where available and falls back to the clipboard; **Copy text** always copies.
- Dark mode by default, with a light/dark toggle in the header. The choice is remembered per browser and applied before the first paint, so there's no flash.
- A finish badge (trophy, medal, thumbs up or warning) on each question's answer screen and on the results screen, using the same thresholds. All in-app icons are original monochrome SVGs in `src/Icons.tsx` and `src/Tyre.tsx`. Emoji are only used in plain-text shares.
- An archive of past puzzles at `/archive` and `/p/<n>`. No sign-in is needed.
- Loading, error (with retry), empty, not-found and storage-blocked states. Dialogs and labels are accessible, focus is visible and reduced motion is respected.

## Local setup

Requires Node 20+ (CI uses Node 22).

```bash
npm install
npm run dev        # http://localhost:5173/undercut-daily/
```

| Command            | What it does                                           |
| ------------------ | ------------------------------------------------------ |
| `npm run dev`      | Vite dev server                                        |
| `npm run validate` | Validates `public/questions.json` (fails on any error) |
| `npm test`         | Vitest: scoring, puzzle selection, content validation  |
| `npm run lint`     | ESLint                                                 |
| `npm run build`    | Type-check and production build to `dist/`             |
| `npm run check`    | validate, then test, then build                        |

## Deployment

`.github/workflows/deploy.yml` runs on every push to `main`. It validates the content, runs the tests and lint, builds, and deploys `dist/` to GitHub Pages through `actions/deploy-pages`. Pull requests run the same checks without deploying.

- **Base path:** the workflow sets `BASE_PATH=/<repo-name>/`. Locally it defaults to `/undercut-daily/` (see `vite.config.ts`). For a custom domain or a user site, set `BASE_PATH=/`.
- **SPA routing:** the build copies `index.html` to `404.html`, so deep links like `/undercut-daily/p/3` load the app, which then routes on the client.
- **Pages settings:** Settings → Pages → Source must be set to **GitHub Actions**.

## Scoring

Each guess is compared to the answer by how many *times* off it is, so being 2× too high and 2× too low count the same:

```
factor = max(guess, answer) / min(guess, answer)     # 1 = exact
```

Each question also gets a tyre compound, shown as an original tyre icon in the app (no brand marks) and as an emoji in shared text:

| Times off | Tyre |
| --------- | ---- |
| ≤ 1.5×    | 🔴 Soft |
| ≤ 3×      | 🟡 Medium |
| > 3×      | ⚪ Hard |

The **daily score** shown on the results screen is the plain average of the three factors (lower is better, 1× is perfect). It decides the finish badge:

| Average times off | Badge |
| ----------------- | ----- |
| ≤ 2×              | 🏆 Race win |
| < 5×              | 🥇 Podium finish |
| ≤ 10×             | 👍 Points finish |
| > 10×             | ⚠️ Crashed out |

**Zero safety:** if the guess or the answer is 0, both are shifted by +1 before the ratio is taken, so nothing is ever divided by zero. A guess of 0 for an answer of 0 counts as exact. Negative and non-numeric input is rejected in the UI, and `offFactor` throws on invalid input. All of this is in `src/lib/scoring.ts` and covered by `scoring.test.ts`.

## Daily puzzle selection

`src/lib/puzzle.ts`:

1. `puzzleNumberFor(date)` is the number of whole UTC days since `LAUNCH_DATE`, plus 1.
2. The question bank is sorted by `id`, so the order of entries in the file doesn't matter.
3. The bank is split into *cycles* of `floor(N / 3)` days. Each cycle uses a seeded (mulberry32) shuffle keyed on the cycle number. Day *k* of a cycle takes questions `3k..3k+2`, so no question repeats within a cycle.

Adding or removing questions changes the schedule for future puzzles. Players who already played a puzzle keep the questions they answered, because the app stores the question IDs alongside the guesses. If you need past puzzles to stay identical for new visitors too, only add questions in multiples that start a new cycle, or pin a schedule.

## Content format

Questions live in **`public/questions.json`**, separate from the UI code. The app fetches this file at runtime. Each entry looks like this:

```jsonc
{
  "id": "ver-points-2023",            // unique, kebab-case
  "prompt": "How many championship points did …?",
  "answer": 575,                      // finite, non-negative number
  "unit": "points",
  "season": 2023,
  "sourceDate": "2023-12-31",         // YYYY-MM-DD the figure is final as of (not in the future)
  "sourceName": "Jolpica F1 API (Ergast-compatible)",
  "sourceUrl": "https://api.jolpi.ca/ergast/f1/2023/driverstandings.json",
  "corroborationUrl": "https://en.wikipedia.org/wiki/…",   // optional second source
  "sourceType": "reported",           // "reported" = value read directly; "calculated" = derived
  "definition": "Exactly what is being counted …",
  "calculationNotes": "How the number was read or computed, plus any limitations …",
  "napkin": "Optional estimation hint shown after the reveal"
}
```

`npm run validate` (and CI) checks for required fields, kebab-case and unique IDs, numeric answers, real and non-future dates, https source URLs, and a valid `sourceType`.

### Reported vs calculated

- **Reported:** the value appears directly in the source, such as the final standings `points` or `wins` field, or a race's lap count.
- **Calculated:** the value was derived from source data, such as a difference between two totals, a sum across races, or a count of distinct winners. `calculationNotes` must describe the calculation precisely enough to reproduce it.

The UI shows this as a *Reported* or *Calculated* badge in the "Source & method" panel after each reveal.

## Adding and verifying questions

1. **Use stable, historical, objectively countable facts:** final standings, race lap counts, wins, sums over a completed season. Avoid live or in-progress seasons, and avoid metrics that aren't published reliably (gear shifts, top speeds by lap, and so on).
2. **Find a primary source.** The current bank uses the [Jolpica F1 API](https://github.com/jolpica/jolpica-f1), an open, community-maintained successor to the Ergast API with the same schema, and cross-checks against Wikipedia where possible.
3. **Reproduce the number yourself.** For example:
   ```bash
   curl -s https://api.jolpi.ca/ergast/f1/2023/driverstandings.json | jq '.MRData.StandingsTable.StandingsLists[0].DriverStandings[0] | {points, wins}'
   curl -s https://api.jolpi.ca/ergast/f1/2023/13/pitstops.json | jq '.MRData.total'
   ```
4. Fill in every field. Say whether the value is reported or calculated, and write down any limitations in `calculationNotes`.
5. Run `npm run validate && npm test`.
6. If you can't find a reliable source or reproduce the calculation, **leave the question out**.

### Data source limitations

- Jolpica is a free, volunteer-run API. It isn't an official data feed and has rate limits (about 4 requests per second and 500 per hour, unauthenticated). The app **never calls it at runtime**. It was only used to verify the static answers in `questions.json`, through its documented public endpoints and at a gentle request rate.
- **Pit stop counts** come from the dataset's pit stop logs, which are built from timing data. Tyre changes made during red-flag stoppages may not be logged as stops. Questions that use these counts say so and are labelled *Calculated*. Treat them as the dataset's count, not an official governing-body figure.
- The Wikipedia links are for cross-checking and context only.

## Project layout

```
public/questions.json      question bank (content)
src/lib/scoring.ts         scoring maths
src/lib/puzzle.ts          date → puzzle number → questions
src/lib/storage.ts         localStorage progress, write-once guesses, streaks
src/lib/share.ts           spoiler-free share text, Web Share or clipboard
src/lib/validate.ts        content validator (used by the script and the tests)
src/App.tsx, router.ts     UI and a small history-API router
scripts/validate-questions.ts
.github/workflows/deploy.yml
```

## License

The code is MIT licensed. Stat values are factual data credited to the sources linked for each question.
