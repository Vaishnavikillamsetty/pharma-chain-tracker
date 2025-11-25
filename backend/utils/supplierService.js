const nodemailer = require('nodemailer');

const sendSupplierOrder = async (drugData, orderQuantity, deliveryAddress) => {
  const supplierEmails = {
    'MediCorp Ltd': 'orders@medicorp.com',
    'Global Pharma': 'supply@globalpharma.com',
    'BioTech Solutions': 'purchasing@biotech.com',
    'Emergency Supplier': 'emergency@quickmeds.com'
  };

  const supplierEmail = supplierEmails[drugData.supplier] || 'orders@defaultsupplier.com';

  const emailSubject = `🔄 URGENT: Purchase Order - ${drugData.name} (Batch: ${drugData.batch_number})`;

  const emailBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc3545;">🚨 URGENT MEDICINE ORDER</h2>
      
      <div style="background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107;">
        <h3>📋 Order Details</h3>
        <table style="width: 100%;">
          <tr><td><strong>Drug Name:</strong></td><td>${drugData.name}</td></tr>
          <tr><td><strong>Batch Number:</strong></td><td>${drugData.batch_number}</td></tr>
          <tr><td><strong>Order Quantity:</strong></td><td>${orderQuantity} units</td></tr>
          <tr><td><strong>Current Stock:</strong></td><td>${drugData.quantity} units (CRITICAL)</td></tr>
          <tr><td><strong>Delivery Address:</strong></td><td>${deliveryAddress}</td></tr>
          <tr><td><strong>Urgency Level:</strong></td><td>🔴 HIGH PRIORITY</td></tr>
        </table>
      </div>

      <div style="background: #d4edda; padding: 15px; border-radius: 8px; margin-top: 15px;">
        <h3>🏥 Hospital Information</h3>
        <p><strong>Hospital:</strong> City General Hospital</p>
        <p><strong>Contact:</strong> Pharmacy Department - +1-555-0123</p>
        <p><strong>Order Reference:</strong> PO-${Date.now()}</p>
      </div>

      <div style="background: #d1ecf1; padding: 15px; border-radius: 8px; margin-top: 15px;">
        <h3>📦 Delivery Instructions</h3>
        <p>• Please deliver within 24 hours</p>
        <p>• Contact upon arrival at: +1-555-0123</p>
        <p>• Use emergency delivery entrance</p>
        <p>• Temperature-sensitive items: Maintain 2-8°C</p>
      </div>

      <div style="margin-top: 20px; text-align: center; color: #666;">
        <p>This is an automated order from PharmaChain Tracker System</p>
        <p>🕒 Generated: ${new Date().toLocaleString()}</p>
      </div>
    </div>
  `;

  try {
    const transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.sendMail({
      from: '"PharmaChain Auto-Order" <orders@pharmachain.com>',
      to: supplierEmail,
      subject: emailSubject,
      html: emailBody
    });

    console.log(`✅ Order sent to supplier: ${supplierEmail}`);
    return { success: true, supplier: drugData.supplier, orderId: `PO-${Date.now()}` };
  } catch (error) {
    console.error('❌ Failed to send order:', error);
    return { success: false, error: error.message };
  }
};

module.exports = { sendSupplierOrder };