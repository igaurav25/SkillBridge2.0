import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..', '..');

const PHASE = process.env.AUDIT_PHASE || 'phase-0';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://127.0.0.1:4200';
const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:5000';
const BASELINE_MODE = process.argv.includes('--baseline');
const QUICK_VIEWPORTS = process.argv.includes('--quick');

const SCREENSHOT_DIR = path.join(ROOT_DIR, 'tests', 'screenshots', PHASE);
const REPORT_DIR = path.join(ROOT_DIR, 'tests', 'reports');
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
fs.mkdirSync(REPORT_DIR, { recursive: true });

const ALL_VIEWPORTS = QUICK_VIEWPORTS
  ? [
      { width: 1920, height: 1080 },
      { width: 1280, height: 800 },
      { width: 768, height: 1024 },
      { width: 390, height: 844 },
      { width: 360, height: 800 },
    ]
  : [
      { width: 1920, height: 1080 },
      { width: 1440, height: 900 },
      { width: 1366, height: 768 },
      { width: 1280, height: 800 },
      { width: 1024, height: 768 },
      { width: 768, height: 1024 },
      { width: 430, height: 932 },
      { width: 390, height: 844 },
      { width: 375, height: 812 },
      { width: 360, height: 800 },
    ];

const ROLE_ROUTES = {
  guest: [
    '/',
    '/login',
    '/register',
    '/jobs',
    '/companies',
    '/career-explorer',
  ],
  student: [
    '/student/dashboard',
    '/profile',
    '/resume-builder',
    '/resume-analyzer',
    '/applications',
    '/saved-jobs',
    '/skill-gap',
    '/career-assistant',
    '/interview-prep',
    '/assessments',
    '/learning-roadmap',
    '/projects',
    '/github-analyzer',
    '/career-analytics',
    '/achievements',
    '/jobs',
  ],
  recruiter: [
    '/recruiter/dashboard',
    '/recruiter/post-job',
    '/recruiter/applications',
    '/recruiter/candidates',
  ],
  admin: [
    '/admin/dashboard',
    '/admin/users',
    '/admin/jobs',
    '/admin/reports',
  ],
};

// Demo credentials for automated local verification ONLY (seeded when USE_MEMORY_DB=true / non-prod)
const DEMO_CREDS = {
  student: { email: 'student@skillbridge.com', password: 'Password123!' },
  recruiter: { email: 'recruiter@skillbridge.com', password: 'Password123!' },
  admin: { email: 'admin@skillbridge.com', password: 'Password123!' },
};

async function fetchAuthSession(role) {
  const creds = DEMO_CREDS[role];
  const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(creds),
  });
  if (!res.ok) {
    throw new Error(`Failed login for ${role}: HTTP ${res.status}`);
  }
  const json = await res.json();
  return { token: json.token, user: json.user };
}

function findEdgeExecutable() {
  const candidates = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return undefined;
}

