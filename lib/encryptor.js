const crypto = require('crypto');

const defaultKeyV1 = 'a3K8Bx%2r8Y7#xDh';
const defaultKeyV2 = '{yxAHAY_Lm6pbC/<';
//'\x54\x40\x78\x44\x49\x67\x5a\x51\x6c\x5e\x63\x13'
const gcvIv = new Uint8Array([
    54, 40, 78, 44, 49, 67, 90, 81, 108, 94, 99, 19
]);

const gcmAead = 'qualcomm-test';

function encrypt(data, key = defaultKeyV1) {
    const cipher = crypto.createCipheriv('aes-128-ecb', key, '');
    const str = cipher.update(JSON.stringify(data), 'utf8', 'base64');
    const request = str + cipher.final('base64');
    return request;
}

function encryptV2(data, key = defaultKeyV2) {
    const cipher = crypto.createCipheriv('aes-128-gcm', key, gcvIv);
    const str = cipher.update(JSON.stringify(data), 'utf8', 'base64');
    const request = str + cipher.final('base64');
    return request;
}

function decrypt(data, key = defaultKeyV1) {
    const decipher = crypto.createDecipheriv('aes-128-ecb', key, '');
    const str = decipher.update(data, 'base64', 'utf8');
    const response = JSON.parse(str + decipher.final('utf8'));

    return response;
}

function decryptV2(data, key = defaultKeyV2) {
    const decipher = crypto.createDecipheriv('aes-128-gcm', key, gcvIv);
    const str = decipher.update(data, 'base64', 'utf8');
    const response = JSON.parse(str);

    return response;
}

module.exports = {
    defaultKey: defaultKeyV1,
    encrypt,
    decrypt,
    encryptV2,
    decryptV2
};