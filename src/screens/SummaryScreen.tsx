import { useMemo, useState } from 'react';
import type { Attempt, AttemptAnswer, Dataset, Question } from '../types/exam';
import type { NavFn } from '../App';
import { fmtClock, fmtDate, fmtMs } from '../data/format';
import { getAttempt } from '../data/storage';
import { topicNameOf } from '../data/loadDatasets';

export function SummaryScreen({
  dataset,
  attemptId,
  nav,
}: {
  dataset: Dataset;
  attemptId: string;
  nav: NavFn;
}) {
  const attempt = getAttempt(attemptId);

  if (!attempt) {
    return (
      <div className="container center" style={{ minHeight: '60vh' }}>
        <div className="col gap-16 tac">
          <div className="muted">This attempt could not be found.</div>
          <button className="btn primary" onClick={() => nav({ name: 'history' })}>
            Open history
          </button>
        </div>
      </div>
    );
  }

  return <SummaryContent attempt={attempt} dataset={dataset} nav={nav} />;
}

function SummaryContent({
  attempt,
  dataset,
  nav,
}: {
  attempt: Attempt;
  dataset: Dataset;
  nav: NavFn;
}) {
  const exam = dataset.exams.find((e) => e.id === attempt.examId)!;
  const qById = useMemo(
    () => Object.fromEntries(dataset.questions.map((q) => [q.id, q])),
    [dataset],
  );

  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const pct = Math.round((attempt.correctCount / attempt.total) * 100);
  const passed = pct >= exam.passingScore;
  const incorrect = attempt.answers.filter((a) => !a.correct && !a.skipped);
  const skipped = attempt.answers.filter((a) => a.skipped);
  const correctAnswers = attempt.answers.filter((a) => a.correct);

  const totalAnswered = attempt.answers.filter((a) => !a.skipped);
  const avgAll = totalAnswered.length
    ? totalAnswered.reduce((s, a) => s + a.elapsedMs, 0) / totalAnswered.length
    : 0;
  const avgCorrect = correctAnswers.length
    ? correctAnswers.reduce((s, a) => s + a.elapsedMs, 0) / correctAnswers.length
    : 0;
  const avgWrong = incorrect.length
    ? incorrect.reduce((s, a) => s + a.elapsedMs, 0) / incorrect.length
    : 0;

  const topicBreakdown = useMemo(() => {
    const map = new Map<string, { total: number; correct: number }>();
    attempt.answers.forEach((a) => {
      const m = map.get(a.topicId) ?? { total: 0, correct: 0 };
      m.total += 1;
      if (a.correct) m.correct += 1;
      map.set(a.topicId, m);
    });
    return [...map.entries()]
      .map(([topicId, v]) => ({
        topicId,
        name: topicNameOf(dataset, exam.id, topicId),
        ...v,
        pct: Math.round((v.correct / v.total) * 100),
      }))
      .sort((a, b) => a.pct - b.pct);
  }, [attempt, dataset, exam.id]);

  const weakTopics = topicBreakdown.filter((t) => t.pct < 70).slice(0, 3);

  return (
    <div className="container wide fade-in">
      <div className="col gap-48">
        <header
          className="col gap-24"
          style={{ paddingTop: 'calc(20px * var(--d))' }}
        >
          <div className="row gap-16 aic">
            <span className={`pill ${passed ? 'success' : 'error'}`}>
              {passed ? '✓ Passed' : '✕ Did not pass'}
            </span>
            <span className="tag">{exam.code}</span>
            <span
              className="muted"
              style={{ fontSize: 'calc(13px * var(--d))' }}
            >
              {fmtDate(attempt.startedAt)} ·{' '}
              {new Date(attempt.startedAt).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>

          <div className="row between aib wrap gap-32">
            <div className="col gap-8">
              <span className="eyebrow">Final score</span>
              <div className="row gap-16 aib">
                <span
                  className="display"
                  style={{
                    fontSize: 'calc(120px * var(--d))',
                    lineHeight: 0.95,
                  }}
                >
                  {pct}
                  <span style={{ fontSize: '0.4em', color: 'var(--fg-muted)' }}>
                    %
                  </span>
                </span>
                <div className="col" style={{ paddingBottom: 16 }}>
                  <span
                    className="mono"
                    style={{ fontSize: 'calc(16px * var(--d))' }}
                  >
                    {attempt.correctCount} / {attempt.total} correct
                  </span>
                  <span
                    className="muted mono"
                    style={{ fontSize: 'calc(13px * var(--d))' }}
                  >
                    Pass mark {exam.passingScore}% ·{' '}
                    {passed
                      ? `+${pct - exam.passingScore} pts`
                      : `${pct - exam.passingScore} pts`}
                  </span>
                </div>
              </div>
            </div>

            <div className="row gap-12">
              <button className="btn" onClick={() => nav({ name: 'home' })}>
                Back to exams
              </button>
              <button
                className="btn primary"
                onClick={() =>
                  nav({ name: 'setup', examId: attempt.examId })
                }
              >
                Try another mock
              </button>
            </div>
          </div>

          <div style={{ position: 'relative', marginTop: 8 }}>
            <div className="pbar" style={{ height: 8 }}>
              <div
                style={{
                  width: `${pct}%`,
                  background: passed ? 'var(--success)' : 'var(--error)',
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                }}
              />
            </div>
            <div
              style={{
                position: 'absolute',
                left: `${exam.passingScore}%`,
                top: -4,
                bottom: -4,
                width: 1.5,
                background: 'var(--fg)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: `${exam.passingScore}%`,
                top: 14,
                transform: 'translateX(-50%)',
                fontFamily: 'var(--font-mono)',
                fontSize: 'calc(11px * var(--d))',
                color: 'var(--fg-muted)',
                whiteSpace: 'nowrap',
              }}
            >
              Pass {exam.passingScore}%
            </div>
          </div>
        </header>

        <section
          className="row gap-48 wrap"
          style={{
            borderTop: '1px solid var(--border)',
            borderBottom: '1px solid var(--border)',
            padding: 'calc(28px * var(--d)) 0',
          }}
        >
          <div className="metric grow">
            <span className="lbl">Total time</span>
            <span className="val small mono">{fmtClock(attempt.durationMs)}</span>
            {attempt.timeLimitMs && (
              <span className="sub">
                of {fmtClock(attempt.timeLimitMs)} allowed
              </span>
            )}
          </div>
          <div className="metric grow">
            <span className="lbl">Avg per question</span>
            <span className="val small mono">{fmtMs(avgAll)}</span>
            <span className="sub">over {totalAnswered.length} answered</span>
          </div>
          <div className="metric grow">
            <span className="lbl">Avg when correct</span>
            <span
              className="val small mono"
              style={{ color: 'var(--success)' }}
            >
              {fmtMs(avgCorrect)}
            </span>
            <span className="sub">{correctAnswers.length} questions</span>
          </div>
          <div className="metric grow">
            <span className="lbl">Avg when wrong</span>
            <span className="val small mono" style={{ color: 'var(--error)' }}>
              {fmtMs(avgWrong)}
            </span>
            <span className="sub">
              {incorrect.length} questions
              {skipped.length ? `, ${skipped.length} skipped` : ''}
            </span>
          </div>
        </section>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.4fr 1fr',
            gap: 'calc(48px * var(--d))',
          }}
        >
          <section className="col gap-16">
            <div className="row between aib">
              <h2 className="serif" style={{ fontSize: 'calc(24px * var(--d))' }}>
                Question by question
              </h2>
              <div
                className="muted mono"
                style={{ fontSize: 'calc(12px * var(--d))' }}
              >
                Click any row to expand
              </div>
            </div>

            <div className="col gap-8">
              {attempt.answers.map((a, i) => {
                const q = qById[a.questionId];
                const isOpen = openIdx === i;
                return (
                  <QuestionRow
                    key={a.questionId}
                    a={a}
                    q={q}
                    topicName={topicNameOf(dataset, exam.id, a.topicId)}
                    index={i + 1}
                    isOpen={isOpen}
                    onToggle={() => setOpenIdx(isOpen ? null : i)}
                  />
                );
              })}
            </div>
          </section>

          <aside
            className="col gap-32"
            style={{ alignSelf: 'flex-start', position: 'sticky', top: 100 }}
          >
            <DistributionCard
              correct={correctAnswers.length}
              wrong={incorrect.length}
              skipped={skipped.length}
            />

            <section className="col gap-12">
              <h3 className="eyebrow">Topics breakdown</h3>
              <div className="col gap-8">
                {topicBreakdown.map((t) => (
                  <TopicBar key={t.topicId} {...t} />
                ))}
              </div>
            </section>

            {weakTopics.length > 0 && (
              <section
                className="card col gap-12"
                style={{
                  background: 'var(--bg-sunken)',
                  borderStyle: 'dashed',
                }}
              >
                <span className="eyebrow">Recommended focus</span>
                <div
                  className="serif"
                  style={{ fontSize: 'calc(17px * var(--d))', lineHeight: 1.4 }}
                >
                  You're below 70% in{' '}
                  {weakTopics.length === 1
                    ? 'one area'
                    : `${weakTopics.length} areas`}
                  .
                </div>
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: 20,
                    color: 'var(--fg-muted)',
                    fontSize: 'calc(13px * var(--d))',
                  }}
                >
                  {weakTopics.map((t) => (
                    <li key={t.topicId} style={{ marginBottom: 4 }}>
                      <span style={{ color: 'var(--fg)' }}>{t.name}</span> —{' '}
                      {t.correct}/{t.total} ({t.pct}%)
                    </li>
                  ))}
                </ul>
                <button
                  className="btn primary sm"
                  onClick={() => nav({ name: 'review' })}
                >
                  Review wrong answers →
                </button>
              </section>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

function QuestionRow({
  a,
  q,
  topicName,
  index,
  isOpen,
  onToggle,
}: {
  a: AttemptAnswer;
  q: Question | undefined;
  topicName: string;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
}) {
  if (!q) return null;
  const stateColor = a.skipped
    ? 'var(--fg-subtle)'
    : a.correct
      ? 'var(--success)'
      : 'var(--error)';
  const stateLabel = a.skipped ? 'Skipped' : a.correct ? 'Correct' : 'Wrong';
  const hasExplanation = q.explanation && q.explanation.trim().length > 0;

  return (
    <div
      className="card flush"
      style={{
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-md)',
        overflow: 'hidden',
      }}
    >
      <button
        onClick={onToggle}
        style={{
          display: 'grid',
          gridTemplateColumns: '32px 1fr auto auto',
          gap: 16,
          alignItems: 'center',
          padding: 'calc(14px * var(--d)) calc(18px * var(--d))',
          background: 'transparent',
          border: 0,
          cursor: 'pointer',
          width: '100%',
          textAlign: 'left',
          fontFamily: 'inherit',
          color: 'inherit',
        }}
      >
        <span
          className="mono"
          style={{
            fontSize: 'calc(13px * var(--d))',
            color: 'var(--fg-muted)',
          }}
        >
          {index.toString().padStart(2, '0')}
        </span>
        <span
          style={{
            fontSize: 'calc(14px * var(--d))',
            display: '-webkit-box',
            WebkitLineClamp: 1,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {q.statement}
        </span>
        <span
          className="mono muted"
          style={{ fontSize: 'calc(12px * var(--d))' }}
        >
          {fmtMs(a.elapsedMs)}
        </span>
        <span className="row gap-8 aic">
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: stateColor,
              display: 'inline-block',
            }}
          />
          <span
            style={{
              fontSize: 'calc(12px * var(--d))',
              color: stateColor,
              fontWeight: 500,
              minWidth: 56,
            }}
          >
            {stateLabel}
          </span>
          <span
            className="mono muted"
            style={{
              fontSize: 'calc(12px * var(--d))',
              width: 14,
              textAlign: 'right',
            }}
          >
            {isOpen ? '−' : '+'}
          </span>
        </span>
      </button>

      {isOpen && (
        <div
          className="fade-in"
          style={{
            borderTop: '1px solid var(--border)',
            padding:
              'calc(20px * var(--d)) calc(20px * var(--d)) calc(24px * var(--d)) calc(20px * var(--d))',
            background: 'var(--bg-sunken)',
          }}
        >
          <div className="col gap-12">
            <div className="row gap-12 aic">
              <span
                className="tag"
                style={{
                  padding: '2px 8px',
                  border: '1px solid var(--border)',
                  borderRadius: 999,
                }}
              >
                {topicName}
              </span>
              {a.flagged && (
                <span
                  className="pill"
                  style={{
                    color: 'var(--warning)',
                    borderColor: 'var(--warning)',
                  }}
                >
                  ★ Flagged
                </span>
              )}
              {q.multi && <span className="pill accent">Multi-select</span>}
            </div>
            <p
              className="serif"
              style={{
                fontSize: 'calc(17px * var(--d))',
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              {q.statement}
            </p>
            <div className="col gap-6">
              {q.options.map((opt) => {
                const isCorrect = q.correctOptionIds.includes(opt.id);
                const isUserSel = a.selected.includes(opt.id);
                const state = isCorrect
                  ? 'correct'
                  : isUserSel
                    ? 'incorrect'
                    : 'disabled';
                return (
                  <div
                    key={opt.id}
                    className="opt"
                    data-state={state}
                    style={{
                      cursor: 'default',
                      padding: 'calc(10px * var(--d)) calc(14px * var(--d))',
                      fontSize: 'calc(14px * var(--d))',
                    }}
                  >
                    <span className="key">{opt.id}</span>
                    <span className="text">{opt.text}</span>
                    {isCorrect && <span className="badge correct">Correct</span>}
                    {!isCorrect && isUserSel && (
                      <span className="badge incorrect">Your pick</span>
                    )}
                  </div>
                );
              })}
            </div>
            {hasExplanation && (
              <div className="col gap-4" style={{ paddingTop: 4 }}>
                <span className="eyebrow">Explanation</span>
                <div
                  style={{
                    fontSize: 'calc(14px * var(--d))',
                    lineHeight: 1.6,
                    color: 'var(--fg-muted)',
                  }}
                >
                  {q.explanation}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DistributionCard({
  correct,
  wrong,
  skipped,
}: {
  correct: number;
  wrong: number;
  skipped: number;
}) {
  const total = correct + wrong + skipped;
  if (total === 0) return null;
  const cw = (correct / total) * 100;
  const ww = (wrong / total) * 100;
  const sw = (skipped / total) * 100;
  return (
    <section className="col gap-12">
      <h3 className="eyebrow">Distribution</h3>
      <div
        style={{
          display: 'flex',
          height: 36,
          borderRadius: 'var(--r-sm)',
          overflow: 'hidden',
          border: '1px solid var(--border)',
        }}
      >
        {correct > 0 && (
          <div style={{ width: `${cw}%`, background: 'var(--success)' }} />
        )}
        {wrong > 0 && (
          <div style={{ width: `${ww}%`, background: 'var(--error)' }} />
        )}
        {skipped > 0 && (
          <div
            style={{
              width: `${sw}%`,
              background: 'var(--bg-sunken)',
              borderLeft: '1px solid var(--border)',
            }}
          />
        )}
      </div>
      <div className="row between" style={{ fontSize: 'calc(12px * var(--d))' }}>
        <span className="row gap-6 aic">
          <Swatch color="var(--success)" />
          Correct <span className="mono" style={{ marginLeft: 4 }}>
            {correct}
          </span>
        </span>
        <span className="row gap-6 aic">
          <Swatch color="var(--error)" />
          Wrong <span className="mono" style={{ marginLeft: 4 }}>
            {wrong}
          </span>
        </span>
        {skipped > 0 && (
          <span className="row gap-6 aic">
            <Swatch color="var(--bg-sunken)" border />
            Skipped <span className="mono" style={{ marginLeft: 4 }}>
              {skipped}
            </span>
          </span>
        )}
      </div>
    </section>
  );
}

function Swatch({ color, border }: { color: string; border?: boolean }) {
  return (
    <span
      style={{
        width: 10,
        height: 10,
        borderRadius: 2,
        background: color,
        border: border ? '1px solid var(--border)' : '0',
        display: 'inline-block',
      }}
    />
  );
}

function TopicBar({
  name,
  total,
  correct,
  pct,
}: {
  topicId: string;
  name: string;
  total: number;
  correct: number;
  pct: number;
}) {
  const color =
    pct >= 80 ? 'var(--success)' : pct >= 60 ? 'var(--warning)' : 'var(--error)';
  return (
    <div className="col gap-4">
      <div className="row between" style={{ fontSize: 'calc(13px * var(--d))' }}>
        <span>{name}</span>
        <span className="mono muted">
          {correct}/{total} · <span style={{ color }}>{pct}%</span>
        </span>
      </div>
      <div className="pbar">
        <div style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}
