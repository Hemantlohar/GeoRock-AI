import { ArrowRight, Brain, Camera, BellRing, ShieldCheck } from 'lucide-react';
import { Link } from '../lib/router';
import { usePageMeta } from '../lib/seo';
import { track } from '../lib/analytics';
import { SiteHeader, Footer } from '../components/SiteChrome';

const FEATURES = [
  { icon: Brain, title: 'Explainable risk scoring', text: 'XGBoost, Random Forest and Logistic Regression models score rockfall probability, with SHAP showing which readings drive each result.' },
  { icon: Camera, title: 'Computer-vision crack checks', text: 'Upload a bench photo and measure crack width automatically, then feed it straight into the risk model.' },
  { icon: BellRing, title: 'Tiered early warnings', text: 'Low, medium, high and critical bands trigger clear advisories and a log your control room can acknowledge.' },
  { icon: ShieldCheck, title: 'Field reports in one place', text: 'Operators submit observations from site and relay urgent ones to control in a single step.' },
];

export default function Landing() {
  usePageMeta({
    title: 'GeoRock AI — Open-Pit Rockfall Prediction & Early Warning',
    description: 'AI rockfall risk scoring for open-pit mines: explainable ML, computer-vision crack inspection and tiered alerts in one decision-support dashboard.',
    path: '/',
  });

  return (
    <div className="page">
      <SiteHeader />
      <main id="main">
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">Open-pit slope stability</p>
            <h1>See rockfall risk before the bench moves.</h1>
            <p className="lead">
              GeoRock AI turns slope monitoring data into an explainable risk score and a clear alert level, so
              your team can act early and know why.
            </p>
            <Link to="/dashboard" className="btn-solid btn-lg" onClick={() => track('cta_click', { where: 'hero' })}>
              Open the live dashboard <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <p className="fineprint">No sign-up needed. Demo models are trained on synthetic data.</p>
          </div>
          <img className="hero-img" src="/images/dashboard-preview.webp" width="1280" height="720" fetchpriority="high" decoding="async"
            alt="GeoRock AI dashboard showing a pit plan with colour-coded sector risk, a risk gauge and a field observation form" />
        </section>

        <section className="features" aria-labelledby="feat-title">
          <h2 id="feat-title">Built for the way mine safety teams work</h2>
          <ul>
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <li key={title}>
                <span className="feat-ico"><Icon size={20} aria-hidden="true" /></span>
                <h3>{title}</h3>
                <p>{text}</p>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <Footer />
    </div>
  );
}
