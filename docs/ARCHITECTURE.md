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

`GymTracker` owns the shared state (plans, sessions, active tab, selected exercise) and passes it down to four feature areas plus shared primitives under `src/components/`:

| Area | Role |
| --- | --- |
| `plans` | Create, edit, archive, restore, delete and start training plans |
| `log` | Log a session set by set, including timed sets, rests and holds and their timers |
| `progress` | The Stats tab: per-exercise charts and analysis (the folder keeps its earlier name) |
| `settings` | The Settings tab (also opened by the empty-state import link, which starts the file picker): appearance, units, timers (default rest per category, rest after holds, sound and vibration), language, and the Data card with CSV export, import (each step in a sheet) and Delete all data |
| `shared` | Small form and layout primitives |

Starting a plan creates an active session, kept in storage until Save, so a reload mid-session restores it and unfinished work never reaches Stats or the export. Editing a saved session opens the same way, but its exercise screens are `SavedSets` (typed rows) instead of `ExerciseLogger`, so no rest or hold timer is created. The four tabs (Plans, Log, Stats, Settings) are hidden while a session is open. Layout widths and breakpoints are tokens in `src/styles/tokens.css`: below 600 px the phone layout fills the screen; from 600 px the app keeps a centred 600 px column with the tab bar inside it; from 1024 px the tabs move to a top bar beside the wordmark. Log home then fills the 1200 px frame in two panes (`.mainContent:has(.logHome)`): New session in a fixed 440 px pane with the plan's first exercises, Recent sessions as a table beside it. Stats does the same: its exercise search and list sit in the left pane in place of the full-screen search sheet, and the chart and figures fill the right; because the sheet and the list are different controls, `ProgressTab` picks one with `useMediaQuery(WIDE_QUERY)` rather than CSS. Plans uses the same hook: the active plans become selectable rows in the left pane, with Archived below them, and the selected plan is shown in full on the right with Start and the actions sheet; the selection is not stored and opens on the first active plan. Below 1024 px the same detail is a screen of its own: tapping a plan's name opens it under a back link, and saving a new plan opens it marked as saved, with Done back to the list; from 1024 px saving selects the new plan in the right pane instead. Edit plan, in the actions sheet of an active plan, opens the same form filled in; saving the changes marks the overview "Changes saved" the same way. An edit replaces the plan in place (same id and list position). Renaming the plan or one of its exercises also renames it in that plan's past sessions, matched by plan id and exercise id, so Log and Stats keep one name; imported sessions without the plan's ids keep the old name, and removed or changed exercises stay as they were logged. With no active plans Plans keeps the 600 px column. With nothing to list, Plans (no active plans), Log (no active plan) and Stats (no saved sessions) show the shared `EmptyState` accent block in place of their visible title, which stays as a visually hidden h1; its CSV import link appears only when the device holds no plans and no sessions. With no active plan and no sessions Log centres that block in the 480 px column, as Stats does. Recent sessions starts at the six newest and grows ten at a time; its plan filter groups sessions by plan id, or by saved plan name for imported sessions without one, so archived and deleted plans keep their history. The filter and the number shown are component state, reset whenever Log home unmounts. Screens without a wide layout keep the 600 px column. The wide-only parts are in the phone markup too, hidden below 1024 px, so the narrower layouts render as before. During a session the log shows either the exercise list or one exercise as a full screen. Every exercise screen stays mounted, hidden when not shown, so a running rest or hold keeps its timer and sound cue while the person looks at another exercise. Its sets table shows today's sets beside last time's: set N is paired with set N of the most recent saved session that has the exercise, in the chosen units, and the Last column is left out when there is no such session. From 1024 px an open exercise spans the window: its timer is fixed in the left 60% at full height (a running or paused timer has its buttons in a strip under the block), and the entry column (navigation on top, the main button and the next-exercise card, or Finish on the last exercise, at the bottom) flows on the right. A reps exercise with no rest running shows the rest it will start, so the split holds still on Set done. The session list and the Done screen keep the 600 px column.

