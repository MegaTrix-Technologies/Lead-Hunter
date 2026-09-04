const express = require('express');
const router = express.Router();
const commissionController = require('../controllers/commissionController');
const { authenticate, requireSuperAdmin } = require('../middleware/authMiddleware');

router.use(authenticate);

router.get('/my-earnings', commissionController.getMyEarnings);
router.get('/all', requireSuperAdmin, commissionController.getAllUserEarnings);

module.exports = router;
