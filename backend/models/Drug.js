const db = require('../config/database');
const QRCode = require('qrcode');

class Drug {
  // Create new drug
  static async create(drugData, callback) {
    const {
      name, generic_name, batch_number, manufacturer, quantity,
      min_stock_level, max_stock_level, unit_price, expiry_date, storage_conditions
    } = drugData;

    // Generate QR code data
    const qrData = JSON.stringify({
      name,
      batch_number,
      manufacturer,
      expiry_date
    });

    try {
      const qrCodeData = await QRCode.toDataURL(qrData);
      
      const sql = `INSERT INTO drugs (
        name, generic_name, batch_number, manufacturer, quantity,
        min_stock_level, max_stock_level, unit_price, expiry_date,
        storage_conditions, barcode_data, qr_code_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      
      db.run(sql, [
        name, generic_name, batch_number, manufacturer, quantity,
        min_stock_level, max_stock_level, unit_price, expiry_date,
        storage_conditions, batch_number, qrCodeData
      ], function(err) {
        if (err) {
          callback(err);
        } else {
          callback(null, { id: this.lastID, ...drugData });
        }
      });
    } catch (err) {
      callback(err);
    }
  }

  // Get all drugs
  static getAll(callback) {
    const sql = `
      SELECT d.*, 
             (d.quantity <= d.min_stock_level) as low_stock,
             (julianday(d.expiry_date) - julianday('now')) < 30 as near_expiry
      FROM drugs d 
      ORDER BY d.created_at DESC`;
    
    db.all(sql, [], callback);
  }

  // Get drug by ID
  static getById(id, callback) {
    const sql = 'SELECT * FROM drugs WHERE id = ?';
    db.get(sql, [id], callback);
  }

  // Update drug quantity
  static updateQuantity(id, newQuantity, callback) {
    const sql = 'UPDATE drugs SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    db.run(sql, [newQuantity, id], callback);
  }

  // Get low stock drugs
  static getLowStock(callback) {
    const sql = 'SELECT * FROM drugs WHERE quantity <= min_stock_level';
    db.all(sql, [], callback);
  }

  // Get expiring drugs
  static getExpiring(days = 30, callback) {
    const sql = `SELECT * FROM drugs WHERE julianday(expiry_date) - julianday('now') < ?`;
    db.all(sql, [days], callback);
  }
}

module.exports = Drug;