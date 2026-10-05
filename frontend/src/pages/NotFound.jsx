import { Compass } from 'lucide-react';
import { Link } from '../lib/router';
import { usePageMeta } from '../lib/seo';
import { SiteHeader, Footer } from '../components/SiteChrome';

export default function NotFound() {
  usePageMeta({ title: 'Page not found — GeoRock AI', description: 'The page you were looking for does not exist.', path: '/404', noindex: true });
  return (
    <div className="page">
      <SiteHeader cta={false} />
      <main className="center-page" id="main">
        <Compass size={44} aria-hidden="true" className="muted-ico" />
        <p className="code404">404</p>
        <h1>This slope has no bench here.</h1>
        <p className="lead">The page you requested doesn’t exist or has moved.</p>
        <Link to="/" className="btn-solid">Back to home</Link>
      </main>
      <Footer />
    </div>
  );
}
