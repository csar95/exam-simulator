# Exam Simulator

A local-first, offline practice tool for certification-style multiple-choice exams. Built with React 19, TypeScript and Vite, styled with Tailwind CSS v4. All progress is stored in the browser via `localStorage` — there is no backend.

The app ships with a sample dataset for the **AWS Certified AI Practitioner (AIF-C01)** exam, but it is dataset-agnostic: dropping additional JSON files into `src/datasets/` is enough to register new exams.

## Features

- **Multiple exams** auto-discovered from `src/datasets/*.json` via Vite's `import.meta.glob`.
- **Configurable runs** — choose question count, time limit (or untimed), topic filter, answer shuffling, and whether to receive per-question feedback during the attempt.
- **Single- and multi-answer questions** detected automatically from the dataset (`correctOptionIds.length > 1`).
- **Deterministic shuffling** with a seeded LCG so the same draw can be reproduced within a render.
- **Live timer** with countdown when a time limit is set, plus per-question elapsed time tracking.
- **Flagging and review** of questions during the attempt.
- **Attempt history** with score, duration and pass/fail vs. the exam's `passingScore`, persisted across sessions.
- **Detailed review screen** to revisit previous attempts question by question.
- **Keyboard-friendly, responsive UI** with no chrome during the exam itself for a focused, test-like view.

## Tech stack

- React `^19.2` + TypeScript `~6.0`
- Vite `^8` with `@vitejs/plugin-react`
- Tailwind CSS `^4.3` via `@tailwindcss/vite`
- `lucide-react` icons
- ESLint 10 with `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`

## Getting started

Requirements: Node.js 20+ and npm.

```bash
npm install
npm run dev       # start Vite dev server with HMR
npm run build     # type-check (tsc -b) and produce a production build in dist/
npm run preview   # preview the production build locally
npm run lint      # run ESLint over the project
```

## Project structure

```
src/
├── App.tsx                 # Router-less screen switcher + top navigation
├── main.tsx                # React entry point
├── types/
│   └── exam.ts             # Dataset, Exam, Question, Attempt, Route types
├── data/
│   ├── loadDatasets.ts     # Eager glob-imports every dataset JSON
│   ├── storage.ts          # localStorage wrapper for attempt history
│   └── format.ts           # Time/date formatting, seeded sampler, array equality
├── datasets/
│   └── aws-aif-c01.json    # Sample exam (AWS AI Practitioner)
├── screens/
│   ├── HomeScreen.tsx      # Exam catalogue
│   ├── SetupScreen.tsx     # Per-attempt configuration
│   ├── ExamScreen.tsx      # The exam runner itself
│   ├── SummaryScreen.tsx   # Post-attempt results
│   ├── HistoryScreen.tsx   # All saved attempts
│   └── ReviewScreen.tsx    # Question-by-question review
└── styles/
    └── global.css          # Tailwind layer + custom styles
```

Navigation is intentionally state-based (a discriminated `Route` union in `App.tsx`) rather than URL-based; there is no router dependency.

## Adding a new exam

Each exam is a single JSON file in `src/datasets/`. The expected shape is defined by the `DatasetFile` type in `src/types/exam.ts`:

```json
{
  "exam": {
    "id": "unique-exam-id",
    "name": "Human-readable exam name",
    "code": "EXAM-CODE",
    "provider": "Provider name",
    "passingScore": 72,
    "defaultQuestionCount": 65,
    "defaultDurationMinutes": 130,
    "topics": [
      { "id": "topic-id", "name": "Topic name" }
    ]
  },
  "questions": [
    {
      "id": "q-001",
      "topicId": "topic-id",
      "statement": "Question text…",
      "options": [
        { "id": "A", "text": "Option A" },
        { "id": "B", "text": "Option B" }
      ],
      "correctOptionIds": ["B"],
      "explanation": "Why B is correct…"
    }
  ]
}
```

Notes:
- `correctOptionIds` with more than one entry automatically flags the question as multi-answer.
- Every question's `topicId` should match a topic declared on the exam; the UI uses topic names in setup filters and in review.
- Vite picks up new files at dev-server start, so restart `npm run dev` after adding a dataset.

## Data persistence

Attempts are stored in `localStorage` under the key `examsim.attempts.v1`. The store keeps the 100 most recent attempts and exposes `getAttempts`, `getAttempt`, `saveAttempt`, and `deleteAttempt` in `src/data/storage.ts`. Clearing site data wipes the history.

## License

No license declared yet — treat as "all rights reserved" until one is added.
