const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { authenticate, requireSuperAdmin, requireRoles } = require('../middleware/authMiddleware');

router.use(authenticate);

router.get('/', requireRoles('developer'), projectController.getProjects);
router.patch('/:id/assign', requireSuperAdmin, projectController.assignDevelopers);
router.post('/:id/notes', requireRoles('developer'), projectController.addDeliveryNote);
router.patch('/:id/complete', requireRoles('developer'), projectController.completeProject);

module.exports = router;
