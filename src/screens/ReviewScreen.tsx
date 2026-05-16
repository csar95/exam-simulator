import { useMemo, useState } from 'react';
import type { Dataset, Question } from '../types/exam';
import type { NavFn } from '../App';
import { getAttempts } from '../data/storage';
import { fmtDate } from '../data/format';
import { topicNameOf } from '../data/loadDatasets';

interface ReviewItem {
  questionId: string;
  attempts: number;
  wrong: number;
  lastSeen: number;
  lastSelected: string[] | null;
  q: Question;
  topicName: string;
  errRate: number;
}

interface TopicStat {
  topicId: string;
  name: string;
  total: number;
  wrong: number;
  rate: number;
}

export function ReviewScreen({
  dataset,
  nav,
}: {
  dataset: Dataset;
  nav: NavFn;
}) {
  const attempts = useMemo(() => getAttempts(), []);
  const qById = useMemo(
    () => Object.fromEntries(dataset.questions.map((q) => [q.id, q])),
    [dataset],
  );

  const items: ReviewItem[] = useMemo(() => {
    const map = new Map<
      string,
      {
        questionId: string;
        attempts: number;
        wrong: number;
        lastSeen: number;
        lastSelected: string[] | null;
      }
    >();
    attempts.forEach((att) => {
      att.answers.forEach((a) => {
        const item = map.get(a.questionId) ?? {
          questionId: a.questionId,
          attempts: 0,
          wrong: 0,
          lastSeen: 0,
          lastSelected: null,
        };
        item.attempts += 1;
        if (!a.correct && !a.skipped) {
          item.wrong += 1;
          if (att.startedAt > item.lastSeen) {
            item.lastSeen = att.startedAt;
            item.lastSelected = a.selected;
          }
        }
        map.set(a.questionId, item);
      });
    });
    return [...map.values()]
      .filter((i) => i.wrong > 0)
      .map((i) => {
        const q = qById[i.questionId];
        if (!q) return null;
        return {
          ...i,
          q,
          topicName: topicNameOf(dataset, q.examId, q.topicId),
          errRate: i.wrong / i.attempts,
        };
      })
      .filter((i): i is ReviewItem => i !== null)
      .sort((a, b) => b.errRate - a.errRate || b.wrong - a.wrong);
  }, [attempts, qById, dataset]);

  const topicStats: TopicStat[] = useMemo(() => {
    const map = new Map<
      string,
      { topicId: string; examId: string; total: number; wrong: number }
    >();
    attempts.forEach((att) => {
      att.answers.forEach((a) => {
        const key = `${att.examId}::${a.topicId}`;
        const m = map.get(key) ?? {
          topicId: a.topicId,
          examId: att.examId,
          total: 0,
          wrong: 0,
        };
        m.total += 1;
        if (!a.correct && !a.skipped) m.wrong += 1;
        map.set(key, m);
      });
    });
    return [...map.values()]
      .map((v) => ({
        topicId: v.topicId,
        name: topicNameOf(dataset, v.examId, v.topicId),
        total: v.total,
        wrong: v.wrong,
        rate: v.wrong / v.total,
      }))
      .filter((t) => t.total >= 2)
      .sort((a, b) => b.rate - a.rate);
  }, [attempts, dataset]);

  const [topicFilter, setTopicFilter] = useState<string>('all');

  const filtered =
    topicFilter === 'all'
      ? items
      : items.filter((i) => i.q.topicId === topicFilter);

  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="container wide fade-in">
      <div className="col gap-48">
        <header
          className="col gap-16"
          style={{ paddingTop: 'calc(20px * var(--d))' }}
        >
          <div className="eyebrow">Targeted practice</div>
          <h1 className="display" style={{ fontSize: 'calc(56px * var(--d))' }}>
            Review
          </h1>
          <p className="muted">
            Every question you've got wrong, ranked by how often. Read
            explanations, then re-test yourself on the topics you're weakest at.
          </p>
        </header>

        {items.length === 0 ? (
          <div
            className="card col gap-16 tac"
            style={{
              padding: 'calc(48px * var(--d))',
              borderStyle: 'dashed',
            }}
          >
            <h3 className="serif" style={{ fontSize: 'calc(24px * var(--d))' }}>
              Nothing to review
            </h3>
            <p className="muted">
              Complete some mocks first — your missed questions will collect
              here.
            </p>
            <button
              className="btn primary"
              style={{ alignSelf: 'center' }}
              onClick={() => nav({ name: 'home' })}
            >
              Start a mock
            </button>
          </div>
        ) : (
          <>
            <section className="col gap-16">
              <div className="row between aib">
                <h2
                  className="serif"
                  style={{ fontSize: 'calc(24px * var(--d))' }}
                >
                  Where you struggle
                </h2>
                <span
                  className="muted mono"
                  style={{ fontSize: 'calc(12px * var(--d))' }}
                >
                  {items.length} unique missed
                </span>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                  gap: 'calc(12px * var(--d))',
                }}
              >
                {topicStats.slice(0, 6).map((t) => (
                  <TopicTile
                    key={t.topicId}
                    {...t}
                    onClick={() => setTopicFilter(t.topicId)}
                  />
                ))}
              </div>
            </section>

            <section className="col gap-16">
              <div className="row between aic wrap gap-12">
                <h2
                  className="serif"
                  style={{ fontSize: 'calc(24px * var(--d))' }}
                >
                  Missed questions
                </h2>
                <div className="row gap-8 wrap">
                  <button
                    className={`btn sm ${topicFilter === 'all' ? 'primary' : ''}`}
                    onClick={() => setTopicFilter('all')}
                  >
                    All{' '}
                    <span className="mono muted" style={{ marginLeft: 6 }}>
                      {items.length}
                    </span>
                  </button>
                  {topicStats.map((t) => {
                    const count = items.filter(
                      (i) => i.q.topicId === t.topicId,
                    ).length;
                    if (count === 0) return null;
                    return (
                      <button
                        key={t.topicId}
                        className={`btn sm ${topicFilter === t.topicId ? 'primary' : ''}`}
                        onClick={() => setTopicFilter(t.topicId)}
                      >
                        {t.name}{' '}
                        <span className="mono muted" style={{ marginLeft: 6 }}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="col gap-8">
                {filtered.map((item) => (
                  <ReviewRow
                    key={item.questionId}
                    item={item}
                    isOpen={openId === item.questionId}
                    onToggle={() =>
                      setOpenId(openId === item.questionId ? null : item.questionId)
                    }
                  />
                ))}
              </div>
            </section>

            <section
              className="card col gap-12"
              style={{
                background: 'var(--bg-sunken)',
                borderStyle: 'dashed',
              }}
            >
              <div className="row between aic wrap gap-16">
                <div className="col gap-4">
                  <span className="eyebrow">Practice drill</span>
                  <h3
                    className="serif"
                    style={{ fontSize: 'calc(22px * var(--d))' }}
                  >
                    Build a mock from your weakest topics
                  </h3>
                  <p
                    className="muted"
                    style={{
                      margin: 0,
                      fontSize: 'calc(13px * var(--d))',
                    }}
                  >
                    Configure a focused session from the setup screen — pick a
                    topic filter to drill it.
                  </p>
                </div>
                <button
                  className="btn primary"
                  onClick={() =>
                    nav({ name: 'setup', examId: dataset.exams[0].id })
                  }
                >
                  Configure drill →
                </button>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function TopicTile({
  name,
  total,
  wrong,
  rate,
  onClick,
}: TopicStat & { onClick: () => void }) {
  const color =
    rate > 0.4
      ? 'var(--error)'
      : rate > 0.2
        ? 'var(--warning)'
        : 'var(--success)';
  return (
    <button
      className="card clickable col gap-12"
      onClick={onClick}
      style={{
        textAlign: 'left',
        fontFamily: 'inherit',
        color: 'inherit',
        cursor: 'pointer',
        padding: 'calc(20px * var(--d))',
      }}
    >
      <div className="row between aib">
        <h4 style={{ fontSize: 'calc(15px * var(--d))', fontWeight: 500 }}>
          {name}
        </h4>
        <span
          className="mono"
          style={{ color, fontSize: 'calc(13px * var(--d))' }}
        >
          {Math.round(rate * 100)}%
        </span>
      </div>
      <div className="pbar">
        <div style={{ width: `${rate * 100}%`, background: color }} />
      </div>
      <div className="muted mono" style={{ fontSize: 'calc(11px * var(--d))' }}>
        {wrong} wrong of {total} seen
      </div>
    </button>
  );
}

function ReviewRow({
  item,
  isOpen,
  onToggle,
}: {
  item: ReviewItem;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const q = item.q;
  const hasExplanation = q.explanation && q.explanation.trim().length > 0;
  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-md)',
        overflow: 'hidden',
        background: 'var(--bg-elev)',
      }}
    >
      <button
        onClick={onToggle}
        style={{
          display: 'grid',
          gridTemplateColumns: '36px 1fr auto auto',
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
            color: 'var(--error)',
            fontSize: 'calc(13px * var(--d))',
            fontWeight: 500,
          }}
        >
          {item.wrong}×
        </span>
        <span
          style={{
            fontSize: 'calc(14px * var(--d))',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {q.statement}
        </span>
        <span
          className="tag"
          style={{
            padding: '2px 8px',
            border: '1px solid var(--border)',
            borderRadius: 999,
            whiteSpace: 'nowrap',
          }}
        >
          {item.topicName}
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
      </button>

      {isOpen && (
        <div
          className="fade-in"
          style={{
            borderTop: '1px solid var(--border)',
            padding:
              'calc(20px * var(--d)) calc(20px * var(--d)) calc(24px * var(--d))',
            background: 'var(--bg-sunken)',
          }}
        >
          <div className="col gap-12">
            <div className="row gap-12 aic wrap">
              <span
                className="muted"
                style={{ fontSize: 'calc(12px * var(--d))' }}
              >
                Last missed {fmtDate(item.lastSeen)}
              </span>
              <span
                className="muted"
                style={{ fontSize: 'calc(12px * var(--d))' }}
              >
                ·
              </span>
              <span
                className="muted mono"
                style={{ fontSize: 'calc(12px * var(--d))' }}
              >
                {item.wrong} wrong / {item.attempts} seen
              </span>
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
                const wasUserLastPick =
                  item.lastSelected && item.lastSelected.includes(opt.id);
                const state = isCorrect
                  ? 'correct'
                  : wasUserLastPick
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
                    {!isCorrect && wasUserLastPick && (
                      <span className="badge incorrect">Last pick</span>
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
