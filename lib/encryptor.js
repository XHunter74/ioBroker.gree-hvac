const crypto = require('crypto');

const defaultKey = 'a3K8Bx%2r8Y7#xDh';
const defaultKeyGCM = Buffer.from('7B7978414841595F4C6D367062432F3C', "hex") //'{yxAHAY_Lm6pbC/<';

const ECB_ALG = 'aes-128-ecb';

const GCM_ALG = 'aes-128-gcm';
const GCM_NONCE = Buffer.from('5440784449675a516c5e6313',"hex"); //'\x54\x40\x78\x44\x49\x67\x5a\x51\x6c\x5e\x63\x13';
const GCM_AEAD = Buffer.from('qualcomm-test');

function encryptGCM(data, key = defaultKeyGCM) {
    const cipher = crypto.createCipheriv(GCM_ALG, key, GCM_NONCE);
    cipher.setAAD(GCM_AEAD);
    const str = cipher.update(JSON.stringify(data), 'utf8', 'base64');
    const encPack = str + cipher.final('base64');
    const rawTag = cipher.getAuthTag();
    const encTag = rawTag.toString('base64').toString("utf-8");
    return {encPack, encTag};
}

function decryptGCM(data, key = defaultKeyGCM, tag) {
    const decipher = crypto.createDecipheriv(GCM_ALG, key, GCM_NONCE);
    decipher.setAAD(GCM_AEAD);
    if (tag) {
        const decTag = Buffer.from(tag, 'base64');
        decipher.setAuthTag(decTag);
    }
    const str = decipher.update(data, 'base64', 'utf8');
    const response = JSON.parse(str + decipher.final('utf8'));

    return response;
}

function encrypt(data, key = defaultKey) {
    const cipher = crypto.createCipheriv(ECB_ALG, key, '');
    const str = cipher.update(JSON.stringify(data), 'utf8', 'base64');
    const pack = str + cipher.final('base64');
    return pack;
}

function decrypt(data, key = defaultKey) {
    const decipher = crypto.createDecipheriv(ECB_ALG, key, '');
    const str = decipher.update(data, 'base64', 'utf8');
    const response = JSON.parse(str + decipher.final('utf8'));

    return response;
}

module.exports = {
    defaultKey,
    defaultKeyGCM,
    encrypt,
    decrypt,
    encryptGCM,
    decryptGCM
};