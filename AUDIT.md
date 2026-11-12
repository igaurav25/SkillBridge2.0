# SkillBridge — Phase 0 Engineering, Security & Performance Audit (`AUDIT.md`)

**Date:** 2026-11-11  
**Branch:** `redesign/phase-0` (branched from `feature/skillbridge-2-upgrade` @ `135d4db`)  
**Audited By:** Senior Engineering Audit (Backend Node/Express/MongoDB, Frontend Angular 19, ML Microservice, Security, Accessibility & Web Performance)

---

## 1. Baseline Telemetry (Measured Before Fixes)

### A. Lighthouse Mobile (Slow 4G Simulation, 390×844)
Measured against `ng build --configuration production` served locally (`127.0.0.1:4200`) with Backend (`127.0.0.1:5000`):

| Route | Performance | Accessibility | Best Practices | SEO | FCP | LCP | TBT | CLS |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `/` (Landing) | **75** | 98 | 96 | 92 | 4,940 ms | **7,118 ms** | 120 ms | 0.000 |
| `/jobs` | **47** | 95 | **73** | 92 | 4,845 ms | **7,658 ms** | 120 ms | **0.8455** |
| `/career-explorer` | **50** | 96 | 96 | 91 | 4,897 ms | **6,493 ms** | 110 ms | **0.8979** |
| `/login` | **76** | 98 | 96 | 91 | 1,443 ms | 1,521 ms | 20 ms | **0.8177** |

- **Bundle Size**: `main-5IQ4SP5X.js` = `844.98 kB` raw (`178.73 kB` transfer) because all 30+ route components are eagerly imported in `app.routes.ts`.

### B. Playwright Full-Matrix & Axe Accessibility Crawl (Baseline)
- **Scope:** 4 roles (`guest`, `student`, `recruiter`, `admin`) × 30 routes × 10 viewports (`1920, 1440, 1366, 1280, 1024, 768, 430, 390, 375, 360`) = **300 viewport checks**.
- **Result:** **30 / 30 routes flagged issues**:
  - Horizontal overflow on `390px, 375px, 360px` on all 30 routes (`+28px` to `+264px`), and on `/admin/*` even at desktop widths `1024px` (`+526px`) and `1440px` (`+150px`), and `/profile` at `1024px–1280px` (`+13px` to `+141px`).
  - Visible `"Skip to main content"` link (`sr-only` missing) and mobile bottom navigation rendered in normal flow at the bottom of desktop views (`md:hidden fixed` missing) across all 30 routes.
  - `/jobs` logged **16 console errors** (`ERR_FAILED`, HTTP `403`) due to broken external Clearbit/favicon URLs + `nested-interactive` axe violation.
  - **22 routes** had `axe-core` critical/serious accessibility violations (`color-contrast`, `label`, `select-name`, `nested-interactive`).

---

## 2. What Works

- **Authentication Core**: Registration (with disposable email check), bcrypt password hashing, JWT token generation, login, role-based frontend routing, and backend `authorize` middleware on admin/recruiter endpoints.
- **Database Seeding & Memory DB**: Zero-friction startup with `mongodb-memory-server` seeding 5 users, 4 companies, 5 jobs, 3 applications, saved jobs, notifications, 7 interview questions, assessments, roadmaps, and projects.
- **Core Student APIs**: Profile CRUD + completion calculation, Resume Builder CRUD, Saved Jobs toggle, Notifications mark-read, Application submission + withdrawal + timeline tracking.
- **AI & Heuristic Engine**: Gemini API integration cleanly wrapped with deterministic heuristic fallback in `aiService.js`; `test_e2e.js` 17-point API smoke suite passes.
- **Python ML Microservice (`ml-service/`)**: FastAPI server with trained scikit-learn `RandomForestClassifier`, `RandomForestRegressor`, `KMeans`, `TF-IDF + KNN` models (`tests/test_ml_service.py` 7/7 passing).
- **Theme Persistence**: 3-state Light / Dark / System theme switcher saves preference to `localStorage`.

---

## 3. Security Audit Findings

