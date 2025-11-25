const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('Created data directory');
}

// Database setup - use absolute path
const dbPath = path.join(__dirname, 'data', 'pharma_chain.db');
console.log('Database path:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error opening database:', err.message);
        console.log('Trying alternative approach...');
        // Try in-memory database as fallback
        createInMemoryDatabase();
    } else {
        console.log('✅ Connected to SQLite database.');
        initializeDatabase();
    }
});

function createInMemoryDatabase() {
    console.log('🔄 Using in-memory database for demo...');
    // Use in-memory database for the hackathon
    global.demoDb = new sqlite3.Database(':memory:');
    initializeDatabase(global.demoDb);
}

// Initialize database tables
function initializeDatabase(database = db) {
    database.serialize(() => {
        // Drugs table
        database.run(`CREATE TABLE IF NOT EXISTS drugs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            brand TEXT,
            batch_number TEXT UNIQUE NOT NULL,
            quantity INTEGER NOT NULL,
            min_stock_level INTEGER DEFAULT 10,
            expiry_date TEXT NOT NULL,
            price REAL,
            storage_temperature TEXT,
            supplier TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) {
                console.error('Error creating drugs table:', err);
            } else {
                console.log('✅ Drugs table ready');
            }
        });

        // Transactions table
        database.run(`CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            drug_id INTEGER,
            transaction_type TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            from_location TEXT,
            to_location TEXT,
            previous_hash TEXT,
            current_hash TEXT UNIQUE,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            performed_by TEXT,
            notes TEXT
        )`, (err) => {
            if (err) {
                console.error('Error creating transactions table:', err);
            } else {
                console.log('✅ Transactions table ready');
            }
        });

        // Insert sample drugs
        const sampleDrugs = [
            {
                name: 'Paracetamol 500mg',
                brand: 'Generic',
                batch_number: 'BATCH001',
                quantity: 150,
                min_stock_level: 20,
                expiry_date: '2024-12-31',
                price: 5.99,
                storage_temperature: 'Room Temperature',
                supplier: 'MediCorp Ltd'
            },
            {
                name: 'Amoxicillin 250mg',
                brand: 'PharmaBest',
                batch_number: 'BATCH002',
                quantity: 8,
                min_stock_level: 15,
                expiry_date: '2024-06-30',
                price: 12.50,
                storage_temperature: 'Room Temperature',
                supplier: 'Global Pharma'
            },
            {
                name: 'Insulin Glargine',
                brand: 'DiabetCare',
                batch_number: 'BATCH003',
                quantity: 45,
                min_stock_level: 10,
                expiry_date: '2024-09-15',
                price: 89.99,
                storage_temperature: '2-8°C',
                supplier: 'BioTech Solutions'
            }
        ];

        // Check if sample data already exists
        database.get('SELECT COUNT(*) as count FROM drugs', (err, row) => {
            if (err) {
                console.error('Error checking existing data:', err);
                return;
            }
            
            if (row.count === 0) {
                console.log('📦 Inserting sample drugs...');
                sampleDrugs.forEach((drug, index) => {
                    database.run(`INSERT INTO drugs (name, brand, batch_number, quantity, min_stock_level, expiry_date, price, storage_temperature, supplier) 
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [drug.name, drug.brand, drug.batch_number, drug.quantity, drug.min_stock_level, drug.expiry_date, drug.price, drug.storage_temperature, drug.supplier],
                        function(err) {
                            if (err) {
                                console.error('Error inserting drug:', err);
                            } else {
                                console.log(`✅ Added: ${drug.name}`);
                                
                                // Add initial transaction
                                addTransactionToLedger({
                                    drug_id: this.lastID,
                                    transaction_type: 'in',
                                    quantity: drug.quantity,
                                    from_location: 'Supplier',
                                    to_location: 'Main Warehouse',
                                    performed_by: 'System',
                                    notes: 'Initial stock'
                                }, database);
                            }
                        });
                });
            } else {
                console.log('✅ Sample data already exists');
            }
        });

        console.log('🎉 Database initialized successfully');
    });
}

