const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticate, requireSuperAdmin } = require('../middleware/authMiddleware');

// All product routes require an authenticated user
router.use(authenticate);

// Agents & Super Admin can read active products
router.get('/', productController.getProducts);

// Only Super Admin can create, modify, or delete products
router.post('/', requireSuperAdmin, productController.createProduct);
router.patch('/:id', requireSuperAdmin, productController.updateProduct);
router.delete('/:id', requireSuperAdmin, productController.deleteProduct);

module.exports = router;