| ID | Severity | Finding | Root Cause Location | Phase 0 Fix? |
| :--- | :---: | :--- | :--- | :---: |
| **SEC-01** | **CRITICAL** | Password reset token leaked directly in HTTP response to unauthenticated `POST /api/auth/forgotpassword` callers (allows instant Admin/User account takeover!). | `backend/src/controllers/authController.js:189` | ✅ Yes |
| **SEC-02** | **CRITICAL** | Hardcoded fallback JWT secret `'skillbridge_super_secret_jwt_key_2026_dev_prod'` used when `JWT_SECRET` is unset, and no fail-fast check in production if `JWT_SECRET` is missing, weak, or a placeholder. | `backend/src/utils/jwt.js:6`, `backend/src/middleware/authMiddleware.js:24,69`, `backend/server.js` | ✅ Yes |
| **SEC-03** | **HIGH** | Production auto-seeding & demo credentials: `server.js` runs `seedAll()` on empty DB even in `production`, creating `admin@skillbridge.com` / `Password123!`. | `backend/server.js:15-18` | ✅ Yes |
| **SEC-04** | **HIGH** | Wide-open CORS bypass: `app.js:54` unconditionally calls `callback(null, true)` for ALL unknown origins, disabling CORS protection in production, and lacks explicit mobile origins (`capacitor://localhost`, `ionic://localhost`). | `backend/src/app.js:48-55` | ✅ Yes |
| **SEC-05** | **HIGH** | Unauthenticated & Over-permissive User/Profile/Resume IDOR: `GET /api/profiles/user/:userId` is public and exposes phone/resume/location; `GET /api/users/:id` lets any student read any other user/admin email & profile; `GET /api/resumes/:id` lets any recruiter read any student's resume; `POST /api/jobs/simulate-live` is completely unauthenticated. | `profileRoutes.js:41`, `userController.js:62`, `resumeController.js:28`, `jobRoutes.js:25` | ✅ Yes |
| **SEC-06** | **HIGH** | Password hash substring leakage & `.select('+password')` in Admin user list (`passwordPreview`). | `backend/src/controllers/adminController.js:94,104-113` | ✅ Yes |
| **SEC-07** | **HIGH** | Inconsistent AI API key env vars (`AI_API_KEY` vs `GEMINI_API_KEY`). | `backend/src/config/ai.js:6`, `.env`, `.env.example` | ✅ Yes |
| **SEC-08** | **HIGH** | Weak file upload checks: `uploadMiddleware.js` validates filename extension only (not `mimetype`), allows 10MB everywhere, and `app.js` allows 15MB JSON payloads globally. | `backend/src/middleware/uploadMiddleware.js`, `backend/src/app.js:63` | ✅ Yes |
| **SEC-09** | **HIGH** | No auth-specific brute-force rate limiter (`login`, `register`, `forgotpassword` share 300 req/15m global limit); `resetPassword` lacks password validation; ReDoS via unescaped `$regex` on search queries. | `authRoutes.js`, `authController.js:218`, `jobController.js`, `userController.js`, `roadmapController.js`, `adminController.js`, `interviewController.js`, `companyController.js` | ✅ Yes |
| **SEC-10** | **HIGH** | Mass assignment vulnerabilities in `jobController.createJob` / `updateJob` and `profileController` add endpoints (`...req.body` allows overriding `recruiter`, `applicantsCount`, `viewsCount`, etc.). | `jobController.js:238,267`, `profileController.js` | ✅ Yes |
| **SEC-11** | **MEDIUM** | Stored/Rendered HTML injection risk in AI chat markdown formatter (`formatMarkdown` runs `.replace` on raw message text without HTML-escaping `<` / `>` before `[innerHTML]`). | `frontend/src/app/pages/career-assistant/career-assistant.component.ts:94` | ✅ Yes |

---

## 4. Bugs & Completeness Audit (By Severity)

### Critical Bugs
1. **BUG-C01 — Tailwind CSS Not Installed While Used Heavily Across UI Templates**:
   - `frontend/package.json` contains **zero Tailwind CSS**, yet `bottom-nav.component.ts`, `career-3d-visualizer.component.ts`, `pwa-install-banner.component.ts`, `admin-dashboard.component.html`, `recruiter-dashboard.component.html`, `student-dashboard.component.html`, and `app.component.html` use Tailwind classes (`md:hidden`, `fixed`, `sr-only`, `grid-cols-2`, `lg:grid-cols-7`, `p-4`, `mb-6`, etc.).
   - **Live Impact:** Stat cards stack vertically in 1 column on 1920px screens, `app-bottom-nav` shows permanently on desktop, `"Skip to main content"` shows visually on every page, and mobile header hamburger `☰` overflows off `360px–390px` screens.
   - **Fix:** Replace broken Tailwind reliance on shell/fixed/hidden/sr-only/modal layout classes in Phase 0 immediately (`app.component.html`, `bottom-nav`, `pwa-install-banner`, `career-3d-visualizer`, `navbar`), fix missing modal variables in `recruiter-dashboard.component.css` / `admin-dashboard.component.css` (making modals opaque instead of transparent!), fix horizontal overflow on `360px` & `/admin/*` & `/profile` & `/resume-builder`; complete the comprehensive design-system primitives overhaul in Phase 1.

