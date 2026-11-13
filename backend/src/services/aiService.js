const { getModel } = require('../config/ai');
const { detectSkillsFromText, commonSkillSet } = require('./resumeParserService');

// Role benchmarks for skill gap and role matches
const roleBenchmarkSkills = {
  'Frontend Developer': [
    'JavaScript', 'TypeScript', 'Angular', 'HTML5', 'CSS3', 'REST API', 'Git', 'Webpack', 'Jest'
  ],
  'Backend Developer': [
    'Node.js', 'Express.js', 'MongoDB', 'PostgreSQL', 'REST API', 'Docker', 'Redis', 'Git', 'System Design'
  ],
  'Full Stack Developer': [
    'JavaScript', 'TypeScript', 'Angular', 'Node.js', 'Express.js', 'MongoDB', 'REST API', 'Git', 'Docker'
  ],
  'Data Analyst': [
    'Python', 'SQL', 'PostgreSQL', 'Tableau', 'PowerBI', 'Data Analysis', 'Excel', 'Statistics'
  ],
  'AI/ML Developer': [
    'Python', 'Machine Learning', 'TensorFlow', 'PyTorch', 'Data Structures', 'Algorithms', 'Mathematics', 'Git'
  ],
  'Cloud Engineer': [
    'AWS', 'Docker', 'Kubernetes', 'Linux', 'CI/CD', 'Terraform', 'GCP', 'Python', 'Networking'
  ],
};

/**
 * Call Gemini model with a prompt and safe error handling
 */
const callGemini = async (prompt, systemInstruction = '') => {
  const model = getModel('gemini-1.5-flash');
  if (!model) return null;

  try {
    const fullPrompt = systemInstruction ? `${systemInstruction}\n\n${prompt}` : prompt;
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    return response.text();
  } catch (err) {
    console.warn('Gemini API call failed, using intelligent fallback engine:', err.message);
    return null;
  }
};

/**
 * 1. AI Resume Analyzer
 */
