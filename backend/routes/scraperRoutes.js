const express = require('express');
const router = express.Router();
const scraperController = require('../controllers/scraperController');
const { authenticate } = require('../middleware/authMiddleware');

router.use(authenticate);

router.post('/scrape', scraperController.scrapeLeads);
router.get('/quota', scraperController.getQuota);
router.get('/autocomplete-area', scraperController.autocompleteArea);
router.get('/jobs', scraperController.getScrapeJobs);

module.exports = router;
