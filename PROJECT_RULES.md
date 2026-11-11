# SkillBridge — Project Rules, Method & Phases

> At the start of every new session, read both `PROJECT_RULES.md` and `PROGRESS.md` first.

---

## RULES (never break these)

1. Keep every working feature, API route, Mongoose model, JWT + role guard, notification flow and AI fallback. Extend, do not rewrite. Remove an old component only after its replacement is verified. If something truly needs a breaking change, stop and ask me.
2. No secrets in code, README, logs or git. Never weaken auth or validation to make the UI easier.
3. Be honest in the UI. Label real AI output "AI-generated" and heuristic output "Rule-based estimate". Show "Verified" only for data that is actually verified. No invented statistics, testimonials, companies or jobs presented as real; with no real data, show an empty state or a clearly labeled sample.
4. Zero overlapping content. Use CSS Grid/Flexbox, spacing tokens, one z-index scale and normal document flow. Absolute positioning only for decorative layers (pointer-events: none). No horizontal scroll down to 360px. Nothing hidden behind fixed headers or bottom navigation (scroll-padding, safe-area insets, dvh instead of 100vh). No clipped text, no distorted images, modals centered and scroll-safe.
5. Performance targets (mobile, Slow 4G; report real numbers and explain any miss): landing LCP < 2.5s, CLS < 0.1, Lighthouse Performance >= 85 on landing and >= 90 on app pages. Lazy-load routes, 3D and below-the-fold sections (@defer / dynamic import). Signals + OnPush, NgOptimizedImage, WebP/AVIF, font-display: swap, pagination, request caching, skeleton loaders, retry and offline states.
6. 3D (Three.js directly, lazy-loaded, <= 300 KB gzip, never blocks first paint): loading state, WebGL-unavailable fallback, prefers-reduced-motion fallback, lite or static version for phones and weak GPUs, pause when the tab is hidden, full disposal of geometry, materials, textures, renderer and listeners on destroy. Procedural shapes, shaders, particles or small compressed GLB files only; no copyrighted game assets or logos. Use 3D only where it adds value (hero, one career-progress visual), not on dashboard cards.
7. Visual direction: cinematic, premium, "AAA-inspired" lighting and depth inside a professional career product. Obsidian/midnight backgrounds, electric blue + cyan + violet accents, subtle glass, restrained glow, strong type hierarchy. Readability and accessibility come first: WCAG AA contrast, keyboard use, visible focus, reduced motion respected.
8. Code quality: strict TypeScript, small reusable components, no copy-paste duplication.
9. Never say something works unless you ran it. If you could not verify something (for example no Android SDK), say "not verified" and why.

---

## METHOD

- One git branch per phase (redesign/phase-N), small commits, never force-push. If a phase is too big, split it and finish one part at a time.
- Before a phase: read the relevant code and write a short plan.
- After a phase run: production build (ng build --configuration production), the backend, node test_e2e.js and the Playwright checks. Fix failures before finishing.
- Playwright checks (set up in Phase 0, reuse every phase): viewports 1920, 1440, 1366, 1280, 1024, 768, 430, 390, 375, 360; every route as every role. Fail on console errors, failed API calls, horizontal overflow, clipped text, unexpected overlapping boxes and serious axe accessibility issues. Save screenshots to tests/screenshots/<phase>/.
- STOP at the end of each phase with a report: what changed, commands run and their results, numbers vs. baseline, screenshot folder, known risks. Update PROGRESS.md. Wait for me to say "continue". Ask questions only when truly blocked.

---

## PHASES (do ONE at a time, starting with Phase 0)

### 0. Audit, bugs, security
Read everything, run both apps, click every route as student, recruiter and admin. Write AUDIT.md (what works, what is broken or incomplete, bugs by severity, security, performance). Fix all critical and high bugs at the root cause and add regression tests. Check: JWT secret handling (fail fast in production if missing or a placeholder), one consistent AI key variable name, demo-login buttons and demo passwords only in non-production, CORS allow-list (include mobile app origins), helmet, rate limits, upload size/type limits, input validation, no sensitive data in logs. Set up Playwright + Lighthouse and record baseline numbers.