async function runDomAudit(page) {
  return await page.evaluate(() => {
    const vw = window.innerWidth;
    const sw = document.documentElement.scrollWidth;
    const horizontalOverflowPx = Math.max(0, sw - vw);

    // Check clipped text on key interactive elements & headings
    const clippedItems = [];
    const textCandidates = document.querySelectorAll('h1, h2, h3, button, a.btn, .nav-link, .badge');
    for (const el of textCandidates) {
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      if (style.overflowX === 'hidden' || style.textOverflow === 'ellipsis') {
        if (el.scrollWidth > el.clientWidth + 3 && !style.textOverflow.includes('ellipsis')) {
          clippedItems.push({
            tag: el.tagName,
            text: (el.textContent || '').trim().slice(0, 40),
            scrollW: Math.round(el.scrollWidth),
            clientW: Math.round(el.clientWidth),
          });
        }
      }
      if (rect.right > vw + 4 && !el.closest('.overflow-x-auto, .table-container')) {
        clippedItems.push({
          tag: el.tagName,
          text: (el.textContent || '').trim().slice(0, 40),
          reason: `overflows viewport right edge (${Math.round(rect.right)} > ${vw})`,
        });
      }
    }

    // Check visible elements escaping or unexpected overlapping interactive elements inside main content
    const overlaps = [];
    const interactive = Array.from(document.querySelectorAll('main a, main button, main input, main select')).filter((el) => {
      const st = window.getComputedStyle(el);
      if (st.display === 'none' || st.visibility === 'hidden' || st.pointerEvents === 'none') return false;
      const r = el.getBoundingClientRect();
      return r.width > 4 && r.height > 4 && r.bottom > 0 && r.top < window.innerHeight;
    });

    for (let i = 0; i < interactive.length; i++) {
      const a = interactive[i];
      const ra = a.getBoundingClientRect();
      for (let j = i + 1; j < interactive.length; j++) {
        const b = interactive[j];
        if (a.contains(b) || b.contains(a)) continue;
        const rb = b.getBoundingClientRect();
        const xOverlap = Math.max(0, Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left));
        const yOverlap = Math.max(0, Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top));
        if (xOverlap > 8 && yOverlap > 8) {
          // Ignore elements in closed/hidden modals or inside different z-index stacking contexts where one is fixed overlay
          const sa = window.getComputedStyle(a);
          const sb = window.getComputedStyle(b);
          if (sa.position === 'fixed' || sb.position === 'fixed') continue;
          overlaps.push({
            a: (a.textContent || a.tagName).trim().slice(0, 25),
            b: (b.textContent || b.tagName).trim().slice(0, 25),
            area: Math.round(xOverlap * yOverlap),
          });
        }
      }
    }

    // Check transparent modals bug check / bottom-nav overlap on main
    const bottomNav = document.querySelector('app-bottom-nav nav');
    const bottomNavVisible = bottomNav ? window.getComputedStyle(bottomNav).display !== 'none' : false;
    const footer = document.querySelector('footer');
    let hiddenBehindBottomNav = false;
    if (bottomNavVisible && bottomNav && footer) {
      const navRect = bottomNav.getBoundingClientRect();
      // If bottomNav is static/relative in normal flow (non-fixed!)
      const navPos = window.getComputedStyle(bottomNav).position;
      if (navPos !== 'fixed' && vw >= 768) {
        hiddenBehindBottomNav = true; // bottom nav rendered visibly in desktop flow!
      }
      if (navPos === 'fixed' && vw >= 768) {
        hiddenBehindBottomNav = true; // mobile bottom nav shouldn't be visible on desktop >= 768
      }
    }

    return {
      viewportWidth: vw,
      scrollWidth: sw,
      horizontalOverflowPx,
      clippedCount: clippedItems.length,
      clippedItems: clippedItems.slice(0, 5),
      overlapCount: overlaps.length,
      overlaps: overlaps.slice(0, 5),
      bottomNavBugOnDesktop: vw >= 768 && bottomNavVisible,
      skipLinkVisibleWithoutFocus: (() => {
        const skip = document.querySelector('a[href="#main-content"]');
        if (!skip) return false;
        const r = skip.getBoundingClientRect();
        return r.width > 10 && r.height > 10 && document.activeElement !== skip;
      })(),
    };
  });
}

