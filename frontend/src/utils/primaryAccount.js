/**
 * Thin helpers for storing/retrieving the customer's primary account number.
 * Keyed by username so different logins don't collide.
 */

const key = (username) => `nova_primary_account_${username || 'default'}`;

export function getPrimaryAccount(username) {
  return localStorage.getItem(key(username)) || null;
}

export function setPrimaryAccount(username, accountNumber) {
  if (accountNumber) {
    localStorage.setItem(key(username), accountNumber);
  } else {
    localStorage.removeItem(key(username));
  }
}
