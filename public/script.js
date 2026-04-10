// ==========================================
// Toeddro Mailer — Frontend Logic
// ==========================================

let emailList = [];
let progressInterval = null;

// ==========================================
// Initialization
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  loadConfig();
  updateSummary();

  // Drag & drop support
  const uploadZone = document.getElementById('uploadZone');
  uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.style.borderColor = 'var(--accent-primary)';
    uploadZone.style.background = 'rgba(99, 102, 241, 0.05)';
  });
  uploadZone.addEventListener('dragleave', () => {
    uploadZone.style.borderColor = '';
    uploadZone.style.background = '';
  });
  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.style.borderColor = '';
    uploadZone.style.background = '';
    if (e.dataTransfer.files.length) {
      const input = document.getElementById('csvFile');
      input.files = e.dataTransfer.files;
      uploadCSV(input);
    }
  });
});

// ==========================================
// SMTP Config
// ==========================================

async function loadConfig() {
  try {
    const res = await fetch('/api/config');
    const config = await res.json();

    const grid = document.getElementById('configGrid');
    const items = [
      { label: 'SMTP Host', value: config.host },
      { label: 'SMTP Port', value: config.port },
      { label: 'User', value: config.user },
      { label: 'Sender', value: `${config.senderName} <${config.senderEmail}>` },
      { label: 'Delay', value: `${config.delay}ms` },
      { label: 'Status', value: config.configured ? 'Configured ✓' : 'Not configured ✗' }
    ];

    grid.innerHTML = items.map(item => `
      <div class="config-item">
        <div class="config-label">${item.label}</div>
        <div class="config-value ${item.value === 'not set' || item.value.includes('Not configured') ? 'not-set' : ''}">
          ${item.value}
        </div>
      </div>
    `).join('');

    const statusDot = document.querySelector('.status-dot');
    const statusText = document.querySelector('.status-text');

    if (config.configured) {
      statusText.textContent = 'SMTP Configured';
      statusDot.className = 'status-dot connected';
    } else {
      statusText.textContent = 'SMTP Not Configured';
      statusDot.className = 'status-dot error';
    }

    document.getElementById('summaryDelay').textContent = `${parseInt(config.delay) / 1000}s`;
  } catch (err) {
    showToast('Failed to load config', 'error');
  }
}

async function verifySmtp() {
  const btn = document.getElementById('btnVerify');
  btn.classList.add('loading');

  try {
    const res = await fetch('/api/verify-smtp', { method: 'POST' });
    const data = await res.json();

    const statusDot = document.querySelector('.status-dot');
    const statusText = document.querySelector('.status-text');

    if (data.success) {
      statusDot.className = 'status-dot connected';
      statusText.textContent = 'SMTP Connected';
      showToast('SMTP connection verified! ✓', 'success');
    } else {
      statusDot.className = 'status-dot error';
      statusText.textContent = 'Connection Failed';
      showToast(data.message, 'error');
    }
  } catch (err) {
    showToast('Failed to verify SMTP', 'error');
  } finally {
    btn.classList.remove('loading');
  }
}

// ==========================================
// Recipients Management
// ==========================================

function addManualEmails() {
  const input = document.getElementById('emailInput');
  const text = input.value.trim();
  if (!text) return;

  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const found = text.match(emailRegex) || [];
  const newEmails = found.map(e => e.toLowerCase());

  let added = 0;
  newEmails.forEach(email => {
    if (!emailList.includes(email)) {
      emailList.push(email);
      added++;
    }
  });

  input.value = '';
  renderEmailChips();
  updateSummary();
  showToast(`Added ${added} email(s), ${newEmails.length - added} duplicates skipped`, 'info');
}

async function uploadCSV(input) {
  if (!input.files || !input.files[0]) return;

  const formData = new FormData();
  formData.append('csvfile', input.files[0]);

  try {
    const res = await fetch('/api/upload-csv', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();

    if (data.success) {
      let added = 0;
      data.emails.forEach(email => {
        if (!emailList.includes(email)) {
          emailList.push(email);
          added++;
        }
      });

      renderEmailChips();
      updateSummary();
      showToast(`Extracted ${data.count} emails, added ${added} new`, 'success');
    } else {
      showToast(data.message, 'error');
    }
  } catch (err) {
    showToast('Failed to upload file', 'error');
  }

  input.value = '';
}

function removeEmail(email) {
  emailList = emailList.filter(e => e !== email);
  renderEmailChips();
  updateSummary();
}

function clearAllEmails() {
  emailList = [];
  renderEmailChips();
  updateSummary();
  showToast('All recipients cleared', 'info');
}

function renderEmailChips() {
  const container = document.getElementById('emailListContainer');
  const chips = document.getElementById('emailChips');
  const count = document.getElementById('recipientCount');

  if (emailList.length === 0) {
    container.style.display = 'none';
    count.textContent = '0 recipients';
    return;
  }

  container.style.display = 'block';
  count.textContent = `${emailList.length} recipient${emailList.length !== 1 ? 's' : ''}`;

  chips.innerHTML = emailList.map(email => `
    <div class="email-chip">
      <span>${email}</span>
      <button class="remove-chip" onclick="removeEmail('${email}')" title="Remove">×</button>
    </div>
  `).join('');
}

// ==========================================
// Email Content
// ==========================================

async function uploadContentFile(input) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  try {
    const text = await file.text();
    document.getElementById('emailBody').value = text;
    showToast('Content loaded successfully!', 'success');
  } catch (err) {
    showToast('Failed to read file', 'error');
  }
  input.value = ''; // Reset input to allow re-uploading same file
}