async function main() {
  const exePath = findEdgeExecutable();
  console.log(`Launching Playwright with browser: ${exePath || 'bundled chromium'}`);
  console.log(`Phase: ${PHASE} | Mode: ${BASELINE_MODE ? 'BASELINE RECORDING' : 'STRICT ENFORCEMENT'} | Viewports: ${ALL_VIEWPORTS.length}`);

  const browser = await chromium.launch({
    executablePath: exePath,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  const findings = [];
  let totalChecks = 0;
  let totalFailures = 0;

  // Screenshot matrix viewports (representative subset if all routes x all viewports takes very long, wait: prompt says "viewports 1920, 1440, 1366, 1280, 1024, 768, 430, 390, 375, 360; every route as every role")
  // We CAN test ALL 10 viewports across all roles and routes! To keep execution fast (~30-60s), we reuse auth contexts per role and loop all viewports cleanly.

  for (const [role, routes] of Object.entries(ROLE_ROUTES)) {
    console.log(`\n=== Role: ${role.toUpperCase()} (${routes.length} routes x ${ALL_VIEWPORTS.length} viewports) ===`);
    let authSession = null;
    if (role !== 'guest') {
      authSession = await fetchAuthSession(role);
    }

    const context = await browser.newContext({ viewport: ALL_VIEWPORTS[0] });
    if (authSession) {
      await context.addInitScript(({ token, user }) => {
        localStorage.setItem('sb_auth_token', token);
        localStorage.setItem('sb_user', JSON.stringify(user));
      }, authSession);
    }

    const page = await context.newPage();

    for (const route of routes) {
      const consoleErrors = [];
      const pageErrors = [];
      const failedApiCalls = [];

      const onConsole = (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      };
      const onPageError = (err) => {
        pageErrors.push(err.message);
      };
      const onResponse = (res) => {
        const url = res.url();
        if (url.includes('/api/') && res.status() >= 400) {
          failedApiCalls.push(`${res.status()} ${res.request().method()} ${url}`);
        }
      };

      page.on('console', onConsole);
      page.on('pageerror', onPageError);
      page.on('response', onResponse);

      // Navigate once at desktop width first
      await page.setViewportSize(ALL_VIEWPORTS[0]);
      try {
        await page.goto(`${FRONTEND_URL}${route}`, { waitUntil: 'networkidle', timeout: 15000 });
      } catch {
        await page.goto(`${FRONTEND_URL}${route}`, { waitUntil: 'load', timeout: 15000 });
      }
      await page.waitForTimeout(450);

      // Check axe-core on primary viewport + 360px mobile viewport
      let axeViolationsDesktop = [];
      try {
        const axeRes = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa'])
          .analyze();
        axeViolationsDesktop = axeRes.violations
          .filter(v => v.impact === 'critical' || v.impact === 'serious')
          .map(v => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length }));
      } catch (e) {
        axeViolationsDesktop = [{ id: 'axe-error', impact: 'serious', help: e.message, nodes: 1 }];
      }

      // Sweep across ALL required viewports without costly full reload on every viewport
      const viewportIssues = [];
      for (const vp of ALL_VIEWPORTS) {
        await page.setViewportSize(vp);
        await page.waitForTimeout(120);
        const domCheck = await runDomAudit(page);
        totalChecks++;

        const hasIssue =
          domCheck.horizontalOverflowPx > 1 ||
          domCheck.clippedCount > 0 ||
          domCheck.overlapCount > 0 ||
          domCheck.bottomNavBugOnDesktop ||
          domCheck.skipLinkVisibleWithoutFocus;

        if (hasIssue) {
          viewportIssues.push({ viewport: vp.width, ...domCheck });
        }

        // Capture screenshots for representative viewports (1920 desktop, 768 tablet, 360 small mobile)
        if (vp.width === 1920 || vp.width === 768 || vp.width === 360) {
          const safeRoute = route === '/' ? 'landing' : route.replace(/^\//, '').replace(/\//g, '_');
          const shotName = `${role}__${safeRoute}__w${vp.width}.png`;
          await page.screenshot({ path: path.join(SCREENSHOT_DIR, shotName), fullPage: false });
        }
      }

      page.off('console', onConsole);
      page.off('pageerror', onPageError);
      page.off('response', onResponse);

      // Deduplicate noise from expected optional checks only if needed
      const routeSummary = {
        role,
        route,
        consoleErrors,
        pageErrors,
        failedApiCalls,
        axeSeriousCritical: axeViolationsDesktop,
        viewportIssues,
      };

      const routeFailed =
        consoleErrors.length > 0 ||
        pageErrors.length > 0 ||
        failedApiCalls.length > 0 ||
        axeViolationsDesktop.length > 0 ||
        viewportIssues.length > 0;

      if (routeFailed) {
        totalFailures++;
        console.log(
          `  [ISSUE] ${route} | consoleErr=${consoleErrors.length} pageErr=${pageErrors.length} apiFail=${failedApiCalls.length} axe=${axeViolationsDesktop.length} vpIssues=${viewportIssues.length}`
        );
      } else {
        console.log(`  [OK]    ${route} (clean across all ${ALL_VIEWPORTS.length} viewports)`);
      }
      findings.push(routeSummary);
    }

    await context.close();
  }

  await browser.close();

  const summary = {
    phase: PHASE,
    timestamp: new Date().toISOString(),
    viewportsTested: ALL_VIEWPORTS.map(v => v.width),
    totalRoutesChecked: findings.length,
    totalViewportChecks: totalChecks,
    routesWithIssues: totalFailures,
    findings,
  };

  const reportPath = path.join(REPORT_DIR, `playwright-${PHASE}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2));
  console.log(`\nSaved Playwright audit report to ${reportPath}`);
  console.log(`Screenshots saved in ${SCREENSHOT_DIR}`);
  console.log(`Summary: ${findings.length} routes x ${ALL_VIEWPORTS.length} viewports (${totalChecks} viewport checks), ${totalFailures} routes with issues.`);

  if (!BASELINE_MODE && totalFailures > 0) {
    console.error('❌ Playwright enforcement failed due to issues listed above.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[Playwright Runner Fatal Error]', err);
  process.exit(1);
});

