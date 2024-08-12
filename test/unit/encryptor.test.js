const { expect } = require('chai');

describe('Encrypt and Decrypt data using  AES-128-ECB', () => {
    const { encrypt, decrypt } = require('../../lib/encryptor');
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
        const encryptedData = encrypt(data);
        expect(encryptedData).to.deep.equal(expectedEncryptedData);
    });

    it('should decrypt the data correctly', () => {
        const decryptedData = decrypt(expectedEncryptedData);
        expect(decryptedData).to.deep.equal(data);
    });
});