function switchTab(tab) {
  const editPane = document.getElementById('editPane');
  const previewPane = document.getElementById('previewPane');
  const tabEdit = document.getElementById('tabEdit');
  const tabPreview = document.getElementById('tabPreview');

  if (tab === 'edit') {
    editPane.style.display = 'block';
    editPane.classList.add('active');
    previewPane.style.display = 'none';
    previewPane.classList.remove('active');
    tabEdit.classList.add('active');
    tabPreview.classList.remove('active');
  } else {
    editPane.style.display = 'none';
    editPane.classList.remove('active');
    previewPane.style.display = 'block';
    previewPane.classList.add('active');
    tabEdit.classList.remove('active');
    tabPreview.classList.add('active');

    // Render preview
    const body = document.getElementById('emailBody').value;
    const preview = document.getElementById('emailPreview');
    preview.innerHTML = formatEmailHtml(body);
  }
}

function formatEmailHtml(text) {
  // Convert URLs to links
  let html = text.replace(
    /(https?:\/\/[^\s]+)/g,
    '<a href="$1" target="_blank" style="color:#6366f1;">$1</a>'
  );
  return html;
}

function getEmailHtml(bodyText) {
  const htmlBody = formatEmailHtml(bodyText);
  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #ffffff; color: #1a1a2e; line-height: 1.8; font-size: 15px;">
      <div style="white-space: pre-wrap; word-wrap: break-word;">${htmlBody}</div>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
      <p style="font-size: 12px; color: #9ca3af;">Sent via Toeddro Outreach</p>
    </div>
  `;
}

// ==========================================
// Send Emails
// ==========================================

function updateSummary() {
  document.getElementById('summaryRecipients').textContent = emailList.length;
  document.getElementById('summarySubject').textContent =
    document.getElementById('emailSubject').value || '—';
}

async function startSending() {
  if (emailList.length === 0) {
    showToast('Add at least one recipient email!', 'error');
    return;
  }

  const subject = document.getElementById('emailSubject').value.trim();
  const body = document.getElementById('emailBody').value.trim();

  if (!subject) {
    showToast('Please enter an email subject', 'error');
    return;
  }

  if (!body) {
    showToast('Please enter email content', 'error');
    return;
  }

  // Confirm
  const confirmed = confirm(
    `You are about to send ${emailList.length} email(s).\n\nSubject: ${subject}\n\nContinue?`
  );
  if (!confirmed) return;

  const btnSend = document.getElementById('btnSend');
  const btnAbort = document.getElementById('btnAbort');
  const progressSection = document.getElementById('progressSection');
  const logContainer = document.getElementById('logContainer');

  btnSend.style.display = 'none';
  btnAbort.style.display = 'inline-flex';
  progressSection.style.display = 'block';
  logContainer.style.display = 'block';

  // Clear previous logs
  document.getElementById('logEntries').innerHTML = '';

  try {
    const res = await fetch('/api/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emails: emailList,
        subject,
        textContent: body,
        htmlContent: getEmailHtml(body)
      })
    });

    const data = await res.json();

    if (!data.success) {
      showToast(data.message, 'error');
      btnSend.style.display = 'inline-flex';
      btnAbort.style.display = 'none';
      return;
    }

    showToast(`Sending to ${emailList.length} recipients...`, 'info');

    // Poll progress
    progressInterval = setInterval(pollProgress, 1000);
  } catch (err) {
    showToast('Failed to start sending: ' + err.message, 'error');
    btnSend.style.display = 'inline-flex';
    btnAbort.style.display = 'none';
  }
}

async function pollProgress() {
  try {
    const res = await fetch('/api/progress');
    const data = await res.json();

    document.getElementById('statSent').textContent = data.sent;
    document.getElementById('statFailed').textContent = data.failed;
    document.getElementById('statTotal').textContent = data.total;

    const percent = data.total > 0 ? ((data.sent + data.failed) / data.total) * 100 : 0;
    document.getElementById('progressBar').style.width = `${percent}%`;
    document.getElementById('progressText').textContent =
      data.isRunning
        ? `Processing ${data.sent + data.failed} of ${data.total}...`
        : `Completed: ${data.sent} sent, ${data.failed} failed`;

    // Update logs
    const logEntries = document.getElementById('logEntries');
    const currentCount = logEntries.children.length;

    for (let i = currentCount; i < data.logs.length; i++) {
      const log = data.logs[i];
      const entry = document.createElement('div');
      entry.className = `log-entry ${log.type}`;
      const time = new Date(log.timestamp).toLocaleTimeString();
      entry.innerHTML = `<span class="log-time">${time}</span><span>${log.message}</span>`;
      logEntries.appendChild(entry);
      logEntries.scrollTop = logEntries.scrollHeight;
    }

    // Done
    if (!data.isRunning && (data.sent + data.failed) > 0) {
      clearInterval(progressInterval);
      progressInterval = null;

      document.getElementById('btnSend').style.display = 'inline-flex';
      document.getElementById('btnAbort').style.display = 'none';

      if (data.failed === 0) {
        showToast(`All ${data.sent} emails sent successfully! 🎉`, 'success');
      } else {
        showToast(`Done: ${data.sent} sent, ${data.failed} failed`, 'error');
      }
    }
  } catch (err) {
    // Silently handle polling errors
  }
}

async function abortSending() {
  const confirmed = confirm('Are you sure you want to abort sending?');
  if (!confirmed) return;

  try {
    await fetch('/api/abort', { method: 'POST' });
    showToast('Abort signal sent, finishing current email...', 'info');
  } catch (err) {
    showToast('Failed to abort', 'error');
  }
}

// ==========================================
// Toast Notifications
// ==========================================

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
