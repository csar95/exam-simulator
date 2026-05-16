import { useCallback, useState } from 'react';
import type { Route } from './types/exam';
import { loadDataset } from './data/loadDatasets';
import { HomeScreen } from './screens/HomeScreen';
import { SetupScreen } from './screens/SetupScreen';
import { ExamScreen } from './screens/ExamScreen';
import { SummaryScreen } from './screens/SummaryScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { ReviewScreen } from './screens/ReviewScreen';

const dataset = loadDataset();

export type NavFn = (route: Route) => void;

function App() {
  const [route, setRoute] = useState<Route>({ name: 'home' });

  const nav = useCallback<NavFn>((r) => {
    setRoute(r);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const showChrome = route.name !== 'exam';

  return (
    <div className="app">
      {showChrome && <TopBar route={route} nav={nav} />}
      <main className="grow">
        {route.name === 'home' && <HomeScreen dataset={dataset} nav={nav} />}
        {route.name === 'setup' && (
          <SetupScreen dataset={dataset} examId={route.examId} nav={nav} />
        )}
        {route.name === 'exam' && (
          <ExamScreen dataset={dataset} config={route.config} nav={nav} />
        )}
        {route.name === 'summary' && (
          <SummaryScreen dataset={dataset} attemptId={route.attemptId} nav={nav} />
        )}
        {route.name === 'history' && <HistoryScreen dataset={dataset} nav={nav} />}
        {route.name === 'review' && <ReviewScreen dataset={dataset} nav={nav} />}
      </main>
    </div>
  );
}

function TopBar({ route, nav }: { route: Route; nav: NavFn }) {
  return (
    <div className="topbar">
      <div className="brand" onClick={() => nav({ name: 'home' })}>
        <span className="dot" />
        <span>Examiner</span>
      </div>
      <nav>
        <a
          className={route.name === 'home' || route.name === 'setup' ? 'active' : ''}
          onClick={() => nav({ name: 'home' })}
        >
          Exams
        </a>
        <a
          className={route.name === 'history' ? 'active' : ''}
          onClick={() => nav({ name: 'history' })}
        >
          History
        </a>
        <a
          className={route.name === 'review' ? 'active' : ''}
          onClick={() => nav({ name: 'review' })}
        >
          Review
        </a>
      </nav>
      <div style={{ width: 100, textAlign: 'right' }}>
        <span className="tag">v1.0</span>
      </div>
    </div>
  );
}

export default App;
