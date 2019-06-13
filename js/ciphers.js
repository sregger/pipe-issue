const b64u = require('b64u');
const crypto = require('crypto');

const algorithm = 'aes-256-gcm';

exports.createCipher = () => {
    const key = new Buffer(crypto.randomBytes(32), 'utf8');
    const iv = new Buffer(crypto.randomBytes(16), 'utf8');
    const encrypter = crypto.createCipheriv(algorithm, key, iv);
    encrypter.key = key;
    encrypter.iv = iv;
    return encrypter;
}

exports.createDecipher = (key, iv, tag) => {
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    // Must be set before any decryption occurs
    decipher.setAuthTag(tag);
    return decipher;
}