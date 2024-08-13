const { expect } = require('chai');

describe('Encrypt and Decrypt data using AES-128-ECB', () => {
    const { encryptV1, decryptV1, defaultKeyGCM } = require('../../lib/encryptor');
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
        expect(encryptedData).to.deep.equal(expectedEncryptedData);
    });

    it('should decrypt the data correctly', () => {
        const decryptedData = decryptV1(expectedEncryptedData);
        expect(decryptedData).to.deep.equal(data);
    });
});

describe('Encrypt and Decrypt data using AES-128-GCM', () => {
    const { encryptV2, decryptV2, defaultKeyGCM } = require('../../lib/encryptor');
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
        expect(encryptedData.encPack).to.deep.equal(expectedEncryptedData);
        expect(encryptedData.encTag).to.deep.equal(expectedEncryptedTag);
    });

    it('should decrypt the data correctly', () => {
        const decryptedData = decryptV2(expectedEncryptedData, defaultKeyGCM, expectedEncryptedTag);
        expect(decryptedData).to.deep.equal(data);
    });
});