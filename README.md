# 🚀 Toeddro Mailer

Toeddro Mailer is a premium, high-performance bulk email sender designed for partnership outreach. It features a stunning, modern web interface with real-time progress tracking, flexible recipient management, and dynamic content loading.

![Mailer UI](https://img.shields.io/badge/UI-Modern%20Dark-blueviolet)
![Tech](https://img.shields.io/badge/Tech-Node.js%20%7C%20Express%20%7C%20Nodemailer-green)

---

## ✨ Features

- **💎 Premium UI**: A sleek, glassmorphism-inspired dark theme with smooth micro-animations.
- **📧 Bulk Sending**: Send emails to hundreds of recipients with a single click.
- **📊 Real-time Progress**: Monitor sent/failed counts and live activity logs.
- **👥 Flexible Recipient Management**:
  - Manual paste (comma/newline separated).
  - CSV and Text file upload support.
- **📝 Content Editor**:
  - Live email preview.
  - Upload `.txt` or `.html` files for email body content.
- **🛡️ Safety First**:
  - Configurable delay between emails to prevent SMTP rate limiting/spam flagging.
  - Verification tool to test SMTP connection before launching.
  - Emergency Abort button.

---

## 🛠️ Prerequisites

- **Node.js** (v14 or higher recommended)
- **SMTP Credentials**:
  - If using Gmail, you **must** use an [App Password](https://myaccount.google.com/security) (2-Step Verification must be enabled).

---

## 🚀 Getting Started

### 1. Installation

Clone or download the project, then install dependencies:

```bash
npm install
```

### 2. Configuration

Create/Open the `.env` file in the root directory and fill in your SMTP details:

```env
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Sender Info
SENDER_NAME=Joice
SENDER_EMAIL=your-email@gmail.com

# Timing
EMAIL_DELAY=2000 # Delay in milliseconds (2 seconds)
```

### 3. Run the Server

```bash
node server.js
```

The application will be available at: **[http://localhost:3000](http://localhost:3000)**

---

## 📖 Usage Guide

1.  **Verify SMTP**: Click "Verify Connection" in Step 1 to ensure your credentials are correct.
2.  **Add Recipients**: Paste emails or upload a CSV file. The system automatically cleans duplicates.
3.  **Prepare Content**: Enter your subject line. Type your message or upload a text file. Use the "Preview" tab to see how it looks.
4.  **Launch**: Hit "Launch Campaign" and watch the real-time logs as emails go out.

---

## 🔒 Security Note

- **.env Safety**: Never commit your `.env` file to public repositories. It contains sensitive credentials.
- **Rate Limiting**: Most SMTP providers (like Gmail) have daily sending limits (usually 500-2000 per day). Respect these to avoid account suspension.

---

## 🛠️ Technology Stack

- **Backend**: Node.js, Express.js
- **Mailing**: Nodemailer
- **Frontend**: Vanilla JS, CSS (Glassmorphism), HTML5
- **Parsing**: csv-parse, Multer
