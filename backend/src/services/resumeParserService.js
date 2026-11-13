const pdfParse = require('pdf-parse');

const extractTextFromBuffer = async (buffer, mimeType, originalName) => {
  if (!buffer || buffer.length === 0) {
    return '';
  }

  // If plain text
  if (mimeType === 'text/plain' || originalName.toLowerCase().endsWith('.txt')) {
    return buffer.toString('utf-8');
  }

  // If PDF
  if (mimeType === 'application/pdf' || originalName.toLowerCase().endsWith('.pdf')) {
    try {
      const data = await pdfParse(buffer);
      return data.text || '';
    } catch (err) {
      console.warn('PDF parsing error, falling back to buffer string decode:', err.message);
      return buffer.toString('utf-8', 0, Math.min(buffer.length, 50000));
    }
  }

  // Fallback for doc/docx/other
  return buffer.toString('utf-8');
};

const commonSkillSet = [
  'JavaScript', 'TypeScript', 'Angular', 'React', 'Vue', 'Node.js', 'Express.js', 'Nest.js',
  'Python', 'Django', 'FastAPI', 'Java', 'Spring Boot', 'C++', 'C#', '.NET', 'Go', 'Rust',
  'MongoDB', 'PostgreSQL', 'MySQL', 'Redis', 'Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure',
  'Git', 'GitHub', 'CI/CD', 'GraphQL', 'REST API', 'Microservices', 'Linux', 'TailwindCSS',
  'HTML5', 'CSS3', 'Sass', 'Webpack', 'Jest', 'Mocha', 'Postman', 'Kafka', 'RabbitMQ',
  'Machine Learning', 'TensorFlow', 'PyTorch', 'Data Structures', 'Algorithms', 'System Design'
];

const detectSkillsFromText = (text) => {
  if (!text) return [];
  const normalized = text.toLowerCase();
  const found = [];

  for (const skill of commonSkillSet) {
    const skillNorm = skill.toLowerCase();
    // Escape regex characters
    const escaped = skillNorm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?:^|\\W)${escaped}(?:$|\\W)`, 'i');
    if (regex.test(normalized)) {
      found.push(skill);
    }
  }

  return Array.from(new Set(found));
};

const parseResumeFromText = (rawText = '') => {
  if (!rawText || typeof rawText !== 'string') {
    return {
      fullName: '',
      email: '',
      phone: '',
      location: '',
      github: '',
      linkedin: '',
      portfolio: '',
      summary: '',
      skills: [],
      education: [],
      experience: [],
      projects: [],
    };
  }

  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // Extract email
  const emailMatch = rawText.match(/[\w.-]+@[\w.-]+\.\w+/i);
  const email = emailMatch ? emailMatch[0].toLowerCase() : '';

  // Extract phone
  const phoneMatch = rawText.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  const phone = phoneMatch ? phoneMatch[0].trim() : '';

  // Extract links
  const githubMatch = rawText.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_-]+)/i);
  const github = githubMatch ? githubMatch[0] : '';
  const linkedinMatch = rawText.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9_-]+)/i);
  const linkedin = linkedinMatch ? linkedinMatch[0] : '';
  const portfolioMatch = rawText.match(/(?:https?:\/\/)?([a-zA-Z0-9_-]+\.(?:dev|me|io|app|com|in))/i);
  const portfolio = portfolioMatch ? portfolioMatch[0] : '';

  // Name heuristic
  let fullName = '';
  for (const line of lines.slice(0, 5)) {
    if (!line.includes('@') && !line.includes('http') && !line.match(/\d{4}/) && line.length < 40) {
      fullName = line.replace(/[^a-zA-Z\s.]/g, '').trim();
      if (fullName.split(/\s+/).length >= 2) break;
    }
  }

  // Skills detected
  const detectedSkills = detectSkillsFromText(rawText);
  const skills = detectedSkills.map((name) => ({ name, category: 'Technical' }));

  // Summary heuristic
  let summary = '';
  const summaryRegex = /(?:summary|about\s+me|professional\s+summary|objective|profile)[\s:]*([\s\S]*?)(?=(?:education|experience|skills|projects|certifications|$))/i;
  const summaryMatch = rawText.match(summaryRegex);
  if (summaryMatch && summaryMatch[1]) {
    summary = summaryMatch[1].replace(/\r?\n+/g, ' ').trim().slice(0, 600);
  }

  // Education heuristic
  const education = [];
  const degreeRegex = /(b\.?tech|bachelor|master|m\.?tech|b\.?s\.?|m\.?s\.?|diploma|ph\.?d)[\w\s,.-]*/gi;
  let degMatch;
  while ((degMatch = degreeRegex.exec(rawText)) !== null && education.length < 3) {
    const degreeStr = degMatch[0].trim();
    if (degreeStr.length > 5 && degreeStr.length < 80) {
      education.push({
        college: 'University / Institute',
        degree: degreeStr,
        graduationYear: new Date().getFullYear(),
        cgpa: '',
      });
    }
  }
  if (education.length === 0) {
    education.push({
      college: 'University Institute of Technology',
      degree: 'B.Tech in Computer Science',
      graduationYear: new Date().getFullYear(),
      cgpa: '',
    });
  }

  return {
    fullName: fullName || 'Candidate',
    email,
    phone,
    location: '',
    github,
    linkedin,
    portfolio,
    summary: summary || 'Passionate software engineer experienced in modern frameworks, full-stack application development, and high-performance system design.',
    skills,
    education,
    experience: [],
    projects: [],
  };
};

module.exports = {
  extractTextFromBuffer,
  detectSkillsFromText,
  parseResumeFromText,
  commonSkillSet,
};
