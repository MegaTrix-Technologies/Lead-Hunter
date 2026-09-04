const express = require('express');
const router = express.Router();
const saleController = require('../controllers/saleController');
const { authenticate, requireSuperAdmin, requireRoles } = require('../middleware/authMiddleware');

router.use(authenticate);

// Closer Queue & Actions
router.get('/closer-queue', requireRoles('sales_closer'), saleController.getCloserQueue);
router.post('/close-lead/:id', requireRoles('sales_closer'), saleController.closeLead);

// Sales Ledger & Manual Entry
router.get('/', saleController.getSales);
router.post('/manual', requireSuperAdmin, saleController.createManualSale);
router.patch('/:id/collect-payment', requireRoles('sales_closer'), saleController.collectFinalPayment);

module.exports = router;
