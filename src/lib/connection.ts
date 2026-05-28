import * as dgram from 'node:dgram';
import { EventEmitter } from 'node:events';
import { encryptV1, decryptV1, defaultKey, defaultKeyGCM, encryptV2, decryptV2 } from './encryptor';

const commandsMap: Record<string, string> = {
    bind: 'bindok',
    status: 'dat',
    cmd: 'res',
};

/**
 *
 */
export class Connection extends EventEmitter {
    private requestTimeoutMs: number;
    private logger: ioBroker.Logger;
    private socket: dgram.Socket;
    private socketScan: dgram.Socket;
    private devices: Record<string, string | Buffer> = {};
    private deviceEncVer: Record<string, 1 | 2> = {};

    /**
     *
     */
    constructor(address: string, logger: ioBroker.Logger, requestTimeoutMs = 1000) {
        super();
        this.logger = logger;
        this.requestTimeoutMs = requestTimeoutMs;
        this.socket = dgram.createSocket('udp4');
        this.socketScan = dgram.createSocket('udp4');

        this.socketScan.on('message', this.handleResponse.bind(this));

        this.socketScan.on('listening', () => {
            const socketAddress = this.socketScan.address();
            this.logger.info(`Socket server is listening on ${socketAddress.address}:${socketAddress.port}`);
            this.scan(address);
        });

        this.socket.on('error', error => {
            this.logger.error(error.message);
        });
        this.socketScan.on('error', error => {
            this.logger.error(error.message);
        });

        this.socket.bind();
        this.socketScan.bind();
    }

    /**
     *
     */
    registerKey(deviceId: string, key: string | Buffer): void {
        this.logger.debug(`Registering key: ${deviceId} - ${key}`);
        this.devices[deviceId] = key;
    }

    /**
     *
     */
    getEncryptionKey(deviceId: string): string | Buffer {
        return this.devices[deviceId] || defaultKey;
    }

    /**
     *
     */
    registerEncVersion(deviceId: string, encVer: 1 | 2): void {
        this.logger.debug(`Registering encVer: ${deviceId} - ${encVer}`);
        this.deviceEncVer[deviceId] = encVer;
    }

    /**
     *
     */
    getEncVersion(deviceId: string): 1 | 2 {
        return this.deviceEncVer[deviceId] || 1;
    }

    /**
     *
     */
    scan(ipAddresses: string): void {
        const message = Buffer.from(JSON.stringify({ cid: 'app', t: 'scan', i: 1, uid: 0 }));
        ipAddresses.split(';').forEach(deviceAddress => {
            this.logger.debug(`Test address ${deviceAddress} for available device with message: ${message}`);
            this.socketScan.send(message, 0, message.length, 7000, deviceAddress);
        });
    }

