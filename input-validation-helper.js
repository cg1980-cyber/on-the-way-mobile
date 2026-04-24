/**
 * SECURITY HARDENED: Input Validation and Sanitization
 *
 * This module provides validation functions for user inputs
 * All user input should be validated before being sent to the backend
 */

/**
 * SECURITY: Validate tracking number format and length
 * @param {string} trackingNumber - Tracking number to validate
 * @returns {string} Validated tracking number
 * @throws {Error} If validation fails
 */
export function validateTrackingNumber(trackingNumber) {
  if (!trackingNumber || typeof trackingNumber !== 'string') {
    throw new Error('Tracking number must be a non-empty string');
  }

  const trimmed = trackingNumber.trim();

  // Check length - most tracking numbers are 20-40 characters
  if (trimmed.length < 5) {
    throw new Error('Tracking number too short (minimum 5 characters)');
  }

  if (trimmed.length > 50) {
    throw new Error('Tracking number too long (maximum 50 characters)');
  }

  // Only allow alphanumeric and common tracking characters (-, space)
  if (!/^[A-Z0-9\-\s]*$/i.test(trimmed)) {
    throw new Error('Tracking number contains invalid characters');
  }

  return trimmed.toUpperCase();
}

/**
 * SECURITY: Validate carrier selection
 * @param {string} carrier - Carrier name to validate
 * @returns {string} Validated carrier
 * @throws {Error} If validation fails
 */
export function validateCarrier(carrier) {
  const validCarriers = ['usps', 'ups', 'fedex'];

  if (!carrier || typeof carrier !== 'string') {
    throw new Error('Carrier must be a non-empty string');
  }

  const lowerCarrier = carrier.toLowerCase().trim();

  if (!validCarriers.includes(lowerCarrier)) {
    throw new Error(`Invalid carrier. Must be one of: ${validCarriers.join(', ')}`);
  }

  return lowerCarrier;
}

/**
 * SECURITY: Validate and sanitize nickname
 * @param {string} nickname - User nickname to validate
 * @returns {string} Validated and sanitized nickname
 * @throws {Error} If validation fails
 */
export function validateNickname(nickname) {
  // Allow empty nickname (optional field)
  if (!nickname) {
    return '';
  }

  if (typeof nickname !== 'string') {
    throw new Error('Nickname must be a string');
  }

  const trimmed = nickname.trim();

  // Max length - prevent abuse
  if (trimmed.length > 100) {
    throw new Error('Nickname too long (maximum 100 characters)');
  }

  // Sanitize potentially dangerous characters
  // Remove HTML/XML tags and script-like content
  const sanitized = trimmed
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>"'`]/g, '') // Remove potentially dangerous characters
    .trim();

  if (sanitized.length === 0) {
    throw new Error('Nickname cannot be empty or contain only invalid characters');
  }

  return sanitized;
}

/**
 * SECURITY: Validate email address format
 * @param {string} email - Email to validate
 * @returns {string} Validated email
 * @throws {Error} If validation fails
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    throw new Error('Email must be a non-empty string');
  }

  const trimmed = email.toLowerCase().trim();

  // Basic email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(trimmed)) {
    throw new Error('Invalid email format');
  }

  // Max length
  if (trimmed.length > 254) {
    throw new Error('Email too long');
  }

  return trimmed;
}

/**
 * SECURITY: Validate password strength
 * @param {string} password - Password to validate
 * @returns {object} { isValid, errors }
 */
export function validatePassword(password) {
  const errors = [];

  if (!password || typeof password !== 'string') {
    return { isValid: false, errors: ['Password is required'] };
  }

  // Minimum length
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  // Maximum length
  if (password.length > 128) {
    errors.push('Password must be at most 128 characters long');
  }

  // Must contain at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  // Must contain at least one lowercase letter
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  // Must contain at least one number
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  // Must contain at least one special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * SECURITY: Validate that email is from known carrier
 * Used to validate webhook sources
 * @param {string} email - Email to check
 * @returns {boolean} True if email is from known carrier
 */
export function isValidCarrierEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }

  const lowerEmail = email.toLowerCase().trim();

  // Whitelist of known carrier email domains
  const validDomains = [
    '@usps.com',
    '@ups.com',
    '@fedex.com',
    '@informeddelivery.usps.com',
    '@ups-onlinetools.com',
    '@fedexnotifications.com',
  ];

  return validDomains.some(domain => lowerEmail.endsWith(domain));
}

