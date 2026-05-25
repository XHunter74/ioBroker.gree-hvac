import * as crypto from 'node:crypto';

export const defaultKey = Buffer.from('a3K8Bx%2r8Y7#xDh', 'utf8');
export const defaultKeyGCM = Buffer.from('{yxAHAY_Lm6pbC/<', 'utf8');

const ECB_ALG = 'aes-128-ecb';
const GCM_ALG = 'aes-128-gcm';

const GCM_NONCE = Buffer.from('5440784449675a516c5e6313', 'hex');
const GCM_AEAD = Buffer.from('qualcomm-test');

export interface EncryptV2Result {
    encPack: string;
    encTag: string;
}

export function encryptV2(data: unknown, key: Buffer = defaultKeyGCM): EncryptV2Result {
    const cipher = crypto.createCipheriv(GCM_ALG, key, GCM_NONCE);
    cipher.setAAD(GCM_AEAD);
    const str = cipher.update(JSON.stringify(data), 'utf8', 'base64');
    const encPack = str + cipher.final('base64');
    const rawTag = cipher.getAuthTag();
    const encTag = rawTag.toString('base64').toString();
    return { encPack, encTag };
}

export function decryptV2(data: string, key: Buffer = defaultKeyGCM, tag?: string): unknown {
    const decipher = crypto.createDecipheriv(GCM_ALG, key, GCM_NONCE);
    decipher.setAAD(GCM_AEAD);
    if (tag) {
        const decTag = Buffer.from(tag, 'base64');
        decipher.setAuthTag(decTag);
    }
    const str = decipher.update(data, 'base64', 'utf8');
    return JSON.parse(str + decipher.final('utf8'));
}

export function encryptV1(data: unknown, key: string | Buffer = defaultKey): string {
    const cipher = crypto.createCipheriv(ECB_ALG, key, '');
    const str = cipher.update(JSON.stringify(data), 'utf8', 'base64');
    return str + cipher.final('base64');
}

export function decryptV1(data: string, key: string | Buffer = defaultKey): unknown {
    const decipher = crypto.createDecipheriv(ECB_ALG, key, '');
    const str = decipher.update(data, 'base64', 'utf8');
    return JSON.parse(str + decipher.final('utf8'));
}