const analyzeResume = async (resumeText, targetRole = 'Software Developer') => {
  const detected = detectSkillsFromText(resumeText);
  const targetBenchmarks = roleBenchmarkSkills[targetRole] || roleBenchmarkSkills['Full Stack Developer'];

  const prompt = `You are a Principal Technical Recruiter and ATS (Applicant Tracking System) specialist.
Analyze this resume text for the target role: "${targetRole}".
Analyze ONLY what is actually documented in the resume text. Do NOT fabricate, invent, or assume any skills, projects, or experiences that are not explicitly present in the candidate's resume.
If the candidate has no skills listed, detectedSkills MUST be an empty array [].

Resume content:
"""
${resumeText.slice(0, 4000)}
"""

Return a valid JSON object only (no markdown code blocks, just raw JSON) matching this exact schema:
{
  "profileStrength": 78,
  "skillsScore": 82,
  "projectsScore": 75,
  "experienceScore": 68,
  "keywordsScore": 80,
  "summary": "Professional 2-3 sentence overview of this candidate's profile.",
  "detectedSkills": ["JavaScript", "Node.js"],
  "missingSkills": ["Docker", "AWS"],
  "strengths": ["Strong frontend foundations", "Clear project descriptions"],
  "weakSections": ["Lacks production deployment experience", "Metrics and quantifiable results missing"],
  "atsSuggestions": ["Add keywords like CI/CD and REST API", "Use standard section headers"],
  "suggestedImprovements": ["Quantify impact with numbers (e.g. reduced load time by 30%)", "Add a link to live deployed projects"],
  "suggestedJobRoles": ["Frontend Developer", "Full Stack Engineer", "Junior Web Developer"],
  "suggestedProjects": ["Full Stack E-Commerce with Stripe", "Realtime Collaborative Workspace"],
  "suggestedTechnologies": ["Docker", "TypeScript", "PostgreSQL"],
  "bulletRewrites": [
    {
      "original": "Worked on frontend features using Angular and fixed bugs.",
      "rewritten": "Architected 6 responsive Angular 19 views utilizing OnPush and Signals, reducing client render latency by 35% for 12,000+ monthly active users.",
      "impactNote": "Applies Google's X-Y-Z formula (Accomplished [X] measured by [Y] by doing [Z]) with quantifiable metrics."
    },
    {
      "original": "Built backend REST APIs and connected to database.",
      "rewritten": "Engineered 14 secure RESTful endpoints in Node.js/Express with JWT auth and MongoDB aggregation, boosting query throughput by 40%.",
      "impactNote": "Highlights architectural ownership, security hardening, and database optimization."
    }
  ]
}`;

  const geminiResult = await callGemini(prompt, 'Respond only with pure JSON.');
  if (geminiResult) {
    try {
      const cleanJson = geminiResult.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      return { ...parsed, engine: 'AI-generated' };
    } catch (e) {
      console.warn('Failed to parse Gemini JSON output for resume analysis, using heuristic analysis');
    }
  }

  // Heuristic Fallback Engine - Strictly reflects genuine resume contents
  const matched = detected.filter((s) => targetBenchmarks.map(b => b.toLowerCase()).includes(s.toLowerCase()));
  const missing = targetBenchmarks.filter((b) => !detected.map(d => d.toLowerCase()).includes(b.toLowerCase()));

  const skillsScore = targetBenchmarks.length > 0 ? Math.round((matched.length / targetBenchmarks.length) * 100) : 0;
  const projectsScore = resumeText.toLowerCase().includes('project') ? 70 : 0;
  const experienceScore = (resumeText.toLowerCase().includes('experience') || resumeText.toLowerCase().includes('intern')) ? 65 : 0;
  const keywordsScore = targetBenchmarks.length > 0 ? Math.min(100, Math.round((detected.length / targetBenchmarks.length) * 100)) : 0;
  const profileStrength = Math.round((skillsScore * 0.35) + (projectsScore * 0.25) + (experienceScore * 0.2) + (keywordsScore * 0.2));

  const summary = detected.length > 0
    ? `Candidate profile displays verified skills in ${detected.slice(0, 4).join(', ')}. Target role readiness for ${targetRole} is evaluated at ${profileStrength}%.`
    : `No technical skills matching ${targetRole} were found in this resume. Please include your programming languages, tools, and technical projects to improve your score.`;

  return {
    engine: 'Rule-based estimate',
    profileStrength,
    skillsScore,
    projectsScore,
    experienceScore,
    keywordsScore,
    summary,
    detectedSkills: detected,
    missingSkills: missing,
    strengths: detected.length > 0 ? [
      'Documented skills align with software engineering fundamentals',
      'Contains relevant technology keywords',
    ] : [
      'Resume uploaded successfully for evaluation',
    ],
    weakSections: [
      ...(detected.length === 0 ? ['Missing essential technical skills and toolsets'] : []),
      'Lacks quantifiable business or performance metrics (e.g. % speedup, user count)',
      'Limited mention of production deployment, cloud services, or CI/CD',
    ],
    atsSuggestions: [
      'Incorporate industry-standard keywords: RESTful API, Unit Testing, System Architecture',
      'Ensure standard clean headers (Education, Experience, Technical Skills, Projects)',
      'Include direct URLs to active GitHub repositories and live deployments',
    ],
    suggestedImprovements: [
      'Add measurable project achievements (e.g., "Handled 1,000+ daily requests")',
      'Strengthen backend database and containerization skills (Docker, PostgreSQL)',
    ],
    suggestedJobRoles: [targetRole, 'Software Engineer', 'Full Stack Developer'],
    suggestedProjects: [
      'Scalable Task Management Application',
      'Realtime Collaborative API with Database Integration',
    ],
    suggestedTechnologies: missing.slice(0, 4),
    bulletRewrites: [
      {
        original: 'Built user interface components and integrated backend data.',
        rewritten: `Architected responsive, accessible UI modules with ${detected.includes('Angular') ? 'Angular Signals' : 'TypeScript'}, decreasing layout shift (CLS) to 0 and boosting page speed by 30%.`,
        impactNote: 'Transforms passive duty into an action-driven technical achievement with measurable Core Web Vitals outcome.',
      },
      {
        original: 'Developed server-side API routes and managed database queries.',
        rewritten: `Engineered scalable REST endpoints with structured rate limiting and schema indexing in ${detected.includes('MongoDB') ? 'MongoDB' : 'database'}, handling concurrent traffic with 99.9% uptime.`,
        impactNote: 'Demonstrates enterprise backend resilience, defensive architecture, and quantitative impact.',
      },
      {
        original: 'Wrote unit tests and helped troubleshoot bugs.',
        rewritten: 'Implemented automated regression test suites, catching critical edge cases and elevating codebase confidence across releases.',
        impactNote: 'Emphasizes proactive software engineering rigor and reliability engineering.',
      },
    ],
  };
};

