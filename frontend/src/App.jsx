import { lazy, Suspense } from 'react';
import { Router, useRouter } from './lib/router';
import Landing from './pages/Landing';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import NotFound from './pages/NotFound';
import CookieBanner from './components/CookieBanner';

const Dashboard = lazy(() => import('./pages/Dashboard'));

function Routes() {
  const { path } = useRouter();
  switch (path) {
    case '/': return <Landing />;
    case '/dashboard': return <Suspense fallback={<div className="boot" role="status">Loading dashboard…</div>}><Dashboard /></Suspense>;
    case '/privacy': return <Privacy />;
    case '/terms': return <Terms />;
    default: return <NotFound />;
  }
}

export default function App() {
  return (
    <Router>
      <a href="#main" className="skip-link">Skip to main content</a>
      <Routes />
      <CookieBanner />
    </Router>
  );
}