2. **BUG-C02 — Recruiter Job Creation & Status Updates Broken Due to Frontend/Backend Schema Mismatch**:
   - `recruiter-dashboard.component.ts` & `.html` send `type`, `workMode: 'on-site'`, `experienceLevel: 'fresher'`, `skillsRequired`, `salary.period: 'year'|'month'` while backend `Job.js` requires `jobType`, `workType: ['remote','hybrid','onsite']`, `experienceLevel: ['internship','entry','mid','senior','lead']`, `requiredSkills`, `salary.period: ['yearly','monthly','hourly','stipend']`.
   - `recruiter-dashboard` renders `app.user?.name` (always `"Applicant"` because backend populates `app.candidate`), `app.resumeSnapshot` (`app.resume`), `job.applicationsCount` (`job.applicantsCount`), `job.workMode` (`job.workType`), and filters/submits lowercase status `'shortlisted'` / `'interview'` / `'selected'` instead of Title Case (`'Shortlisted'`, `'Interview'`, `'Selected'`), causing Recruiter stats to show `0` and status updates to fail Mongoose validation with HTTP `400`.
   - **Fix in Phase 0:** Root-fix schema alignment across `recruiter-dashboard.component.ts/.html`.

3. **BUG-C03 — `errorMiddleware.js` Operator Precedence Bug Returns HTTP 200 on Error**:
   - `const statusCode = error.statusCode || res.statusCode !== 200 ? res.statusCode : 500;` evaluates `(error.statusCode || res.statusCode !== 200) ? res.statusCode : 500`, sending `200` on errors where `err.statusCode` was explicitly set while `res.statusCode` was `200`.
   - **Fix in Phase 0:** Parenthesize `(res.statusCode !== 200 ? res.statusCode : 500)`, handle `MulterError` (`400`/`413`) cleanly.

4. **BUG-C04 — Auth 401 Interceptor Session Desync & `guestGuard` Crash**:
   - `error.interceptor.ts` clears `localStorage` on 401 without clearing `AuthService` signals, causing stale UI state and route-guard redirect loops. `guestGuard` crashes with `SyntaxError` if `sb_user` in `localStorage` is malformed. `login.component.ts` attempts admin-role rejection *after* `AuthService.login()` already navigated to student dashboard.
   - **Fix in Phase 0:** Cleanly synchronize 401 session clearing via `AuthService`, wrap `JSON.parse` safely, and pass optional portal check cleanly.

### High Bugs
5. **BUG-H01 — `applicationController` Null Reference Crash + Admin Filter Bug**:
   - `getApplicationById` calls `.toString()` on `application.candidate._id` and `application.recruiter._id` without null guards if a referenced user was deleted; `getRecruiterApplications` queries `{ recruiter: req.user.id }` even when `req.user.role === 'admin'`.
6. **BUG-H02 — `adminController` & `admin-dashboard` Report Casing & Unverified Companies Bug**:
   - `admin-dashboard.component.ts` resolves reports with lowercase `'resolved'` while `Report.js` enum requires `'Pending' | 'Under Review' | 'Resolved' | 'Rejected'`! And the "Unverified Enterprises" widget computes `companies.length - 1` instead of filtering `!c.isVerified`!
   - `adminController.js` fabricates fake candidate defaults (`phone: '9876543210'`, `resumeScore: 85`, `applicationsCount: 2`, `totalJobsPosted: 4`) when a user lacks profile data.
7. **BUG-H03 — `roadmapController` & `jobController` Unescaped Regex (Crash on `"C++"`) & Pagination NaN/Negative Skip Crash**:
   - Searching or loading a roadmap for `"C++"` throws `500 Invalid regular expression`. Passing negative/invalid `page`/`limit` throws MongoDB negative skip error or `Infinity` pages.
