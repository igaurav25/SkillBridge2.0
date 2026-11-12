# SkillBridge Redesign & Upgrade — Progress Tracker

**Current Active Branch:** `redesign/phase-1`
**Baseline Branch:** `feature/skillbridge-2-upgrade` (`135d4db`)

---

## Phase Checklist

- [x] **Phase 0**: Audit, bugs, security (`redesign/phase-0`) — *Completed & Verified*
- [x] **Phase 1**: Design system and app shell (`redesign/phase-1`) — *Completed & Verified*
- [ ] **Phase 2**: Cinematic landing page + 3D hero (`redesign/phase-2`)
- [ ] **Phase 3**: Student experience (`redesign/phase-3`)
- [ ] **Phase 4**: AI modules (`redesign/phase-4`)
- [ ] **Phase 5**: Job marketplace (`redesign/phase-5`)
- [ ] **Phase 6**: Recruiter command center (`redesign/phase-6`)
- [ ] **Phase 7**: Admin control center (`redesign/phase-7`)
- [ ] **Phase 8**: Mobile: all phones + Android app (`redesign/phase-8`)
- [ ] **Phase 9**: Performance and release (`redesign/phase-9`)
- [ ] **Phase 10**: Extra features (ask user which ones before building) (`redesign/phase-10`)

---

## Phase Notes & Reports

### Phase 0 — Audit, Bugs, Security (`redesign/phase-0`)
- **Status:** Complete (awaiting user `"continue"` for Phase 1).
- **Artifacts:** `AUDIT.md`, `tests/reports/playwright-phase-0-baseline.json`, `tests/reports/playwright-phase-0.json`, `tests/reports/lighthouse-phase-0.json`, `tests/screenshots/phase-0/`.
- **Verified Checks:**
  - `cd frontend; npx ng build --configuration production`: exit `0` (`911.66 kB` initial raw / `196.71 kB` transfer).
  - `node --test backend/tests/regression.test.js`: **9/9 passing**.
  - `node test_e2e.js`: **all smoke checks passing**.
  - `AUDIT_PHASE=phase-0 node tests/run-audit-harness.mjs`: **30/30 routes × 10 viewports = 300/300 checks clean (0 issues)**; Lighthouse Best Practices **100** on all 4 audited routes, Accessibility **98–100**, Performance **50–76** (bundle & CLS targets deferred to Phases 1, 2, 5, 9).

### Phase 1 — Design System and App Shell (`redesign/phase-1`)
- **Status:** Complete (awaiting user `"continue"` for Phase 2).
- **Artifacts & Reports:** `tests/reports/playwright-phase-1.json`, `tests/reports/lighthouse-phase-1.json`, `tests/screenshots/phase-1/`.
- **Key Deliverables:**
  - Dedicated design tokens (`frontend/src/styles/tokens.css`) with dark + light themes, fluid typography (`clamp`), spacing/shell metrics, radii, shadows, strict single z-index scale (`--z-base: 1` .. `--z-skip-link: 999`), safe-area insets, and motion variables.
  - Global primitives (`frontend/src/styles.css`): `.sb-section`, `.grid-auto`, `.sb-card-glass`, `.btn-ghost`, `.skeleton-card`, unified `.modal-backdrop`/`.modal-card`, `.sb-drawer-backdrop`/`.sb-drawer`, `.sb-table` hover states, `dvh`-safe layout, scroll-padding, and reduced-motion rules.
  - Standalone `OnPush` UI primitives (`frontend/src/app/components/ui/`): `SbModalComponent`, `SbBadgeComponent`, `SbSkeletonComponent`, barrel export `index.ts`.
  - Lazy-loaded non-landing routes via `loadComponent` (`frontend/src/app/app.routes.ts`), non-blocking Google Fonts (`frontend/src/index.html`), `.app-main { min-height: calc(100dvh - var(--nav-height)); }` CLS fix (`app.component.css`), inline SVG initials avatars + unified desktop/mobile Workspace Drawer outside navbar stacking context (`navbar.component.*`), and unified z-index alignment on `bottom-nav`, `pwa-install-banner`, and `toast`.
- **Verified Checks:**
  - `cd frontend; npx ng build --configuration production`: exit `0`; Initial total **494.80 kB** raw (**130.35 kB** transfer) vs Phase 0 **911.66 kB** raw (**196.71 kB** transfer), `main`: **65.46 kB** raw / **13.65 kB** transfer, + 34 lazy chunks.
  - `node --test backend/tests/regression.test.js`: **9/9 passing**.
  - `$env:AUDIT_PHASE='phase-1'; node tests/run-audit-harness.mjs`: `test_e2e.js` **ALL PASS**; Playwright **30 routes × 10 viewports = 300/300 checks clean (0 issues)**; Lighthouse Slow 4G: `/` Perf **85** (was 76) / LCP **4239ms** (was 6949ms) / CLS **0.0585**, `/jobs` Perf **78** (was 51) / CLS **0.0124** (was 0.8471), `/career-explorer` Perf **80** (was 50) / CLS **0** (was 0.8199), `/login` Perf **86** (was 76) / CLS **0.0542** (was 0.8199).
  - Light-theme (`[data-theme="light"]`) Axe + overflow + Workspace Drawer verification (`1280x800` & `360x800` across `/`, `/jobs`, `/profile`, `/student/dashboard`, `/recruiter/dashboard`, `/admin/dashboard`): **0 serious/critical Axe violations, 0 horizontal overflow, Escape closes drawer cleanly**.

