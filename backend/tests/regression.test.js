const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const mongoose = require('mongoose');

const { validateSecurityConfig, getJwtSecret } = require('../src/utils/jwt');
const { getGeminiApiKey } = require('../src/config/ai');
const { escapeRegex, parsePagination, pickFields } = require('../src/utils/securityHelpers');
const { errorHandler } = require('../src/middleware/errorMiddleware');
const { evaluateMockInterview, careerChat, generateCoverLetter, analyzeResume } = require('../src/services/aiService');
const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/db');
const { seedAll } = require('../src/utils/seedRunner');

// ------------------------------------------------------------------
// 1. Unit Security & Helper Tests
// ------------------------------------------------------------------
test('Security: JWT fail-fast in production when missing, placeholder, or too short', () => {
  const prevEnv = process.env.NODE_ENV;
  const prevSecret = process.env.JWT_SECRET;

  try {
    process.env.NODE_ENV = 'production';

    delete process.env.JWT_SECRET;
    assert.throws(() => validateSecurityConfig(), /FATAL SECURITY ERROR/);

    process.env.JWT_SECRET = 'skillbridge_super_secret_jwt_key_2026_dev_prod';
    assert.throws(() => validateSecurityConfig(), /FATAL SECURITY ERROR/);

    process.env.JWT_SECRET = 'short_key';
    assert.throws(() => validateSecurityConfig(), /FATAL SECURITY ERROR/);

    process.env.JWT_SECRET = 'x'.repeat(40);
    assert.equal(getJwtSecret(), 'x'.repeat(40));
  } finally {
    process.env.NODE_ENV = prevEnv;
    process.env.JWT_SECRET = prevSecret;
  }
});

test('Security: CORS allow-list supports mobile Capacitor origins & blocks untrusted origins in prod', () => {
  const prevEnv = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = 'production';
    assert.equal(app.isOriginAllowed('capacitor://localhost'), true);
    assert.equal(app.isOriginAllowed('ionic://localhost'), true);
    assert.equal(app.isOriginAllowed('http://localhost:4200'), true);
    assert.equal(app.isOriginAllowed('https://evil-phishing-site.example.com'), false);
  } finally {
    process.env.NODE_ENV = prevEnv;
  }
});

test('Security: Consistent GEMINI_API_KEY env configuration', () => {
  const prevKey = process.env.GEMINI_API_KEY;
  try {
    process.env.GEMINI_API_KEY = '  test-key-123  ';
    assert.equal(getGeminiApiKey(), 'test-key-123');
  } finally {
    process.env.GEMINI_API_KEY = prevKey;
  }
});

test('Helpers: ReDoS escapeRegex handles C++ cleanly without RegExp SyntaxError', () => {
  const escaped = escapeRegex('C++ (2026) *?[a]');
  assert.doesNotThrow(() => new RegExp(`^${escaped}$`, 'i'));
});

test('Helpers: parsePagination clamps negative pages and huge limits', () => {
  const clamped = parsePagination('-5', '999999', 100);
  assert.deepEqual(clamped, { page: 1, limit: 100, skip: 0 });
  const bad = parsePagination('abc', 'NaN', 50);
  assert.deepEqual(bad, { page: 1, limit: 10, skip: 0 });
});

test('Helpers: pickFields prevents mass assignment', () => {
  const body = { title: 'Dev', applicantsCount: 9999, recruiter: 'hack_id' };
  const clean = pickFields(body, ['title', 'location']);
  assert.deepEqual(clean, { title: 'Dev' });
});

test('Middleware: errorHandler honors err.statusCode=400 & Multer LIMIT_FILE_SIZE=413', () => {
  const makeMockRes = () => {
    const out = { statusCode: 200, payload: null };
    return {
      statusCode: 200,
      status(code) { out.statusCode = code; return this; },
      json(data) { out.payload = data; return this; },
      getOut: () => out,
    };
  };

  const err1 = new Error('Bad upload');
  err1.statusCode = 400;
  const res1 = makeMockRes();
  errorHandler(err1, { method: 'POST', originalUrl: '/test' }, res1, () => {});
  assert.equal(res1.getOut().statusCode, 400);

  const err2 = new Error('Too big');
  err2.name = 'MulterError';
  err2.code = 'LIMIT_FILE_SIZE';
  const res2 = makeMockRes();
  errorHandler(err2, { method: 'POST', originalUrl: '/test' }, res2, () => {});
  assert.equal(res2.getOut().statusCode, 413);
});