8. **BUG-H04 — Hardcoded `http://localhost:5000` Across 21 Frontend Services**:
   - Breaks any LAN mobile device, Capacitor build, or deployed domain.
   - **Fix in Phase 0:** Introduce `frontend/src/environments/environment.ts` + dynamic origin resolution utility (`environment.apiUrl`) across services.
9. **BUG-H05 — Recruiter & Admin Sub-routes Ignore Active Tab**:
   - `/recruiter/post-job`, `/recruiter/applications`, `/recruiter/candidates`, `/admin/users`, `/admin/jobs`, `/admin/reports` always mount on `'overview'` tab instead of activating the requested route tab.
10. **BUG-H06 — `/jobs` Broken External Favicon/Logo URLs (16 Console Errors)**:
    - External URLs from `platformsData` / Clearbit / remote sites return `403` or `ERR_FAILED` in console.
11. **BUG-H07 — Unhonest UI Labels & Hardcoded/Fake Values (Rule 3 Violation)**:
    - `landing.component.html` shows hardcoded `"5,000+"`, `"98%"`, `"1,200+"`, `"45,000+"` stats (Phase 2 replaces with real `/api/public/stats`).
    - `job-card.component.ts` shows `"✓"` and `"Verified Portal"` for unverified/simulated external jobs; `"Simulate New Job"` needs clear `"Sample Simulation"` labeling or restriction; `aiService.js` doesn't return `engine: 'AI-generated' | 'Rule-based estimate'` label; `student-dashboard.component.ts` sends hardcoded `interviewScore: 70`, `assessmentScore: 75` to readiness ML endpoint and displays `careerReadinessScore = 72` placeholder before load; `aiService.generateCoverLetter` falls back to `'Gaurav Sharma'`; `footer.component.ts` links `"System Status"` directly to protected `/admin/dashboard`.

### Medium & Low Bugs (Addressed in Phase 0 if Critical for Baseline Checks, Remainder in Phases 1–9)
- **BUG-M01 — Accessibility (Axe Critical/Serious on 22 Routes)**:
  - Unlabeled `<select>` and `<input>` controls (`label`, `select-name`) on `/profile`, `/resume-builder`, `/resume-analyzer`, `/interview-prep`, `/learning-roadmap`.
  - Low color contrast (`#94A3B8`/violet gradient pills/badges on dark background) across buttons/tags (`color-contrast`).
  - `nested-interactive` on `<div (click)>` job cards containing `<a href>` / `<button>`.
- **BUG-M02 — Performance (LCP 6.5s–7.7s, CLS 0.82–0.90 on Mobile Slow 4G)**:
  - All routes eagerly bundled into 845 kB `main.js`. Lazy loading routes (`loadComponent`) + eliminating static->fixed banner/bottom-nav layout shifts will sharply improve LCP & CLS (Phase 0 fixes CLS/shell overflow; Phase 1 & Phase 9 achieve >= 85/90 Lighthouse targets).
- **BUG-M03 — `aiController.generateCoverLetterHandler` Ignores `customInstructions`**:
  - Extracts `customInstructions` from `req.body` and discards it without passing to `generateCoverLetter()`.
- **BUG-M04 — Clean up stray scratch/legacy scripts**:
  - `backend/test_complete_flow.js`, `backend/test_student_real_details.js`, `backend/test_platforms_aggregation.js` sit directly in `backend/`.

---

## 5. Phase 0 Action Items

1. Fix all **SEC-01 .. SEC-11** security vulnerabilities cleanly and add **backend unit/regression test suite (`backend/tests/regression.test.js`)** verifying JWT fail-fast, password reset token gating, CORS allow-list, upload MIME validation, ReDoS escaping, IDOR isolation, error status precedence, and mass assignment blocking.
2. Fix **BUG-C01 .. BUG-C04** & **BUG-H01 .. BUG-H07** critical functional/runtime/XSS/layout-overflow/console-error bugs (`environment.ts` centralization, Recruiter/Admin schemas & tabs & opaque modals, mobile 360px header overflow, `sr-only`/`.bottom-nav` visibility, `/jobs` image/icon 403s, truthful labels & zero console errors).
3. Fix **axe-core** critical `label`, `select-name`, and `nested-interactive` accessibility bugs so Playwright matrix passes cleanly across all **10 viewports × 30 routes = 300 checks**.
4. Capture post-fix **Phase 0 Playwright + Lighthouse** measurements into `tests/reports/` & `tests/screenshots/phase-0/` and document baseline vs Phase 0 results.

