import LegalPage from './LegalPage';
import { CONTACT_EMAIL } from '../lib/env';

export default function Privacy() {
  return (
    <LegalPage title="Privacy Policy" path="/privacy" updated="1 October 2026"
      description="How GeoRock AI collects, uses and protects data: what we store, which cookies and analytics we use, and your choices.">
      <p>This policy explains what information GeoRock AI (“we”, “us”) handles when you use this website and dashboard, and the choices you have.</p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Information you enter:</strong> operator ID, mission reference, sector, field-observation readings, coordinates, severity and notes, and the monitoring parameters you submit for risk scoring. Please do not enter personal data in free-text notes.</li>
        <li><strong>Images you upload</strong> for crack analysis are processed to produce a result. They are not stored by the analysis endpoint.</li>
        <li><strong>Technical data:</strong> your IP address is used to apply rate limits and block spam. We convert it to a salted one-way hash before storing it with an observation, and rate-limit counters expire within minutes.</li>
        <li><strong>Analytics (only if you accept):</strong> privacy-friendly, cookie-free page and button-click statistics through Plausible Analytics. No advertising or cross-site tracking.</li>
      </ul>

      <h2>Cookies and local storage</h2>
      <ul>
        <li><strong>Essential:</strong> your cookie choice (browser local storage) and your current operator session fields (browser session storage, cleared when you close the tab).</li>
        <li><strong>Analytics:</strong> loaded only after you choose “Accept analytics”. You can change your mind at any time with “Cookie settings” in the footer.</li>
        <li><strong>Bot protection:</strong> if enabled, Cloudflare Turnstile may run a short challenge on the observation form and receives technical signals from your browser.</li>
      </ul>

      <h2>Third-party services we use</h2>
      <p>Supabase (database hosting), Upstash (rate limiting and caching), Cloudflare (optional bot challenge), Plausible (optional analytics) and Google Fonts (typefaces, which means your IP address is sent to Google when the page loads). Each acts as a processor under its own terms.</p>

      <h2>How we use information</h2>
      <p>To run the service, produce risk assessments and alerts, keep a history of predictions and field reports for your team, prevent abuse, and understand (with consent) which features are used.</p>

      <h2>Retention</h2>
      <p>Predictions, alerts and field observations are kept until your organisation asks us to delete them. Rate-limit counters expire automatically within minutes.</p>

      <h2>Your rights</h2>
      <p>Depending on where you live, you may have the right to access, correct, delete or export your data, or to object to processing. Contact us at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> and we will respond within a reasonable time.</p>

      <h2>Security</h2>
      <p>Traffic is encrypted with HTTPS, secrets are kept on the server, and database access is restricted to our backend. No system is perfectly secure, so please report concerns to us promptly.</p>

      <h2>Children</h2>
      <p>This service is intended for professionals and is not directed at children.</p>

      <h2>Changes</h2>
      <p>We may update this policy and will change the date above when we do.</p>
    </LegalPage>
  );
}
