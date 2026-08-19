const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function verifySmtpConnection() {
  console.log('Testing Brevo SMTP Transport connection...');
  console.log(`Host: ${process.env.SMTP_HOST}`);
  console.log(`Port: ${process.env.SMTP_PORT}`);
  console.log(`User: ${process.env.SMTP_USER}`);
  console.log(`From: ${process.env.FROM_EMAIL}`);
  console.log(`Reply-To: ${process.env.REPLY_TO}`);

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: process.env.SMTP_PORT == '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  try {
    const success = await transporter.verify();
    if (success) {
      console.log('\n✔ [SUCCESS] Brevo SMTP connection verified successfully!');
      console.log('✔ Authenticated and ready to send marketing proposals from sales@megatrixai.com.');
    }
  } catch (error) {
    console.error('\n❌ [ERROR] SMTP Verification failed:', error.message);
  }
}

verifySmtpConnection();
