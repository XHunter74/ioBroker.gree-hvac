import { EventEmitter } from 'node:events';
import type * as dgram from 'node:dgram';
import { Connection } from './connection';
import { defaultKey, defaultKeyGCM } from './encryptor';
import type { Device, DeviceStatus } from './types';

// https://github.com/tomikaa87/gree-remote
const statusKeys = [
    'Pow',
    'Mod',
    'TemUn',
    'SetTem',
    'TemRec',
    'WdSpd',
    'Air',
    'Blo',
    'Health',
    'SwhSlp',
    'Lig',
    'SwingLfRig',
    'SwUpDn',
    'Quiet',
    'Tur',
    'StHt',
    'SvSt',
    'TemSen',
    'time',
];

const TEMPERATURE_SENSOR_OFFSET = -40;
const DeviceScanTimeoutMs = 5000;

/**
 *
 */
export class DeviceManager extends EventEmitter {
    private logger: ioBroker.Logger;
    private connection: Connection;
    private devices: Record<string, Device> = {};

    /**
     *
     */
    constructor(devicesList: string, logger: ioBroker.Logger, requestTimeoutMs = 1000) {
        super();
        this.logger = logger;
        this.connection = new Connection(devicesList, logger, requestTimeoutMs);
        this.rescanDevices(devicesList);
        this.connection.on('dev', this._registerDevice.bind(this));
    }

    /**
     *
     */
    rescanDevices(devicesList: string): void {
        const rescanTimeout = setTimeout(() => {
            const items = devicesList.split(';');
            const readyDevices = Object.keys(this.devices).map(key => this.devices[key].address);
            const rescanItems = items.filter(item => !readyDevices.includes(item));
            if (rescanItems.length === 0) {
                return;
            }
            const addresses = rescanItems.join(';');
            try {
                this.connection.scan(addresses);
            } catch {
                /* ignore scan errors */
            }
            clearTimeout(rescanTimeout);
            this.rescanDevices(devicesList);
        }, DeviceScanTimeoutMs);
    }

    /**
     *
     */
    async sendRegisterDevice(
        message: Record<string, unknown>,
        rinfo: dgram.RemoteInfo,
        encVersion: 1 | 2,
    ): Promise<Device | null> {
        const deviceId = (message.cid || message.mac) as string;
        this.logger.info(`New device found: ${message.name} (mac: ${deviceId}), binding encVer ${encVersion}...`);
        const { address, port } = rinfo;

        try {
            const response = await this.connection.sendRequest(
                address,
                port,
                {
                    cid: 'app',
                    tcid: deviceId,
                    mac: deviceId,
                    t: 'bind',
                    uid: 0,
                },
                encVersion,
            );

            const key = response.key;

            if (key) {
                const device: Device = {
                    ...message,
                    mac: message.mac as string,
                    name: message.name as string,
                    address,
                    port,
                    key: key as string,
                    encVersion,
                };

                this.devices[deviceId] = device;
                this.connection.registerKey(rinfo.address, key as string | Buffer);
                this.connection.registerEncVersion(address, encVersion);

                this.emit('device_bound', deviceId, device);
                this.logger.info(
                    `New device bound: ${device.name} (${device.address}:${device.port}) with encryption v${encVersion}`,
                );

                return device;
            }
            return null;
        } catch (e) {
            this.logger.error(`Failed to bind device ${deviceId}: ${(e as Error).message}`);
            this.logger.error((e as Error).stack ?? String(e));
            return null;
        }
    }

    /**
     *
     */
    async _registerDevice(
        message: Record<string, unknown>,
        rinfo: dgram.RemoteInfo,
    ): Promise<Device | null | undefined> {
        let encVersion = this.connection.getEncVersion(rinfo.address);
        let device: Device | null;
        try {
            device = await this.sendRegisterDevice(message, rinfo, encVersion);
            if (!device) {
                this.logger.info('Registering failed, trying next encVer...');
                this.connection.registerEncVersion(rinfo.address, ((encVersion % 2) + 1) as 1 | 2);
                encVersion = this.connection.getEncVersion(rinfo.address);
                if (encVersion === 1) {
                    this.connection.registerKey(rinfo.address, defaultKey);
                } else if (encVersion === 2) {
                    this.connection.registerKey(rinfo.address, defaultKeyGCM);
                }
                device = await this.sendRegisterDevice(message, rinfo, encVersion);
            }
        } catch (e) {
            this.logger.error((e as Error).stack ?? String(e));
            return undefined;
        }
        return device;
    }

    /**
     *
     */
    close(): void {
        this.connection.close();
    }

    /**
     *
     */
    getDevices(): Device[] {
        return Object.values(this.devices);
    }

    /**
     *
     */
    async getDeviceStatus(deviceId: string): Promise<DeviceStatus> {
        const device = this.devices[deviceId];

        if (!device) {
            throw new Error(`Device ${deviceId} not found`);
        }

        const payload = {
            cols: statusKeys,
            mac: device.mac,
            t: 'status',
        };

        const response = await this.connection.sendRequest(device.address, device.port, payload);
        const cols = response.cols as string[];
        const dat = response.dat as (number | string | boolean)[];

        const deviceStatus: DeviceStatus = cols.reduce(
            (acc, key, index) => ({
                ...acc,
                [key]: dat[index],
            }),
            {},
        );

        if ('TemSen' in deviceStatus) {
            deviceStatus.TemSen = (deviceStatus.TemSen as number) + TEMPERATURE_SENSOR_OFFSET;
        }

        this.emit('device_status', deviceId, deviceStatus);
        return deviceStatus;
    }

    /**
     *
     */
    async setDeviceState(
        deviceId: string,
        state: Record<string, number | string | boolean>,
    ): Promise<DeviceStatus | null> {
        const device = this.devices[deviceId];

        if (!device) {
            return null;
        }

        const payload = {
            mac: device.mac,
            opt: Object.keys(state),
            p: Object.values(state),
            t: 'cmd',
        };

        const response = await this.connection.sendRequest(device.address, device.port, payload);
        const opt = response.opt as string[];
        const p = response.p as (number | string | boolean)[];

        const deviceStatus: DeviceStatus = opt.reduce(
            (acc, key, index) => ({
                ...acc,
                [key]: p[index],
            }),
            {},
        );

        this.emit('device_status', deviceId, deviceStatus);
        return deviceStatus;
    }
}