/**
 * 2. AI Job Matching
 */
const calculateJobMatch = async (userSkills = [], job = {}, userProfile = {}) => {
  const jobSkills = [...(job.requiredSkills || []), ...(job.preferredSkills || [])];
  const userSkillNames = (userSkills || []).map((s) => (typeof s === 'string' ? s : s.name || ''));

  const prompt = `You are an AI Job Matching engine.
Analyze candidate skills vs job requirements.

Candidate Skills: ${userSkillNames.join(', ')}
Candidate Headline: ${userProfile.headline || 'Developer'}
Job Title: ${job.title}
Job Company: ${job.companyName || ''}
Job Requirements: ${(job.requirements || []).join('; ')}
Job Required Skills: ${(job.requiredSkills || []).join(', ')}

Return a pure JSON object:
{
  "matchScore": 85,
  "matchedSkills": ["JavaScript", "Angular", "Node.js"],
  "missingSkills": ["Docker", "AWS"],
  "recommendation": "Strong candidate match for this role. Review AWS fundamentals prior to interview."
}`;

  const geminiResult = await callGemini(prompt, 'Respond only with valid JSON.');
  if (geminiResult) {
    try {
      const cleanJson = geminiResult.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      return { ...parsed, engine: 'AI-generated' };
    } catch (e) {
      // Fallback
    }
  }

  // Heuristic matching
  const lowerUser = userSkillNames.map((s) => s.toLowerCase());
  const matched = [];
  const missing = [];

  for (const js of jobSkills) {
    if (lowerUser.some((u) => u === js.toLowerCase() || u.includes(js.toLowerCase()) || js.toLowerCase().includes(u))) {
      matched.push(js);
    } else {
      missing.push(js);
    }
  }

  const denominator = Math.max(1, jobSkills.length);
  const matchRatio = matched.length / denominator;
  const score = Math.round(matchRatio * 100);

  let recommendation = `Match rating is ${score}%. `;
  if (missing.length > 0) {
    recommendation += `Focus on acquiring or showcasing experience with: ${missing.slice(0, 3).join(', ')}.`;
  } else if (matched.length > 0) {
    recommendation += `Candidate meets all core technical requirements. Highlight real-world project outcomes in the application.`;
  } else {
    recommendation += `Candidate profile currently has no overlapping skills with this role.`;
  }

  return {
    engine: 'Rule-based estimate',
    matchScore: score,
    matchedSkills: Array.from(new Set(matched)),
    missingSkills: Array.from(new Set(missing)),
    recommendation,
  };
};

/**
 * 3. Skill Gap Analyzer
 */
