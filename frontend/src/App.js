import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API_BASE = 'http://localhost:5000/api';

function App() {
  const [drugs, setDrugs] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [currentView, setCurrentView] = useState('dashboard');
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newDrug, setNewDrug] = useState({
    name: '',
    batch_number: '',
    quantity: 0,
    min_stock_level: 10,
    expiry_date: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [drugsRes, alertsRes, transactionsRes] = await Promise.all([
        axios.get(`${API_BASE}/drugs`),
        axios.get(`${API_BASE}/alerts`),
        axios.get(`${API_BASE}/transactions`)
      ]);
      setDrugs(drugsRes.data || []);
      setAlerts(alertsRes.data || []);
      setTransactions(transactionsRes.data?.transactions || []);
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Cannot connect to backend server. Make sure backend is running on port 5000.');
      // Set sample data for demo
      setDrugs(getSampleDrugs());
      setAlerts(getSampleAlerts());
      setTransactions(getSampleTransactions());
    } finally {
      setLoading(false);
    }
  };

  // Sample data for demo if backend is not available
  const getSampleDrugs = () => [
    {
      id: 1,
      name: 'Paracetamol 500mg',
      batch_number: 'BATCH001',
      quantity: 150,
      min_stock_level: 20,
      expiry_date: '2024-12-31',
      status: 'OK'
    },
    {
      id: 2,
      name: 'Amoxicillin 250mg',
      batch_number: 'BATCH002', 
      quantity: 8,
      min_stock_level: 15,
      expiry_date: '2024-06-30',
      status: 'LOW_STOCK'
    },
    {
      id: 3,
      name: 'Insulin Glargine',
      batch_number: 'BATCH003',
      quantity: 45,
      min_stock_level: 10,
      expiry_date: '2024-09-15',
      status: 'OK'
    }
  ];

  const getSampleAlerts = () => [
    {
      drug_id: 2,
      alert_type: 'LOW_STOCK',
      message: 'Stock level critical for Amoxicillin 250mg',
      severity: 'high',
      batch_number: 'BATCH002',
      name: 'Amoxicillin 250mg',
      quantity: 8,
      expiry_date: '2024-06-30'
    }
  ];

  const getSampleTransactions = () => [
    {
      id: 1,
      drug_name: 'Paracetamol 500mg',
      batch_number: 'BATCH001',
      transaction_type: 'in',
      quantity: 100,
      from_location: 'Supplier',
      to_location: 'Main Warehouse',
      timestamp: new Date().toISOString(),
      performed_by: 'System'
    },
    {
      id: 2,
      drug_name: 'Amoxicillin 250mg', 
      batch_number: 'BATCH002',
      transaction_type: 'out',
      quantity: 5,
      from_location: 'Main Warehouse',
      to_location: 'Emergency Ward',
      timestamp: new Date().toISOString(),
      performed_by: 'Nurse Jane'
    }
  ];

  const addDrug = async (e) => {
    e.preventDefault();
    try {
      // If backend is connected, use real API
      if (!error) {
        await axios.post(`${API_BASE}/drugs`, {
          ...newDrug,
          brand: 'Generic',
          storage_temperature: 'Room Temperature',
          supplier: 'Local Supplier',
          price: 0
        });
      }
      
      // Add to local state for demo
      const newDrugObj = {
        id: drugs.length + 1,
        ...newDrug,
        status: newDrug.quantity <= newDrug.min_stock_level ? 'LOW_STOCK' : 'OK'
      };
      setDrugs([...drugs, newDrugObj]);
      
      setShowAddForm(false);
      setNewDrug({ name: '', batch_number: '', quantity: 0, min_stock_level: 10, expiry_date: '' });
      alert('Drug added successfully!');
    } catch (error) {
      alert('Error adding drug: ' + error.message);
    }
  };

  const updateStock = async (drugId, action) => {
    const quantity = parseInt(prompt('Enter quantity:'));
    if (!isNaN(quantity)) {
      try {
        if (!error) {
          await axios.post(`${API_BASE}/drugs/${drugId}/stock`, {
            action: action,
            quantity: quantity,
            location: 'Central Pharmacy',
            performed_by: 'Pharmacist',
            notes: 'Manual update'
          });
        }
        
        // Update local state
        setDrugs(drugs.map(drug => {
          if (drug.id === drugId) {
            const newQuantity = action === 'add' ? drug.quantity + quantity : drug.quantity - quantity;
            return {
              ...drug,
              quantity: newQuantity,
              status: newQuantity <= drug.min_stock_level ? 'LOW_STOCK' : 'OK'
            };
          }
          return drug;
        }));
        
        alert('Stock updated successfully!');
        loadData();
      } catch (error) {
        alert('Error updating stock: ' + error.message);
      }
    }
  };

  // Dashboard Component
  const Dashboard = () => (
    <div className="dashboard">
      <h2>Supply Chain Dashboard</h2>
      
      {error && (
        <div className="error-banner">
          ⚠️ {error} <button onClick={loadData}>Retry</button>
        </div>
      )}
      
      {loading ? (
        <div className="loading">Loading data...</div>
      ) : (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <h3>Total Drugs</h3>
              <p className="stat-number">{drugs.length}</p>
            </div>
            <div className="stat-card warning">
              <h3>Low Stock</h3>
              <p className="stat-number">{drugs.filter(d => d.quantity <= d.min_stock_level).length}</p>
            </div>
            <div className="stat-card danger">
              <h3>Near Expiry</h3>
              <p className="stat-number">
                {drugs.filter(d => new Date(d.expiry_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)).length}
              </p>
            </div>
            <div className="stat-card critical">
              <h3>Active Alerts</h3>
              <p className="stat-number">{alerts.length}</p>
            </div>
          </div>

          <div className="dashboard-content">
            <div className="recent-alerts">
              <h3>Recent Alerts</h3>
              {alerts.length > 0 ? alerts.slice(0, 5).map(alert => (
                <div key={`${alert.drug_id}-${alert.alert_type}`} className={`alert-item ${alert.severity}`}>
                  <span className="alert-icon">⚠️</span>
                  <div className="alert-content">
                    <strong>{alert.message}</strong>
                    <small>Batch: {alert.batch_number}</small>
                  </div>
                </div>
              )) : <p className="no-data">No alerts</p>}
            </div>

            <div className="recent-transactions">
              <h3>Recent Transactions</h3>
              {transactions.length > 0 ? transactions.slice(0, 5).map(tx => (
                <div key={tx.id} className="transaction-item">
                  <span className={`tx-type ${tx.transaction_type}`}>
                    {tx.transaction_type.toUpperCase()}
                  </span>
                  <div className="tx-details">
                    <strong>{tx.drug_name}</strong>
                    <small>Qty: {tx.quantity} | {tx.to_location}</small>
                  </div>
                </div>
              )) : <p className="no-data">No transactions</p>}
            </div>
          </div>
        </>
      )}
    </div>
  );

  // Drugs Management Component
  const DrugsView = () => (
    <div className="drug-management">
      <div className="section-header">
        <h2>Drug Inventory Management</h2>
        <button onClick={() => setShowAddForm(true)} className="btn-primary">
          + Add New Drug
        </button>
      </div>

      {error && (
        <div className="error-banner">
          ⚠️ Demo Mode: Using sample data - {error}
        </div>
      )}

      {showAddForm && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Add New Drug</h3>
            <form onSubmit={addDrug}>
              <input
                type="text"
                placeholder="Drug Name"
                value={newDrug.name}
                onChange={(e) => setNewDrug({...newDrug, name: e.target.value})}
                required
              />
              <input
                type="text"
                placeholder="Batch Number"
                value={newDrug.batch_number}
                onChange={(e) => setNewDrug({...newDrug, batch_number: e.target.value})}
                required
              />
              <input
                type="number"
                placeholder="Quantity"
                value={newDrug.quantity}
                onChange={(e) => setNewDrug({...newDrug, quantity: parseInt(e.target.value)})}
                required
              />
              <input
                type="number"
                placeholder="Min Stock Level"
                value={newDrug.min_stock_level}
                onChange={(e) => setNewDrug({...newDrug, min_stock_level: parseInt(e.target.value)})}
              />
              <input
                type="date"
                placeholder="Expiry Date"
                value={newDrug.expiry_date}
                onChange={(e) => setNewDrug({...newDrug, expiry_date: e.target.value})}
                required
              />
              <div className="form-actions">
                <button type="submit">Add Drug</button>
                <button type="button" onClick={() => setShowAddForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading">Loading drugs...</div>
      ) : (
        <div className="drugs-grid">
          {drugs.map(drug => (
            <div key={drug.id} className={`drug-card ${drug.status === 'LOW_STOCK' ? 'low-stock' : drug.status === 'NEAR_EXPIRY' ? 'near-expiry' : ''}`}>
              <div className="drug-header">
                <h4>{drug.name}</h4>
                <span className="batch">{drug.batch_number}</span>
              </div>
              <div className="drug-details">
                <p><strong>Quantity:</strong> {drug.quantity} units</p>
                <p><strong>Min Stock:</strong> {drug.min_stock_level} units</p>
                <p><strong>Expiry:</strong> {new Date(drug.expiry_date).toLocaleDateString()}</p>
                <p><strong>Status:</strong> <span className="status">{drug.status}</span></p>
              </div>
              <div className="drug-actions">
                <button onClick={() => updateStock(drug.id, 'add')} className="btn-secondary">
                  Add Stock
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Other components remain the same as before...
  const TransactionsView = () => (
    <div className="transaction-history">
      <h2>Blockchain Transaction Ledger</h2>
      {error && <div className="error-banner">⚠️ Demo Mode: Using sample data</div>}
      <div className="transactions-list">
        {transactions.map(tx => (
          <div key={tx.id} className="transaction-item">
            <div className="tx-header">
              <span className={`tx-type ${tx.transaction_type}`}>
                {tx.transaction_type.toUpperCase()}
              </span>
              <span className="tx-date">
                {new Date(tx.timestamp).toLocaleString()}
              </span>
            </div>
            <div className="tx-details">
              <p><strong>Drug:</strong> {tx.drug_name} ({tx.batch_number})</p>
              <p><strong>Quantity:</strong> {tx.quantity} units</p>
              <p><strong>From:</strong> {tx.from_location} → <strong>To:</strong> {tx.to_location}</p>
              <p><strong>By:</strong> {tx.performed_by}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const AlertsView = () => (
    <div className="alerts-panel">
      <h2>System Alerts</h2>
      {error && <div className="error-banner">⚠️ Demo Mode: Using sample data</div>}
      <div className="alerts-list">
        {alerts.map(alert => (
          <div key={`${alert.drug_id}-${alert.alert_type}`} className={`alert-card ${alert.severity}`}>
            <div className="alert-header">
              <h4>{alert.alert_type}</h4>
              <span className="severity-badge">{alert.severity}</span>
            </div>
            <p className="alert-message">{alert.message}</p>
            <div className="alert-details">
              <p><strong>Drug:</strong> {alert.name}</p>
              <p><strong>Batch:</strong> {alert.batch_number}</p>
              <p><strong>Current Stock:</strong> {alert.quantity}</p>
              <p><strong>Expiry:</strong> {new Date(alert.expiry_date).toLocaleDateString()}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="App">
      <header className="app-header">
        <h1>💊 PharmaChain Tracker {error && "(Demo Mode)"}</h1>
        <nav className="nav-menu">
          <button className={currentView === 'dashboard' ? 'active' : ''} onClick={() => setCurrentView('dashboard')}>
            Dashboard
          </button>
          <button className={currentView === 'drugs' ? 'active' : ''} onClick={() => setCurrentView('drugs')}>
            Drug Management
          </button>
          <button className={currentView === 'transactions' ? 'active' : ''} onClick={() => setCurrentView('transactions')}>
            Transaction Ledger
          </button>
          <button className={currentView === 'alerts' ? 'active' : ''} onClick={() => setCurrentView('alerts')}>
            Alerts ({alerts.length})
          </button>
        </nav>
      </header>

      <main className="app-main">
        {currentView === 'dashboard' && <Dashboard />}
        {currentView === 'drugs' && <DrugsView />}
        {currentView === 'transactions' && <TransactionsView />}
        {currentView === 'alerts' && <AlertsView />}
      </main>
    </div>
  );
}

export default App;