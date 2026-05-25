import assert from 'node:assert/strict';
import { encryptV1, decryptV1, encryptV2, decryptV2, defaultKeyGCM } from '../../build/lib/encryptor.js';

describe('Encrypt and Decrypt data using AES-128-ECB', () => {
    const expectedEncryptedData = 'LP24Ek0OaYogxs3iQLjL4CVWHqmPoWzCNdstE6VtRN5YT1PXPBDouOPiWHaG4G8lz22fUZtUbkblUYF5BzlKDV9xeQzMlsaP4RKBtrnsDrPgJXA+/2/qaGLK2Z7N/04mLjfzIBDIkDxmTYsl4aiW1+80HbfgK3MNVtBb+mRtQFwvWGtrb35TAKQLbuUeHhrjkywWYwaOwxo65kKReDaAYU+t/W6ao6KLeI6AQs8sVr6ZbdEmdMsvWjDwsWTPw4iozbbXHI8ghbocDlA7fUL03g==';

    const data = {
        t: "dev",
        cid: "502cc605d5a1",
        bc: "gree",
        brand: "gree",
        catalog: "gree",
        mac: "502cc605d5a1",
        mid: "3018",
        model: "gree",
        name: "c605d5a1",
        series: "gree",
        vender: "1",
        ver: "V1.0.0.0",
        lock: 0
    };

    it('should encrypt the data correctly', () => {
        const encryptedData = encryptV1(data);
        assert.deepStrictEqual(encryptedData, expectedEncryptedData);
    });

    it('should decrypt the data correctly', () => {
        const decryptedData = decryptV1(expectedEncryptedData);
        assert.deepStrictEqual(decryptedData, data);
    });
});

describe('Encrypt and Decrypt data using AES-128-GCM', () => {
    const expectedEncryptedData = 'JtoKliwtrZWlpNCVOSARFZVjvdMQgUTwMFEwCLvahOTTdG5N10M5OI3w9aCGCJffjfuyCITofrMT4JbII6+A1+2Qyk7gfwk5dZR2EayhdZgEoOSGGofp1NG7sM5o7a8eFq+2oChWDqTBGSbpwgXi7D3lH3MHl69lO9CHVqNeh4BiujYkVwS8ZeC2r1srS6O8i+ryGhedh+q+4CvnkIN+M2+73Ds6jUrdpcHFeTxudL18EfiO0s52M78lga9J8AtcIaaDqvM0';
    const expectedEncryptedTag = '596Gsbo+odGTNGIgr+YVFQ==';

    const data = {
        t: "dev",
        cid: "502cc605d5a1",
        bc: "gree",
        brand: "gree",
        catalog: "gree",
        mac: "502cc605d5a1",
        mid: "3018",
        model: "gree",
        name: "c605d5a1",
        series: "gree",
        vender: "1",
        ver: "V1.0.0.0",
        lock: 0
    };

    it('should encrypt the data correctly', () => {
        const encryptedData = encryptV2(data);
        assert.deepStrictEqual(encryptedData.encPack, expectedEncryptedData);
        assert.deepStrictEqual(encryptedData.encTag, expectedEncryptedTag);
    });

    it('should decrypt the data correctly', () => {
        const decryptedData = decryptV2(expectedEncryptedData, defaultKeyGCM, expectedEncryptedTag);
        assert.deepStrictEqual(decryptedData, data);
    });
});
