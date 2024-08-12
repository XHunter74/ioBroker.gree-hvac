const EventEmitter = require('events');
const Connection = require('./connection');
const { defaultKey } = require('./encryptor');
const TEMPERATURE_SENSOR_OFFSET = -40;

// https://github.com/tomikaa87/gree-remote
const statusKeys = [
    'Pow', 'Mod', 'TemUn', 'SetTem', 'TemRec', 'WdSpd', 'Air',
    'Blo', 'Health', 'SwhSlp', 'Lig', 'SwingLfRig', 'SwUpDn',
    'Quiet', 'Tur', 'SvSt', 'TemSen', 'time'
];

const DeviceScanTimeoutMs = 5000;

class DeviceManager extends EventEmitter {

    logger;

    constructor(devicesList, logger) {
        super();
        this.logger = logger;
        this.connection = new Connection(devicesList, logger);
        this.devices = {};
        this.rescanDevices(devicesList);
        this.connection.on('dev', this._registerDevice.bind(this));
    }

    rescanDevices(devicesList) {
        const rescanTimeout = setTimeout(() => {
            const items = devicesList.split(';');
            const readyDevices = Object.keys(this.devices).map((key) => this.devices[key].address);
            const rescanItems = items.filter((item) => !readyDevices.includes(item));
            if (rescanItems.length === 0) {
                return;
            }
            const addresses = rescanItems.join(';');
            try {
                this.connection.scan(addresses);
            } catch { } // eslint-disable-line no-empty
            clearTimeout(rescanTimeout);
            this.rescanDevices(devicesList);
        }, DeviceScanTimeoutMs);
    }

    async _registerDevice(message, rinfo) {
        const deviceId = message.cid || message.mac;
        this.logger.info(`New device found: ${message.name} (mac: ${deviceId}), binding...`);
        const { address, port } = rinfo;

        try {
            const { key } = await this.connection.sendRequest(address, port, defaultKey, {
                mac: deviceId,
                t: 'bind',
                uid: 0
            });
            const device = {
                ...message,
                address,
                port,
                key,
                t: undefined
            };

            this.devices[deviceId] = device;

            this.connection.registerKey(rinfo.address, key);

            this.emit('device_bound', deviceId, device);
            this.logger.info(`New device bound: ${device.name} (${device.address}:${device.port})`);

            return device;
        } catch(error) {
            this.logger.error(`Failed to bind device ${deviceId}: ${error.message}`);
            return null;
        }
    }

    getDevices() {
        return Object.values(this.devices);
    }

    async getDeviceStatus(deviceId) {
        const device = this.devices[deviceId];

        if (!device) {
            throw new Error(`Device ${deviceId} not found`);
        }

        const payload = {
            cols: statusKeys,
            mac: device.mac,
            t: 'status'
        };

        const response = await this.connection.sendRequest(device.address, device.port, device.key, payload);
        const deviceStatus = response.cols.reduce((acc, key, index) => ({
            ...acc,
            [key]: response.dat[index]
        }), {});

        if ('TemSen' in deviceStatus) {
            deviceStatus['TemSen'] += TEMPERATURE_SENSOR_OFFSET;
        }

        this.emit('device_status', deviceId, deviceStatus);
        return deviceStatus;
    }

    async setDeviceState(deviceId, state) {
        const device = this.devices[deviceId];

        if (!device) {
            return null;
        }

        const payload = {
            mac: device.mac,
            opt: Object.keys(state),
            p: Object.values(state),
            t: 'cmd'
        };

        const response = await this.connection.sendRequest(device.address, device.port, device.key, payload);
        const deviceStatus = response.opt.reduce((acc, key, index) => ({
            ...acc,
            [key]: response.p[index]
        }), {});

        this.emit('device_status', deviceId, deviceStatus);
        return deviceStatus;
    }
}

module.exports = DeviceManager;
