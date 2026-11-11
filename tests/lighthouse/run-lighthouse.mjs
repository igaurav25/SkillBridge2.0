import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..', '..');

const PHASE = process.env.AUDIT_PHASE || 'phase-0';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://127.0.0.1:4200';
const REPORT_DIR = path.join(ROOT_DIR, 'tests', 'reports');
fs.mkdirSync(REPORT_DIR, { recursive: true });

function findBrowserPath() {
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

async function runAuditOnUrl(url, port) {
  const options = {
    logLevel: 'error',
    output: 'json',
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    port,
    formFactor: 'mobile',
    screenEmulation: {
      mobile: true,
      width: 390,
      height: 844,
      deviceScaleFactor: 3,
      disabled: false,
    },
    throttlingMethod: 'simulate', // Default Slow 4G mobile throttling
  };

  const runnerResult = await lighthouse(url, options);
  const lhr = runnerResult.lhr;

  return {
    url,
    scores: {
      performance: Math.round((lhr.categories.performance?.score || 0) * 100),
      accessibility: Math.round((lhr.categories.accessibility?.score || 0) * 100),
      bestPractices: Math.round((lhr.categories['best-practices']?.score || 0) * 100),
      seo: Math.round((lhr.categories.seo?.score || 0) * 100),
    },
    metrics: {
      firstContentfulPaintMs: Math.round(lhr.audits['first-contentful-paint']?.numericValue || 0),
      largestContentfulPaintMs: Math.round(lhr.audits['largest-contentful-paint']?.numericValue || 0),
      totalBlockingTimeMs: Math.round(lhr.audits['total-blocking-time']?.numericValue || 0),
      cumulativeLayoutShift: Number((lhr.audits['cumulative-layout-shift']?.numericValue || 0).toFixed(4)),
      speedIndexMs: Math.round(lhr.audits['speed-index']?.numericValue || 0),
    },
  };
}

async function main() {
  const chromePath = findBrowserPath();
  console.log(`Launching Lighthouse with browser: ${chromePath || 'auto'}`);

  const chrome = await chromeLauncher.launch({
    chromePath,
    chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  });

  const urls = [
    `${FRONTEND_URL}/`,
    `${FRONTEND_URL}/jobs`,
    `${FRONTEND_URL}/career-explorer`,
    `${FRONTEND_URL}/login`,
  ];

  const results = [];
  try {
    for (const url of urls) {
      console.log(`Running Mobile Slow 4G Lighthouse audit for: ${url}`);
      const res = await runAuditOnUrl(url, chrome.port);
      console.log(
        `  Perf=${res.scores.performance} | A11y=${res.scores.accessibility} | BP=${res.scores.bestPractices} | SEO=${res.scores.seo} | LCP=${res.metrics.largestContentfulPaintMs}ms | CLS=${res.metrics.cumulativeLayoutShift}`
      );
      results.push(res);
    }
  } finally {
    await chrome.kill();
  }

  const outPath = path.join(REPORT_DIR, `lighthouse-${PHASE}.json`);
  fs.writeFileSync(
    outPath,
    JSON.stringify({ phase: PHASE, timestamp: new Date().toISOString(), results }, null, 2)
  );
  console.log(`Saved Lighthouse report to ${outPath}`);
}

main().catch((err) => {
  console.error('[Lighthouse Runner Fatal Error]', err);
  process.exit(1);
});

