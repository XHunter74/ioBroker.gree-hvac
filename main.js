'use strict';
const DeviceManager = require('./lib/device_manager');
const proptiesMap = require('./lib/properties_map');

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require('@iobroker/adapter-core');

// Load your modules here, e.g.:
// const fs = require("fs");

class GreeHvac extends utils.Adapter {

    deviceManager;

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

        if (!this.validateIPList(this.config.devicelist)) {
            this.log.error('Invalid device list');
            this.terminate('Invalid device list');
        }
        const pollInterval = 5000;
        this.deviceManager = new DeviceManager(this.config.devicelist, this.log);

        this.deviceManager.on('device_bound', async (deviceId, device) => {
            await this.processDevice(deviceId, device);

            if (pollInterval > 0) {
                setInterval(() => this.getDeviceStatus(deviceId), pollInterval);
            }
        });
    }

    getDeviceStatus = async (deviceId) => {
        const deviceStatus = await this.deviceManager.getDeviceStatus(deviceId);
        this.processDeviceStatus(deviceId, deviceStatus);
    }

    async processDeviceStatus(deviceId, deviceStatus) {
        for (const key in deviceStatus) {
            if (deviceStatus.hasOwnProperty(key)) {
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
        for (let ip of ips) {
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
            // Here you must clear all timeouts or intervals that may still be active
            // clearTimeout(timeout1);
            // clearTimeout(timeout2);
            // ...
            // clearInterval(interval1);

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
    onStateChange(id, state) {
        if (state.ack === false) {
            this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
        }
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

