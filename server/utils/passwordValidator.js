import crypto from 'crypto';

// Set of commonly used, predictable, or leaked passwords to block
const COMMON_PASSWORDS = new Set([
  'password', 'password123', 'password123!', '123456789012', '1234567890123',
  'administrator', 'adminadmin123', 'adminadmin123!', 'qwertyuiopas', 'qwertyuiop12',
  'qwerty123456', 'autocraft123', 'autocraft123!', 'welcome12345', 'welcome12345!',
  'letmein12345', 'letmein12345!', 'password!!!!', 'passwordxxxx', 'charlie12345',
  'monkey123456', 'superman1234', 'shadow123456', 'dragon123456', 'football1234',
  'baseball1234', 'soccer123456', 'porsche12345', 'ferrari12345', 'mustang12345',
  'corvette1234', 'chevrolet123', 'mercedes1234', 'bmwbmw123456', 'audi12345678',
  'honda123 Honda', 'toyota123456', 'nissan123456', 'hyundai12345', 'subaru123456'
]);

/**
 * Validates password strength and matches against common passwords and predictability checks
 * @param {string} password 
 * @returns {{isValid: boolean, message?: string}}
 */
export const validatePassword = (password) => {
  if (!password) {
    return { isValid: false, message: 'Password is required' };
  }

  if (password.length < 12) {
    return { isValid: false, message: 'Password must be at least 12 characters long' };
  }

  if (!/[A-Z]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one uppercase letter' };
  }

  if (!/[a-z]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one lowercase letter' };
  }

  if (!/[0-9]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one number' };
  }

  if (!/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\/;`]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one special character' };
  }

  // Dictionary check (case-insensitive check against common patterns)
  const normalized = password.toLowerCase().trim();
  if (COMMON_PASSWORDS.has(normalized)) {
    return { isValid: false, message: 'This password is too common and easily guessable. Please choose a more secure password.' };
  }

  // Predictability checks:
  // 1. Repeating sequences (e.g. "aaaaa" or "121212")
  if (/(.)\1{4,}/.test(password)) {
    return { isValid: false, message: 'Password cannot contain repeating characters' };
  }

  // 2. Sequential numbers/letters
  const sequentialPatterns = ['12345', 'abcde', 'qwert', 'asdfg', 'zxcvb'];
  for (const pattern of sequentialPatterns) {
    if (normalized.includes(pattern)) {
      return { isValid: false, message: 'Password cannot contain simple keyboard sequences or patterns' };
    }
  }

  return { isValid: true };
};
