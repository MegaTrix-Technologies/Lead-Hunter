const express = require('express');
const router = express.Router();
const emailController = require('../controllers/emailController');
const { authenticate, requireSuperAdmin } = require('../middleware/authMiddleware');

// Email proposals & campaigns are restricted to Super Administrator
router.use(authenticate, requireSuperAdmin);

router.get('/templates', emailController.getTemplates);
router.post('/templates', emailController.createTemplate);
router.put('/templates/:id', emailController.updateTemplate);
router.delete('/templates/:id', emailController.deleteTemplate);

router.post('/campaign', emailController.launchCampaign);
router.get('/campaign/active', emailController.getActiveReport);

module.exports = router;