Logic that has no UI lives outside the components: `src/utils` (storage, CSV, import merging, the active session, sessions and sets, progress and metrics, rest rules, plans, dates, ids, timer and unit preferences), `src/hooks` (`useTimer`, `useActiveSession`, `useMediaQuery`), `src/constants` and `src/types`.

## Data and state

- Store: `localStorage` in the user's browser, accessed through `src/utils/storage.ts`.
- Keys: `gym:plans`, `gym:sessions`, `gym:tab`, `gym:selectedExName` (written by `GymTracker`), `gym:activeSession` (the unfinished session, `src/utils/activeSession.ts`), `gym:timer:<id>` (one per rest or hold shown in the session, cleared when the session is saved, discarded or deleted, `src/hooks/useTimer.ts`), `gym:timerPrefs` (rest seconds per category, rest after holds, sound and vibration, written from Settings; a missing or unreadable value takes its default, 60/30/15 seconds and all on; a rest already stored keeps its own target, `src/utils/timerPrefs.ts`), `gym:unitPrefs` (weight `kg`/`lbs` and distance `km`/`mi`, written from Settings, kg and km when missing or unreadable, `src/utils/unitPrefs.ts`) and `gym:accent` (the accent colour id, written from Settings, lime when missing or unknown, `src/utils/accentPrefs.ts`).
- Units: weights are stored in kg and distances in each exercise's own unit (km for new exercises, mi kept for older ones). Screens read the Settings choice through `useUnitPrefs` and convert at the edges with `src/utils/units.ts`: displays round weights to 0.1 and distances to 0.01, typed values are converted back at full precision, and an edited set keeps any field left unchanged. Changing units never rewrites stored data.
- Accent: the five accent colours are tokens in `src/styles/tokens.css` (`--accent-<id>`); `:root[data-accent="…"]` points `--color-accent` at one of them. `src/utils/accentPrefs.ts` stores the choice under `gym:accent`, sets `data-accent` before the first render so the page never flashes lime, and falls back to lime for a missing or unknown value. A unit test reads the tokens file and checks each accent's contrast.
- Order: sessions are kept newest first by save order, not sorted by date. Saving prepends; an import appends.
- Key entities, defined in `src/types/index.ts`: `TrainingPlan` holds `Exercise` definitions; a `WorkoutSession` holds `ExerciseLog` entries, each with its `Set` values. Exercises carry an optional category (`strength`, `calisthenics`, `cardio`) and tracking type (`reps` or `time`); data saved before these fields existed is read as strength and reps.
- Loading and saving: the app reads storage on start and shows a loading screen until it has finished. Plans and sessions are written as they change, before the screen updates. Saving a session on Finish and saving a new or edited plan update the screen only if the browser kept the write. An edit that renames writes the sessions first and puts them back if the plans write is then refused. Other changes (archive, restore, delete, import) update the screen either way. The tab and the selected Stats exercise are written after each change.
- Ownership: all data belongs to the one browser profile. There is no sharing, no authorization layer and no migrations; a missing field is handled by a default at read time.

## Import and export

