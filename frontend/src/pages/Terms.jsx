import LegalPage from './LegalPage';
import { Link } from '../lib/router';
import { CONTACT_EMAIL } from '../lib/env';

const LAW = import.meta.env.VITE_GOVERNING_LAW || 'the jurisdiction in which the service operator is established';

export default function Terms() {
  return (
    <LegalPage title="Terms & Conditions" path="/terms" updated="1 October 2026"
      description="The terms for using GeoRock AI, including acceptable use, safety disclaimer, data handling and liability.">
      <p>By using GeoRock AI you agree to these terms. If you do not agree, please do not use the service.</p>

      <h2>1. Decision support only</h2>
      <p>GeoRock AI provides model-based estimates of rockfall risk. The demonstration models are trained on synthetic data. Outputs are <strong>not</strong> a substitute for site inspection, qualified geotechnical engineering judgement, or your statutory safety procedures. Never rely on this tool as the sole basis for decisions affecting people or equipment.</p>

      <h2>2. Acceptable use</h2>
      <ul>
        <li>Do not attempt to disrupt, probe or overload the service, or bypass rate limits and bot protection.</li>
        <li>Do not submit unlawful, harmful or misleading content, or personal data in free-text fields.</li>
        <li>Do not use automated tools to submit forms or scrape the service without permission.</li>
      </ul>

      <h2>3. Your content</h2>
      <p>You keep ownership of the data and images you submit. You grant us a limited licence to process and store them to operate the service as described in the <Link to="/privacy">Privacy Policy</Link>.</p>

      <h2>4. Availability</h2>
      <p>We aim for reliable service but do not guarantee uninterrupted operation. We may change, suspend or withdraw features at any time.</p>

      <h2>5. Intellectual property</h2>
      <p>The software, design and documentation are owned by us or our licensors. These terms do not transfer any rights except the right to use the service.</p>

      <h2>6. Disclaimer and liability</h2>
      <p>The service is provided “as is” without warranties of any kind. To the extent permitted by law, we are not liable for indirect or consequential loss, or for loss arising from reliance on model outputs.</p>

      <h2>7. Governing law</h2>
      <p>These terms are governed by the laws of {LAW}.</p>

      <h2>8. Changes and contact</h2>
      <p>We may update these terms and will change the date above when we do. Questions: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
    </LegalPage>
  );
}
