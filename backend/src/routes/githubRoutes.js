const express = require('express');
const router = express.Router();
const { optionalProtect } = require('../middleware/authMiddleware');
const { analyzeGitHubProfile } = require('../controllers/githubController');

router.post('/analyze', optionalProtect, analyzeGitHubProfile);

module.exports = router;

