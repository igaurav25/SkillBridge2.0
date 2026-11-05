const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function probeUrl(url, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 400);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForServer(name, url, maxRetries = 25, delayMs = 600) {
  for (let i = 0; i < maxRetries; i++) {
    const ok = await probeUrl(url);
    if (ok) {
      console.log(`[READY] ${name} is responsive at ${url}`);
      return true;
    }
    await wait(delayMs);
  }
  console.error(`[TIMEOUT] ${name} did not become ready at ${url}`);
  return false;
}

async function main() {
  console.log('===========================================================');
  console.log('  SkillBridge 2.0 Full-Stack Automated Verification Harness');
  console.log('===========================================================');

  const rootDir = __dirname;
  const pyExe = path.join(rootDir, 'ml-service', '.venv', 'Scripts', 'python.exe');
  
  // 1. Launch ML Microservice (FastAPI / Uvicorn on 8000)
  console.log('\n[1/3] Launching Python ML Microservice (port 8000)...');
  const mlProcess = spawn(pyExe, ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8000'], {
    cwd: path.join(rootDir, 'ml-service'),
    stdio: 'pipe'
  });

  mlProcess.stdout.on('data', (d) => {
    const s = d.toString();
    if (s.includes('Application startup complete') || s.includes('Uvicorn running')) {
      console.log(`  [ML Engine] ${s.trim()}`);
    }
  });

  mlProcess.stderr.on('data', (d) => {
    // Uvicorn logs to stderr by default
    const s = d.toString();
    if (s.includes('Uvicorn running') || s.includes('Application startup complete')) {
      console.log(`  [ML Engine] ${s.trim()}`);
    }
  });

  // 2. Launch Backend (Node/Express on 5000)
  console.log('\n[2/3] Launching Node.js / Express Backend (port 5000)...');
  const backendProcess = spawn(process.execPath, ['server.js'], {
    cwd: path.join(rootDir, 'backend'),
    env: { ...process.env, PORT: '5000', USE_MEMORY_DB: 'true', ML_SERVICE_URL: 'http://127.0.0.1:8000' },
    stdio: 'pipe'
  });

  backendProcess.stdout.on('data', (d) => {
    const s = d.toString();
    if (s.includes('SkillBridge Backend API') || s.includes('MongoDB Connected') || s.includes('Seed Complete')) {
      console.log(`  [Backend] ${s.trim()}`);
    }
  });

  backendProcess.stderr.on('data', (d) => {
    console.error(`  [Backend Error] ${d.toString().trim()}`);
  });

  // 3. Wait for both servers to be online
  const mlReady = await waitForServer('Python ML Microservice', 'http://127.0.0.1:8000/health', 30, 800);
  const backendReady = await waitForServer('Node.js Backend', 'http://127.0.0.1:5000/api/health', 30, 800);

  if (!mlReady || !backendReady) {
    console.error('[FATAL] Services failed to boot in time.');
    killProcesses();
    process.exit(1);
  }

  function killProcesses() {
    try {
      if (mlProcess && !mlProcess.killed) {
        mlProcess.kill('SIGTERM');
      }
      if (backendProcess && !backendProcess.killed) {
        backendProcess.kill('SIGTERM');
      }
    } catch (e) {}
  }

  // 4. Run test_e2e.js
  console.log('\n[3/3] Executing 17-Point End-to-End Test Suite...');
  const testProcess = spawn(process.execPath, ['test_e2e.js'], {
    cwd: rootDir,
    stdio: 'inherit'
  });

  testProcess.on('exit', (code) => {
    console.log(`\n===========================================================`);
    if (code === 0) {
      console.log('>>> ALL FULL-STACK & ML INTEGRATION TESTS COMPLETED SUCCESSFULLY! <<<');
    } else {
      console.error(`>>> INTEGRATION TESTS FAILED WITH CODE ${code} <<<`);
    }
    console.log('===========================================================');
    killProcesses();
    process.exit(code || 0);
  });
}

main().catch((err) => {
  console.error('[Fatal Error in Harness]', err);
  process.exit(1);
});