    /**
     *
     */
    async sendRequest(
        address: string,
        port: number,
        payload: Record<string, unknown>,
        encVersion?: 1 | 2,
    ): Promise<Record<string, unknown>> {
        return new Promise((resolve, reject) => {
            let requestTimeout: NodeJS.Timeout;
            try {
                const key = this.getEncryptionKey(address);
                const effectiveEncVersion: 1 | 2 = encVersion ?? this.getEncVersion(address);

                let pack: string;
                let tag: string | undefined;

                if (effectiveEncVersion === 1) {
                    pack = encryptV1(payload, key);
                } else {
                    const { encPack, encTag } = encryptV2(payload, key as Buffer);
                    pack = encPack;
                    tag = encTag;
                }

                this.logger.debug(`Payload: ${JSON.stringify(payload)}`);
                this.logger.debug(`key: ${key}`);
                this.logger.debug(`pack: ${pack}`);
                this.logger.debug(`tag: ${tag}`);
                this.logger.debug(`encVersion: ${effectiveEncVersion}`);

                const request = {
                    cid: 'app',
                    i: payload.t === 'bind' ? 1 : key === defaultKey ? 1 : 0,
                    t: 'pack',
                    uid: 0,
                    tcid: payload.mac,
                    pack,
                    tag,
                };

                const messageHandler = (msg: Buffer, rinfo: dgram.RemoteInfo): void => {
                    const message = JSON.parse(msg.toString()) as Record<string, unknown>;
                    this.logger.debug(
                        `Received message from ${message.cid} (${rinfo.address}:${rinfo.port}) ${msg.toString()} - ${JSON.stringify(rinfo)}`,
                    );

                    if (rinfo.address !== address || rinfo.port !== port) {
                        return;
                    }

                    const decKey = this.getEncryptionKey(rinfo.address);
                    const decTag = message.tag as string | undefined;
                    let resolvedEncVersion: 1 | 2 = decTag != undefined ? 2 : 1;
                    if (resolvedEncVersion === 2) {
                        this.registerEncVersion(rinfo.address, resolvedEncVersion);
                    } else {
                        resolvedEncVersion = this.getEncVersion(rinfo.address);
                    }

                    this.logger.debug(`decKey: ${decKey}`);
                    this.logger.debug(`decTag: ${decTag}`);
                    this.logger.debug(`encVersion: ${resolvedEncVersion}`);

                    let response: Record<string, unknown>;
                    try {
                        if (resolvedEncVersion === 1) {
                            response = decryptV1(message.pack as string, decKey) as Record<string, unknown>;
                        } else {
                            response = decryptV2(message.pack as string, decKey as Buffer, decTag) as Record<
                                string,
                                unknown
                            >;
                        }
                        this.logger.debug(`sendRequest - Response data: ${JSON.stringify(response)}`);
                    } catch (e) {
                        this.logger.error(
                            `Can not decrypt message from ${message.cid} (${rinfo.address}:${rinfo.port}) with key ${decKey} and tag ${decTag}`,
                        );
                        this.logger.error((e as Error).stack ?? String(e));
                        return;
                    }

                    if (response.t !== commandsMap[payload.t as string]) {
                        this.logger.debug(`No matching command: ${response.t}`);
                        return;
                    }

                    if (response.mac !== payload.mac) {
                        this.logger.debug(`No matching mac ${response.mac} - ${payload.mac}`);
                        return;
                    }

                    this.socket.off('message', messageHandler);
                    clearTimeout(requestTimeout);
                    resolve(response);
                };

                this.logger.debug(`Sending request to ${address}:${port}: ${JSON.stringify(request)}`);
                this.socket.on('message', messageHandler);

                const toSend = Buffer.from(JSON.stringify(request));
                this.socket.send(toSend, 0, toSend.length, port, address);

                requestTimeout = setTimeout(() => {
                    this.socket.off('message', messageHandler);
                    clearTimeout(requestTimeout);
                    reject(new Error(`Request to ${address}:${port} timed out`));
                }, this.requestTimeoutMs);
            } catch (e) {
                this.logger.error((e as Error).stack ?? String(e));
                reject(e instanceof Error ? e : new Error(String(e)));
            }
        });
    }

    /**
     *
     */
    close(): void {
        this.socket.close();
        this.socketScan.close();
    }

    /**
     *
     */
    handleResponse(msg: Buffer, rinfo: dgram.RemoteInfo): void {
        let message: Record<string, unknown>;

        try {
            message = JSON.parse(msg.toString()) as Record<string, unknown>;
        } catch {
            this.logger.error(`Device ${rinfo.address}:${rinfo.port} sent invalid JSON that can not be parsed`);
            this.logger.debug(String(msg));
            return;
        }

        const tag = message.tag as string | undefined;
        const encVersion: 1 | 2 = tag != undefined ? 2 : 1;
        const key = encVersion === 1 ? defaultKey : defaultKeyGCM;

        this.logger.silly(`key: ${key}`);
        this.logger.silly(`tag: ${tag}`);
        this.logger.silly(`encVersion: ${encVersion}`);

        let response: Record<string, unknown>;
        try {
            if (encVersion === 1) {
                response = decryptV1(message.pack as string, key) as Record<string, unknown>;
            } else {
                response = decryptV2(message.pack as string, key, tag) as Record<string, unknown>;
            }
            this.logger.debug(`handleResponse - Response data: ${JSON.stringify(response)}`);
        } catch (e) {
            this.logger.error(
                `handleResponse - Can not decrypt message from ${message.cid} (${rinfo.address}:${rinfo.port}) with key ${key} and tag ${tag}`,
            );
            this.logger.error((e as Error).stack ?? String(e));
            return;
        }

        this.emit(response.t, response, rinfo, encVersion);
    }
}