const analyzeSkillGap = async (currentSkills = [], targetRole = 'Full Stack Developer') => {
  const userSkillNames = (currentSkills || []).map((s) => (typeof s === 'string' ? s : s.name || ''));
  const benchmarks = roleBenchmarkSkills[targetRole] || roleBenchmarkSkills['Full Stack Developer'];

  const prompt = `You are a Career Architect and Technical Mentor.
A student or developer wants to achieve the target role: "${targetRole}".
Analyze ONLY the student's actual current skills: ${userSkillNames.join(', ') || 'No skills listed yet'}.
If the student has no skills listed, readinessScore must be 0 and existingSkills must be empty [].

Current Skills: ${userSkillNames.join(', ')}
Target Role: ${targetRole}

Return pure JSON with this structure:
{
  "targetRole": "${targetRole}",
  "readinessScore": 65,
  "existingSkills": ["JavaScript", "CSS3"],
  "missingSkills": ["TypeScript", "Docker"],
  "learningOrder": [
    { "step": 1, "skill": "TypeScript", "duration": "2 weeks", "reason": "Essential for Angular and modern Node.js" },
    { "step": 2, "skill": "Docker", "duration": "1 week", "reason": "Standard for modern deployment and containerization" }
  ],
  "suggestedProjects": [
    { "title": "Production REST API with Docker", "skills": ["Node.js", "Docker", "MongoDB"] }
  ],
  "suggestedTechnologies": ["TypeScript", "Docker", "Redis"],
  "actionPlan": "Summary of next steps to become job-ready."
}`;

  const geminiResult = await callGemini(prompt, 'Respond only with valid JSON.');
  if (geminiResult) {
    try {
      const cleanJson = geminiResult.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      return { ...parsed, engine: 'AI-generated' };
    } catch (e) {
      // Fallback
    }
  }

  // Heuristic engine - Strictly authentic
  const lowerUser = userSkillNames.map((s) => s.toLowerCase());
  const existing = [];
  const missing = [];

  for (const b of benchmarks) {
    if (lowerUser.includes(b.toLowerCase())) {
      existing.push(b);
    } else {
      missing.push(b);
    }
  }

  const readinessScore = benchmarks.length > 0 ? Math.round((existing.length / benchmarks.length) * 100) : 0;

  const learningOrder = missing.map((skill, index) => ({
    step: index + 1,
    skill,
    duration: index === 0 ? '1-2 weeks' : '2-3 weeks',
    priority: index === 0 ? 'Critical' : (index < 3 ? 'Recommended' : 'Elective'),
    reason: `Core technical capability expected in ${targetRole} screening rounds.`,
  }));

  const actionPlan = existing.length > 0
    ? `You currently match ${readinessScore}% of the standard requirements for ${targetRole}. Focus on ${missing.slice(0, 2).join(' and ') || 'advanced project development'} to improve job readiness.`
    : `You have 0 matching skills for ${targetRole} right now. Start by learning the foundational requirements: ${missing.slice(0, 2).join(' and ')}.`;

  return {
    engine: 'Rule-based estimate',
    targetRole,
    readinessScore,
    existingSkills: existing,
    missingSkills: missing,
    learningOrder: learningOrder.length > 0 ? learningOrder : [
      { step: 1, skill: 'System Design', duration: '2 weeks', reason: 'Prepares candidate for technical interview rounds.' },
      { step: 2, skill: 'Cloud Architecture', duration: '2 weeks', reason: 'Adds high-value enterprise qualification.' },
    ],
    suggestedProjects: [
      {
        title: `Full Stack ${targetRole.replace('Developer', '')} Project`,
        skills: [...existing.slice(0, 2), ...missing.slice(0, 2)],
        description: 'Build an end-to-end full stack application with authentication, database indexing, and containerized deployment.',
      },
      {
        title: 'Microservices & API Gateway Project',
        skills: ['Node.js', 'Docker', 'Redis'],
        description: 'Demonstrates distributed system design, caching, and rate limiting capabilities.',
      },
    ],
    suggestedTechnologies: missing.slice(0, 5),
    actionPlan,
  };
};

/**
 * 4. AI Career Assistant (Multi-turn chat)
 */
