import { useMemo, useState } from 'react';
import type { Dataset } from '../types/exam';
import type { NavFn } from '../App';
import { deleteAttempt, getAttempts } from '../data/storage';
import { fmtClock, fmtDate } from '../data/format';

export function HistoryScreen({
  dataset,
  nav,
}: {
  dataset: Dataset;
  nav: NavFn;
}) {
  const [version, setVersion] = useState(0);
  const attempts = useMemo(() => getAttempts(), [version]);

  const stats = useMemo(() => {
    if (attempts.length === 0) return null;
    const pcts = attempts.map((a) => (a.correctCount / a.total) * 100);
    return {
      total: attempts.length,
      avg: Math.round(pcts.reduce((s, p) => s + p, 0) / pcts.length),
      best: Math.round(Math.max(...pcts)),
      worst: Math.round(Math.min(...pcts)),
    };
  }, [attempts]);

  const onDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this attempt? This cannot be undone.')) {
      deleteAttempt(id);
      setVersion((v) => v + 1);
    }
  };

  return (
    <div className="container wide fade-in">
      <div className="col gap-48">
        <header
          className="col gap-16"
          style={{ paddingTop: 'calc(20px * var(--d))' }}
        >
          <div className="eyebrow">Your progress</div>
          <h1 className="display" style={{ fontSize: 'calc(56px * var(--d))' }}>
            History
          </h1>
          <p className="muted" style={{ maxWidth: '56ch' }}>
            Every mock you've completed, with quick scan of score, time, and
            topic breakdown.
          </p>
        </header>

        {stats && (
          <section
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 'calc(32px * var(--d))',
              padding: 'calc(24px * var(--d)) 0',
              borderTop: '1px solid var(--border)',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <div className="metric">
              <span className="lbl">Attempts</span>
              <span className="val small mono">{stats.total}</span>
            </div>
            <div className="metric">
              <span className="lbl">Average</span>
              <span className="val small mono">{stats.avg}%</span>
            </div>
            <div className="metric">
              <span className="lbl">Best</span>
              <span
                className="val small mono"
                style={{ color: 'var(--success)' }}
              >
                {stats.best}%
              </span>
            </div>
            <div className="metric">
              <span className="lbl">Worst</span>
              <span
                className="val small mono"
                style={{ color: 'var(--error)' }}
              >
                {stats.worst}%
              </span>
            </div>
          </section>
        )}

        {attempts.length === 0 ? (
          <div
            className="card col gap-16 tac"
            style={{
              padding: 'calc(48px * var(--d))',
              borderStyle: 'dashed',
            }}
          >
            <h3 className="serif" style={{ fontSize: 'calc(24px * var(--d))' }}>
              No attempts yet
            </h3>
            <p className="muted">Complete a mock and it'll show up here.</p>
            <button
              className="btn primary"
              style={{ alignSelf: 'center' }}
              onClick={() => nav({ name: 'home' })}
            >
              Choose an exam
            </button>
          </div>
        ) : (
          <section className="col gap-12">
            <div className="row between aic">
              <h2 className="serif" style={{ fontSize: 'calc(24px * var(--d))' }}>
                All attempts
              </h2>
              <div
                className="muted mono"
                style={{ fontSize: 'calc(12px * var(--d))' }}
              >
                {attempts.length} total
              </div>
            </div>

            <table className="tbl">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Exam</th>
                  <th>Mode</th>
                  <th style={{ textAlign: 'right' }}>Score</th>
                  <th style={{ textAlign: 'right' }}>Questions</th>
                  <th style={{ textAlign: 'right' }}>Time</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {attempts.map((a) => {
                  const pct = Math.round((a.correctCount / a.total) * 100);
                  const exam = dataset.exams.find((e) => e.id === a.examId);
                  const passed = pct >= (exam?.passingScore ?? 0);
                  return (
                    <tr
                      key={a.id}
                      className="clickable"
                      onClick={() =>
                        nav({ name: 'summary', attemptId: a.id })
                      }
                    >
                      <td>
                        <div className="col" style={{ gap: 2 }}>
                          <span>{fmtDate(a.startedAt)}</span>
                          <span
                            className="muted mono"
                            style={{ fontSize: 'calc(11px * var(--d))' }}
                          >
                            {new Date(a.startedAt).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="col" style={{ gap: 2 }}>
                          <span>{a.examName}</span>
                          <span className="tag">{exam?.code ?? ''}</span>
                        </div>
                      </td>
                      <td>
                        <div className="row gap-6 wrap">
                          <span
                            className="tag"
                            style={{
                              padding: '1px 6px',
                              border: '1px solid var(--border)',
                              borderRadius: 4,
                            }}
                          >
                            {a.showFeedback ? 'Study' : 'Exam'}
                          </span>
                          {a.timeLimitMs && (
                            <span
                              className="tag"
                              style={{
                                padding: '1px 6px',
                                border: '1px solid var(--border)',
                                borderRadius: 4,
                              }}
                            >
                              Timed
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div
                          className="row aic"
                          style={{
                            justifyContent: 'flex-end',
                            gap: 10,
                          }}
                        >
                          <div className="pbar" style={{ width: 80 }}>
                            <div
                              style={{
                                width: `${pct}%`,
                                background: passed
                                  ? 'var(--success)'
                                  : 'var(--error)',
                              }}
                            />
                          </div>
                          <span
                            className="mono"
                            style={{
                              fontWeight: 500,
                              color: passed
                                ? 'var(--success)'
                                : 'var(--error)',
                              minWidth: 44,
                              textAlign: 'right',
                            }}
                          >
                            {pct}%
                          </span>
                        </div>
                      </td>
                      <td
                        style={{ textAlign: 'right' }}
                        className="mono muted"
                      >
                        {a.correctCount}/{a.total}
                      </td>
                      <td
                        style={{ textAlign: 'right' }}
                        className="mono muted"
                      >
                        {fmtClock(a.durationMs)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn ghost sm"
                          onClick={(e) => onDelete(a.id, e)}
                          title="Delete attempt"
                          style={{
                            color: 'var(--fg-subtle)',
                            padding: '4px 8px',
                          }}
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        )}
      </div>
    </div>
  );
}
