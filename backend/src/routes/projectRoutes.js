const express = require('express');
const router = express.Router();
const { optionalProtect } = require('../middleware/authMiddleware');
const { getRecommendedProjects, getProjectById } = require('../controllers/projectController');

router.get('/recommendations', optionalProtect, getRecommendedProjects);
router.get('/:id', optionalProtect, getProjectById);

module.exports = router;