const careerChat = async (userMessage, history = [], userProfile = {}) => {
  const profileContext = userProfile
    ? `Candidate Profile Context:
- Headline: ${userProfile.headline || 'Developer'}
- Skills: ${(userProfile.skills || []).map(s => s.name || s).join(', ')}
- Preferred Role: ${userProfile.preferredRole || 'Software Developer'}
- Education: ${(userProfile.education || []).map(e => `${e.degree} at ${e.college}`).join('; ')}`
    : '';

  const systemInstruction = `You are SkillBridge AI, a helpful, encouraging, and highly knowledgeable career advisor, engineering mentor, and technical recruiter.
Help students and developers with career path guidance, resume reviews, learning roadmaps, interview preparation, and job application strategies.
Always format output in beautiful Markdown with bullet points, bold key terms, and code snippets when appropriate.
Support queries in English and any language requested by the user.
${profileContext}`;

  const conversationText = history
    .slice(-6)
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n');

  const prompt = `${conversationText ? conversationText + '\n' : ''}User: ${userMessage}\nAssistant:`;

  const geminiResult = await callGemini(prompt, systemInstruction);
  if (geminiResult) {
    return { reply: geminiResult, engine: 'AI-generated' };
  }

  // Intelligent conversational fallback
  const lowerMsg = userMessage.toLowerCase();
  if (lowerMsg.includes('full-stack') || lowerMsg.includes('full stack')) {
    return {
      engine: 'Rule-based estimate',
      reply: `### Path to Becoming a Modern Full-Stack Developer 🚀

To stand out in today's tech market, here is the structured roadmap:

1. **Frontend Mastery (Angular / React + TypeScript)**
   - Solidify core JavaScript (ES6+, async/await, closures, prototypes).
   - Learn **Angular 19** fundamentals: Signals, Standalone Components, Reactive Forms, and RxJS state management.
   - Master responsive UI design with clean CSS variables and modern layout patterns.

2. **Backend Architecture (Node.js & Express)**
   - Build RESTful APIs with clean layered architectures (controllers, services, repositories).
   - Implement JWT authentication, bcrypt password hashing, and role-based guards.
   - Database modeling with MongoDB / Mongoose or PostgreSQL.

3. **DevOps & Production Readiness**
   - Containerize apps with **Docker**.
   - Set up CI/CD pipelines (GitHub Actions).
   - Deploy full-stack apps to cloud providers (Render, Vercel, AWS).

💡 **Pro Tip**: Recruiters value 2 high-quality, production-deployed projects with live demo links more than 10 basic tutorial clones!`
    };
  }

  if (lowerMsg.includes('resume') || lowerMsg.includes('shortlist') || lowerMsg.includes('not getting shortlisted')) {
    return {
      engine: 'Rule-based estimate',
      reply: `### Why Resumes Get Filtered & How to Fix Them 📄

If you're not getting shortlisted, the 3 most common reasons are:

1. **Lack of Measurable Impact (The "X-Y-Z" Formula)**
   - ❌ *Weak:* "Created an e-commerce website using Angular and Node.js."
   - ✅ *Strong:* "Architected an e-commerce platform using Angular 19 and Node.js, reducing API latency by 35% through Redis caching."

2. **ATS Keyword Optimization**
   - Automated scanners look for exact technical terms mentioned in the job description: *REST API, TypeScript, JWT Authentication, Unit Testing, MongoDB Aggregation*.

3. **Portfolio & GitHub Proof**
   - Provide clickable hyperlinks to your live web applications, clean GitHub READMEs, and API documentation.

Upload your resume to our **SkillBridge AI Resume Analyzer** to get an instant breakdown of missing keywords and score!`
    };
  }

  if (lowerMsg.includes('angular') || lowerMsg.includes('learn after node')) {
    return {
      engine: 'Rule-based estimate',
      reply: `### Next Steps for Modern Web Development ⚡

After mastering **Node.js**:
1. **Caching & Queues**: Master **Redis** for session management and job queues (BullMQ).
2. **Containerization**: Learn **Docker & Docker Compose** to spin up environments locally.
3. **Database Performance**: Study indexing strategies, MongoDB aggregation pipelines, and transaction rollbacks.
4. **Cloud & Serverless**: Deploy serverless functions and explore AWS S3, CloudFront, and Lambda.`
    };
  }

  return {
    engine: 'Rule-based estimate',
    reply: `### Hello! I am your SkillBridge Career Assistant 💼

I'm here to help you accelerate your tech career. Here are things we can do together:

* **Resume Reviews**: Provide feedback on bullet points and ATS optimization.
* **Skill Roadmaps**: Create targeted learning sequences for *Frontend*, *Backend*, *Cloud*, or *AI*.
* **Interview Prep**: Practice behavioral, technical, and system design questions.
* **Cover Letter Drafting**: Tailor customized cover letters for your target companies.

How can I help you today? Feel free to ask about any role or technology!`
  };
};