test('AI Honesty & Anti-Spam: evaluates unique content and labels fallback engine', async () => {
  const prevKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = '';
  try {
    const spamEval = await evaluateMockInterview('Explain Closures', 'yes '.repeat(60));
    assert.equal(spamEval.engine, 'Rule-based estimate');
    assert.ok(spamEval.score < 50, `Spam score should be < 50, got ${spamEval.score}`);
    assert.ok(spamEval.starBreakdown && typeof spamEval.starBreakdown.situationTask === 'string', 'STAR breakdown present');
    assert.ok(spamEval.rubric && typeof spamEval.rubric.technicalAccuracy === 'number', 'Rubric scores present');

    const chatRes = await careerChat('Hello', [], {});
    assert.equal(chatRes.engine, 'Rule-based estimate');
    assert.ok(chatRes.reply.length > 10);

    const clRes = await generateCoverLetter({}, { title: 'SDE' }, 'Focus on Node.js');
    assert.equal(clRes.engine, 'Rule-based estimate');
    assert.ok(!clRes.coverLetter.includes('Gaurav Sharma'), 'Must not contain hardcoded fallback name');

    const resumeRes = await analyzeResume('JavaScript Developer with Angular experience. Built e-commerce project.');
    assert.equal(resumeRes.engine, 'Rule-based estimate');
    assert.ok(Array.isArray(resumeRes.bulletRewrites) && resumeRes.bulletRewrites.length > 0, 'Bullet rewrites present');
    assert.ok(resumeRes.bulletRewrites[0].rewritten.length > 10, 'Valid rewritten bullet text');
  } finally {
    process.env.GEMINI_API_KEY = prevKey;
  }
});

