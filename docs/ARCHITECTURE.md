# Architecture

GymOS is a frontend-only single-page app. A React tree holds plans and logged sessions in memory, mirrors them to the browser's `localStorage`, and moves them in and out as CSV files. There is no server, API or account.

## Stack and runtime

- Language and framework: TypeScript, React 19
- Build tool: Vite, with `tsc -b` for type checking
- Charts: Recharts
- Runtime: a modern browser; Node.js 22.13+ (22.x) or 24+ for development (the floor set by Vitest, ESLint and axe-core)
- Package manager: npm (`package-lock.json` is committed)
- Entry points: `index.html` loads `src/main.tsx`, which renders `src/App.tsx`, which renders `src/GymTracker.tsx`

## Boundaries

`GymTracker` owns the shared state (plans, sessions, active tab, selected exercise) and passes it down to three feature areas plus shared primitives under `src/components/`:

| Area | Role |
| --- | --- |
| `plans` | Create, archive, restore, delete and start training plans |
| `log` | Log a session set by set, including timed sets, rests and holds and their timers |
| `progress` | Per-exercise charts and analysis, plus the Data screen for CSV import and export |
| `shared` | Small form and layout primitives |

Starting a plan creates an active session, kept in storage until Save, so a reload mid-session restores it and unfinished work never reaches Progress or the export. The tab bar is hidden while a session is open. During a session the log shows either the exercise list or one exercise as a full screen. Every exercise screen stays mounted, hidden when not shown, so a running rest or hold keeps its timer and sound cue while the person looks at another exercise.

Logic that has no UI lives outside the components: `src/utils` (storage, CSV, import merging, the active session, sessions and sets, progress and metrics, rest rules, plans, dates, ids, timer preferences), `src/hooks` (`useTimer`, `useActiveSession`), `src/constants` and `src/types`.

## Data and state

- Store: `localStorage` in the user's browser, accessed through `src/utils/storage.ts`.
- Keys: `gym:plans`, `gym:sessions`, `gym:tab`, `gym:selectedExName` (written by `GymTracker`), `gym:activeSession` (the unfinished session, `src/utils/activeSession.ts`), `gym:timer:<id>` (one per rest or hold shown in the session, cleared when the session is saved or cancelled, `src/hooks/useTimer.ts`) and `gym:timerPrefs` (sound and vibration, read if present; no screen writes it yet, so both are on, `src/utils/timerPrefs.ts`).
- Order: sessions are kept newest first by save order, not sorted by date. Saving prepends; an import appends.
- Key entities, defined in `src/types/index.ts`: `TrainingPlan` holds `Exercise` definitions; a `WorkoutSession` holds `ExerciseLog` entries, each with its `Set` values. Exercises carry an optional category (`strength`, `calisthenics`, `cardio`) and tracking type (`reps` or `time`); data saved before these fields existed is read as strength and reps.
- Loading and saving: the app reads storage on start and shows a loading screen until it has finished. Plans and sessions are written as they change, before the screen updates. Saving a session on Finish and saving a new plan update the screen only if the browser kept the write. Other changes (archive, restore, delete, import) update the screen either way. The tab and the selected Progress exercise are written after each change.
- Ownership: all data belongs to the one browser profile. There is no sharing, no authorization layer and no migrations; a missing field is handled by a default at read time.

## Import and export

Export builds one CSV from plans and sessions (`exportToCSV`). Import (`importFromCSV`) accepts the current header or the older, shorter one and rejects any other header. Nothing is stored at parse time: the Data screen shows what the file holds, then the user chooses **Add to my data**, which merges plans by name and skips sessions already present (same date, plan and notes), or **Replace my data**, which overwrites stored plans and sessions. A file that fails to parse leaves stored data unchanged.

## Trust boundaries

The only untrusted input is a CSV file the user selects. It must match the current or the older header. Each row is then checked (`isWellFormed` in `src/utils/csv.ts`): it needs every column, a known row type, a plan name and an exercise name, a session row needs a date, and with the current header category and tracking type must be allowed values. Rows that fail are skipped and counted. Numeric fields (weight, reps, duration, distance), the date format and the muscle group are not validated, so a hand-edited file can still store values the app does not expect.

Storage reads and writes are wrapped in `try`/`catch`. A read failure returns no data, so the app starts empty. A write failure is reported to the caller. Finish and New plan then stay open with a Not saved alert and Try again, and Finish also offers the unsaved session as a CSV download. A refused write from archive, restore, delete, import or the active session is still not reported.

## Offline and install

`public/manifest.webmanifest` lets the app be added to a home screen. Both typefaces come from npm packages and are served from the app's own origin, and no code requests another origin. There is no service worker, so the app needs the network to load; once loaded, it works without one because all data is local.

## Configuration

There are no environment variables (`.env.example` declares none) and no runtime configuration. The app is built to static files in `dist/`; no host has been chosen.

## Testing

- Unit: Vitest, colocated as `src/**/*.test.ts`. It covers storage, CSV parsing and export, import merging and its summary, session and set models, the active session, progress series, metrics and personal records, rest timer rules, clock formatting, the hold phase, plan building, archive, restore and delete, dates, and the shared controls' sizing and colour rules. Run `npm test`.
- End to end: Playwright in `tests/e2e/`, against the built app on port 4173 (set `E2E_PORT` to use another) in a Pixel 7 mobile Chromium profile. There is one spec per area: plans and new plan, Log home, the session list and set logging, rest timers and their cleanup, timed sets, finish and save, save failures, progress, the Data screen, the app shell, fonts, shared controls (44 px hit areas) and a smoke load of the three tabs. `session-journey.spec.ts` runs a whole session from Log home to Recent. Run `npm run test:e2e`.
- Accessibility: axe (WCAG 2.1 A and AA) runs inside those specs on each screen and its main states, and `accessibility.spec.ts` adds the three tabs, the plan sheets and the new-plan form. `npm run test:e2e` runs all of it; `npx playwright test accessibility` runs only that file.
- Lint and types: `npm run lint` and `npx tsc -b`.
- Continuous integration: none configured.
- Not automated: other browsers (notably iOS Safari), real devices, sound and vibration cues, and install to a home screen.