/**
 * 5. AI Cover Letter Generator
 */
const generateCoverLetter = async (userProfile = {}, job = {}, customInstructions = '') => {
  const prompt = `You are a professional executive resume writer.
Generate a compelling, personalized, high-converting cover letter for this candidate applying to this job.

Candidate Information:
- Name: ${userProfile.user?.name || userProfile.fullName || 'Candidate'}
- Headline: ${userProfile.headline || 'Software Developer'}
- Skills: ${(userProfile.skills || []).map(s => s.name || s).join(', ')}
- About: ${userProfile.about || 'Dedicated developer passionate about building scalable web solutions.'}
- Education: ${(userProfile.education || []).map(e => `${e.degree} from ${e.college}`).join(', ')}
- Experience: ${(userProfile.experience || []).map(exp => `${exp.title} at ${exp.company}`).join(', ')}

Job Details:
- Title: ${job.title}
- Company: ${job.companyName || 'the Hiring Team'}
- Location: ${job.location || 'Remote'}
- Required Skills: ${(job.requiredSkills || []).join(', ')}
- Description: ${(job.description || '').slice(0, 1000)}
${customInstructions ? `- Custom Instructions: ${customInstructions}` : ''}

Write a professional, 3-4 paragraph cover letter.
Return only the text of the cover letter.`;

  const geminiResult = await callGemini(prompt);
  if (geminiResult) {
    return { coverLetter: geminiResult.trim(), engine: 'AI-generated' };
  }

  // High quality structured fallback (no hardcoded user names)
  const candidateName = userProfile.user?.name || userProfile.fullName || 'Candidate';
  const companyName = job.companyName || 'Hiring Team';
  const jobTitle = job.title || 'Full Stack Developer';
  const topSkills = (userProfile.skills || []).slice(0, 4).map(s => s.name || s).join(', ') || 'your core software engineering stack';
  const customNote = customInstructions ? `\n\nIn alignment with your role priorities, I bring particular focus to ${customInstructions.trim()}.` : '';

  return {
    engine: 'Rule-based estimate',
    coverLetter: `Dear Hiring Manager,

I am writing to express my strong enthusiasm for the ${jobTitle} position at ${companyName}. With a solid foundation in modern software development and hands-on experience utilizing ${topSkills}, I am eager to contribute to your engineering team's ongoing success and high-impact initiatives.

Throughout my technical journey, I have focused on writing clean, scalable, and maintainable code. My experience encompasses building resilient applications, designing maintainable APIs, and solving complex engineering challenges, which closely aligns with the expectations outlined for the ${jobTitle} role at ${companyName}.${customNote}

I am particularly excited about ${companyName}'s vision and dedication to technical excellence. I look forward to bringing my problem-solving mindset, collaborative spirit, and commitment to continuous learning to your team. Thank you for your time and consideration, and I welcome the opportunity to discuss my qualifications further in an interview.

Sincerely,
${candidateName}
SkillBridge Developer Network`
  };
};

/**
 * 6. AI Mock Interview Practice & Evaluation
 */
