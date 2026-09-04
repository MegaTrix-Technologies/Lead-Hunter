const express = require('express');
const router = express.Router();
const accountController = require('../controllers/accountController');
const { authenticate, requireSuperAdmin } = require('../middleware/authMiddleware');

// Enforce strict authentication & Super Admin role authorization across ALL account routes
router.use(authenticate, requireSuperAdmin);

// Accounts Overview & Financial Aggregation
router.get('/summary', accountController.getAccountsSummary);

// Detailed Data Views & Expense CRUD
router.get('/sales', accountController.getSalesLedger);
router.get('/expenses', accountController.getExpensesLedger);
router.post('/expenses', accountController.createExpense);
router.patch('/expenses/:id', accountController.updateExpense);
router.delete('/expenses/:id', accountController.deleteExpense);

// Structured Financial Report
router.get('/report', accountController.getAccountsReport);

// Document Exports
router.get('/export-excel', accountController.exportAccountsExcel);
router.get('/export-pdf', accountController.exportAccountsPdf);

module.exports = router;