### 1. Design system and app shell
New tokens (color, fluid type, spacing, radius, shadow, z-index, motion). Reusable primitives (container, section, grid, card, button, input, modal, drawer, toast, skeleton, table, badge) used everywhere. Responsive navbar/sidebar/footer, route transitions, light and dark themes kept.

### 2. Cinematic landing page + 3D hero
Sections: hero, platform intro, how it works, opportunities, AI career intelligence, resume + ATS, skill gap, mock interviews, student success, recruiter ecosystem, platform stats (real aggregate counts from a public endpoint), testimonials (real or labeled sample), FAQ, footer. Headline: "BUILD YOUR SKILLS. SHAPE YOUR FUTURE." CTAs: "Explore Opportunities" and "Start Your Journey". Three.js hero with career-themed objects, cinematic lighting, floating particles, slow camera drift, mouse parallax on desktop only. GSAP + IntersectionObserver reveals. SEO meta tags and share image.

### 3. Student experience
Dashboard from real data (welcome, profile completion, readiness score, applications, saved jobs, resume health, skill progress, upcoming interviews, recommendations, activity, AI insights). Profile, skills, education, experience, projects, certifications (backward-compatible model change). Resume builder: live preview, at least 4 templates (2 single-column ATS, 2 portfolio style), PDF export, quality suggestions, multiple saved resumes. Notifications page. Account settings (profile, password, theme, notification preferences, export/delete my data).

### 4. AI modules
Mentor chat (history, suggested prompts, streaming if feasible), skill gap (visual comparison, readiness %, prioritized roadmap with progress), job match (score, matching and missing skills, tips), cover letter (edit, copy, download), ATS analyzer, mock interview (setup, category, difficulty, timer, per-answer feedback, final report, history). Every result shows its engine label; clear quota and error states.

### 5. Job marketplace
Search, filters (location, work mode, experience, stream, skills, date), newest first, skill-match %, pagination, saved jobs, student application tracker (board + list), direct-apply links, company info, scam reporting, expired-listing handling, truthful "Verified" and "Source" labels.

### 6. Recruiter command center
Recruiter + company profile, job CRUD with templates, applicants, candidate search and profile with ATS match, drag-and-drop Kanban pipeline (also keyboard accessible), interview scheduling (new model, notifications, calendar), notes and tags, bulk actions, analytics (funnel, views to applications).

### 7. Admin control center
Analytics charts, user moderation, company verification, job moderation, scam-report workflow, application monitoring, activity/audit log, admin profile and security.

### 8. Mobile: all phones + Android app
Installable PWA (manifest, icons, service worker, offline page, update prompt). First compare Ionic Angular vs Capacitor-only for Angular 19 compatibility and weight; explain your choice in 5 lines, then build it. A real mobile shell, not a squeezed desktop site: bottom tabs, 44px+ touch targets, safe-area insets, pull-to-refresh, bottom-sheet modals, back-button handling, inputs at 16px+ so iOS does not zoom. Capacitor Android: secure token storage, camera + file picker for resume/avatar, push-notification scaffolding (list the credentials I must provide), deep links, icon + splash. Generate the iOS project too, but only say it builds if you are on a Mac. Document the APK/AAB build steps.

### 9. Performance and release
Bundle analysis, dead-code removal, image optimization, database indexes and slow-query fixes, compression and caching headers, pagination everywhere. Full Playwright + Lighthouse run vs. baseline. Update README (setup, env vars, scripts, architecture) and add a CI workflow (build + tests).

### 10. Extra features (ask me which ones before building)
Google sign-in; email verification and password-reset emails; job alerts (saved searches) by email/push; interview and deadline reminders; public shareable portfolio page; resume auto-fill from an uploaded PDF and "tailor my resume to this job"; learning streaks and badges; moderated recruiter-candidate messaging; company reviews and salary insights (only with real sources); global search / command palette; English + Hindi; sitemap + prerendered landing page for SEO.

