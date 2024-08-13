// import { send } from 'process';

const { expect } = require('chai');
const sinon = require('sinon');
const Connection = require('../../lib/connection');

describe('Connection', () => {
    let connection;
    let logger;

    beforeEach(() => {
        logger = {
            info: sinon.stub(),
            error: sinon.stub(),
            debug: sinon.stub(),
        };
        connection = new Connection('127.0.0.1', logger);
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should register a key for a device', () => {
        const deviceId = 'device1';
        const key = 'key1';

        connection.registerKey(deviceId, key);

        expect(connection.getEncryptionKey(deviceId)).to.equal(key);
    });

    it('should return the default key for an unknown device', () => {
        const deviceId = 'unknownDevice';

        expect(connection.getEncryptionKey(deviceId)).to.equal('defaultKey');
    });

    it('should send a scan request to multiple IP addresses', () => {
        const sendStub = sinon.stub(connection.socket, 'send');
        const ipAddresses = '192.168.0.1;192.168.0.2;192.168.0.3';

        connection.scan(ipAddresses);

        expect(sendStub.callCount).to.equal(3);
        expect(sendStub.getCall(0).args[3]).to.equal(7000);
        expect(sendStub.getCall(0).args[4]).to.equal('192.168.0.1');
        expect(sendStub.getCall(1).args[3]).to.equal(7000);
        expect(sendStub.getCall(1).args[4]).to.equal('192.168.0.2');
        expect(sendStub.getCall(2).args[3]).to.equal(7000);
        expect(sendStub.getCall(2).args[4]).to.equal('192.168.0.3');
    });

    it('should send a request and resolve with the response', async () => {
        const response = {
            t: 'res',
            mac: 'device1',
            // other properties
        };
        const payload = {
            t: 'cmd',
            mac: 'device1',
            // other properties
        };

        const socket = {
            on: sinon.stub().callsFake(async (event, callback) => {
                await callback(response);
            }),
            send: sinon.stub(),
            address: sinon.stub().returns('127.0.0.1')
        };

        connection.socket = socket;

        const promise = connection.sendRequest('127.0.0.1', 7000, 'a3K8Bx%2r8Y7#xDh', payload);

        // Simulate receiving a response
        connection.handleResponse(JSON.stringify({ pack: response }), { address: '127.0.0.1', port: 7000 });

        const result = await promise;

        expect(socket.send.calledOnce).to.be.true;
        expect(result).to.deep.equal(response);
    });

//     it('should send a request and reject with an error if timed out', async () => {
//         const sendStub = sinon.stub(connection.socket, 'send');
//         const payload = {
//             t: 'cmd',
//             mac: 'device1',
//             // other properties
//         };

//         const promise = connection.sendRequest('127.0.0.1', 7000, 'a3K8Bx%2r8Y7#xDh', payload);

//         // Simulate timeout
//         await new Promise((resolve) => setTimeout(resolve, 2000));

//         try {
//             await promise;
//         } catch (error) {
//             expect(sendStub.calledOnce).to.be.false;
//             expect(error.message).to.equal('Request to 127.0.0.1:7000 timed out');
//         }
//     });

//     // Add more tests as needed
});