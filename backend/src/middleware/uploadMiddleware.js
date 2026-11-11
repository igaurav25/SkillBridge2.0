const multer = require('multer');
const path = require('path');

const storage = multer.memoryStorage();

const RESUME_RULES = {
  extensions: new Set(['.pdf', '.txt', '.doc', '.docx']),
  mimeTypes: new Set([
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ]),
};

const AVATAR_RULES = {
  extensions: new Set(['.png', '.jpg', '.jpeg', '.webp']),
  mimeTypes: new Set(['image/png', 'image/jpeg', 'image/webp']),
};

const createFileFilter = (rules, label) => (req, file, cb) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  const mime = (file.mimetype || '').toLowerCase();

  if (rules.extensions.has(ext) && rules.mimeTypes.has(mime)) {
    return cb(null, true);
  }
  const err = new Error(`Unsupported file format (${ext || mime}). Allowed for ${label}: ${Array.from(rules.extensions).join(', ')}`);
  err.statusCode = 400;
  return cb(err, false);
};

const uploadResume = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit for resumes
  fileFilter: createFileFilter(RESUME_RULES, 'resume'),
});

const uploadAvatar = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit for avatars
  fileFilter: createFileFilter(AVATAR_RULES, 'avatar'),
});

// Unified safe filter (backward compatible)
const unifiedUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'avatar') {
      return createFileFilter(AVATAR_RULES, 'avatar')(req, file, cb);
    }
    return createFileFilter(RESUME_RULES, 'resume')(req, file, cb);
  },
});

module.exports = unifiedUpload;
module.exports.uploadResume = uploadResume;
module.exports.uploadAvatar = uploadAvatar;
