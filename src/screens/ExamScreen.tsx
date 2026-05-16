import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type {
  Attempt,
  AttemptAnswer,
  Dataset,
  Exam,
  ExamConfig,
  Question,
} from '../types/exam';
import type { NavFn } from '../App';
import { arrayEq, fmtClock, sampleN } from '../data/format';
import { saveAttempt } from '../data/storage';
import { topicNameOf } from '../data/loadDatasets';

interface AnswerState {
  selected: string[];
  revealed: boolean;
  flagged: boolean;
}

const emptyAnswer: AnswerState = { selected: [], revealed: false, flagged: false };

export function ExamScreen({
  dataset,
  config,
  nav,
}: {
  dataset: Dataset;
  config: ExamConfig;
  nav: NavFn;
}) {
  const exam = dataset.exams.find((e) => e.id === config.examId)!;

  const questions = useMemo(() => {
    let pool = dataset.questions.filter((q) => q.examId === config.examId);
    if (config.topicFilter && config.topicFilter !== 'all') {
      pool = pool.filter((q) => q.topicId === config.topicFilter);
    }
    const seed = Date.now() & 0xffff;
    const sampled = sampleN(pool, config.count, seed);
    if (config.shuffleAnswers) {
      return sampled.map((q, i) => {
        const opts = q.options.slice();
        let s = (seed + i * 7) | 0 || 1;
        for (let k = opts.length - 1; k > 0; k--) {
          s = (s * 9301 + 49297) % 233280;
          const j = Math.floor((s / 233280) * (k + 1));
          [opts[k], opts[j]] = [opts[j], opts[k]];
        }
        return { ...q, options: opts };
      });
    }
    return sampled;
  }, [dataset, config]);

  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [showPause, setShowPause] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showNavigator, setShowNavigator] = useState(false);
  const [now, setNow] = useState(Date.now());

  const startedAtRef = useRef(Date.now());
  const questionStartRef = useRef(Date.now());
  const timeAccumRef = useRef<Record<string, number>>({});
  const pauseStartRef = useRef<number | null>(null);
  const totalPausedRef = useRef(0);

  const q = questions[idx];
  const ans = q ? (answers[q.id] ?? emptyAnswer) : emptyAnswer;

  useEffect(() => {
    if (showPause) {
      pauseStartRef.current = Date.now();
    } else if (pauseStartRef.current) {
      totalPausedRef.current += Date.now() - pauseStartRef.current;
      pauseStartRef.current = null;
      questionStartRef.current = Date.now();
    }
  }, [showPause]);

  useEffect(() => {
    if (showPause) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [showPause]);

  const sumPaused =
    totalPausedRef.current + (pauseStartRef.current ? now - pauseStartRef.current : 0);
  const elapsedTotal = now - startedAtRef.current - sumPaused;
  const remaining = config.timeLimitMs ? config.timeLimitMs - elapsedTotal : null;
  const timeUp = remaining != null && remaining <= 0;

  const commitTime = useCallback((qid: string) => {
    const elapsed = Date.now() - questionStartRef.current;
    timeAccumRef.current[qid] = (timeAccumRef.current[qid] ?? 0) + elapsed;
    questionStartRef.current = Date.now();
  }, []);

  const finishExam = useCallback(
    (forced: boolean) => {
      if (q) commitTime(q.id);
      const attempt = buildAttempt(
        questions,
        answers,
        timeAccumRef.current,
        startedAtRef.current,
        config,
        exam,
        forced,
      );
      saveAttempt(attempt);
      nav({ name: 'summary', attemptId: attempt.id });
    },
    [questions, answers, config, exam, nav, q, commitTime],
  );

  useEffect(() => {
    if (timeUp && !showPause) finishExam(true);
  }, [timeUp, showPause, finishExam]);

  const setIndex = useCallback(
    (i: number) => {
      if (q) commitTime(q.id);
      setIdx(i);
    },
    [q, commitTime],
  );

  const next = useCallback(() => {
    if (idx < questions.length - 1) setIndex(idx + 1);
    else finishExam(false);
  }, [idx, questions.length, setIndex, finishExam]);

  const prev = useCallback(() => {
    if (idx > 0) setIndex(idx - 1);
  }, [idx, setIndex]);

  const toggle = useCallback(
    (optId: string) => {
      if (!q || ans.revealed) return;
      const max = (q.correctOptionIds || []).length || 1;
      setAnswers((prev) => {
        const cur = prev[q.id] ?? emptyAnswer;
        let selected = cur.selected.includes(optId)
          ? cur.selected.filter((x) => x !== optId)
          : [...cur.selected, optId];
        if (selected.length > max) selected = selected.slice(-max);
        return { ...prev, [q.id]: { ...cur, selected } };
      });
    },
    [q, ans.revealed],
  );

  const reveal = useCallback(() => {
    if (!q) return;
    setAnswers((prev) => {
      const cur = prev[q.id] ?? emptyAnswer;
      return { ...prev, [q.id]: { ...cur, revealed: true } };
    });
  }, [q]);

  const toggleFlag = useCallback(() => {
    if (!q) return;
    setAnswers((prev) => {
      const cur = prev[q.id] ?? emptyAnswer;
      return { ...prev, [q.id]: { ...cur, flagged: !cur.flagged } };
    });
  }, [q]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (showPause || showExitConfirm) return;
      if (showNavigator) {
        if (e.key === 'Escape') setShowNavigator(false);
        return;
      }
      if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'f' || e.key === 'F') toggleFlag();
      else if (e.key === 'g' || e.key === 'G') setShowNavigator(true);
      else if (/^[1-9]$/.test(e.key)) {
        const i = parseInt(e.key, 10) - 1;
        if (q && q.options[i]) toggle(q.options[i].id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showPause, showExitConfirm, showNavigator, next, prev, toggleFlag, toggle, q]);

  if (!q) {
    return (
      <div className="container center" style={{ minHeight: '80vh' }}>
        <div className="muted">No questions match this configuration.</div>
      </div>
    );
  }

  const answeredCount = Object.values(answers).filter(
    (a) => a.selected.length > 0,
  ).length;
  const flaggedCount = Object.values(answers).filter((a) => a.flagged).length;

  const optState = (optId: string): string => {
    const isSelected = ans.selected.includes(optId);
    if (ans.revealed) {
      const isCorrect = q.correctOptionIds.includes(optId);
      if (isCorrect) return 'correct';
      if (isSelected) return 'incorrect';
      return 'disabled';
    }
    return isSelected ? 'selected' : '';
  };

  const topicName = topicNameOf(dataset, exam.id, q.topicId);
  const hasExplanation = q.explanation && q.explanation.trim().length > 0;

  return (
    <div className="exam-shell">
      <ExamHeader
        exam={exam}
        idx={idx}
        total={questions.length}
        answeredCount={answeredCount}
        flaggedCount={flaggedCount}
        remaining={remaining}
        onPause={() => setShowPause(true)}
        onExit={() => setShowExitConfirm(true)}
        onOpenNavigator={() => setShowNavigator(true)}
      />

      <div
        className="container wide"
        style={{
          paddingTop: 'calc(40px * var(--d))',
          paddingBottom: 'calc(120px * var(--d))',
        }}
      >
        <div
          className="col gap-32"
          style={{ maxWidth: 820, margin: '0 auto' }}
        >
          <div className="row between aic">
            <div className="row gap-12 aic">
              <span
                className="mono subtle"
                style={{ fontSize: 'calc(13px * var(--d))' }}
              >
                Question{' '}
                <strong style={{ color: 'var(--fg)' }}>
                  {(idx + 1).toString().padStart(2, '0')}
                </strong>
                <span className="muted"> / {questions.length}</span>
              </span>
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
              {q.multi && <span className="pill accent">Select 2</span>}
            </div>
            <button
              className="btn ghost sm"
              onClick={toggleFlag}
              style={
                ans.flagged
                  ? {
                      color: 'var(--warning)',
                      borderColor: 'var(--warning)',
                      border: '1px solid',
                    }
                  : undefined
              }
            >
              {ans.flagged ? '★ Flagged for review' : '☆ Flag for review'}
            </button>
          </div>

          <h2
            style={{
              fontSize: 'calc(22px * var(--d))',
              lineHeight: 1.4,
              fontWeight: 400,
            }}
          >
            {q.statement}
          </h2>

          <div className="col gap-12">
            {q.options.map((opt) => (
              <button
                key={opt.id}
                className="opt fade-in"
                data-state={optState(opt.id)}
                onClick={() => toggle(opt.id)}
                disabled={ans.revealed}
              >
                <span className="key">{opt.id}</span>
                <span className="text">{opt.text}</span>
                {ans.revealed && q.correctOptionIds.includes(opt.id) && (
                  <span className="badge correct">Correct</span>
                )}
                {ans.revealed &&
                  !q.correctOptionIds.includes(opt.id) &&
                  ans.selected.includes(opt.id) && (
                    <span className="badge incorrect">Your pick</span>
                  )}
              </button>
            ))}
          </div>

          {q.multi && !ans.revealed && (
            <div
              className="muted mono"
              style={{ fontSize: 'calc(12px * var(--d))' }}
            >
              {ans.selected.length} / {q.correctOptionIds.length} selected
            </div>
          )}

          {ans.revealed && hasExplanation && (
            <div
              className="card fade-in"
              style={{
                background: 'var(--bg-sunken)',
                borderLeft: '3px solid var(--accent)',
                borderRadius: 'var(--r-md)',
              }}
            >
              <div className="eyebrow" style={{ marginBottom: 8 }}>
                Explanation
              </div>
              <div
                style={{ fontSize: 'calc(15px * var(--d))', lineHeight: 1.6 }}
              >
                {q.explanation}
              </div>
            </div>
          )}
        </div>
      </div>

      <ExamFooter
        idx={idx}
        total={questions.length}
        canReveal={config.showFeedback && !ans.revealed && ans.selected.length > 0}
        revealed={ans.revealed}
        hasSelection={ans.selected.length > 0}
        showFeedback={config.showFeedback}
        onPrev={prev}
        onNext={next}
        onReveal={reveal}
        onFinish={() => finishExam(false)}
        isLast={idx === questions.length - 1}
      />

      {showPause && (
        <PauseModal
          onResume={() => setShowPause(false)}
          onExit={() => {
            setShowPause(false);
            setShowExitConfirm(true);
          }}
        />
      )}
      {showExitConfirm && (
        <ExitModal
          answered={answeredCount}
          total={questions.length}
          onCancel={() => setShowExitConfirm(false)}
          onSubmit={() => {
            setShowExitConfirm(false);
            finishExam(false);
          }}
          onDiscard={() => nav({ name: 'home' })}
        />
      )}
      {showNavigator && (
        <NavigatorModal
          questions={questions}
          answers={answers}
          idx={idx}
          onPick={(i) => {
            setIndex(i);
            setShowNavigator(false);
          }}
          onClose={() => setShowNavigator(false)}
          onFinish={() => {
            setShowNavigator(false);
            finishExam(false);
          }}
        />
      )}
    </div>
  );
}

