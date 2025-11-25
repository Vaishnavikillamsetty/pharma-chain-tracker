const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Get inventory summary
router.get('/summary', (req, res) => {
  const sql = `
    SELECT 
      COUNT(*) as total_drugs,
      SUM(quantity) as total_items,
      SUM(CASE WHEN quantity <= min_stock_level THEN 1 ELSE 0 END) as low_stock_items,
      SUM(CASE WHEN julianday(expiry_date) - julianday('now') < 30 THEN 1 ELSE 0 END) as expiring_soon
    FROM drugs`;
  
  db.get(sql, [], (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(result);
  });
});

// Get locations
router.get('/locations', (req, res) => {
  const sql = 'SELECT * FROM inventory_locations';
  db.all(sql, [], (err, locations) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(locations);
  });
});

module.exports = router;