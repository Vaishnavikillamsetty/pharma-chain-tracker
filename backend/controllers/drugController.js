const Drug = require('../models/Drug');
const crypto = require('crypto');
const Order = require('../models/Order'); // <-- NEW (Make sure you created the Order model file)

// Generate hash for blockchain
function generateHash(data) {
  return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

const drugController = {
  // Create new drug
  createDrug: (req, res) => {
    const drugData = req.body;
    
    Drug.create(drugData, (err, drug) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      res.status(201).json({
        message: 'Drug created successfully',
        drug: drug
      });
    });
  },

  // Get all drugs
  getAllDrugs: (req, res) => {
    Drug.getAll((err, drugs) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(drugs);
    });
  },

  // Get drug by ID
  getDrugById: (req, res) => {
    const id = req.params.id;
    
    Drug.getById(id, (err, drug) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!drug) {
        return res.status(404).json({ error: 'Drug not found' });
      }
      res.json(drug);
    });
  },

  // ---------------------------
  // UPDATED: Update drug + Auto reorder trigger
  // ---------------------------
  updateDrug: (req, res) => {
    const id = req.params.id;
    const updateData = req.body;

    Drug.update(id, updateData, async (err, updatedDrug) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (!updatedDrug) {
        return res.status(404).json({ error: "Drug not found" });
      }

      // AUTO ORDER CHECK
      try {
        if (updatedDrug.quantity <= updatedDrug.lowStockLimit) {

          const order = new Order({
            medicineName: updatedDrug.name,
            quantityRequested: updatedDrug.restockAmount || 50,
            hospitalName: "City Hospital",
            hospitalAddress: "Tekkali, Andhra Pradesh",
            status: "Pending",
            createdAt: new Date()
          });

          await order.save();
          console.log(`⚠️ Auto-Order Created: ${updatedDrug.name}`);
        }
      } catch (autoErr) {
        console.log("Auto-order failed:", autoErr.message);
      }

      res.json({ 
        message: 'Drug updated successfully',
        updatedDrug 
      });
    });
  },

  // Get alerts (low stock and expiring drugs)
  getAlerts: (req, res) => {
    Drug.getLowStock((err, lowStock) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      Drug.getExpiring(30, (err, expiring) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        res.json({
          low_stock: lowStock,
          expiring_soon: expiring
        });
      });
    });
  }
};

module.exports = drugController;
