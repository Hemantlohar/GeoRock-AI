import { useEffect } from 'react';
import { Cookie } from 'lucide-react';
import { Link } from '../lib/router';
import { setConsent, useConsent } from '../lib/consent';
import { syncAnalytics } from '../lib/analytics';

export default function CookieBanner() {
  const { consent, showBanner } = useConsent();
  useEffect(() => { syncAnalytics(); }, [consent]);
  if (!showBanner) return null;

  return (
    <div className="cookie" role="dialog" aria-modal="false" aria-labelledby="cookie-title" aria-describedby="cookie-desc">
      <Cookie size={20} aria-hidden="true" className="cookie-ico" />
      <div className="cookie-body">
        <h2 id="cookie-title">Your privacy choices</h2>
        <p id="cookie-desc">
          We use essential storage to remember your session and this choice. With your permission we also
          use privacy-friendly analytics (no advertising, no cross-site tracking). See our{' '}
          <Link to="/privacy">Privacy Policy</Link>.
        </p>
      </div>
      <div className="cookie-actions">
        <button type="button" className="btn-ghost" onClick={() => setConsent(false)}>Essential only</button>
        <button type="button" className="btn-solid" onClick={() => setConsent(true)}>Accept analytics</button>
      </div>
    </div>
  );
}
