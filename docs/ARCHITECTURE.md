# Architecture

GymOS is a frontend-only single-page app. A React tree holds plans and logged sessions in memory, mirrors them to the browser's `localStorage`, and moves them in and out as CSV files. There is no server, API or account.

## Stack and runtime

- Language and framework: TypeScript, React 19
- Build tool: Vite, with `tsc -b` for type checking
- Charts: Recharts
- Runtime: a modern browser; Node 18+ for development
- Package manager: npm (`package-lock.json` is committed)
- Entry points: `index.html` loads `src/main.tsx`, which renders `src/App.tsx`, which renders `src/GymTracker.tsx`

## Boundaries

`GymTracker` owns the shared state (plans, sessions, active tab, selected exercise) and passes it down to three feature areas under `src/components/`:

| Area | Role |
| --- | --- |
| `plans` | Create, archive, restore, delete and start training plans |
| `log` | Log a session set by set, including timed sets |
| `progress` | Per-exercise charts and analysis, plus CSV import and export |
| `timers` | Rest and hold timers used by the log screens |
| `shared` | Small form and layout primitives |

Logic that has no UI lives outside the components: `src/utils` (storage, CSV, metrics, dates, ids, timer preferences), `src/hooks/useTimer.ts`, `src/constants` and `src/types`.

## Data and state

- Store: `localStorage` in the user's browser, accessed through `src/utils/storage.ts`.
- Keys: `gym:plans`, `gym:sessions`, `gym:tab`, `gym:selectedExName` (written by `GymTracker`) and `gym:timerPrefs` (written by `src/utils/timerPrefs.ts`).
- Key entities, defined in `src/types/index.ts`: `TrainingPlan` holds `Exercise` definitions; a `WorkoutSession` holds `ExerciseLog` entries, each with its `Set` values. Exercises carry an optional category (`strength`, `calisthenics`, `cardio`) and tracking type (`reps` or `time`); data saved before these fields existed is read as strength and reps.
- Loading: the app reads storage on start and shows a loading screen until it has finished. It writes each key back whenever its state changes.
- Ownership: all data belongs to the one browser profile. There is no sharing, no authorization layer and no migrations; a missing field is handled by a default at read time.

## Import and export

Export builds one CSV from plans and sessions (`exportToCSV`). Import (`importFromCSV`) accepts the current header or the older, shorter one and rejects any other header. After parsing, the user chooses **Append**, which merges plans by name and skips sessions already present, or **Replace**, which overwrites stored plans and sessions.

## Trust boundaries

The only untrusted input is a CSV file the user selects. Today it is checked by header match and a minimum column count; rows with too few columns are skipped. Field values are not validated beyond that, and category and tracking type are cast to their types without checking them against the allowed values. A hand-edited file can therefore store values the app does not expect.

Storage reads and writes are wrapped in `try`/`catch`. A read failure returns no data and a write failure is ignored, so the app starts empty or loses the write without telling the user.

## Offline and install

`public/manifest.webmanifest` lets the app be installed to a home screen. There is no service worker, so the app does not yet load offline.

## Configuration

There are no environment variables (`.env.example` declares none) and no runtime configuration. The app is built to static files in `dist/`; no host has been chosen.

## Testing

- Unit: Vitest, colocated as `src/**/*.test.ts`. Today it covers the storage helpers and the progress metrics. Run `npm test`.
- End to end: Playwright in `tests/e2e/`, against the built app on port 4173 in a Pixel 7 mobile profile. `smoke.spec.ts` checks the three tabs load; `accessibility.spec.ts` runs axe (WCAG 2.1 A and AA) on the Plans, Log and Progress tabs. Run `npm run test:e2e`.
- Lint and types: `npm run lint` and `npx tsc -b`.
- Continuous integration: none configured.
- Not automated: timers and the log flow beyond a page load, CSV import and export, desktop and other browsers, and any real-device check.
