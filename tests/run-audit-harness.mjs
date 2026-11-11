import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'frontend', 'dist', 'frontend', 'browser');

const PHASE = process.env.AUDIT_PHASE || 'phase-0';
const BASELINE_MODE = process.argv.includes('--baseline');
const SKIP_LIGHTHOUSE = process.argv.includes('--skip-lighthouse');
const SKIP_E2E = process.argv.includes('--skip-e2e');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

function startStaticSpaServer(port = 4200) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const reqUrl = (req.url || '/').split('?')[0];
      const safePath = path.normalize(reqUrl).replace(/^(\.\.[/\\])+/, '');
      let filePath = path.join(DIST_DIR, safePath === '/' ? 'index.html' : safePath);

      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(DIST_DIR, 'index.html');
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      fs.readFile(filePath, (err, content) => {
        if (err) {
          res.writeHead(500);
          res.end('Internal Server Error');
          return;
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      });
    });

    server.on('error', reject);
    server.listen(port, '127.0.0.1', () => {
      console.log(`[READY] Production SPA Server listening on http://127.0.0.1:${port} (${DIST_DIR})`);
      resolve(server);
    });
  });
}

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForHealth(url, name, maxRetries = 40) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        console.log(`[READY] ${name} is healthy at ${url}`);
        return true;
      }
    } catch {}
    await wait(500);
  }
  throw new Error(`Timed out waiting for ${name} at ${url}`);
}

function runSubScript(command, args = [], extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: ROOT_DIR,
      env: { ...process.env, AUDIT_PHASE: PHASE, ...extraEnv },
      stdio: 'inherit',
    });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
    });
  });
}

async function main() {
  if (!fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
    throw new Error(`Frontend production build not found at ${DIST_DIR}. Run ng build --configuration production first.`);
  }

  let spaServer = null;
  let backendProc = null;

  try {
    // 1. Start static SPA server on 4200
    spaServer = await startStaticSpaServer(4200);

    // 2. Start Backend on 5000
    console.log('Launching Backend server on port 5000 (USE_MEMORY_DB=true)...');
    backendProc = spawn(process.execPath, ['server.js'], {
      cwd: path.join(ROOT_DIR, 'backend'),
      env: { ...process.env, PORT: '5000', USE_MEMORY_DB: 'true', NODE_ENV: 'development' },
      stdio: 'pipe',
    });

    backendProc.stdout.on('data', (d) => {
      const msg = d.toString().trim();
      if (msg.includes('running on port') || msg.includes('Seed Complete') || msg.includes('Connected')) {
        console.log(`  [Backend] ${msg}`);
      }
    });
    backendProc.stderr.on('data', (d) => {
      console.error(`  [Backend ERR] ${d.toString().trim()}`);
    });

    await waitForHealth('http://127.0.0.1:5000/api/health', 'Backend API');

    // 3. Run smoke E2E script
    if (!SKIP_E2E) {
      console.log('\n--- Running node test_e2e.js ---');
      await runSubScript(process.execPath, ['test_e2e.js']);
    }

    // 4. Run Playwright matrix audit
    console.log('\n--- Running Playwright Matrix Audit ---');
    const pwArgs = ['tests/playwright/audit-runner.mjs'];
    if (BASELINE_MODE) pwArgs.push('--baseline');
    await runSubScript(process.execPath, pwArgs);

    // 5. Run Lighthouse Mobile audit
    if (!SKIP_LIGHTHOUSE) {
      console.log('\n--- Running Lighthouse Mobile Audits ---');
      await runSubScript(process.execPath, ['tests/lighthouse/run-lighthouse.mjs']);
    }

    console.log('\n>>> ALL HARNESS CHECKS COMPLETED SUCCESSFULLY! <<<');
  } finally {
    if (backendProc && !backendProc.killed) {
      backendProc.kill('SIGTERM');
    }
    if (spaServer) {
      spaServer.close();
    }
  }
}

main().catch((err) => {
  console.error('[Harness Failed]', err.message);
  process.exit(1);
});