// Blockchain hash function
const calculateHash = (data) => {
    return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
};

// Get previous transaction hash
const getPreviousHash = (database, callback) => {
    database.get('SELECT current_hash FROM transactions ORDER BY id DESC LIMIT 1', (err, row) => {
        if (err) return callback(err);
        callback(null, row ? row.current_hash : '0');
    });
};

// Add transaction to blockchain ledger
const addTransactionToLedger = (transactionData, database = db, callback = () => {}) => {
    getPreviousHash(database, (err, previousHash) => {
        if (err) {
            console.error('Error getting previous hash:', err);
            return callback(err);
        }
        
        const timestamp = new Date().toISOString();
        const dataToHash = {
            ...transactionData,
            previousHash,
            timestamp
        };
        
        const currentHash = calculateHash(dataToHash);
        
        const sql = `INSERT INTO transactions 
            (drug_id, transaction_type, quantity, from_location, to_location, previous_hash, current_hash, performed_by, notes) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        
        database.run(sql, [
            transactionData.drug_id,
            transactionData.transaction_type,
            transactionData.quantity,
            transactionData.from_location,
            transactionData.to_location,
            previousHash,
            currentHash,
            transactionData.performed_by,
            transactionData.notes
        ], function(err) {
            if (err) {
                console.error('Error inserting transaction:', err);
                return callback(err);
            }
            callback(null, { transactionId: this.lastID, hash: currentHash });
        });
    });
};

// Use the appropriate database (file or in-memory)
const getDatabase = () => {
    return global.demoDb || db;
};

// Routes
app.get('/', (req, res) => {
    res.json({ 
        message: 'PharmaChain Tracker API is running!',
        database: global.demoDb ? 'in-memory' : 'file',
        endpoints: {
            drugs: '/api/drugs',
            transactions: '/api/transactions',
            alerts: '/api/alerts',
            health: '/api/health'
        }
    });
});

// Get all drugs with stock status
app.get('/api/drugs', (req, res) => {
    const database = getDatabase();
    const sql = `
        SELECT d.*, 
               CASE 
                 WHEN d.quantity <= d.min_stock_level THEN 'LOW_STOCK'
                 WHEN date(d.expiry_date) <= date('now', '+30 days') THEN 'NEAR_EXPIRY'
                 ELSE 'OK'
               END as status
        FROM drugs d
        ORDER BY d.updated_at DESC
    `;
    
    database.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Error fetching drugs:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(rows || []);
    });
});

// Add new drug
app.post('/api/drugs', (req, res) => {
    const database = getDatabase();
    const { name, brand, batch_number, quantity, min_stock_level, expiry_date, price, storage_temperature, supplier } = req.body;
    
    const sql = `INSERT INTO drugs 
        (name, brand, batch_number, quantity, min_stock_level, expiry_date, price, storage_temperature, supplier) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    database.run(sql, [name, brand, batch_number, quantity, min_stock_level, expiry_date, price, storage_temperature, supplier], 
        function(err) {
            if (err) {
                console.error('Error adding drug:', err);
                return res.status(500).json({ error: err.message });
            }
            
            // Add initial transaction to ledger
            addTransactionToLedger({
                drug_id: this.lastID,
                transaction_type: 'in',
                quantity: quantity,
                from_location: 'Supplier',
                to_location: 'Main Warehouse',
                performed_by: 'System',
                notes: 'Initial stock addition'
            }, database, (txErr) => {
                if (txErr) console.error('Transaction logging failed:', txErr);
            });
            
            res.json({ 
                id: this.lastID, 
                message: 'Drug added successfully',
                batch_number: batch_number
            });
        });
});

// Update drug stock
app.post('/api/drugs/:id/stock', (req, res) => {
    const database = getDatabase();
    const { action, quantity, location, performed_by, notes } = req.body;
    const drugId = req.params.id;
    
    if (!action || !quantity) {
        return res.status(400).json({ error: 'Action and quantity are required' });
    }
    
    // Get current drug info
    database.get('SELECT * FROM drugs WHERE id = ?', [drugId], (err, drug) => {
        if (err) {
            console.error('Error fetching drug:', err);
            return res.status(500).json({ error: err.message });
        }
        if (!drug) return res.status(404).json({ error: 'Drug not found' });
        
        let newQuantity = drug.quantity;
        let transactionType = '';
        
        if (action === 'add') {
            newQuantity += quantity;
            transactionType = 'in';
        } else if (action === 'remove') {
            if (drug.quantity < quantity) {
                return res.status(400).json({ error: 'Insufficient stock' });
            }
            newQuantity -= quantity;
            transactionType = 'out';
        } else {
            return res.status(400).json({ error: 'Invalid action' });
        }
        
        // Update drug quantity
        database.run('UPDATE drugs SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
            [newQuantity, drugId], function(updateErr) {
                if (updateErr) {
                    console.error('Error updating drug:', updateErr);
                    return res.status(500).json({ error: updateErr.message });
                }
                
                // Add to blockchain ledger
                addTransactionToLedger({
                    drug_id: drugId,
                    transaction_type: transactionType,
                    quantity: quantity,
                    from_location: 'Main Warehouse',
                    to_location: location || 'Central Pharmacy',
                    performed_by: performed_by || 'System',
                    notes: notes || `${action} operation`
                }, database, (txErr, txResult) => {
                    if (txErr) {
                        console.error('Transaction logging failed:', txErr);
                        return res.status(500).json({ error: 'Transaction logging failed: ' + txErr.message });
                    }
                    
                    res.json({ 
                        message: `Stock ${action} operation successful`,
                        newQuantity: newQuantity,
                        transactionId: txResult.transactionId,
                        hash: txResult.hash
                    });
                });
            });
    });
});

// Get transaction history
app.get('/api/transactions', (req, res) => {
    const database = getDatabase();
    const sql = `
        SELECT t.*, d.name as drug_name, d.batch_number 
        FROM transactions t 
        LEFT JOIN drugs d ON t.drug_id = d.id 
        ORDER BY t.timestamp DESC
    `;
    
    database.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Error fetching transactions:', err);
            return res.status(500).json({ error: err.message });
        }
        
        res.json({ 
            transactions: rows || [], 
            total_transactions: rows ? rows.length : 0 
        });
    });
});

