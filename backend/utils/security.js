const crypto = require('crypto');

// Clave de cifrado (debe estar en variables de entorno en producción)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const TAG_LENGTH = 16;

/**
 * Cifrar datos usando AES-256-GCM
 * @param {string} text - Texto a cifrar
 * @returns {string} Texto cifrado en formato base64
 */
function encrypt(text) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const salt = crypto.randomBytes(SALT_LENGTH);
    const key = crypto.pbkdf2Sync(ENCRYPTION_KEY, salt, 100000, 32, 'sha256');
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Combinar salt, iv, authTag y encrypted
    const combined = Buffer.concat([
        salt,
        iv,
        authTag,
        Buffer.from(encrypted, 'hex')
    ]);
    
    return combined.toString('base64');
}

/**
 * Descifrar datos usando AES-256-GCM
 * @param {string} encryptedText - Texto cifrado en formato base64
 * @returns {string} Texto descifrado
 */
function decrypt(encryptedText) {
    const combined = Buffer.from(encryptedText, 'base64');
    
    const salt = combined.slice(0, SALT_LENGTH);
    const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const authTag = combined.slice(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    const encrypted = combined.slice(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    
    const key = crypto.pbkdf2Sync(ENCRYPTION_KEY, salt, 100000, 32, 'sha256');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, null, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
}

/**
 * Generar hash SHA-256 para integridad de datos
 * @param {string} data - Datos a hashear
 * @returns {string} Hash en formato hexadecimal
 */
function hashData(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Verificar integridad de datos
 * @param {string} data - Datos originales
 * @param {string} hash - Hash a verificar
 * @returns {boolean} True si el hash es válido
 */
function verifyHash(data, hash) {
    const computedHash = hashData(data);
    return computedHash === hash;
}

/**
 * Generar token aleatorio
 * @param {number} length - Longitud del token en bytes
 * @returns {string} Token en formato hexadecimal
 */
function generateToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
}

/**
 * Sanitizar input para prevenir XSS
 * @param {string} input - Input a sanitizar
 * @returns {string} Input sanitizado
 */
function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}

/**
 * Validar email
 * @param {string} email - Email a validar
 * @returns {boolean} True si es válido
 */
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validar teléfono (solo números)
 * @param {string} phone - Teléfono a validar
 * @returns {boolean} True si es válido
 */
function validatePhone(phone) {
    const phoneRegex = /^\d{10,15}$/;
    return phoneRegex.test(phone);
}

/**
 * Generar par de claves RSA para firmas digitales
 * @returns {Object} Par de claves (publicKey, privateKey)
 */
function generateKeyPair() {
    return crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem'
        }
    });
}

/**
 * Firmar datos con clave privada RSA
 * @param {string} data - Datos a firmar
 * @param {string} privateKey - Clave privada en formato PEM
 * @returns {string} Firma en formato base64
 */
function signData(data, privateKey) {
    const sign = crypto.createSign('sha256');
    sign.update(data);
    sign.end();
    return sign.sign(privateKey, 'base64');
}

/**
 * Verificar firma con clave pública RSA
 * @param {string} data - Datos originales
 * @param {string} signature - Firma en formato base64
 * @param {string} publicKey - Clave pública en formato PEM
 * @returns {boolean} True si la firma es válida
 */
function verifySignature(data, signature, publicKey) {
    const verify = crypto.createVerify('sha256');
    verify.update(data);
    verify.end();
    return verify.verify(publicKey, signature, 'base64');
}

module.exports = {
    encrypt,
    decrypt,
    hashData,
    verifyHash,
    generateToken,
    sanitizeInput,
    validateEmail,
    validatePhone,
    generateKeyPair,
    signData,
    verifySignature
};
