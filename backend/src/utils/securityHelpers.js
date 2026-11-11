/**
 * Escape user input before constructing MongoDB $regex / RegExp to prevent ReDoS & SyntaxErrors (e.g. "C++").
 */
const escapeRegex = (str = '') => {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Clamp pagination inputs cleanly so skip >= 0 and 1 <= limit <= maxLimit.
 */
const parsePagination = (rawPage = 1, rawLimit = 10, maxLimit = 100) => {
  const parsedPage = parseInt(rawPage, 10);
  const parsedLimit = parseInt(rawLimit, 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(maxLimit, parsedLimit) : 10;
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

/**
 * Pick only allowed fields from req.body to prevent mass assignment.
 */
const pickFields = (source = {}, allowedFields = []) => {
  const picked = {};
  if (!source || typeof source !== 'object') return picked;
  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(source, field) && source[field] !== undefined) {
      picked[field] = source[field];
    }
  }
  return picked;
};

module.exports = {
  escapeRegex,
  parsePagination,
  pickFields,
};
