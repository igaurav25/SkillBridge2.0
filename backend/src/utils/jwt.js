const jwt = require('jsonwebtoken');

const INSECURE_PLACEHOLDERS = new Set([
  'skillbridge_super_secret_jwt_key_2026_dev_prod',
  'your_jwt_secret',
  'changeme',
  'secret',
  'jwt_secret',
  'default_secret',
]);

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET ? process.env.JWT_SECRET.trim() : '';
  const isProd = process.env.NODE_ENV === 'production';

  if (isProd) {
    if (!secret || INSECURE_PLACEHOLDERS.has(secret) || secret.length < 32) {
      throw new Error(
        'FATAL SECURITY ERROR: JWT_SECRET must be set to a cryptographically strong string (>= 32 chars) and not a placeholder in production.'
      );
    }
    return secret;
  }

  return secret || 'skillbridge_dev_only_secret_key_do_not_use_in_prod';
};

const validateSecurityConfig = () => {
  // Validates JWT secret and security configuration at startup
  getJwtSecret();
};

const signToken = (id, role) => {
  return jwt.sign({ id, role }, getJwtSecret(), {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

const sendTokenResponse = (user, statusCode, res, message = 'Success') => {
  const token = signToken(user._id, user.role);

  res.status(statusCode).json({
    success: true,
    message,
    token,
    user: {
      id: user._id,
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      isVerified: user.isVerified,
      headline: user.headline,
      companyName: user.companyName,
    },
  });
};

module.exports = { signToken, sendTokenResponse, getJwtSecret, validateSecurityConfig };
