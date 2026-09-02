const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, requireSuperAdmin } = require('../middleware/authMiddleware');

// All user management routes require authentication and Super Admin privileges
router.use(authenticate, requireSuperAdmin);

router.get('/', userController.getUsers);
router.post('/', userController.createUser);
router.get('/usage-breakdown', userController.getUserUsageBreakdown);
router.patch('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);

module.exports = router;
