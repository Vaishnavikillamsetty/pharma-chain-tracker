const nodemailer = require('nodemailer');

// Email configuration
const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendInvestorAlert = async (drugData, action, quantity, address) => {
  const investorEmails = [
    'investor1@healthcare.vc',
    'investor2@medtech.com',
    'partner@hospital.org'
  ];

  const emailSubject = `🚨 PharmaChain Alert: ${action} - ${drugData.name}`;
  
  const emailBody = `
    <h2>💊 PharmaChain Tracker - Drug Movement Alert</h2>
    
    <div style="background: #f8f9fa; padding: 20px; border-radius: 10px;">
      <h3>📦 Drug Information</h3>
      <p><strong>Drug Name:</strong> ${drugData.name}</p>
      <p><strong>Batch Number:</strong> ${drugData.batch_number}</p>
      <p><strong>Action:</strong> ${action.toUpperCase()}</p>
      <p><strong>Quantity:</strong> ${quantity} units</p>
      <p><strong>Destination:</strong> ${address}</p>
      <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
    </div>

    <div style="margin-top: 20px; background: #e7f3ff; padding: 15px; border-radius: 8px;">
      <h4>🔗 Blockchain Transaction Created</h4>
      <p>This action has been recorded in our immutable blockchain ledger.</p>
      <p><strong>Transaction Hash:</strong> ${generateTransactionHash()}</p>
    </div>

    <div style="margin-top: 15px; color: #666;">
      <p>This is an automated alert from PharmaChain Tracker System</p>
    </div>
  `;

  try {
    for (const email of investorEmails) {
      await transporter.sendMail({
        from: '"PharmaChain Alerts" <alerts@pharmachain.com>',
        to: email,
        subject: emailSubject,
        html: emailBody
      });
      console.log(`✅ Alert sent to: ${email}`);
    }
    return true;
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    return false;
  }
};

module.exports = { sendInvestorAlert };