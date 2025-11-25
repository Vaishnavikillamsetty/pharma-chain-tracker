const db = require('./models/database');

// Sample drugs data
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

// Insert sample data
sampleDrugs.forEach(drug => {
  db.run(`INSERT OR IGNORE INTO drugs (name, brand, batch_number, quantity, min_stock_level, expiry_date, price, storage_temperature, supplier) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [drug.name, drug.brand, drug.batch_number, drug.quantity, drug.min_stock_level, drug.expiry_date, drug.price, drug.storage_temperature, drug.supplier],
    function(err) {
      if (err) {
        console.error('Error inserting drug:', err);
      } else {
        console.log(`Inserted drug: ${drug.name}`);
      }
    });
});

console.log('Sample data initialization complete!');