---

## 6. Phase 0 Post-Fix Verification (Baseline vs. Phase 0)

All SEC-01 .. SEC-11, BUG-C01 .. BUG-C04, BUG-H01 .. BUG-H07, and critical/serious Playwright + Axe blockers have been resolved and verified on branch `redesign/phase-0`:

### A. Command & Test Suite Results
- **Frontend Production Build** (`cd frontend; npx ng build --configuration production`): **PASS (exit 0)** — Initial total `911.66 kB` raw (`196.71 kB` transfer; `main` `858.50 kB`, `polyfills` `34.59 kB`, `styles` `18.58 kB`).
- **Backend Security & API Regression Suite** (`node --test backend/tests/regression.test.js`): **9 / 9 PASS (0 fail, 0 skipped)** covering JWT fail-fast, CORS mobile + prod origin gating, `GEMINI_API_KEY` config, ReDoS escaping (`C++`), pagination clamping, mass-assignment filtering, HTTP status precedence + Multer `413`, AI engine honesty labeling, auth rate limits, IDOR isolation, recruiter job creation, and admin privacy.
- **Full-Stack E2E Smoke Suite** (`node test_e2e.js` via `tests/run-audit-harness.mjs`): **PASS** across all endpoints (health, auth, profile, jobs, AI mentor/skill-gap/cover-letter, mock interviews, recruiter/admin dashboards, ML fallback, assessments, roadmaps, projects, GitHub analyzer, analytics, achievements).
- **Playwright Strict Audit Matrix** (`$env:AUDIT_PHASE='phase-0'; node tests/run-audit-harness.mjs`): **PASS (exit 0)** — **30 routes × 10 viewports = 300 viewport checks, 0 routes with issues** (`0` console errors, `0` page errors, `0` failed API calls, `0` serious/critical Axe violations, `0` viewport overlaps/clips/overflows; screenshots in `tests/screenshots/phase-0/`, report in `tests/reports/playwright-phase-0.json`).

### B. Metrics Comparison (Baseline vs. Phase 0 Post-Fix)

| Metric / Audit | Baseline (`135d4db`) | Phase 0 Post-Fix | Notes |
| :--- | :---: | :---: | :--- |
| **Playwright Routes w/ Issues (of 30)** | **30 / 30** | **0 / 30** | All 300 viewport checks (`1920..360`) clean |
| **Landing `/` (Lighthouse Perf / A11y / BP)** | 75 / 98 / 96 | **76 / 98 / 100** | FCP `4940→1564ms`, LCP `7118→6949ms`, CLS `0` |
| **`/jobs` (Perf / A11y / BP / CLS)** | 47 / 95 / 73 / 0.8455 | **51 / 98 / 100 / 0.8471** | Console errors `16→0`; LCP `7658→7544ms` |
| **`/career-explorer` (Perf / A11y / BP / CLS)** | 50 / 96 / 96 / 0.8979 | **50 / 100 / 100 / 0.8199** | FCP `4897→1459ms`, LCP `6493→6346ms` |
| **`/login` (Perf / A11y / BP / CLS)** | 76 / 98 / 96 / 0.8177 | **76 / 98 / 100 / 0.8199** | LCP `1521→1478ms` |

### C. Known Risks & Items Deferred to Later Phases
- **Mobile Slow 4G Performance (`50–76`) & CLS (`0.82–0.85` on `/jobs`, `/career-explorer`, `/login`)**: Still below Phase 5/9 target (`Perf >= 85/90`, `LCP < 2.5s`, `CLS < 0.1`) because routes in `app.routes.ts` are still eagerly bundled (`858.50 kB` `main` chunk) and asynchronous page/font layout shifts remain until Phases 1, 2, 5, and 9 (`loadComponent`, `@defer`, reserved layout containers, font-display & critical CSS optimization).
- **Light Theme Sweep**: Global contrast and component tokens were verified in default dark mode across all 300 Playwright checks; full dual-theme light+dark automated sweep will be standardized with the new design system tokens in Phase 1.
- **ML Python Service Fallback**: Live Python `ml-service` was offline during headless Node tests, so ML endpoints exercised deterministic fallback (`[MLService] ... fallback engaged`). Keep `Rule-based estimate` / fallback UX accurate in Phase 4.


