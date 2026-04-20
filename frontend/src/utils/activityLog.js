const KEY = (username) => `nova_activity_${username}`;
const MAX_ENTRIES = 500;

/**
 * Log a customer action.
 * @param {string} username
 * @param {string} action  e.g. 'TRANSFER', 'LOAN_APPLIED', 'PROFILE_EDITED'
 * @param {object} details additional context fields
 */
export function logActivity(username, action, details = {}) {
  if (!username) return;
  try {
    const log = JSON.parse(localStorage.getItem(KEY(username)) || '[]');
    log.unshift({ id: Date.now(), action, details, ts: new Date().toISOString() });
    localStorage.setItem(KEY(username), JSON.stringify(log.slice(0, MAX_ENTRIES)));
  } catch { /* ignore */ }
}

/**
 * Retrieve the activity log for a customer.
 * @param {string} username
 * @returns {Array}
 */
export function getActivityLog(username) {
  if (!username) return [];
  try {
    return JSON.parse(localStorage.getItem(KEY(username)) || '[]');
  } catch { return []; }
}
