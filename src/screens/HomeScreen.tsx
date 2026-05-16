import type { Dataset, Exam } from '../types/exam';
import type { NavFn } from '../App';
import { getAttempts } from '../data/storage';

const HEADLINE = 'The shortest path to certified.';

export function HomeScreen({ dataset, nav }: { dataset: Dataset; nav: NavFn }) {
  return (
    <div className="container narrow fade-in">
      <div className="col gap-48">
        <header className="col gap-24" style={{ paddingTop: 'calc(40px * var(--d))' }}>
          <div className="eyebrow">Exam preparation, deliberate.</div>
          <h1 className="display" style={{ fontSize: 'calc(64px * var(--d))' }}>
            {HEADLINE}
          </h1>
          <p
            className="muted"
            style={{
              fontSize: 'calc(17px * var(--d))',
              lineHeight: 1.55,
            }}
          >
            Configure a timed mock, review your weak spots, and track every attempt.
            Built for focused study sessions — not noise.
          </p>
        </header>

        <section className="col gap-16">
          <div className="row between aib">
            <h2 className="serif" style={{ fontSize: 'calc(28px * var(--d))' }}>
              Available exams
            </h2>
            <span className="muted" style={{ fontSize: 'calc(13px * var(--d))' }}>
              {dataset.exams.length} {dataset.exams.length === 1 ? 'exam' : 'exams'}
            </span>
          </div>

          <div className="col gap-12">
            {dataset.exams.map((exam) => (
              <ExamCard
                key={exam.id}
                exam={exam}
                dataset={dataset}
                onPick={() => nav({ name: 'setup', examId: exam.id })}
              />
            ))}
          </div>
        </section>

        <footer
          className="muted tac"
          style={{ fontSize: 'calc(12px * var(--d))', padding: '24px 0' }}
        >
          Drop new datasets into <span className="mono">src/datasets/</span> to add exams.
        </footer>
      </div>
    </div>
  );
}

function ExamCard({
  exam,
  dataset,
  onPick,
}: {
  exam: Exam;
  dataset: Dataset;
  onPick: () => void;
}) {
  const qs = dataset.questions.filter((q) => q.examId === exam.id);
  const examAttempts = getAttempts().filter((a) => a.examId === exam.id);
  const bestPct = examAttempts.length
    ? Math.max(...examAttempts.map((a) => Math.round((a.correctCount / a.total) * 100)))
    : null;

  return (
    <button
      className="card clickable col gap-16"
      onClick={onPick}
      style={{
        textAlign: 'left',
        cursor: 'pointer',
        fontFamily: 'inherit',
        color: 'inherit',
        padding: 'calc(28px * var(--d)) calc(32px * var(--d))',
      }}
    >
      <div className="row between aic">
        <div className="row gap-12 aic">
          <span className="pill">{exam.provider}</span>
          <span className="tag">{exam.code}</span>
        </div>
        <span className="muted" style={{ fontSize: 'calc(13px * var(--d))' }}>
          Pass ≥ {exam.passingScore}%
        </span>
      </div>

      <h3
        className="display"
        style={{ fontSize: 'calc(36px * var(--d))' }}
      >
        {exam.name}
      </h3>

      <div
        className="row gap-32 wrap"
        style={{ fontSize: 'calc(13px * var(--d))' }}
      >
        <span>
          <span className="muted">Questions</span>{' '}
          <strong className="mono">{qs.length}</strong>
        </span>
        <span>
          <span className="muted">Topics</span>{' '}
          <strong className="mono">{exam.topics.length}</strong>
        </span>
        <span>
          <span className="muted">Default mock</span>{' '}
          <strong className="mono">
            {exam.defaultQuestionCount} · {exam.defaultDurationMinutes}m
          </strong>
        </span>
        {bestPct != null && (
          <span>
            <span className="muted">Best</span>{' '}
            <strong className="mono">{bestPct}%</strong>
          </span>
        )}
      </div>

      <div
        className="row between aic"
        style={{ paddingTop: 'calc(4px * var(--d))' }}
      >
        <div className="row gap-8 wrap" style={{ maxWidth: '60%' }}>
          {exam.topics.slice(0, 5).map((t) => (
            <span
              key={t.id}
              className="tag"
              style={{
                padding: '2px 8px',
                border: '1px solid var(--border)',
                borderRadius: 999,
              }}
            >
              {t.name}
            </span>
          ))}
          {exam.topics.length > 5 && (
            <span className="tag">+{exam.topics.length - 5}</span>
          )}
        </div>
        <span
          className="row gap-8 aic"
          style={{ color: 'var(--fg)', fontSize: 'calc(14px * var(--d))' }}
        >
          Start a mock <span style={{ fontFamily: 'var(--font-mono)' }}>→</span>
        </span>
      </div>
    </button>
  );
}
