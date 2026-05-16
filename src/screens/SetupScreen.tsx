import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Dataset } from '../types/exam';
import type { NavFn } from '../App';

export function SetupScreen({
  dataset,
  examId,
  nav,
}: {
  dataset: Dataset;
  examId: string;
  nav: NavFn;
}) {
  const exam = dataset.exams.find((e) => e.id === examId)!;
  const examQs = useMemo(
    () => dataset.questions.filter((q) => q.examId === examId),
    [dataset, examId],
  );
  const totalQs = examQs.length;

  const presets = useMemo(() => {
    const set = new Set([10, 25, exam.defaultQuestionCount, totalQs]);
    return [...set].filter((n) => n <= totalQs).sort((a, b) => a - b);
  }, [exam, totalQs]);

  const topicCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const q of examQs) {
      map.set(q.topicId, (map.get(q.topicId) ?? 0) + 1);
    }
    return exam.topics
      .map((t) => ({ ...t, count: map.get(t.id) ?? 0 }))
      .filter((t) => t.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [examQs, exam.topics]);

  const [count, setCount] = useState(exam.defaultQuestionCount);
  const [timeLimitOn, setTimeLimitOn] = useState(true);
  const [durationMin, setDurationMin] = useState(exam.defaultDurationMinutes);
  const [showFeedback, setShowFeedback] = useState(false);
  const [shuffleAnswers, setShuffleAnswers] = useState(true);
  const [topicFilter, setTopicFilter] = useState<string>('all');

  const availableQs =
    topicFilter === 'all'
      ? totalQs
      : (topicCounts.find((t) => t.id === topicFilter)?.count ?? 0);
  const effectiveCount = Math.min(count, availableQs);

  const start = () => {
    nav({
      name: 'exam',
      config: {
        examId,
        count: effectiveCount,
        timeLimitMs: timeLimitOn ? durationMin * 60 * 1000 : null,
        showFeedback,
        shuffleAnswers,
        topicFilter,
      },
    });
  };

  return (
    <div className="container narrow fade-in">
      <div className="col gap-32">
        <div className="col gap-8">
          <button
            className="btn ghost sm"
            onClick={() => nav({ name: 'home' })}
            style={{ alignSelf: 'flex-start', marginLeft: -12 }}
          >
            ← Exams
          </button>
          <div className="row gap-12 aic" style={{ paddingTop: 8 }}>
            <span className="pill">{exam.provider}</span>
            <span className="tag">{exam.code}</span>
          </div>
          <h1
            className="display"
            style={{ fontSize: 'calc(48px * var(--d))', marginTop: 8 }}
          >
            Configure your mock
          </h1>
          <p className="muted">
            {exam.name} — {totalQs} questions available. The official exam is{' '}
            {exam.defaultQuestionCount} questions in {exam.defaultDurationMinutes}{' '}
            minutes, with a {exam.passingScore}% pass mark.
          </p>
        </div>

        <Field
          label="01"
          title="How many questions?"
          hint={`From a pool of ${availableQs} matching questions.`}
        >
          <div className="row gap-8 wrap">
            {presets.map((n) => (
              <button
                key={n}
                className={`btn sm ${count === n ? 'primary' : ''}`}
                onClick={() => setCount(n)}
              >
                {n === exam.defaultQuestionCount && n !== totalQs
                  ? `${n} (official)`
                  : n === totalQs
                    ? `${n} (all)`
                    : n}
              </button>
            ))}
          </div>
          <div className="row gap-12 aic" style={{ marginTop: 12 }}>
            <input
              type="range"
              min={1}
              max={availableQs}
              value={Math.min(count, availableQs)}
              onChange={(e) => setCount(parseInt(e.target.value, 10))}
              style={{ flex: 1, accentColor: 'var(--fg)' }}
            />
            <span
              className="mono"
              style={{ minWidth: 60, textAlign: 'right' }}
            >
              {effectiveCount}
              <span className="muted"> / {availableQs}</span>
            </span>
          </div>
        </Field>

        <Field
          label="02"
          title="Topic focus"
          hint="Narrow practice to a specific area, or include everything."
        >
          <div className="row gap-8 wrap">
            <button
              className={`btn sm ${topicFilter === 'all' ? 'primary' : ''}`}
              onClick={() => setTopicFilter('all')}
            >
              All topics{' '}
              <span className="mono muted" style={{ marginLeft: 6 }}>
                {totalQs}
              </span>
            </button>
            {topicCounts.map((t) => (
              <button
                key={t.id}
                className={`btn sm ${topicFilter === t.id ? 'primary' : ''}`}
                onClick={() => setTopicFilter(t.id)}
              >
                {t.name}{' '}
                <span className="mono muted" style={{ marginLeft: 6 }}>
                  {t.count}
                </span>
              </button>
            ))}
          </div>
        </Field>

        <Field
          label="03"
          title="Time limit"
          hint="A countdown will appear, with a warning when 5 minutes remain."
        >
          <div className="row gap-16 aic wrap">
            <Switch value={timeLimitOn} onChange={setTimeLimitOn} />
            <span style={{ fontSize: 'calc(14px * var(--d))' }}>
              {timeLimitOn ? 'Timed' : 'Untimed practice'}
            </span>
            {timeLimitOn && (
              <div
                className="row gap-8 aic"
                style={{ marginLeft: 'auto' }}
              >
                <input
                  type="number"
                  min={1}
                  max={300}
                  value={durationMin}
                  onChange={(e) =>
                    setDurationMin(parseInt(e.target.value || '0', 10) || 1)
                  }
                  style={{ width: 80, textAlign: 'right' }}
                />
                <span className="muted">minutes</span>
              </div>
            )}
          </div>
          {timeLimitOn && (
            <div className="row gap-8" style={{ marginTop: 10 }}>
              {[
                { label: 'Suggested', val: Math.round(effectiveCount * 2) },
                {
                  label: 'Official pace',
                  val: Math.round(
                    effectiveCount *
                      (exam.defaultDurationMinutes / exam.defaultQuestionCount),
                  ),
                },
                {
                  label: 'Sprint',
                  val: Math.max(5, Math.round(effectiveCount * 1)),
                },
              ].map((opt) => (
                <button
                  key={opt.label}
                  className="btn ghost sm"
                  onClick={() => setDurationMin(opt.val)}
                  style={{ border: '1px dashed var(--border)' }}
                >
                  <span className="muted">{opt.label}</span>{' '}
                  <span className="mono">{opt.val}m</span>
                </button>
              ))}
            </div>
          )}
        </Field>

        <Field
          label="04"
          title="Reveal answer between questions?"
          hint="When on, after each question you'll see the correct answer in green and your incorrect selection in red."
        >
          <div className="col gap-8">
            <OptionRow
              active={!showFeedback}
              onClick={() => setShowFeedback(false)}
              title="Exam mode"
              desc="No feedback during the test. See all corrections in the final summary."
            />
            <OptionRow
              active={showFeedback}
              onClick={() => setShowFeedback(true)}
              title="Study mode"
              desc="Reveal the correct answer after each question before moving on."
            />
          </div>
        </Field>

        <Field label="05" title="Other options">
          <div className="row gap-16 aic">
            <Switch value={shuffleAnswers} onChange={setShuffleAnswers} />
            <div>
              <div style={{ fontSize: 'calc(14px * var(--d))' }}>
                Shuffle answer choices
              </div>
              <div
                className="muted"
                style={{ fontSize: 'calc(12px * var(--d))' }}
              >
                Randomise A–D order per question.
              </div>
            </div>
          </div>
        </Field>

        <div
          className="card col gap-16"
          style={{ background: 'var(--bg-sunken)', borderStyle: 'dashed' }}
        >
          <div className="row between aib wrap gap-16">
            <div className="col gap-4">
              <span className="eyebrow">Your mock</span>
              <h3
                className="serif"
                style={{ fontSize: 'calc(22px * var(--d))' }}
              >
                {effectiveCount} questions{' '}
                {timeLimitOn ? <>· {durationMin}-minute timer</> : '· untimed'}{' '}
                {showFeedback && '· study mode'}
              </h3>
              <div
                className="muted"
                style={{ fontSize: 'calc(13px * var(--d))' }}
              >
                {topicFilter === 'all'
                  ? 'All topics'
                  : `Topic: ${topicCounts.find((t) => t.id === topicFilter)?.name ?? topicFilter}`}{' '}
                · {shuffleAnswers ? 'shuffled' : 'fixed order'}
              </div>
            </div>
            <button
              className="btn primary lg"
              onClick={start}
              disabled={effectiveCount === 0}
            >
              Begin mock{' '}
              <span style={{ fontFamily: 'var(--font-mono)' }}>→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  title,
  hint,
  children,
}: {
  label: string;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section
      className="col gap-12"
      style={{ paddingTop: 'calc(16px * var(--d))' }}
    >
      <div className="row gap-16 aib">
        <span
          className="mono subtle"
          style={{ width: 28, fontSize: 'calc(12px * var(--d))' }}
        >
          {label}
        </span>
        <div className="col gap-2 grow">
          <h3 className="serif" style={{ fontSize: 'calc(22px * var(--d))' }}>
            {title}
          </h3>
          {hint && (
            <p
              className="muted"
              style={{ fontSize: 'calc(13px * var(--d))', margin: 0 }}
            >
              {hint}
            </p>
          )}
        </div>
      </div>
      <div style={{ marginLeft: 44 }}>{children}</div>
    </section>
  );
}

function OptionRow({
  active,
  onClick,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  desc: string;
}) {
  return (
    <button
      className="opt"
      onClick={onClick}
      data-state={active ? 'selected' : ''}
    >
      <span className="key" style={{ borderRadius: '50%' }}>
        {active ? '●' : ''}
      </span>
      <span className="text">
        <strong style={{ display: 'block', marginBottom: 2 }}>{title}</strong>
        <span className="muted" style={{ fontSize: 'calc(13px * var(--d))' }}>
          {desc}
        </span>
      </span>
    </button>
  );
}

export function Switch({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: 40,
        height: 22,
        borderRadius: 999,
        padding: 2,
        border: '1px solid var(--border-strong)',
        background: value ? 'var(--fg)' : 'var(--bg-sunken)',
        cursor: 'pointer',
        display: 'flex',
        justifyContent: value ? 'flex-end' : 'flex-start',
        transition: 'background .15s ease',
      }}
      aria-pressed={value}
    >
      <span
        style={{
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: value ? 'var(--bg)' : 'var(--fg-muted)',
          transition: 'background .15s ease',
        }}
      />
    </button>
  );
}
