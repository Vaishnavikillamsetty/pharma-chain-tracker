const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');

// Transaction routes
router.post('/', transactionController.createTransaction);
router.get('/', transactionController.getAllTransactions);
router.get('/drug/:drugId', transactionController.getDrugTransactions);
router.get('/verify/:batchNumber', transactionController.verifyChain);

module.exports = router;