# CLAUDE.md

Operating notes for Claude Code when working in this repo. Keep this file short and current — prune anything that goes stale.

## Project overview

Local-first practice tool for certification-style multiple-choice exams. React 19 + TypeScript + Vite, Tailwind v4. No backend: datasets are JSON files bundled at build time and attempt history lives in `localStorage`. Ships with a sample AWS AIF-C01 dataset.

## Commands

```bash
npm run dev       # Vite dev server (HMR)
npm run build     # tsc -b && vite build  → ./dist
npm run preview   # serve the production build
npm run lint      # ESLint over the repo
```

There is no test runner configured yet. Do not invent `npm test`.

**Always run `npm run lint` and `npm run build` before declaring a task done** — `build` runs the TypeScript project references, so it doubles as type-check.

## Architecture

- **No router.** `src/App.tsx` switches screens via a discriminated `Route` union from `src/types/exam.ts`. Navigation is a `nav(route)` callback passed down as a prop. Do not add `react-router` or change the URL — it's a deliberate choice.
- **Datasets are auto-discovered.** `src/data/loadDatasets.ts` uses `import.meta.glob('../datasets/*.json', { eager: true })`. Adding a JSON file under `src/datasets/` registers a new exam after a dev-server restart. The file shape is `DatasetFile` in `src/types/exam.ts`.
- **Multi-answer is derived, not declared.** `loadDataset()` sets `Question.multi = correctOptionIds.length > 1`. Don't add a separate field.
- **Determinism matters.** `sampleN` in `src/data/format.ts` is a seeded LCG shuffle so a render produces the same draw twice. Don't replace it with `Math.random()` inside render paths.
- **Persistence boundary is `src/data/storage.ts`.** All `localStorage` access goes through it. Key is `examsim.attempts.v1` — bump the version suffix if the `Attempt` shape changes in a breaking way, and add a migration.
- **`ExamScreen` hides the top chrome.** `App.tsx` checks `route.name !== 'exam'`; preserve this when adding new routes that should feel "focused".

## Conventions

- TypeScript strict mode is on (`tsconfig.app.json`). Prefer `interface` for object shapes (see `src/types/exam.ts`), `type` for unions.
- Use `import type { … }` for type-only imports — the lint config will flag mixed imports.
- Tailwind v4 via `@tailwindcss/vite`; global tokens live in `src/styles/global.css`. Prefer utility classes over new CSS; only add to `global.css` for genuinely shared primitives (e.g. `.topbar`, `.brand`).
- Icons come from `lucide-react`. Don't add another icon library.
- Keep screens self-contained under `src/screens/`. Cross-screen logic belongs in `src/data/` or `src/types/`.

## Do / Don't

- **Don't** add a backend, auth, network calls, or analytics. This app is offline by design.
- **Don't** add dependencies without a clear reason — current footprint is intentionally small (React, Tailwind, lucide).
- **Don't** edit `dist/` or commit it.
- **Don't** mutate `Attempt` records in place; `storage.ts` treats them as immutable snapshots.
- **Do** keep dataset JSON valid against the `DatasetFile` type — there's no runtime validator, malformed files will throw at load.
- **Do** preserve `passingScore`, `defaultQuestionCount`, and `defaultDurationMinutes` semantics when touching `SetupScreen` or `SummaryScreen`: pass/fail is computed against `passingScore` as a percentage.

## Adding a new exam

Drop a JSON file in `src/datasets/` matching `DatasetFile` (`src/types/exam.ts`). Every question's `topicId` must exist in the exam's `topics`. Restart the dev server so Vite re-globs.

## Gotchas

- `Date.now() & 0xffff` is used as the shuffle seed in `ExamScreen`. It's intentional — keeps the seed small and stable across a single render. Don't "fix" it.
- `storage.ts` caps history at 100 attempts (`slice(0, 100)`). Older attempts are silently dropped.
- The top bar shows a hardcoded `v1.0` tag in `App.tsx`. If you bump it, update `package.json` too.

## When in doubt

Mirror the patterns already in `src/screens/` and `src/data/`. If a change would touch the `Route` union, the `Attempt` shape, or the dataset format, surface the trade-off before implementing — those are the load-bearing types.
