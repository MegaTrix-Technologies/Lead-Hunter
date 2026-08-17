const express = require('express');
const router = express.Router();
const leadController = require('../controllers/leadController');

router.get('/', leadController.getLeads);
router.get('/queue', leadController.getCallingQueue);
router.get('/export', leadController.exportLeads);
router.post('/bulk-delete', leadController.bulkDelete);
router.post('/', leadController.createLead);
router.get('/:id', leadController.getLeadById);
router.patch('/:id/call-status', leadController.updateCallStatus);
router.post('/:id/notes', leadController.addCallNote);
router.delete('/:id', leadController.deleteLead);

module.exports = router;