function buildAttempt(
  questions: Question[],
  answers: Record<string, AnswerState>,
  times: Record<string, number>,
  startedAt: number,
  config: ExamConfig,
  exam: Exam,
  forced: boolean,
): Attempt {
  const finishedAt = Date.now();
  const attemptAnswers: AttemptAnswer[] = questions.map((q) => {
    const a = answers[q.id] ?? emptyAnswer;
    const elapsedMs = times[q.id] ?? 0;
    const selected = a.selected;
    const skipped = selected.length === 0;
    const correct = !skipped && arrayEq(selected, q.correctOptionIds);
    return {
      questionId: q.id,
      topicId: q.topicId,
      selected,
      correct,
      skipped,
      elapsedMs,
      flagged: a.flagged,
    };
  });
  return {
    id: `att-${finishedAt}`,
    examId: exam.id,
    examName: exam.name,
    label: forced ? 'Time expired' : 'Custom mock',
    startedAt,
    finishedAt,
    durationMs: finishedAt - startedAt,
    timeLimitMs: config.timeLimitMs,
    showFeedback: config.showFeedback,
    total: attemptAnswers.length,
    correctCount: attemptAnswers.filter((a) => a.correct).length,
    answers: attemptAnswers,
  };
}

function ExamHeader({
  exam,
  idx,
  total,
  answeredCount,
  flaggedCount,
  remaining,
  onPause,
  onExit,
  onOpenNavigator,
}: {
  exam: Exam;
  idx: number;
  total: number;
  answeredCount: number;
  flaggedCount: number;
  remaining: number | null;
  onPause: () => void;
  onExit: () => void;
  onOpenNavigator: () => void;
}) {
  const warning = remaining != null && remaining < 5 * 60 * 1000;
  const critical = remaining != null && remaining < 60 * 1000;
  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        background: 'var(--bg)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div
        className="container wide"
        style={{
          paddingTop: 'calc(18px * var(--d))',
          paddingBottom: 'calc(18px * var(--d))',
        }}
      >
        <div className="row between aic gap-24">
          <div className="row gap-16 aic">
            <button
              className="btn ghost sm"
              onClick={onExit}
              style={{ marginLeft: -12 }}
            >
              ← Exit
            </button>
            <div className="col" style={{ gap: 2 }}>
              <span className="tag">{exam.code}</span>
              <span
                style={{ fontSize: 'calc(13px * var(--d))' }}
                className="muted"
              >
                {exam.name}
              </span>
            </div>
          </div>

          <div className="row gap-24 aic">
            <button
              className="btn sm"
              onClick={onOpenNavigator}
              title="Open question navigator (G)"
              style={{
                padding: 'calc(6px * var(--d)) calc(10px * var(--d))',
              }}
            >
              <span
                style={{
                  display: 'inline-grid',
                  gridTemplateColumns: 'repeat(3, 4px)',
                  gridTemplateRows: 'repeat(3, 4px)',
                  gap: 1.5,
                  marginRight: 6,
                  verticalAlign: 'middle',
                }}
              >
                {Array.from({ length: 9 }).map((_, i) => (
                  <span
                    key={i}
                    style={{
                      width: 4,
                      height: 4,
                      background: 'currentColor',
                      borderRadius: 0.5,
                      opacity: i === 4 ? 1 : 0.5,
                    }}
                  />
                ))}
              </span>
              <span className="mono">
                {(idx + 1).toString().padStart(2, '0')}
                <span className="muted">/{total}</span>
              </span>
            </button>
            <div
              className="row gap-16 aic"
              style={{ fontSize: 'calc(13px * var(--d))' }}
            >
              <span>
                <span className="muted">Answered </span>
                <span className="mono">
                  <strong>{answeredCount}</strong>/{total}
                </span>
              </span>
              {flaggedCount > 0 && (
                <span style={{ color: 'var(--warning)' }}>
                  ★ <span className="mono">{flaggedCount}</span>
                </span>
              )}
            </div>

            {remaining != null && (
              <div
                className={`mono ${critical ? 'pulse' : ''}`}
                style={{
                  fontSize: 'calc(20px * var(--d))',
                  padding: '6px 14px',
                  borderRadius: 'var(--r-md)',
                  background: critical
                    ? 'var(--error-bg)'
                    : warning
                      ? 'color-mix(in oklab, var(--warning) 12%, var(--bg))'
                      : 'var(--bg-sunken)',
                  color: critical
                    ? 'var(--error)'
                    : warning
                      ? 'var(--warning)'
                      : 'var(--fg)',
                  border:
                    '1px solid ' +
                    (critical
                      ? 'var(--error)'
                      : warning
                        ? 'var(--warning)'
                        : 'var(--border)'),
                  letterSpacing: 0.5,
                }}
              >
                {fmtClock(Math.max(0, remaining))}
              </div>
            )}

            <button className="btn ghost sm" onClick={onPause}>
              Pause
            </button>
          </div>
        </div>
        <div className="pbar" style={{ marginTop: 'calc(14px * var(--d))' }}>
          <div style={{ width: `${((idx + 1) / total) * 100}%` }} />
        </div>
      </div>
    </div>
  );
}

const kbdStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 'calc(11px * var(--d))',
  border: '1px solid var(--border)',
  borderRadius: 4,
  padding: '0 5px',
  marginInline: 2,
};

function ExamFooter({
  idx,
  canReveal,
  revealed,
  hasSelection,
  showFeedback,
  onPrev,
  onNext,
  onReveal,
  onFinish,
  isLast,
}: {
  idx: number;
  total: number;
  canReveal: boolean;
  revealed: boolean;
  hasSelection: boolean;
  showFeedback: boolean;
  onPrev: () => void;
  onNext: () => void;
  onReveal: () => void;
  onFinish: () => void;
  isLast: boolean;
}) {
  // In study mode, block advance only if the user picked an answer but hasn't checked it yet.
  // Skipping (no selection) is always allowed.
  const advanceDisabled = showFeedback && hasSelection && !revealed;
  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        background: 'color-mix(in oklab, var(--bg) 85%, transparent)',
        borderTop: '1px solid var(--border)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        zIndex: 15,
      }}
    >
      <div
        className="container wide"
        style={{
          paddingTop: 'calc(16px * var(--d))',
          paddingBottom: 'calc(16px * var(--d))',
        }}
      >
        <div className="row between aic">
          <button className="btn" onClick={onPrev} disabled={idx === 0}>
            <span style={{ fontFamily: 'var(--font-mono)' }}>←</span> Previous
          </button>

          <div
            className="muted mono"
            style={{ fontSize: 'calc(12px * var(--d))' }}
          >
            <kbd style={kbdStyle}>←</kbd> <kbd style={kbdStyle}>→</kbd> navigate ·{' '}
            <kbd style={kbdStyle}>1–4</kbd> select ·{' '}
            <kbd style={kbdStyle}>F</kbd> flag ·{' '}
            <kbd style={kbdStyle}>G</kbd> all questions
          </div>

          <div className="row gap-8">
            {showFeedback && !revealed && (
              <button
                className="btn"
                onClick={onReveal}
                disabled={!canReveal}
              >
                Check answer
              </button>
            )}
            {isLast ? (
              <button
                className="btn primary"
                onClick={onFinish}
                disabled={advanceDisabled}
              >
                Finish exam{' '}
                <span style={{ fontFamily: 'var(--font-mono)' }}>→</span>
              </button>
            ) : (
              <button
                className="btn primary"
                onClick={onNext}
                disabled={advanceDisabled}
              >
                Next question{' '}
                <span style={{ fontFamily: 'var(--font-mono)' }}>→</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PauseModal({
  onResume,
  onExit,
}: {
  onResume: () => void;
  onExit: () => void;
}) {
  return (
    <div className="scrim" onClick={onResume}>
      <div
        className="modal col gap-16"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="display" style={{ fontSize: 'calc(36px * var(--d))' }}>
          Paused
        </h2>
        <p className="muted">
          The timer is on hold. Take a breath — your progress is safe.
        </p>
        <div className="row gap-12" style={{ marginTop: 8 }}>
          <button className="btn primary grow" onClick={onResume}>
            Resume
          </button>
          <button className="btn" onClick={onExit}>
            Exit exam
          </button>
        </div>
      </div>
    </div>
  );
}

function ExitModal({
  answered,
  total,
  onCancel,
  onSubmit,
  onDiscard,
}: {
  answered: number;
  total: number;
  onCancel: () => void;
  onSubmit: () => void;
  onDiscard: () => void;
}) {
  return (
    <div className="scrim" onClick={onCancel}>
      <div className="modal col gap-16" onClick={(e) => e.stopPropagation()}>
        <h2 className="display" style={{ fontSize: 'calc(32px * var(--d))' }}>
          Leave the exam?
        </h2>
        <p className="muted">
          You've answered{' '}
          <strong className="mono" style={{ color: 'var(--fg)' }}>
            {answered}
          </strong>{' '}
          of <span className="mono">{total}</span> questions. Submit what you
          have, or discard this attempt entirely.
        </p>
        <div className="col gap-8" style={{ marginTop: 8 }}>
          <button className="btn primary" onClick={onSubmit}>
            Submit and see results
          </button>
          <button className="btn" onClick={onCancel}>
            Keep going
          </button>
          <button className="btn danger" onClick={onDiscard}>
            Discard attempt
          </button>
        </div>
      </div>
    </div>
  );
}

type NavFilter = 'all' | 'answered' | 'unanswered' | 'flagged';

function NavigatorModal({
  questions,
  answers,
  idx,
  onPick,
  onClose,
  onFinish,
}: {
  questions: Question[];
  answers: Record<string, AnswerState>;
  idx: number;
  onPick: (i: number) => void;
  onClose: () => void;
  onFinish: () => void;
}) {
  const [filter, setFilter] = useState<NavFilter>('all');

  const items = questions.map((q, i) => {
    const a = answers[q.id];
    const answered = !!a && a.selected.length > 0;
    const flagged = !!a?.flagged;
    return { q, i, answered, flagged };
  });

  const filtered = items.filter((item) => {
    if (filter === 'answered') return item.answered;
    if (filter === 'unanswered') return !item.answered;
    if (filter === 'flagged') return item.flagged;
    return true;
  });

  const counts = {
    all: items.length,
    answered: items.filter((i) => i.answered).length,
    unanswered: items.filter((i) => !i.answered).length,
    flagged: items.filter((i) => i.flagged).length,
  };

  return (
    <div
      className="scrim"
      onClick={onClose}
      style={{ alignItems: 'flex-start', paddingTop: 'calc(8vh)' }}
    >
      <div
        className="modal col gap-24"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 720,
          width: '92%',
          maxHeight: '84vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div className="row between aic">
          <div className="col gap-4">
            <span className="eyebrow">Question navigator</span>
            <h2
              className="display"
              style={{ fontSize: 'calc(30px * var(--d))' }}
            >
              Jump to any question
            </h2>
          </div>
          <button className="btn ghost sm" onClick={onClose}>
            Close <kbd style={kbdStyle}>Esc</kbd>
          </button>
        </div>

        <div className="row between aic wrap gap-12">
          <div className="row gap-8 wrap">
            <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
              All <span className="mono muted">{counts.all}</span>
            </FilterChip>
            <FilterChip
              active={filter === 'answered'}
              onClick={() => setFilter('answered')}
              color="var(--fg)"
            >
              Answered <span className="mono muted">{counts.answered}</span>
            </FilterChip>
            <FilterChip
              active={filter === 'unanswered'}
              onClick={() => setFilter('unanswered')}
            >
              Unanswered <span className="mono muted">{counts.unanswered}</span>
            </FilterChip>
            <FilterChip
              active={filter === 'flagged'}
              onClick={() => setFilter('flagged')}
              color="var(--warning)"
            >
              ★ Flagged <span className="mono muted">{counts.flagged}</span>
            </FilterChip>
          </div>
        </div>

        <div
          style={{
            overflowY: 'auto',
            minHeight: 0,
            paddingRight: 4,
            marginRight: -4,
          }}
        >
          {filtered.length === 0 ? (
            <div className="muted tac" style={{ padding: '40px 0' }}>
              No questions in this view.
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(46px, 1fr))',
                gap: 8,
              }}
            >
              {filtered.map(({ q, i, answered, flagged }) => (
                <NavCell
                  key={q.id}
                  index={i + 1}
                  current={i === idx}
                  answered={answered}
                  flagged={flagged}
                  onClick={() => onPick(i)}
                />
              ))}
            </div>
          )}
        </div>

        <div
          className="row between aic"
          style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}
        >
          <div
            className="row gap-16 wrap"
            style={{ fontSize: 'calc(11px * var(--d))' }}
          >
            <span className="row gap-8 aic">
              <span style={cellSwatch({ current: true })} />
              <span className="muted">Current</span>
            </span>
            <span className="row gap-8 aic">
              <span style={cellSwatch({ answered: true })} />
              <span className="muted">Answered</span>
            </span>
            <span className="row gap-8 aic">
              <span style={cellSwatch({})} />
              <span className="muted">Unanswered</span>
            </span>
            <span className="row gap-8 aic">
              <span style={cellSwatch({ flagged: true })} />
              <span className="muted">Flagged</span>
            </span>
          </div>
          <button className="btn primary sm" onClick={onFinish}>
            Finish exam →
          </button>
        </div>
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  color,
  children,
}: {
  active: boolean;
  onClick: () => void;
  color?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      className={`btn sm ${active ? 'primary' : ''}`}
      onClick={onClick}
      style={
        active && color
          ? { background: color, borderColor: color, color: 'var(--bg)' }
          : undefined
      }
    >
      {children}
    </button>
  );
}

