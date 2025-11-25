const express = require('express');
const router = express.Router();
const drugController = require('../controllers/drugController');

// Drug routes
router.post('/', drugController.createDrug);
router.get('/', drugController.getAllDrugs);
router.get('/alerts', drugController.getAlerts);
router.get('/:id', drugController.getDrugById);
router.put('/:id', drugController.updateDrug);

module.exports = router;