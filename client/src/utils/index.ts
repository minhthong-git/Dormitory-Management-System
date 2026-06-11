/**
 * Các hàm utility dùng chung phía client.
 */

// ── Date formatting ────────────────────────────────────────────
export const formatDate = (dateStr: string, locale = 'vi-VN'): string => {
  return new Date(dateStr).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: '2-digit',
  });
};

export const formatDateTime = (dateStr: string, locale = 'vi-VN'): string => {
  return new Date(dateStr).toLocaleString(locale);
};

// ── Currency ───────────────────────────────────────────────────
export const formatCurrency = (amount: number, currency = 'VND'): string =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency }).format(amount);

// ── Validators ────────────────────────────────────────────────
export const isValidEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const isStrongPassword = (password: string): boolean =>
  password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password);

// ── String helpers ─────────────────────────────────────────────
export const capitalize = (str: string): string =>
  str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

export const truncate = (str: string, maxLen = 50): string =>
  str.length <= maxLen ? str : `${str.slice(0, maxLen)}…`;

// ── Storage helpers ────────────────────────────────────────────
export const storage = {
  get: <T>(key: string): T | null => {
    try {
      const item = localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : null;
    } catch {
      return null;
    }
  },
  set: (key: string, value: unknown): void => {
    localStorage.setItem(key, JSON.stringify(value));
  },
  remove: (key: string): void => {
    localStorage.removeItem(key);
  },
};
