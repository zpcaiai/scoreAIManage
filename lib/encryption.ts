import crypto from 'crypto';

// Encryption configuration
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-32-character-encryption-key-here'; // Must be 32 characters for AES-256
const IV_LENGTH = 16; // For AES, this is always 16
const AUTH_TAG_LENGTH = 16; // For GCM mode

// Ensure encryption key is properly formatted
function getEncryptionKey(): Buffer {
  if (ENCRYPTION_KEY.length !== 32) {
    throw new Error('Encryption key must be exactly 32 characters for AES-256');
  }
  return Buffer.from(ENCRYPTION_KEY, 'utf8');
}

// Encrypt sensitive data
export function encrypt(text: string): string {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    
    const cipher = crypto.createCipher(ENCRYPTION_ALGORITHM, key);
    cipher.setAAD(Buffer.from('additional-data')); // Additional authenticated data
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Combine IV, auth tag, and encrypted data
    const combined = iv.toString('hex') + authTag.toString('hex') + encrypted;
    
    return combined;
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
}

// Decrypt sensitive data
export function decrypt(encryptedData: string): string {
  try {
    const key = getEncryptionKey();
    
    // Extract IV, auth tag, and encrypted data
    const iv = Buffer.from(encryptedData.slice(0, IV_LENGTH * 2), 'hex');
    const authTag = Buffer.from(encryptedData.slice(IV_LENGTH * 2, (IV_LENGTH + AUTH_TAG_LENGTH) * 2), 'hex');
    const encrypted = encryptedData.slice((IV_LENGTH + AUTH_TAG_LENGTH) * 2);
    
    const decipher = crypto.createDecipher(ENCRYPTION_ALGORITHM, key);
    decipher.setAuthTag(authTag);
    decipher.setAAD(Buffer.from('additional-data'));
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt data');
  }
}

// Hash passwords (for user authentication)
export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const saltValue = salt || crypto.randomBytes(32).toString('hex');
  const hash = crypto.pbkdf2Sync(password, saltValue, 10000, 64, 'sha512').toString('hex');
  
  return { hash, salt: saltValue };
}

// Verify password
export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const hashVerify = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return hash === hashVerify;
}

// Generate secure random token
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

// Generate API key
export function generateApiKey(): string {
  const timestamp = Date.now().toString();
  const random = crypto.randomBytes(16).toString('hex');
  const hash = crypto.createHash('sha256').update(timestamp + random).digest('hex');
  
  return `sk_${hash.substring(0, 32)}`;
}

// Encrypt phone numbers (PII)
export function encryptPhoneNumber(phone: string): string {
  if (!phone) return '';
  return encrypt(phone);
}

// Decrypt phone numbers
export function decryptPhoneNumber(encryptedPhone: string): string {
  if (!encryptedPhone) return '';
  return decrypt(encryptedPhone);
}

// Encrypt sensitive student information
export function encryptStudentPII(studentData: any): any {
  const encrypted = { ...studentData };
  
  // Encrypt sensitive fields
  if (encrypted.phone) {
    encrypted.phone = encryptPhoneNumber(encrypted.phone);
  }
  
  if (encrypted.parent_phone) {
    encrypted.parent_phone = encryptPhoneNumber(encrypted.parent_phone);
  }
  
  if (encrypted.parent_name) {
    encrypted.parent_name = encrypt(encrypted.parent_name);
  }
  
  // Mark encrypted fields
  encrypted._encrypted = ['phone', 'parent_phone', 'parent_name'];
  
  return encrypted;
}

// Decrypt sensitive student information
export function decryptStudentPII(encryptedStudentData: any): any {
  const decrypted = { ...encryptedStudentData };
  const encryptedFields = decrypted._encrypted || [];
  
  // Decrypt sensitive fields
  if (encryptedFields.includes('phone') && decrypted.phone) {
    decrypted.phone = decryptPhoneNumber(decrypted.phone);
  }
  
  if (encryptedFields.includes('parent_phone') && decrypted.parent_phone) {
    decrypted.parent_phone = decryptPhoneNumber(decrypted.parent_phone);
  }
  
  if (encryptedFields.includes('parent_name') && decrypted.parent_name) {
    decrypted.parent_name = decrypt(decrypted.parent_name);
  }
  
  // Remove encryption marker
  delete decrypted._encrypted;
  
  return decrypted;
}

// Data masking for logs (prevent sensitive data exposure)
export function maskSensitiveData(data: any): any {
  if (typeof data !== 'object' || data === null) {
    return data;
  }
  
  const masked = Array.isArray(data) ? [...data] : { ...data };
  
  // Mask common sensitive fields
  const sensitiveFields = [
    'password', 'token', 'secret', 'key', 'phone', 'parent_phone',
    'parent_name', 'identification', 'ssn', 'credit_card'
  ];
  
  function maskValue(value: any, field: string): any {
    if (typeof value === 'string') {
      if (field.includes('phone')) {
        return value.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
      } else if (field.includes('name')) {
        return value.substring(0, 1) + '*'.repeat(value.length - 1);
      } else {
        return '***MASKED***';
      }
    }
    return '***MASKED***';
  }
  
  function maskObject(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(item => maskObject(item));
    }
    
    if (typeof obj === 'object' && obj !== null) {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();
        const isSensitive = sensitiveFields.some(field => lowerKey.includes(field));
        
        if (isSensitive && value) {
          result[key] = maskValue(value, lowerKey);
        } else if (typeof value === 'object') {
          result[key] = maskObject(value);
        } else {
          result[key] = value;
        }
      }
      return result;
    }
    
    return obj;
  }
  
  return maskObject(masked);
}

// Verify data integrity using HMAC
export function createHMAC(data: string): string {
  const key = getEncryptionKey();
  return crypto.createHmac('sha256', key).update(data).digest('hex');
}

export function verifyHMAC(data: string, hmac: string): boolean {
  const expectedHMAC = createHMAC(data);
  return crypto.timingSafeEqual(Buffer.from(hmac, 'hex'), Buffer.from(expectedHMAC, 'hex'));
}
