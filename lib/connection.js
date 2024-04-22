const dgram = require('dgram');
const EventEmitter = require('events');
const { encrypt, decrypt, defaultKey } = require('./encryptor');

const commandsMap = {
    'bind': 'bindok',
    'status': 'dat',
    'cmd': 'res'
};

class Connection extends EventEmitter {

    logger;

    constructor(address, logger) {
        super();
        this.logger = logger;
        this.socket = dgram.createSocket('udp4');
        this.devices = {};

        this.socket.on('message', this.handleResponse.bind(this));

        this.socket.on('listening', () => {
            const socketAddress = this.socket.address();
            this.logger.info(`Socket server is listening on ${socketAddress.address}:${socketAddress.port}`);

            this.scan(address);
        });

        this.socket.on('error', (error) => {
            this.logger.error(error.message);
        });

        this.socket.bind();
    }

    registerKey(deviceId, key) {
        this.devices[deviceId] = key;
    }

    getEncryptionKey(deviceId) {
        return this.devices[deviceId] || defaultKey;
    }

    scan(ipAddresses) {
        const message = Buffer.from(JSON.stringify({ t: 'scan' }));

        ipAddresses.split(';').forEach((deviceAddress) => {
            this.logger.info(`Test address ${deviceAddress} for available device`);
            this.socket.send(message, 0, message.length, 7000, deviceAddress);
        });
    }

    async sendRequest(address, port, key, payload) {
        return new Promise((resolve, _reject) => {
            const request = {
                cid: 'app',
                i: key === defaultKey ? 1 : 0,
                t: 'pack',
                uid: 0,
                pack: encrypt(payload, key)
            };

            const messageHandler = (msg, rinfo) => {
                const message = JSON.parse(msg.toString());
                let response;

                // Check device address data
                if (rinfo.address !== address || rinfo.port !== port) {
                    return;
                }

                this.logger.debug(`Received message from ${message.cid} (${rinfo.address}:${rinfo.port}) ${msg.toString()}`);

                try {
                    response = decrypt(message.pack, key);
                } catch (e) {
                    this.logger.error(`Can not decrypt message from ${message.cid} (${rinfo.address}:${rinfo.port}) with key ${key}`);
                    this.logger.debug(message.pack);
                    return;
                }

                if (response.t !== commandsMap[payload.t]) {
                    return;
                }

                if (response.mac !== payload.mac) {
                    return;
                }

                if (this.socket && this.socket.off) {
                    this.socket.off('message', messageHandler);
                }

                resolve(response);
            };

            this.logger.debug(`Sending request to ${address}:${port}: ${JSON.stringify(payload)}`);

            this.socket.on('message', messageHandler);

            const toSend = Buffer.from(JSON.stringify(request));
            this.socket.send(toSend, 0, toSend.length, port, address);
        });
    }

    handleResponse(msg, rinfo) {
        let message, response;

        try {
            message = JSON.parse(msg.toString());
        } catch {
            this.logger.error(`Device ${rinfo.address}:${rinfo.port} sent invalid JSON that can not be parsed`);
            this.logger.debug(msg);
            return;
        }

        const key = this.getEncryptionKey(rinfo.address);

        try {
            response = decrypt(message.pack, key);
        } catch {
            this.logger.error(`Can not decrypt message from ${message.cid} (${rinfo.address}:${rinfo.port}) with key ${key}`);
            this.logger.debug(message.pack);
            return;
        }

        this.emit(response.t, response, rinfo);
    }
}

module.exports = Connection;
