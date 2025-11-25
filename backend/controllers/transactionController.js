const db = require('../config/database');
const crypto = require('crypto');

function generateHash(data) {
  return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

const transactionController = {
  // Create new transaction
  createTransaction: (req, res) => {
    const transactionData = req.body;
    
    // Get the last transaction hash for this batch
    const getLastHashSql = `
      SELECT current_hash FROM transactions 
      WHERE batch_number = ? 
      ORDER BY id DESC LIMIT 1`;
    
    db.get(getLastHashSql, [transactionData.batch_number], (err, lastTransaction) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      const previousHash = lastTransaction ? lastTransaction.current_hash : '0';
      const currentHash = generateHash({
        ...transactionData,
        previousHash,
        timestamp: new Date().toISOString()
      });
      
      const sql = `INSERT INTO transactions (
        drug_id, batch_number, transaction_type, quantity,
        from_location, to_location, performed_by,
        previous_hash, current_hash, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      
      db.run(sql, [
        transactionData.drug_id,
        transactionData.batch_number,
        transactionData.transaction_type,
        transactionData.quantity,
        transactionData.from_location,
        transactionData.to_location,
        transactionData.performed_by || 1, // Default to admin
        previousHash,
        currentHash,
        transactionData.notes
      ], function(err) {
        if (err) {
          return res.status(400).json({ error: err.message });
        }
        
        // Update drug quantity
        const updateQuantitySql = `
          UPDATE drugs 
          SET quantity = quantity + ? 
          WHERE id = ?`;
        
        const quantityChange = transactionData.transaction_type === 'in' ? 
          transactionData.quantity : -transactionData.quantity;
        
        db.run(updateQuantitySql, [quantityChange, transactionData.drug_id], (err) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          
          res.status(201).json({
            message: 'Transaction recorded successfully',
            transactionId: this.lastID,
            currentHash: currentHash
          });
        });
      });
    });
  },

  // Get all transactions for a drug
  getDrugTransactions: (req, res) => {
    const drugId = req.params.drugId;
    
    const sql = `
      SELECT t.*, u.username as performed_by_name, d.name as drug_name
      FROM transactions t
      LEFT JOIN users u ON t.performed_by = u.id
      LEFT JOIN drugs d ON t.drug_id = d.id
      WHERE t.drug_id = ?
      ORDER BY t.timestamp DESC`;
    
    db.all(sql, [drugId], (err, transactions) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(transactions);
    });
  },

  // Verify transaction chain integrity
  verifyChain: (req, res) => {
    const batchNumber = req.params.batchNumber;
    
    const sql = `SELECT * FROM transactions WHERE batch_number = ? ORDER BY timestamp`;
    
    db.all(sql, [batchNumber], (err, transactions) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      let isValid = true;
      const verificationResults = [];
      
      for (let i = 0; i < transactions.length; i++) {
        const currentTx = transactions[i];
        const expectedPreviousHash = i === 0 ? '0' : transactions[i-1].current_hash;
        
        const verificationData = {
          ...currentTx,
          previousHash: expectedPreviousHash
        };
        delete verificationData.current_hash;
        delete verificationData.id;
        
        const calculatedHash = generateHash(verificationData);
        const isBlockValid = currentTx.current_hash === calculatedHash;
        const isChainValid = currentTx.previous_hash === expectedPreviousHash;
        
        isValid = isValid && isBlockValid && isChainValid;
        
        verificationResults.push({
          transactionId: currentTx.id,
          isBlockValid,
          isChainValid,
          calculatedHash,
          storedHash: currentTx.current_hash
        });
      }
      
      res.json({
        isValid,
        totalTransactions: transactions.length,
        verificationResults
      });
    });
  },

  // Get transaction history
  getAllTransactions: (req, res) => {
    const sql = `
      SELECT t.*, d.name as drug_name, u.username as performed_by_name
      FROM transactions t
      LEFT JOIN drugs d ON t.drug_id = d.id
      LEFT JOIN users u ON t.performed_by = u.id
      ORDER BY t.timestamp DESC
      LIMIT 100`;
    
    db.all(sql, [], (err, transactions) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(transactions);
    });
  }
};

module.exports = transactionController;