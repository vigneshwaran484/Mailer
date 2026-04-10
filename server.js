require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const fs = require('fs');
const path = require('path');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(express.json());
app.use(express.static('public'));

// Store sending progress in memory
let sendingState = {
  isRunning: false,
  total: 0,
  sent: 0,
  failed: 0,
  logs: [],
  aborted: false
};

// Create SMTP transporter
function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

// Verify SMTP connection
app.post('/api/verify-smtp', async (req, res) => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    res.json({ success: true, message: 'SMTP connection verified successfully!' });
  } catch (error) {
    res.json({ success: false, message: `SMTP verification failed: ${error.message}` });
  }
});

// Upload CSV of recipients
app.post('/api/upload-csv', upload.single('csvfile'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const fileContent = fs.readFileSync(req.file.path, 'utf-8');
    let emails = [];

    // Try CSV parsing first
    try {
      const records = parse(fileContent, {
        columns: false,
        skip_empty_lines: true,
        trim: true
      });
      records.forEach(row => {
        row.forEach(cell => {
          const emailMatch = cell.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
          if (emailMatch) {
            emails.push(...emailMatch);
          }
        });
      });
    } catch {
      // If CSV parse fails, try line-by-line
      const lines = fileContent.split(/[\n\r,;]+/);
      lines.forEach(line => {
        const emailMatch = line.trim().match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
        if (emailMatch) {
          emails.push(...emailMatch);
        }
      });
    }

    // Remove duplicates
    emails = [...new Set(emails.map(e => e.toLowerCase()))];

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json({ success: true, emails, count: emails.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get current sending progress
app.get('/api/progress', (req, res) => {
  res.json(sendingState);
});

// Abort sending
app.post('/api/abort', (req, res) => {
  sendingState.aborted = true;
  res.json({ success: true, message: 'Abort signal sent' });
});

// Send emails
app.post('/api/send', async (req, res) => {
  const { emails, subject, htmlContent, textContent } = req.body;

  if (!emails || emails.length === 0) {
    return res.status(400).json({ success: false, message: 'No recipients provided' });
  }

  if (sendingState.isRunning) {
    return res.status(400).json({ success: false, message: 'A sending operation is already in progress' });
  }

  // Reset state
  sendingState = {
    isRunning: true,
    total: emails.length,
    sent: 0,
    failed: 0,
    logs: [],
    aborted: false
  };

  // Send response immediately
  res.json({ success: true, message: `Started sending to ${emails.length} recipients` });

  // Process emails in background
  const transporter = createTransporter();
  const delay = parseInt(process.env.EMAIL_DELAY || '2000');
  const senderName = process.env.SENDER_NAME || 'Joice';
  const senderEmail = process.env.SENDER_EMAIL || process.env.SMTP_USER;

  for (let i = 0; i < emails.length; i++) {
    if (sendingState.aborted) {
      sendingState.logs.push({
        type: 'warning',
        message: `Sending aborted after ${sendingState.sent} emails`,
        timestamp: new Date().toISOString()
      });
      break;
    }

    const email = emails[i];

    try {
      await transporter.sendMail({
        from: `"${senderName}" <${senderEmail}>`,
        to: email,
        subject: subject || '',
        text: textContent,
        html: htmlContent
      });

      sendingState.sent++;
      sendingState.logs.push({
        type: 'success',
        message: `✓ Sent to ${email}`,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      sendingState.failed++;
      sendingState.logs.push({
        type: 'error',
        message: `✗ Failed: ${email} — ${error.message}`,
        timestamp: new Date().toISOString()
      });
    }

    // Delay between emails to avoid rate limiting
    if (i < emails.length - 1 && !sendingState.aborted) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  sendingState.isRunning = false;
  sendingState.logs.push({
    type: 'info',
    message: `Completed: ${sendingState.sent} sent, ${sendingState.failed} failed out of ${sendingState.total}`,
    timestamp: new Date().toISOString()
  });
});

// Get SMTP config status (without exposing password)
app.get('/api/config', (req, res) => {
  res.json({
    host: process.env.SMTP_HOST || 'not set',
    port: process.env.SMTP_PORT || 'not set',
    user: process.env.SMTP_USER || 'not set',
    senderName: process.env.SENDER_NAME || 'not set',
    senderEmail: process.env.SENDER_EMAIL || 'not set',
    delay: process.env.EMAIL_DELAY || '2000',
    configured: !!(process.env.SMTP_USER && process.env.SMTP_PASS)
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 Toeddro Mailer running at http://localhost:${PORT}`);
  console.log(`📧 SMTP User: ${process.env.SMTP_USER || 'NOT CONFIGURED'}`);
  console.log(`\nMake sure to configure your .env file with SMTP credentials!\n`);
});