function cellSwatch({
  current,
  answered,
  flagged,
}: {
  current?: boolean;
  answered?: boolean;
  flagged?: boolean;
}): CSSProperties {
  const base: CSSProperties = {
    width: 14,
    height: 14,
    borderRadius: 3,
    display: 'inline-block',
    border: '1px solid var(--border-strong)',
    background: 'var(--bg-elev)',
  };
  if (current) return { ...base, background: 'color-mix(in oklab, var(--accent) 55%, var(--bg))', borderColor: 'var(--accent)' };
  if (answered) return { ...base, background: 'var(--fg)', borderColor: 'var(--fg)' };
  if (flagged) return { ...base, borderColor: 'var(--warning)', borderStyle: 'dashed' };
  return base;
}

function NavCell({
  index,
  current,
  answered,
  flagged,
  onClick,
}: {
  index: number;
  current: boolean;
  answered: boolean;
  flagged: boolean;
  onClick: () => void;
}) {
  const style: CSSProperties = {
    aspectRatio: '1',
    minHeight: 46,
    border: '1px solid var(--border-strong)',
    borderRadius: 'var(--r-sm)',
    background: 'var(--bg-elev)',
    color: 'var(--fg-muted)',
    fontFamily: 'var(--font-mono)',
    fontSize: 'calc(13px * var(--d))',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    transition: 'background .12s, border-color .12s, transform .08s',
  };
  if (answered) {
    style.background = 'var(--fg)';
    style.color = 'var(--bg)';
    style.borderColor = 'var(--fg)';
  }
  if (current) {
    style.background = 'color-mix(in oklab, var(--accent) 55%, var(--bg))';
    style.borderColor = 'var(--accent)';
    style.color = 'var(--bg)';
  }
  if (flagged) {
    style.borderStyle = 'dashed';
    style.borderColor = 'var(--warning)';
  }
  return (
    <button onClick={onClick} style={style}>
      {index}
      {flagged && (
        <span
          style={{
            position: 'absolute',
            top: -5,
            right: -5,
            width: 14,
            height: 14,
            borderRadius: '50%',
            background: 'var(--warning)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 9,
            lineHeight: 1,
            border: '1.5px solid var(--bg)',
          }}
        >
          ★
        </span>
      )}
    </button>
  );
}