// ------------------------------------------------------------------
// 2. End-to-End API Security & Bug Regression Tests
// ------------------------------------------------------------------
test('API Regression Suite (Auth, IDOR, Mass Assignment, C++ Search, Admin Privacy)', async (t) => {
  process.env.USE_MEMORY_DB = 'true';
  process.env.NODE_ENV = 'test';

  await connectDB();
  await seedAll();

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}/api`;

  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await disconnectDB();
  });

  const login = async (email, password) => {
    const r = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return r.json();
  };

  const studentAuth = await login('student@skillbridge.com', 'Password123!');
  const recruiterAuth = await login('recruiter@skillbridge.com', 'Password123!');
  const adminAuth = await login('admin@skillbridge.com', 'Password123!');

  assert.ok(studentAuth.token && recruiterAuth.token && adminAuth.token, 'All demo accounts login in test mode');

  // 1. forgotPassword NEVER leaks resetToken in HTTP response
  const forgotRes = await fetch(`${baseUrl}/auth/forgotpassword`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@skillbridge.com' }),
  });
  const forgotJson = await forgotRes.json();
  assert.equal(forgotRes.status, 200);
  assert.equal(forgotJson.resetToken, undefined, 'resetToken MUST NOT leak in HTTP response');

  // 2. resetPassword validates password length
  const badResetRes = await fetch(`${baseUrl}/auth/resetpassword/invalidtoken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: '123' }),
  });
  assert.equal(badResetRes.status, 400);

  // 3. IDOR: unauthenticated & unrelated student blocked from /profiles/user/:id and /users/:id
  const recruiterId = recruiterAuth.user._id || recruiterAuth.user.id;
  const studentId = studentAuth.user._id || studentAuth.user.id;

  const unauthProf = await fetch(`${baseUrl}/profiles/user/${studentId}`);
  assert.equal(unauthProf.status, 401);

  const otherUserRes = await fetch(`${baseUrl}/users/${recruiterId}`, {
    headers: { Authorization: `Bearer ${studentAuth.token}` },
  });
  assert.equal(otherUserRes.status, 403);

  // 4. Roadmap role query with C++ must return 404 (not 500 RegExp SyntaxError)
  const cppRoadmap = await fetch(`${baseUrl}/roadmaps/role/${encodeURIComponent('C++')}`);
  assert.equal(cppRoadmap.status, 404);

  // 5. Job Search with regex chars returns 200 safely & clamps negative page
  const regexJobSearch = await fetch(`${baseUrl}/jobs?search=${encodeURIComponent('C++(a+)+')}&page=-5&limit=999`);
  assert.equal(regexJobSearch.status, 200);

  // 6. Mass assignment on POST /api/jobs ignored for protected counters
  const createJobRes = await fetch(`${baseUrl}/jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${recruiterAuth.token}`,
    },
    body: JSON.stringify({
      title: 'Regression QA Engineer',
      description: 'Write thorough automated regression test suites for APIs.',
      location: 'Remote',
      applicantsCount: 9999,
      viewsCount: 8888,
    }),
  });
  const createJobJson = await createJobRes.json();
  assert.equal(createJobRes.status, 201);
  assert.equal(createJobJson.data.applicantsCount, 0, 'Mass assigned applicantsCount ignored');
  assert.equal(createJobJson.data.viewsCount, 0, 'Mass assigned viewsCount ignored');

  // 7. Admin users endpoint NEVER exposes passwordPreview or password hash
  const adminUsersRes = await fetch(`${baseUrl}/admin/users`, {
    headers: { Authorization: `Bearer ${adminAuth.token}` },
  });
  const adminUsersJson = await adminUsersRes.json();
  assert.equal(adminUsersRes.status, 200);
  for (const u of adminUsersJson.data) {
    assert.equal(u.password, undefined, 'password must never be returned');
    assert.equal(u.passwordPreview, undefined, 'passwordPreview hash substring must not be returned');
  }

  // 8. Admin /applications/recruiter/all succeeds for Admin without empty recruiter mismatch
  const adminAppsRes = await fetch(`${baseUrl}/applications/recruiter/all`, {
    headers: { Authorization: `Bearer ${adminAuth.token}` },
  });
  const adminAppsJson = await adminAppsRes.json();
  assert.equal(adminAppsRes.status, 200);
  assert.ok(adminAppsJson.count >= 3, 'Admin sees all platform applications');

  // 9. Recruiter cannot access /api/admin/stats (403)
  const recAdminTry = await fetch(`${baseUrl}/admin/stats`, {
    headers: { Authorization: `Bearer ${recruiterAuth.token}` },
  });
  assert.equal(recAdminTry.status, 403);

  // 10. Public platform stats endpoint returns honest numeric counts with zero PII
  const publicStatsRes = await fetch(`${baseUrl}/analytics/public-stats`);
  const publicStatsJson = await publicStatsRes.json();
  assert.equal(publicStatsRes.status, 200);
  assert.equal(publicStatsJson.success, true);
  assert.equal(typeof publicStatsJson.data.activeJobs, 'number');
  assert.equal(typeof publicStatsJson.data.companiesCount, 'number');
  assert.equal(typeof publicStatsJson.data.assessmentsCount, 'number');
  assert.equal(typeof publicStatsJson.data.roadmapsCount, 'number');
  assert.equal(typeof publicStatsJson.data.registeredStudents, 'number');
  assert.ok(publicStatsJson.data.activeJobs >= 5, 'Includes real seeded active jobs');
  assert.equal(publicStatsJson.data.emails, undefined);

  // 11. Account settings: preferences update, password change & data export
  const prefsRes = await fetch(`${baseUrl}/users/preferences`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentAuth.token}`,
    },
    body: JSON.stringify({
      themePreference: 'light',
      preferred3DMode: 'force-2d',
      notificationPreferences: { jobAlerts: false, weeklyDigest: true },
    }),
  });
  const prefsJson = await prefsRes.json();
  assert.equal(prefsRes.status, 200);
  assert.equal(prefsJson.data.themePreference, 'light');
  assert.equal(prefsJson.data.notificationPreferences.jobAlerts, false);
  assert.equal(prefsJson.data.notificationPreferences.weeklyDigest, true);

  const exportRes = await fetch(`${baseUrl}/users/export-data`, {
    headers: { Authorization: `Bearer ${studentAuth.token}` },
  });
  const exportJson = await exportRes.json();
  assert.equal(exportRes.status, 200);
  assert.equal(exportJson.data.account.password, undefined);
  assert.ok(exportJson.data.profile);

  const badPassRes = await fetch(`${baseUrl}/users/password`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentAuth.token}`,
    },
    body: JSON.stringify({ currentPassword: 'WrongPassword!', newPassword: 'NewPassword123!' }),
  });
  assert.equal(badPassRes.status, 401);

  // 12. Phase 5: Job Marketplace, Criteria Filtering, Report Scam, and Applications
  // A. Date posted filtering on /api/jobs
  const jobs24hRes = await fetch(`${baseUrl}/jobs?datePosted=24h&hideExpired=true`);
  const jobs24hJson = await jobs24hRes.json();
  assert.equal(jobs24hRes.status, 200);
  assert.equal(jobs24hJson.success, true);
  assert.ok(Array.isArray(jobs24hJson.data));

  // B. Live platform jobs criteria search with workType, datePosted, and hideExpired
  const liveCriteriaRes = await fetch(`${baseUrl}/jobs/criteria-search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      role: 'Engineer',
      stream: 'btech',
      workType: 'remote',
      datePosted: 'all',
      hideExpired: true,
      page: 1,
      limit: 5,
    }),
  });
  const liveCriteriaJson = await liveCriteriaRes.json();
  assert.equal(liveCriteriaRes.status, 200);
  assert.equal(liveCriteriaJson.success, true);

  // C. Report Scam: Student reports a job with ObjectId
  const seededJob = jobs24hJson.data[0];
  if (seededJob) {
    const reportRes = await fetch(`${baseUrl}/reports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentAuth.token}`,
      },
      body: JSON.stringify({
        targetType: 'Job',
        targetId: seededJob._id,
        targetTitle: seededJob.title,
        reason: 'Scam',
        description: 'Suspicious third-party fee requested.',
      }),
    });
    const reportJson = await reportRes.json();
    assert.equal(reportRes.status, 201);
    assert.equal(reportJson.success, true);
  }

  // D. Report external platform job with string ID (e.g. remotive_test123)
  const reportExtRes = await fetch(`${baseUrl}/reports`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentAuth.token}`,
    },
    body: JSON.stringify({
      targetType: 'Job',
      targetId: 'remotive_test123',
      targetTitle: 'Remote Dev Scam Listing',
      reason: 'Fake Job',
      description: 'Non-existent position on external platform.',
    }),
  });
  const reportExtJson = await reportExtRes.json();
  assert.equal(reportExtRes.status, 201);
  assert.equal(reportExtJson.success, true);

  // E. Candidate applications status & stats check
  const myAppsRes = await fetch(`${baseUrl}/applications/my`, {
    headers: { Authorization: `Bearer ${studentAuth.token}` },
  });
  const myAppsJson = await myAppsRes.json();
  assert.equal(myAppsRes.status, 200);
  assert.ok(myAppsJson.stats !== undefined);
  assert.equal(typeof myAppsJson.stats.total, 'number');

  // 13. Phase 6: Recruiter Command Center, Interview Schedules, Tags, Bulk Actions, Analytics
  // A. Recruiter Analytics Funnel
  const recAnalyticsRes = await fetch(`${baseUrl}/analytics/recruiter`, {
    headers: { Authorization: `Bearer ${recruiterAuth.token}` },
  });
  const recAnalyticsJson = await recAnalyticsRes.json();
  assert.equal(recAnalyticsRes.status, 200);
  assert.equal(recAnalyticsJson.success, true);
  assert.ok(recAnalyticsJson.data.funnel !== undefined);
  assert.ok(recAnalyticsJson.data.conversionRates !== undefined);
  assert.ok(Array.isArray(recAnalyticsJson.data.jobPerformance));

  // B. Bulk Status Update & Tags on Recruiter Applications
  const recAppsRes = await fetch(`${baseUrl}/applications/recruiter/all`, {
    headers: { Authorization: `Bearer ${recruiterAuth.token}` },
  });
  const recAppsJson = await recAppsRes.json();
  assert.equal(recAppsRes.status, 200);

  if (recAppsJson.data && recAppsJson.data.length > 0) {
    const targetApp = recAppsJson.data[0];

    // Tags
    const tagsRes = await fetch(`${baseUrl}/applications/${targetApp._id}/tags`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${recruiterAuth.token}`,
      },
      body: JSON.stringify({ tags: ['Top Tier', 'Immediate Joiner'] }),
    });
    const tagsJson = await tagsRes.json();
    assert.equal(tagsRes.status, 200);
    assert.deepEqual(tagsJson.tags, ['Top Tier', 'Immediate Joiner']);

    // Internal Note
    const noteRes = await fetch(`${baseUrl}/applications/${targetApp._id}/internal-notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${recruiterAuth.token}`,
      },
      body: JSON.stringify({ note: 'Candidate cleared preliminary screen.' }),
    });
    const noteJson = await noteRes.json();
    assert.equal(noteRes.status, 201);
    assert.ok(noteJson.data.length > 0);

    // Bulk status update
    const bulkRes = await fetch(`${baseUrl}/applications/bulk-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${recruiterAuth.token}`,
      },
      body: JSON.stringify({
        applicationIds: [targetApp._id],
        status: 'Under Review',
        note: 'Moved to review via automated screening',
      }),
    });
    const bulkJson = await bulkRes.json();
    assert.equal(bulkRes.status, 200);
    assert.equal(bulkJson.count, 1);

    // C. Schedule Interview
    const schedRes = await fetch(`${baseUrl}/interviews/schedules`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${recruiterAuth.token}`,
      },
      body: JSON.stringify({
        applicationId: targetApp._id,
        title: 'Technical Deep Dive',
        round: 'Technical',
        scheduledAt: new Date(Date.now() + 86400000 * 2).toISOString(),
        duration: 45,
        mode: 'Google Meet',
        meetingLink: 'https://meet.google.com/sb-test-meet',
        notes: 'Bring system design portfolio.',
      }),
    });
    const schedJson = await schedRes.json();
    assert.equal(schedRes.status, 201);
    assert.equal(schedJson.success, true);
    assert.equal(schedJson.data.mode, 'Google Meet');
    assert.equal(schedJson.data.status, 'Scheduled');

    // D. Fetch Scheduled Interviews
    const getSchedsRes = await fetch(`${baseUrl}/interviews/schedules`, {
      headers: { Authorization: `Bearer ${recruiterAuth.token}` },
    });
    const getSchedsJson = await getSchedsRes.json();
    assert.equal(getSchedsRes.status, 200);
    assert.ok(getSchedsJson.count >= 1);

    // E. Reschedule Interview
    const interviewId = schedJson.data._id;
    const reschedRes = await fetch(`${baseUrl}/interviews/schedules/${interviewId}/reschedule`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${recruiterAuth.token}`,
      },
      body: JSON.stringify({
        scheduledAt: new Date(Date.now() + 86400000 * 3).toISOString(),
        duration: 60,
      }),
    });
    const reschedJson = await reschedRes.json();
    assert.equal(reschedRes.status, 200);
    assert.equal(reschedJson.data.status, 'Rescheduled');
    assert.equal(reschedJson.data.duration, 60);
  }

  // 14. Phase 7: Admin Control Center Endpoints & Audit Logging
  // A. Admin Stats includes Funnel, Trends, and Audit Snip
  const adminStatsRes = await fetch(`${baseUrl}/admin/stats`, {
    headers: { Authorization: `Bearer ${adminAuth.token}` },
  });
  const adminStatsJson = await adminStatsRes.json();
  assert.equal(adminStatsRes.status, 200);
  assert.equal(adminStatsJson.success, true);
  assert.ok(adminStatsJson.data.funnelStages, 'Includes funnelStages');
  assert.ok(adminStatsJson.data.workTypes, 'Includes workTypes');
  assert.ok(Array.isArray(adminStatsJson.data.userTrend), 'Includes 7-day userTrend');
  assert.equal(adminStatsJson.data.userTrend.length, 7);

  // B. Admin Companies inspection endpoint
  const adminCompsRes = await fetch(`${baseUrl}/admin/companies`, {
    headers: { Authorization: `Bearer ${adminAuth.token}` },
  });
  const adminCompsJson = await adminCompsRes.json();
  assert.equal(adminCompsRes.status, 200);
  assert.ok(adminCompsJson.data.length >= 1, 'Admin lists companies');
  assert.equal(typeof adminCompsJson.data[0].totalJobs, 'number');

  // C. Admin Applications platform-wide monitoring endpoint
  const adminAppsMonRes = await fetch(`${baseUrl}/admin/applications`, {
    headers: { Authorization: `Bearer ${adminAuth.token}` },
  });
  const adminAppsMonJson = await adminAppsMonRes.json();
  assert.equal(adminAppsMonRes.status, 200);
  assert.ok(Array.isArray(adminAppsMonJson.data), 'Admin applications list returned');

  // D. Admin Audit Logs endpoint
  const adminLogsRes = await fetch(`${baseUrl}/admin/audit-logs`, {
    headers: { Authorization: `Bearer ${adminAuth.token}` },
  });
  const adminLogsJson = await adminLogsRes.json();
  assert.equal(adminLogsRes.status, 200);
  assert.ok(Array.isArray(adminLogsJson.data), 'Audit logs list returned');
});


