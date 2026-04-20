export function formatCurrency(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(amount);
}

/** ₹1,23,456 (no paise) — used in admin tables */
export function formatINR(value) {
  return '₹' + Number(value || 0).toLocaleString('en-IN');
}

export function formatDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(new Date(value));
}

/** DD Mon YYYY with en-IN locale — used in admin tables */
export function formatDateIN(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}

export function formatDateTime(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

export function maskAccount(accountNumber) {
  if (!accountNumber) return '—';
  return `•••• ${String(accountNumber).slice(-4)}`;
}

export function toTitleCase(value) {
  if (!value) return '';
  return value.replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Triggers a direct browser download of text content as a file.
 * Works on localhost without any email/OTP requirement.
 */
export function downloadFile(filename, content, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Opens a print-ready PDF document in a new tab.
 * The browser's "Save as PDF" option can be used to download it.
 * @param {string} docTitle  - Document heading shown in the PDF
 * @param {string} textBody  - Plain-text content (newlines become <br/> / rows)
 */
export function openAsPdf(docTitle, textBody) {
  const rows = textBody.split('\n').map(line => {
    if (/^={3,}/.test(line.trim())) return `<hr style="border:none;border-top:1px solid #ccc;margin:8px 0"/>`;
    if (!line.trim()) return `<br/>`;
    const [key, ...rest] = line.split(':');
    if (rest.length && key.length < 25 && !line.startsWith(' ')) {
      return `<tr><td style="padding:5px 12px 5px 0;color:#555;font-size:12px;white-space:nowrap;vertical-align:top">${key}</td><td style="padding:5px 0;font-size:12px;font-weight:600">:&nbsp;${rest.join(':').trim()}</td></tr>`;
    }
    return `<tr><td colspan="2" style="padding:4px 0;font-size:12px;color:#333">${line}</td></tr>`;
  });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Nova Bank – ${docTitle}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #1a1a1a; padding: 48px; position: relative; }
    body::before { content: 'NOVA BANK CONFIDENTIAL'; position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%) rotate(-45deg); font-size: 64px; font-weight: 900; letter-spacing: 6px; color: rgba(11,61,110,0.06); white-space: nowrap; pointer-events: none; z-index: 0; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; border-bottom: 2px solid #0b3d6e; padding-bottom: 16px; }
    .bank-name { font-size: 22px; font-weight: 800; color: #0b3d6e; letter-spacing: 1px; }
    .bank-tag { font-size: 11px; color: #666; margin-top: 2px; }
    .meta { text-align: right; font-size: 12px; color: #555; line-height: 1.7; }
    .meta strong { color: #0b3d6e; }
    h2 { font-size: 15px; font-weight: 700; color: #0b3d6e; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; }
    .footer { font-size: 10px; color: #999; text-align: center; border-top: 1px solid #ddd; padding-top: 12px; margin-top: 40px; }
    @media print { body { padding: 24px; } }
  </style>
</head>
<body>
  <div class="header">
    <div><div class="bank-name">NOVA BANK</div><div class="bank-tag">Member of Nova Financial Group</div></div>
    <div class="meta"><strong>${docTitle}</strong><br/>Generated: ${new Date().toLocaleString('en-IN')}</div>
  </div>
  <h2>${docTitle}</h2>
  <table>${rows.filter(r => r.startsWith('<tr')).join('')}</table>
  ${rows.filter(r => !r.startsWith('<tr')).join('')}
  <div class="footer">This is a computer-generated document. For queries, contact support@novabank.com &nbsp;|&nbsp; Nova Bank is regulated by the Reserve Bank of India.</div>
  <script>window.onload = function() { window.print(); };</script>
</body>
</html>`;

  const w = window.open('', '_blank');
  if (w) { w.document.write(html); w.document.close(); }
}