// Get alerts
app.get('/api/alerts', (req, res) => {
    const database = getDatabase();
    const alertSql = `
        SELECT d.id as drug_id, d.name, d.batch_number, d.quantity, d.min_stock_level, d.expiry_date,
               CASE 
                 WHEN d.quantity <= d.min_stock_level THEN 'LOW_STOCK'
                 WHEN date(d.expiry_date) <= date('now', '+30 days') THEN 'NEAR_EXPIRY'
               END as alert_type,
               CASE 
                 WHEN d.quantity <= d.min_stock_level THEN 'Stock level critical for ' || d.name
                 WHEN date(d.expiry_date) <= date('now', '+30 days') THEN d.name || ' expires on ' || d.expiry_date
               END as message,
               CASE 
                 WHEN d.quantity = 0 THEN 'high'
                 WHEN d.quantity <= d.min_stock_level THEN 'medium'
                 ELSE 'low'
               END as severity
        FROM drugs d
        WHERE d.quantity <= d.min_stock_level OR date(d.expiry_date) <= date('now', '+30 days')
        ORDER BY 
          CASE 
            WHEN d.quantity = 0 THEN 1
            WHEN d.quantity <= d.min_stock_level THEN 2
            ELSE 3
          END,
          d.expiry_date ASC
    `;
    
    database.all(alertSql, [], (err, rows) => {
        if (err) {
            console.error('Error fetching alerts:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(rows || []);
    });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        database: global.demoDb ? 'in-memory' : 'file',
        message: 'PharmaChain Tracker API is running'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`💊 PharmaChain Tracker API is ready!`);
    console.log(`📊 API available at: http://localhost:${PORT}`);
});

console.log('🎯 Starting PharmaChain Tracker Server...');

const orderRoutes = require("./routes/orderRoutes");
app.use("/orders", orderRoutes);
