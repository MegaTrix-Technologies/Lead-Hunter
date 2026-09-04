const express = require('express');
const router = express.Router();
const accountController = require('../controllers/accountController');
const { authenticate, requireSuperAdmin } = require('../middleware/authMiddleware');

// Enforce strict authentication & Super Admin role authorization across ALL account routes
router.use(authenticate, requireSuperAdmin);

// Accounts Overview & Financial Aggregation
router.get('/summary', accountController.getAccountsSummary);

// Detailed Data Views (Read-Only)
router.get('/sales', accountController.getSalesLedger);
router.get('/expenses', accountController.getExpensesLedger);

// Structured Financial Report
router.get('/report', accountController.getAccountsReport);

// Document Exports
router.get('/export-excel', accountController.exportAccountsExcel);
router.get('/export-pdf', accountController.exportAccountsPdf);

module.exports = router;
