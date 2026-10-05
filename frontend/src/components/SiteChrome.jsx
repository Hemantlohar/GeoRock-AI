import { HardHat, ArrowRight } from 'lucide-react';
import { Link } from '../lib/router';
import { reopenConsent } from '../lib/consent';
import { track } from '../lib/analytics';

export function SiteHeader({ cta = true }) {
  return (
    <header className="site-header">
      <Link to="/" className="brand" aria-label="GeoRock AI home">
        <span className="brand-mark"><HardHat size={18} aria-hidden="true" /></span>
        <span className="brand-name">GEOROCK AI</span>
      </Link>
      {cta && (
        <Link to="/dashboard" className="btn-solid btn-sm" onClick={() => track('cta_click', { where: 'header' })}>
          Open dashboard <ArrowRight size={15} aria-hidden="true" />
        </Link>
      )}
    </header>
  );
}

export function Footer() {
  return (
    <footer className="site-footer">
      <p>© {new Date().getFullYear()} GeoRock AI. Decision-support software — not a substitute for qualified geotechnical judgement.</p>
      <nav aria-label="Legal">
        <Link to="/privacy">Privacy Policy</Link>
        <Link to="/terms">Terms &amp; Conditions</Link>
        <button type="button" className="link-btn" onClick={reopenConsent}>Cookie settings</button>
      </nav>
    </footer>
  );
}
