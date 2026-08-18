const express = require('express');
const router = express.Router();
const scraperController = require('../controllers/scraperController');

router.post('/scrape', scraperController.scrapeLeads);
router.get('/autocomplete-area', scraperController.autocompleteArea);
router.get('/jobs', scraperController.getScrapeJobs);

module.exports = router;
