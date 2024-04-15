'use strict';
const DeviceManager = require('./lib/device_manager');
const proptiesMap = require('./lib/properties_map');

const utils = require('@iobroker/adapter-core');

const MinPollInterval = 1000;
const MaxPollInterval = 60000;

class GreeHvac extends utils.Adapter {

    deviceManager;
    intervals = {};

    /**
     * @param {Partial<utils.AdapterOptions>} [options={}]
     */
    constructor(options) {
        super({
            ...options,
            name: 'gree-hvac',
        });
        this.on('ready', this.onReady.bind(this));
        this.on('stateChange', this.onStateChange.bind(this));
        // this.on('objectChange', this.onObjectChange.bind(this));
        // this.on('message', this.onMessage.bind(this));
        this.on('unload', this.onUnload.bind(this));
    }

    /**
     * Is called when databases are connected and adapter received configuration.
     */
    async onReady() {
        // Initialize your adapter here

        // The adapters config (in the instance object everything under the attribute "native") is accessible via
        // this.config:
        if (!this.config.devicelist) {
            this.log.error('You should config device list in adapter configuration page');
            this.terminate('Device list is empty');
        }
        this.log.info('Device list: ' + this.config.devicelist);
        this.log.info('Poll interval: ' + this.config.pollInterval);

        if (!this.validateIPList(this.config.devicelist)) {
            this.log.error('Invalid device list');
            this.terminate('Invalid device list');
        }

        if (this.config.pollInterval < MinPollInterval || isNaN(this.config.pollInterval) || this.config.pollInterval > MaxPollInterval) {
            this.log.error('Invalid poll interval: ' + this.config.pollInterval);
            this.terminate('Invalid poll interval: ' + this.config.pollInterval);
        }

        this.deviceManager = new DeviceManager(this.config.devicelist, this.log);

        this.deviceManager.on('device_bound', async (deviceId, device) => {
            await this.processDevice(deviceId, device);

            const deviceInterval = setInterval(() => this.getDeviceStatus(deviceId), this.config.pollInterval);
            this.intervals[deviceId] = deviceInterval;
        });
    }

    getDeviceStatus = async (deviceId) => {
        const deviceStatus = await this.deviceManager.getDeviceStatus(deviceId);
        this.processDeviceStatus(deviceId, deviceStatus);
    };

    async processDeviceStatus(deviceId, deviceStatus) {
        for (const key in deviceStatus) {
            if (Object.prototype.hasOwnProperty.call(deviceStatus, key)) {
                const value = deviceStatus[key];
                const mapItem = proptiesMap.find(item => item.hvacName === key);
                if (!mapItem) {
                    this.log.warn(`Property ${key} not found in the map`);
                    continue;
                }
                await this.setStateAsync(`${deviceId}.${mapItem.name}`, { val: value, ack: true });
            }
        }
    }
    async processDevice(deviceId, device) {
        this.log.info(`Device ${deviceId} bound`);

        await this.setObjectNotExistsAsync(deviceId, {
            type: 'state',
            common: {
                name: deviceId,
                type: 'string',
                role: 'variable',
                read: true,
                write: false,
            },
            native: {},
        });

        await this.setStateAsync(deviceId, { val: JSON.stringify(device), ack: true });

        for (const property of proptiesMap) {
            await this.setObjectNotExistsAsync(`${deviceId}.${property.name}`, JSON.parse(property.definition));
        }

        this.subscribeStates(`${deviceId}.*`);

    }

    validateIPList(ipList) {
        // Regular expression for IP address
        const ipPattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

        // Split the list by semicolon
        const ips = ipList.split(';');

        // Validate each IP
        for (const ip of ips) {
            if (!ipPattern.test(ip)) {
                return false;
            }
        }

        // If all IPs are valid
        return true;
    }

    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     * @param {() => void} callback
     */
    onUnload(callback) {
        try {
            for (const deviceId in this.intervals) {
                clearInterval(this.intervals[deviceId]);
            }
            callback();
        } catch (e) {
            callback();
        }
    }

    /**
     * Is called if a subscribed state changes
     * @param {string} id
     * @param {ioBroker.State | null | undefined} state
     */
    async onStateChange(id, state) {
        if (state.ack === false) {
            const { deviceId, devicePath, property } = this.getDeviceInfo(id);
            const mapItem = proptiesMap.find(item => item.name === property);
            if (mapItem) {
                const payload = await this.createPayload(devicePath);
                const cmdResult = await this.deviceManager.setDeviceState(deviceId, payload);
                await this.processDeviceStatus(deviceId, cmdResult);
            }
        }
    }

    async createPayload(devicePath) {
        const payload = {};
        for (const property of proptiesMap) {
            if (await this.objectExists(`${devicePath}.${property.name}`) === true) {
                const state = await this.getStateAsync(`${devicePath}.${property.name}`);
                if (state && state.val !== null) {
                    payload[property.hvacName] = state.val;
                }
            }
        }
        return payload;
    }

    getDeviceInfo(id) {
        const parts = id.split('.');
        const deviceId = parts[2];
        const devicePath = parts.slice(0, -1).join('.');
        const property = parts[parts.length - 1];
        return { deviceId, devicePath, property };
    }

    // If you need to accept messages in your adapter, uncomment the following block and the corresponding line in the constructor.
    // /**
    //  * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
    //  * Using this method requires "common.messagebox" property to be set to true in io-package.json
    //  * @param {ioBroker.Message} obj
    //  */
    // onMessage(obj) {
    //     if (typeof obj === 'object' && obj.message) {
    //         if (obj.command === 'send') {
    //             // e.g. send email or pushover or whatever
    //             this.log.info('send command');

    //             // Send response in callback if required
    //             if (obj.callback) this.sendTo(obj.from, obj.command, 'Message received', obj.callback);
    //         }
    //     }
    // }

}

if (require.main !== module) {
    // Export the constructor in compact mode
    /**
     * @param {Partial<utils.AdapterOptions>} [options={}]
     */
    module.exports = (options) => new GreeHvac(options);
} else {
    // otherwise start the instance directly
    new GreeHvac();
}

