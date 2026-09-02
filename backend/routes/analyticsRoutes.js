const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticate } = require('../middleware/authMiddleware');

router.use(authenticate);

router.get('/', analyticsController.getAnalytics);
router.get('/quotas', analyticsController.getApiLimitsAndCredits);

module.exports = router;