const evaluateMockInterview = async (question, userAnswer, category = 'General', difficulty = 'Intermediate') => {
  const prompt = `You are a Senior Tech Interviewer evaluating a candidate's answer.
Category: ${category}
Difficulty: ${difficulty}
Question: "${question}"
Candidate Answer: "${userAnswer}"

Evaluate the answer thoroughly. Return a pure JSON object:
{
  "score": 85,
  "feedback": "Detailed 2-3 sentence constructive feedback highlighting strengths and what was missed.",
  "strengths": ["Mentioned key concepts", "Accurate technical terminology"],
  "areasToImprove": ["Could have included a code example or edge-case handling"],
  "suggestedAnswer": "Comprehensive model answer that would score 100% in a FAANG-level interview.",
  "starBreakdown": {
    "situationTask": "Clear framing of problem parameters and architecture constraints.",
    "action": "Specific engineering methodology, algorithm, or framework utilized.",
    "resultImpact": "Quantifiable outcome, latency improvement, or failure prevention consideration."
  },
  "rubric": {
    "technicalAccuracy": 85,
    "communication": 80,
    "completeness": 85,
    "productionReadiness": 90
  }
}`;

  const geminiResult = await callGemini(prompt, 'Respond only with pure JSON.');
  if (geminiResult) {
    try {
      const cleanJson = geminiResult.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      return { ...parsed, engine: 'AI-generated' };
    } catch (e) {
      // Fallback
    }
  }

  // Heuristic evaluation based on unique meaningful terms to prevent repetition inflation
  const tokens = (userAnswer || '').trim().toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  const uniqueTokens = new Set(tokens);
  const uniqueCount = uniqueTokens.size;
  let score = 25;
  if (uniqueCount >= 8) score += 25;
  if (uniqueCount >= 18) score += 20;
  if (uniqueCount >= 32) score += 15;
  if (/(example|because|complexity|async|promise|database|api|cache|state|component|index)/i.test(userAnswer || '')) {
    score += 10;
  }
  score = Math.min(95, uniqueCount === 0 ? 0 : score);

  const technicalAccuracy = Math.min(95, Math.max(30, score + (uniqueCount > 15 ? 5 : -5)));
  const communication = Math.min(95, Math.max(25, Math.round(score * 0.95)));
  const completeness = Math.min(95, Math.max(20, Math.round(score * 0.9)));
  const productionReadiness = Math.min(95, Math.max(20, Math.round(score * 0.85)));

  return {
    engine: 'Rule-based estimate',
    score,
    feedback: uniqueCount < 8
      ? `Your answer is very brief (${uniqueCount} unique key terms). Try explaining the underlying mechanism, a real code example, and trade-offs in ${category}.`
      : `Good technical attempt with solid conceptual grounding. You demonstrated an understanding of ${category} fundamentals. To elevate your answer to top tier, include a practical scenario or mention performance trade-offs.`,
    strengths: uniqueCount >= 8
      ? [
          'Addresses the core question directly',
          'Demonstrates familiarity with relevant terminology',
        ]
      : ['Submitted an initial response'],
    areasToImprove: [
      'Include concrete code or architecture examples',
      'Discuss time/space complexity or performance implications where applicable',
    ],
    suggestedAnswer: `In production software engineering, ${question} is handled by utilizing best practices: 1) Ensuring idempotency and clean separation of concerns, 2) Mitigating edge-cases through robust input validation and unit tests, and 3) Monitoring memory and execution overhead.`,
    starBreakdown: {
      situationTask: uniqueCount >= 8 ? 'Clearly established the technical problem statement and context.' : 'Context and problem constraints could be defined more explicitly.',
      action: uniqueCount >= 8 ? 'Described implementation approach and technical keywords.' : 'Action steps and execution logic need deeper explanation.',
      resultImpact: uniqueCount >= 18 ? 'Mentioned technical trade-offs or measurable outcomes.' : 'Add quantifiable metrics, performance impact, or operational lessons learned.',
    },
    rubric: {
      technicalAccuracy,
      communication,
      completeness,
      productionReadiness,
    },
  };
};

module.exports = {
  analyzeResume,
  calculateJobMatch,
  analyzeSkillGap,
  careerChat,
  generateCoverLetter,
  evaluateMockInterview,
  roleBenchmarkSkills,
};
