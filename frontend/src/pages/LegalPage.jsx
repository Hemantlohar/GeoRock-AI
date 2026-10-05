import { usePageMeta } from '../lib/seo';
import { SiteHeader, Footer } from '../components/SiteChrome';

export default function LegalPage({ title, description, path, updated, children }) {
  usePageMeta({ title: `${title} — GeoRock AI`, description, path });
  return (
    <div className="page">
      <SiteHeader />
      <main className="legal" id="main">
        <h1>{title}</h1>
        <p className="muted">Last updated: {updated}</p>
        {children}
      </main>
      <Footer />
    </div>
  );
}
