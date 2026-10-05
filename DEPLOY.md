# GeoRock AI — Setup & Launch Checklist

## 1. Run locally
```
cd backend && pip install -r requirements.txt && python -m uvicorn main:app --reload
cd frontend && cp .env.example .env && npm install && npm run dev
```
(`run_project.bat` still works on Windows.) Open http://localhost:5173 — the landing page; the app is at /dashboard.

## 2. Supabase (database)
1. Create a project at supabase.com.
2. SQL Editor → paste and run `backend/supabase/schema.sql`.
3. Project Settings → API → copy the URL and the **service_role** key into `backend/.env`
   (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`). Never put this key in the frontend.
Without these, the app keeps using the local SQLite file.

## 3. Upstash (rate limiting + cache)
Create a Redis database at upstash.com → REST API → copy into `backend/.env`
(`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`). Without them, an in-memory limiter is used.

## 4. Optional: bot challenge and analytics
- Cloudflare Turnstile: secret → `backend/.env` (`TURNSTILE_SECRET_KEY`), site key → `frontend/.env` (`VITE_TURNSTILE_SITE_KEY`).
- Plausible: set `VITE_PLAUSIBLE_DOMAIN`. It loads only after a visitor accepts the cookie banner.

## 5. Deploy
- Backend (Render/Railway/Fly): set `APP_ENV=production`, `ALLOWED_ORIGINS=https://your-domain`, `TRUST_PROXY=true`, plus the keys above.
  Production disables /docs and forces https.
- Frontend (Vercel/Netlify/Cloudflare Pages): set `VITE_API_BASE_URL`, `VITE_SITE_URL`, `VITE_CONTACT_EMAIL`, `VITE_GOVERNING_LAW`; build `npm run build`, output `dist`.
  `vercel.json` / `public/_headers` add security headers and caching.

## 6. Replace placeholders before going live
- `https://your-domain.example` in `frontend/index.html` (canonical, og:url, og:image, twitter:image).
- `https://your-api.example.com` in the Content-Security-Policy in `vercel.json` and `public/_headers`.
- Contact email and governing law (Terms, Privacy). Have a lawyer review both pages.

## 7. Verify after deploy
Run Lighthouse in Chrome DevTools; test https redirect; submit the field-observation form; check the Supabase table; check https://securityheaders.com.

## Known gaps
- No user login yet: `/api/alerts/{id}/acknowledge` and the dashboard are public (rate-limited only). Add Supabase Auth before a public launch.
- Not run in the build sandbox: `vite build`, the Python backend tests, real Supabase/Upstash calls.
