const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { errorHandler, notFound } = require('./middleware/errorMiddleware');

// Route imports
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const profileRoutes = require('./routes/profileRoutes');
const resumeRoutes = require('./routes/resumeRoutes');
const jobRoutes = require('./routes/jobRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const companyRoutes = require('./routes/companyRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const interviewRoutes = require('./routes/interviewRoutes');
const skillRoutes = require('./routes/skillRoutes');
const aiRoutes = require('./routes/aiRoutes');
const adminRoutes = require('./routes/adminRoutes');
const reportRoutes = require('./routes/reportRoutes');
const savedJobRoutes = require('./routes/savedJobRoutes');
const mlRoutes = require('./routes/mlRoutes');
const assessmentRoutes = require('./routes/assessmentRoutes');
const roadmapRoutes = require('./routes/roadmapRoutes');
const projectRoutes = require('./routes/projectRoutes');
const githubRoutes = require('./routes/githubRoutes');
const achievementRoutes = require('./routes/achievementRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');

const app = express();

// Security HTTP headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Explicit CORS Allow-List (Desktop Browsers + Mobile Capacitor/Ionic Shells)
const buildAllowedOrigins = () => {
  const extra = (process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  return new Set([
    'http://localhost:4200',
    'http://127.0.0.1:4200',
    'capacitor://localhost',
    'ionic://localhost',
    'http://localhost',
    'https://localhost',
    ...(process.env.CLIENT_URL ? [process.env.CLIENT_URL.trim()] : []),
    ...extra,
  ]);
};

const isOriginAllowed = (origin) => {
  if (!origin) return true; // Mobile native shells, curl, same-origin
  const allowSet = buildAllowedOrigins();
  if (allowSet.has(origin)) return true;
  if (process.env.NODE_ENV !== 'production') {
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      return true;
    }
  }
  return false;
};

app.use(
  cors({
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        return callback(null, true);
      }
      const corsErr = new Error('Origin not allowed by CORS policy');
      corsErr.statusCode = 403;
      return callback(corsErr, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// HTTP payload compression (gzip/deflate) for all responses > 1KB
app.use(
  compression({
    threshold: 1024,
    filter: (req, res) => {
      if (req.headers['x-no-compression']) return false;
      return compression.filter(req, res);
    },
  })
);

// Enable robust ETag generation for HTTP 304 revalidation
app.set('etag', 'strong');

// Default Cache-Control and Vary headers for API traffic
app.use('/api', (req, res, next) => {
  res.set('Vary', 'Accept-Encoding, Authorization');
  if (req.method === 'GET') {
    if (!res.getHeader('Cache-Control')) {
      res.set('Cache-Control', 'private, no-cache, must-revalidate');
    }
  } else {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  }
  next();
});

// Body parser capped at safe size (file uploads handled separately via Multer limits)
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Request logging in non-production only (never logs headers/body/tokens)
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Global API rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 400,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP address, please try again in 15 minutes.',
  },
});
app.use('/api', limiter);

// Health check endpoint (non-sensitive public status)
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'SkillBridge API is healthy and operational.',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Dynamic XML Sitemap for Search Engine Discovery & SEO
app.get('/sitemap.xml', async (req, res) => {
  try {
    const Job = require('./models/Job');
    const Company = require('./models/Company');

    const [activeJobs, companies] = await Promise.all([
      Job.find({ status: 'active' }).select('_id updatedAt').sort('-updatedAt').limit(500).lean(),
      Company.find({}).select('_id updatedAt').sort('-updatedAt').limit(200).lean(),
    ]);

    const baseUrl = process.env.CLIENT_URL || 'https://skillbridge.com';
    const staticPages = [
      { loc: '', changefreq: 'daily', priority: '1.0' },
      { loc: '/jobs', changefreq: 'hourly', priority: '0.9' },
      { loc: '/companies', changefreq: 'daily', priority: '0.8' },
      { loc: '/career-explorer', changefreq: 'weekly', priority: '0.8' },
      { loc: '/assessments', changefreq: 'weekly', priority: '0.7' },
      { loc: '/learning-roadmap', changefreq: 'weekly', priority: '0.7' },
      { loc: '/login', changefreq: 'monthly', priority: '0.5' },
      { loc: '/register', changefreq: 'monthly', priority: '0.5' },
    ];

    const today = new Date().toISOString().split('T')[0];
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    for (const page of staticPages) {
      xml += `  <url>\n    <loc>${baseUrl}${page.loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${page.changefreq}</changefreq>\n    <priority>${page.priority}</priority>\n  </url>\n`;
    }

    for (const job of activeJobs) {
      const lastmod = job.updatedAt ? new Date(job.updatedAt).toISOString().split('T')[0] : today;
      xml += `  <url>\n    <loc>${baseUrl}/jobs/${job._id}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
    }

    for (const comp of companies) {
      const lastmod = comp.updatedAt ? new Date(comp.updatedAt).toISOString().split('T')[0] : today;
      xml += `  <url>\n    <loc>${baseUrl}/companies/${comp._id}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
    }

    xml += `</urlset>`;

    res.header('Content-Type', 'application/xml');
    res.header('Cache-Control', 'public, max-age=3600');
    res.send(xml);
  } catch (err) {
    res.status(500).send('Error generating sitemap');
  }
});

// API Routes Mount
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/resumes', resumeRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/saved-jobs', savedJobRoutes);
app.use('/api/ml', mlRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/roadmaps', roadmapRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/github', githubRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/analytics', analyticsRoutes);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

module.exports = app;
module.exports.isOriginAllowed = isOriginAllowed;
