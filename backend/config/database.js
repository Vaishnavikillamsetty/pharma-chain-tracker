const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../database/pharma_chain.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
    initializeDatabase();
  }
});

function initializeDatabase() {
  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'staff',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Drugs table
  db.run(`CREATE TABLE IF NOT EXISTS drugs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    generic_name TEXT,
    batch_number TEXT UNIQUE NOT NULL,
    manufacturer TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    min_stock_level INTEGER DEFAULT 10,
    max_stock_level INTEGER DEFAULT 100,
    unit_price DECIMAL(10,2),
    expiry_date DATE NOT NULL,
    storage_conditions TEXT,
    barcode_data TEXT,
    qr_code_data TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Transactions table (Blockchain-like ledger)
  db.run(`CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    drug_id INTEGER,
    batch_number TEXT NOT NULL,
    transaction_type TEXT NOT NULL, -- 'in', 'out', 'transfer'
    quantity INTEGER NOT NULL,
    from_location TEXT,
    to_location TEXT,
    performed_by INTEGER,
    previous_hash TEXT,
    current_hash TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    FOREIGN KEY (drug_id) REFERENCES drugs (id),
    FOREIGN KEY (performed_by) REFERENCES users (id)
  )`);

  // Inventory locations
  db.run(`CREATE TABLE IF NOT EXISTS inventory_locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    location_name TEXT NOT NULL,
    location_type TEXT NOT NULL, -- 'pharmacy', 'ward', 'storage'
    temperature_condition TEXT,
    capacity INTEGER
  )`);

  // Create default admin user
  const bcrypt = require('bcryptjs');
  const hashedPassword = bcrypt.hashSync('admin123', 10);
  
  db.run(`INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)`, 
    ['admin', hashedPassword, 'admin']);

  // Insert sample locations
  const locations = [
    ['Main Pharmacy', 'pharmacy', 'Room Temperature', 1000],
    ['Emergency Ward', 'ward', 'Room Temperature', 200],
    ['Cold Storage', 'storage', '2-8°C', 500],
    ['Surgical Ward', 'ward', 'Room Temperature', 150]
  ];

  locations.forEach(location => {
    db.run(`INSERT OR IGNORE INTO inventory_locations (location_name, location_type, temperature_condition, capacity) VALUES (?, ?, ?, ?)`, location);
  });

  console.log('Database initialized successfully');
}

module.exports = db;