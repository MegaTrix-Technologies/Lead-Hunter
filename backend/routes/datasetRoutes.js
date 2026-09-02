const express = require('express');
const router = express.Router();
const datasetController = require('../controllers/datasetController');
const { authenticate } = require('../middleware/authMiddleware');

router.use(authenticate);

router.get('/', datasetController.getDatasets);
router.get('/:id', datasetController.getDatasetById);
router.patch('/:id', datasetController.updateDataset);
router.delete('/:id', datasetController.deleteDataset);
router.post('/:id/append', datasetController.appendLeadsToDataset);
router.get('/:id/queue', datasetController.getDatasetQueue);
router.get('/:id/export', datasetController.exportDataset);
router.get('/:id/export-pdf', datasetController.exportDatasetPdf);

module.exports = router;