/**
 * SECURITY: Validate package update object
 * @param {object} updateData - Data to validate
 * @returns {object} Validated update data
 * @throws {Error} If validation fails
 */
export function validatePackageUpdate(updateData) {
  if (!updateData || typeof updateData !== 'object') {
    throw new Error('Update data must be an object');
  }

  const validated = {};

  // Validate nickname if provided
  if ('nickname' in updateData) {
    validated.nickname = validateNickname(updateData.nickname);
  }

  // Validate archived flag if provided
  if ('archived' in updateData) {
    if (typeof updateData.archived !== 'boolean') {
      throw new Error('archived must be a boolean');
    }
    validated.archived = updateData.archived;
  }

  // Validate deleted flag if provided
  if ('deleted' in updateData) {
    if (typeof updateData.deleted !== 'boolean') {
      throw new Error('deleted must be a boolean');
    }
    validated.deleted = updateData.deleted;
  }

  // Prevent other fields
  const allowedFields = ['nickname', 'archived', 'deleted'];
  const providedFields = Object.keys(updateData);
  const invalidFields = providedFields.filter(field => !allowedFields.includes(field));

  if (invalidFields.length > 0) {
    throw new Error(`Invalid fields: ${invalidFields.join(', ')}`);
  }

  return validated;
}

/**
 * SECURITY: Validate new package data
 * @param {object} packageData - Package data from user input
 * @returns {object} Validated package data
 * @throws {Error} If validation fails
 */
export function validateNewPackage(packageData) {
  if (!packageData || typeof packageData !== 'object') {
    throw new Error('Package data must be an object');
  }

  if (!packageData.trackingNumber) {
    throw new Error('Tracking number is required');
  }

  if (!packageData.carrier) {
    throw new Error('Carrier is required');
  }

  const validated = {
    trackingNumber: validateTrackingNumber(packageData.trackingNumber),
    carrier: validateCarrier(packageData.carrier),
    nickname: packageData.nickname ? validateNickname(packageData.nickname) : '',
  };

  return validated;
}

/**
 * SECURITY: Sanitize string for display
 * Remove potentially dangerous characters for display purposes
 * @param {string} input - String to sanitize
 * @returns {string} Sanitized string
 */
export function sanitizeForDisplay(input) {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .trim()
    .substring(0, 500); // Limit length
}

/**
 * SECURITY: Validate input object structure
 * @param {object} obj - Object to validate
 * @param {object} schema - Schema defining required/optional fields
 * @returns {object} Validated object
 * @throws {Error} If validation fails
 *
 * Example schema:
 * {
 *   trackingNumber: { type: 'string', required: true, validator: validateTrackingNumber },
 *   nickname: { type: 'string', required: false, validator: validateNickname },
 * }
 */
export function validateObjectAgainstSchema(obj, schema) {
  if (!obj || typeof obj !== 'object') {
    throw new Error('Input must be an object');
  }

  const validated = {};

  // Check required fields and validate
  for (const [field, rules] of Object.entries(schema)) {
    const value = obj[field];

    // Check if field is required but missing
    if (rules.required && (value === undefined || value === null)) {
      throw new Error(`${field} is required`);
    }

    // Skip validation if field is not provided and not required
    if (!rules.required && (value === undefined || value === null)) {
      continue;
    }

    // Check type
    if (typeof value !== rules.type) {
      throw new Error(`${field} must be of type ${rules.type}`);
    }

    // Apply custom validator if provided
    if (rules.validator && typeof rules.validator === 'function') {
      validated[field] = rules.validator(value);
    } else {
      validated[field] = value;
    }
  }

  return validated;
}

/**
 * SECURITY: Trim and normalize user input
 * @param {string} input - Raw user input
 * @returns {string} Trimmed and normalized input
 */
export function normalizeUserInput(input) {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .trim() // Remove leading/trailing whitespace
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .substring(0, 1000); // Limit length
}

/**
 * VALIDATION ERROR HANDLING
 * Use this in components to provide user-friendly error messages
 *
 * Example usage:
 * try {
 *   const validated = validateTrackingNumber(userInput);
 * } catch (error) {
 *   Alert.alert('Invalid Input', error.message);
 * }
 */

export default {
  validateTrackingNumber,
  validateCarrier,
  validateNickname,
  validateEmail,
  validatePassword,
  isValidCarrierEmail,
  validatePackageUpdate,
  validateNewPackage,
  sanitizeForDisplay,
  validateObjectAgainstSchema,
  normalizeUserInput,
};