Export builds one CSV from plans and sessions (`exportToCSV`), with session weights and distances in the chosen units (converted values rounded to 0.01) and `weight_unit`/`distance_unit` columns naming them; a plan row's `distance_unit` is the exercise's own unit. Import (`importFromCSV`) accepts the current 14-column header, the 12-column header from before units (kg and each exercise's own distance unit) and the 8-column legacy header, and rejects any other header. Each row is converted back to kg and the exercise's distance unit at full precision, so a file re-imports exactly when its values were entered in its units and equal to display precision otherwise. Nothing is stored at parse time: a sheet over Settings shows what the file holds, then the user chooses **Add to my data**, which merges plans by name and skips sessions already present (same date, plan and notes), or **Replace my data**, which overwrites stored plans and sessions. A file that fails to parse leaves stored data unchanged. **Delete all data**, after a confirm sheet, writes empty plans and sessions; preferences (accent, units, timers) are kept.

## Trust boundaries

The only untrusted input is a CSV file the user selects. It must match one of the three export headers. Each row is then checked (`isWellFormed` in `src/utils/csv.ts`): it needs every column, a known row type, a plan name and an exercise name, a session row needs a date, with the 12- or 14-column header category and tracking type must be allowed values, and with the 14-column header a weight or distance needs a known unit (`kg`, `lb`/`lbs`, `km`, `mi`). Rows that fail are skipped and counted. Numeric fields (weight, reps, duration, distance), the date format and the muscle group are not validated, so a hand-edited file can still store values the app does not expect.

Storage reads and writes are wrapped in `try`/`catch`. A read failure returns no data, so the app starts empty. A write failure is reported to the caller. Finish, New plan and Edit plan then stay open with a Not saved alert and Try again, and Finish also offers the unsaved session as a CSV download. A refused write from archive, restore, delete, delete all, import or the active session is still not reported.

## Offline and install

`public/manifest.webmanifest` lets the app be added to a home screen. Its icons come from one mark, `public/icon.svg` (four set ticks, the last in the default accent), which also serves as the favicon; `node build/make-icons.mjs` renders the 192, 512, maskable 512 and 180 apple-touch PNGs from it. Inside the app the same mark is the `BrandMark` component, filled from tokens so its last tick follows the chosen accent; it shows in the wide top bar and at the end of Settings, never on session screens. Both typefaces come from npm packages and are served from the app's own origin, and no code requests another origin. A service worker makes the app reload with no network after a first visit. `build/serviceWorker.ts` is a small Vite plugin that writes `sw.js` at build time:

- It lists every built file and public asset to precache, and names the cache after a hash of their content.
- On install, the worker caches that list.
- It answers same-origin requests from the cache, matching on the URL alone because hosts may send `Vary: Origin`.
- Page loads go to the network first and fall back to the cached `index.html`.
- On activate, it deletes older caches.

A new worker and its cache take over only once every open tab of the old build is closed. An online reload already gets the new build from the network, and since nothing is loaded lazily, a page never mixes files from two builds. The worker is registered only in production builds and assumes the app is hosted at the root path. If registration fails, the app still runs but needs the network to load.

## Configuration

There are no environment variables (`.env.example` declares none) and no runtime configuration. The app is built to static files in `dist/`; no host has been chosen.

## Testing

- Unit: Vitest, colocated as `src/**/*.test.ts`. It covers storage, unit conversion and rounding, CSV parsing and export, import merging and its summary, session and set models, the active session, progress series, metrics and personal records, rest timer rules, clock formatting, the hold phase, plan building, editing (in place, renames carried into past sessions), archive, restore and delete, dates, and the shared controls' sizing and colour rules. `build/serviceWorker.test.ts` checks the worker's precache list and cache name against a real build. Run `npm test`.
- End to end: Playwright in `tests/e2e/`, against the built app on port 4173 (set `E2E_PORT` to use another) in a Pixel 7 mobile Chromium profile; the date picker, timer wave, picker scroll and edit session specs also run in an iPhone 13 WebKit profile. There is one spec per area: plans and new plan, Log home and its session history, the session date picker, the session list and set logging, rest timers and their cleanup, timed sets, offline reload through the service worker, finish and save, save failures, Stats (`progress*.spec.ts`) and its empty states, Settings and its Data section, the app shell and its tablet and wide layouts, fonts, shared controls (44 px hit areas) and a smoke load of the four tabs. `session-journey.spec.ts` runs a whole session from Log home to Recent. Run `npm run test:e2e`.
- Accessibility: axe (WCAG 2.1 A and AA) runs inside those specs on each screen and its main states, and `accessibility.spec.ts` adds the four tabs, the plan sheets and the new-plan form. `npm run test:e2e` runs all of it; `npx playwright test accessibility` runs only that file.
- Lint and types: `npm run lint` and `npx tsc -b`.
- Continuous integration: none configured.
- Not automated: browsers other than Chromium (except those WebKit specs), iOS Safari itself, real devices, sound and vibration cues, and install to a home screen.
