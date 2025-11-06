'use strict';

const DeviceManager = require('./lib/device_manager');
const propertiesMap = require('./lib/properties_map');
const DeviceState = require('./lib/device-state');

const utils = require('@iobroker/adapter-core');
const AdapterUtils = require('iobroker.gree-hvac/lib/adapter-utils');

const MinPollInterval = 1000;
const MaxPollInterval = 60000;
const CheckDevicesTimeoutMs = 1000;
const CheckDevicesTimeout = 'CheckDevices';
const MinCelciusTemperature = 16;
const MaxCelciusTemperature = 30;
const MinFahrenheitTemperature = 60;
const MaxFahrenheitTemperature = 86;

class GreeHvac extends utils.Adapter {

    deviceManager;
    timeouts = {};
    activeDevices = [];

    /**
     * @param {Partial<utils.AdapterOptions>} [options={}]
     */
    constructor(options) {
        super({
            ...options,
            name: 'gree-hvac',
        });
        try {
            this.on('ready', this.onReady.bind(this));
            this.on('stateChange', this.onStateChange.bind(this));
            // this.on('objectChange', this.onObjectChange.bind(this));
            this.on('message', this.onMessage.bind(this));
            this.on('unload', this.onUnload.bind(this));
        } catch (error) {
            this.log.error(`Error in constructor: ${error}`);
            this.sendError(error, 'Error in constructor');
        }
    }

    /**
     * Is called when databases are connected and adapter received configuration.
     */
    async onReady() {
        try {
            // Initialize your adapter here

            // The adapters config (in the instance object everything under the attribute "native") is accessible via
            // this.config:

            this.log.info('Device list: ' + JSON.stringify(this.config.devicelist));
            this.log.info('Poll interval: ' + this.config.pollInterval);

            if (!this.config.devicelist || this.config.devicelist.length === 0 || !AdapterUtils.validateIPList(this.config.devicelist)) {
                this.log.error(`Invalid device list: ${JSON.stringify(this.config.devicelist)}`);
                this.stop();
                return;
            }

            if (this.config.pollInterval < MinPollInterval || isNaN(this.config.pollInterval) || this.config.pollInterval > MaxPollInterval) {
                this.log.error('Invalid poll interval: ' + this.config.pollInterval);
                this.stop();
                return;
            }

            await this.setStateAsync('info.connection', { val: false, ack: true });

            const adapterObjects = await this.getAdapterObjectsAsync();

            for (const key in adapterObjects) {
                if (Object.prototype.hasOwnProperty.call(adapterObjects, key)
                    && key.endsWith('.alive') === true) {
                    await this.setStateAsync(key, { val: false, ack: true });
                }
            }

            const devicesArray = this.config.devicelist.map(item => item.deviceIp);
            const devices = devicesArray.join(';');

            this.subscribeStates('*');

            this.deviceManager = new DeviceManager(devices, this.log, this.config.requestTimeoutMs);

            this.deviceManager.on('device_bound', async (deviceId, device) => {
                try {
                    await this.processDevice(deviceId, device);
                    await this.pollDevices(deviceId, true);

                } catch (error) {
                    this.log.error(`Error in device_bound event for device ${deviceId}: ${error}`);
                    // this.sendError(error, `Error in device_bound event for device ${deviceId}`);
                }
            });
            this.checkDevices();
        } catch (error) {
            this.log.error(`Error in onReady: ${error}`);
            this.sendError(error, 'Error in onReady');
        }
    }

    /**
     * @param {string} deviceId
     * @param {boolean} isFirst
     */
    async pollDevices(deviceId, isFirst) {
        if (isFirst) {
            try {
                await this.getDeviceStatus(deviceId);
            } catch { } // eslint-disable-line no-empty
        }
        this.timeouts[deviceId] = this.setTimeout(async () => {
            try {
                await this.getDeviceStatus(deviceId);
                this.clearTimeout(this.timeouts[deviceId]);
            } catch { } // eslint-disable-line no-empty
            await this.pollDevices(deviceId, false);
        }, this.config.pollInterval);
    }

    checkDevices() {
        this.timeouts[CheckDevicesTimeout] = this.setTimeout(async () => {
            const inactiveDevices = this.activeDevices.filter(device => device.isActive === false);
            if (inactiveDevices.length > 0) {
                await this.setStateAsync('info.connection', { val: false, ack: true });
            } else {
                await this.setStateAsync('info.connection', { val: true, ack: true });
            }
            this.clearTimeout(this.timeouts[CheckDevicesTimeout]);
            this.checkDevices();
        }, CheckDevicesTimeoutMs);
    }

    /**
     * @param {string} deviceId
     */
    async getDeviceStatus(deviceId) {
        const deviceItem = this.activeDevices.find(device => device.id === deviceId);

        try {
            const deviceStatus = await this.deviceManager.getDeviceStatus(deviceId);
            if (deviceItem.isActive === false) {
                this.log.info(`Device ${deviceId} is responding again`);
                deviceItem.isActive = true;
            }
            deviceItem.lastSeen = new Date();
            this.processDeviceStatus(deviceId, deviceStatus);
        } catch (error) {
            await this.setStateAsync(`${deviceId}.alive`, { val: false, ack: true });
            if (deviceItem.isActive === true) {
                this.log.error(`Error in getDeviceStatus for device ${deviceId}: ${error}`);
                deviceItem.isActive = false;
            }
        }
    }

    /**
     * @param {string} deviceId
     * @param {{ [x: string]: any; }} deviceStatus
     */
    async processDeviceStatus(deviceId, deviceStatus) {
        try {
            deviceId = this.nameToId(deviceId);
            await this.setStateAsync(`${deviceId}.alive`, { val: true, ack: true });
            for (const key in deviceStatus) {
                if (Object.prototype.hasOwnProperty.call(deviceStatus, key)) {
                    let value = deviceStatus[key];
                    const mapItem = propertiesMap.find(item => item.hvacName === key);
                    if (!mapItem) {
                        this.log.warn(`Property ${key} not found in the map`);
                        continue;
                    }
                    value = AdapterUtils.mapValue(value, mapItem);
                    value = AdapterUtils.convertValue(deviceStatus, value, mapItem);
                    await this.setStateAsync(`${deviceId}.${mapItem.name}`, { val: value, ack: true });
                }
            }
        } catch (error) {
            this.log.error(`Error in processDeviceStatus for device ${deviceId}: ${error}`);
            this.sendError(error, `Error in processDeviceStatus for device ${deviceId}`);
        }
    }

    /**
     * @param {string} deviceId
     * @param {any} device
     */
    async processDevice(deviceId, device) {
        try {
            this.activeDevices.push(new DeviceState(deviceId));
            deviceId = this.nameToId(deviceId);
            this.log.info(`Device ${deviceId} bound`);

            await this.setObjectNotExistsAsync(deviceId, {
                type: 'device',
                common: {
                    name: deviceId,
                },
                native: {},
            });

            await this.setObjectNotExistsAsync(`${deviceId}.deviceInfo`, {
                type: 'state',
                common: {
                    name: 'Device Info',
                    type: 'string',
                    role: 'info',
                    read: true,
                    write: false,
                },
                native: {}
            });
            await this.setStateAsync(`${deviceId}.deviceInfo`, { val: JSON.stringify(device), ack: true });

            await this.setObjectNotExistsAsync(`${deviceId}.alive`, {
                'type': 'state',
                'common': {
                    'name': 'Is alive',
                    'type': 'boolean',
                    'read': true,
                    'write': false,
                    'role': 'indicator.state'
                },
                native: {}
            });
            await this.setStateAsync(`${deviceId}.alive`, { val: true, ack: true });

            for (const property of propertiesMap) {
                try {
                    const propertyObjectName = `${deviceId}.${property.name}`;
                    if (await this.objectExists(propertyObjectName) === true) {
                        const propertyObject = await this.getObjectAsync(propertyObjectName);
                        if (AdapterUtils.areObjectsTheSame(propertyObject, JSON.parse(property.definition)) === false) {
                            await this.delObjectAsync(propertyObjectName);
                            await this.setObjectNotExistsAsync(propertyObjectName, JSON.parse(property.definition));
                        }
                    } else {
                        await this.setObjectNotExistsAsync(propertyObjectName, JSON.parse(property.definition));
                    }
                }
                catch (error) {
                    this.log.error(`Error in processDevice for device ${deviceId}: ${error}`);
                    this.log.error(`Property ${property.name}, definition '${property.definition}'`);
                    this.sendError(error, `Property ${property.name}, definition '${property.definition}'`);
                }
            }

        } catch (error) {
            this.log.error(`Error in processDevice for device ${deviceId}: ${error}`);
            this.sendError(error, `Error in processDevice for device ${deviceId}`);
        }
    }

    /**
     * @param {string} pName
     */
    nameToId(pName) {
        return (pName || '').replace(this.FORBIDDEN_CHARS, '_');
    }


    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     * @param {() => void} callback
     */
    onUnload(callback) {
        try {
            for (const deviceId in this.timeouts) {
                this.clearTimeout(this.timeouts[deviceId]);
            }
            callback();
        } catch (error) {
            this.log.error(`Error in onUnload: ${error}`);
            this.sendError(error, 'Error in onUnload');
            callback();
        }
    }

    /**
     * Is called if a subscribed state changes
     * @param {string} id
     * @param {ioBroker.State | null | undefined} state
     */
    async onStateChange(id, state) {
        try {
            if (state && state.ack === false) {
                const { deviceId, devicePath, property } = this.getDeviceInfo(id);
                if (property === 'temperature-unit') {
                    await this.onTemperatureUnitChange(devicePath, state.val);
                }
                const mapItem = propertiesMap.find(item => item.name === property);
                if (mapItem) {
                    const payload = await this.createPayload(devicePath);
                    const cmdResult = await this.deviceManager.setDeviceState(deviceId, payload);
                    await this.processDeviceStatus(deviceId, cmdResult);
                }
            }
        } catch (error) {
            this.log.error(`Error in onStateChange for state ${id}: ${error}`);
            this.sendError(error, `Error in onStateChange for state ${id}`);
        }
    }

    async onTemperatureUnitChange(devicePath, temperatureUnit) {
        const temperature = Number((await this.getStateAsync(`${devicePath}.target-temperature`)).val);
        const roomTemperature = Number((await this.getStateAsync(`${devicePath}.room-temperature`)).val);
        if (temperatureUnit === 0) {
            let celsius = AdapterUtils.fahrenheitToCelsius(temperature);
            await this.setStateAsync(`${devicePath}.target-temperature`, celsius, true);
            celsius = AdapterUtils.fahrenheitToCelsius(roomTemperature);
            await this.setStateAsync(`${devicePath}.room-temperature`, celsius, true);
        } else {
            let fahrenheit = AdapterUtils.celsiusToFahrenheit(temperature);
            await this.setStateAsync(`${devicePath}.target-temperature`, fahrenheit, true);
            fahrenheit = AdapterUtils.celsiusToFahrenheit(roomTemperature);
            await this.setStateAsync(`${devicePath}.room-temperature`, fahrenheit, true);
        }
    }

    /**
     * @param {string} deviceId
     */
    async createPayload(deviceId) {
        try {
            let payload = {};
            for (const property of propertiesMap.filter(e => !e.isReadOnly())) {
                if (await this.objectExists(`${deviceId}.${property.name}`) === true) {
                    const state = await this.getStateAsync(`${deviceId}.${property.name}`);
                    if (state && state.val !== null) {
                        const definition = JSON.parse(property.definition);
                        if (definition.native && definition.native.valuesMap) {
                            const valuesMap = definition.native.valuesMap;
                            const valueMap = valuesMap.find(item => item.value === state.val);
                            if (valueMap) {
                                payload[property.hvacName] = valueMap.targetValue;
                            } else {
                                payload[property.hvacName] = state.val;
                            }
                        } else {
                            payload[property.hvacName] = state.val;
                        }
                    }
                }
            }
            for (const property of propertiesMap.filter(e => e.toConverter !== null)) {
                if (property.toConverter) {
                    payload = property.toConverter(payload);
                }
            }
            return payload;
        } catch (error) {
            this.log.error(`Error in createPayload: ${error}`);
            this.sendError(error, 'Error in createPayload');
            return {};
        }
    }

    /**
     * @param {string} id
     */
    getDeviceInfo(id) {
        try {
            const parts = id.split('.');
            const deviceId = parts[2];
            const devicePath = parts.slice(0, -1).join('.');
            const property = parts[parts.length - 1];
            return { deviceId, devicePath, property };
        } catch (error) {
            this.log.error(`Error in getDeviceInfo: ${error}`);
            this.sendError(error, `Error in getDeviceInfo, id: ${id}`);
            return {};
        }
    }

    // If you need to accept messages in your adapter, uncomment the following block and the corresponding line in the constructor.
    /**
     * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
     * Using this method requires "common.messagebox" property to be set to true in io-package.json
     * @param {ioBroker.Message} obj
     */
    async onMessage(obj) {
        this.log.debug(`Received message ${JSON.stringify(obj)}`);
        if (typeof obj === 'object' && obj.message) {
            switch (obj.command) {
                case 'getDevices':
                    await this.processGetDevicesCommand(obj);
                    break;
                case 'remoteCommand':
                    await this.processRemoteCommand(obj);
                    break;
                case 'renameDevice':
                    await this.processRenameDevice(obj);
                    break;
                default:
                    this.log.warn(`Unknown command ${obj.command}`);
                    const result = { error: `Unknown command ${obj.command}` }; // eslint-disable-line no-case-declarations
                    if (obj.callback) this.sendTo(obj.from, obj.command, result, obj.callback);
                    break;
            }
        }
    }

    async processRenameDevice(obj) {
        const result = {};
        try {
            const deviceId = obj.message.deviceId;
            const deviceName = obj.message.name;
            const deviceObject = await this.getObjectAsync(deviceId);
            if (!deviceObject) {
                this.log.warn(`Device ${deviceId} not found`);
                return;
            }
            await this.extendObjectAsync(deviceId, { common: { name: deviceName } });
            this.log.info(`Device ${deviceObject.common.name} renamed to ${deviceName}`);
            result.result = { deviceId: deviceId, name: deviceName };
        }
        catch (error) {
            result.error = error.message;
        }
        if (obj.callback) this.sendTo(obj.from, obj.command, result, obj.callback);
    }

    async processRemoteCommand(obj) {
        const result = {};
        try {
            const command = obj.message.command;
            const deviceId = obj.message.deviceId;
            let state;
            const powerState = (await this.getStateAsync(`${deviceId}.power`)).val;
            const isAlive = (await this.getStateAsync(`${deviceId}.alive`)).val;
            const temperatureUnit = (await this.getStateAsync(`${deviceId}.temperature-unit`)).val;
            let minTemperature = MinCelciusTemperature;
            let maxTemperature = MaxCelciusTemperature;
            if (temperatureUnit === 1) {
                minTemperature = MinFahrenheitTemperature;
                maxTemperature = MaxFahrenheitTemperature;
            }
            if (isAlive === false) {
                throw new Error('Device is not responding');
            }
            let newState;
            switch (command) {
                case 'on-off-btn':
                    newState = powerState === 1 ? 0 : 1;
                    await this.setStateAsync(`${deviceId}.power`, newState);
                    break;
                case 'temperature-up-btn':
                    if (powerState === 0) {
                        throw new Error('Device power is off');
                    }
                    state = (await this.getStateAsync(`${deviceId}.target-temperature`)).val;
                    newState = Number(state) + 1;
                    if (newState > maxTemperature) {
                        newState = maxTemperature;
                    }
                    await this.setStateAsync(`${deviceId}.target-temperature`, newState);
                    break;
                case 'temperature-down-btn':
                    if (powerState === 0) {
                        throw new Error('Device power is off');
                    }
                    state = (await this.getStateAsync(`${deviceId}.target-temperature`)).val;
                    newState = Number(state) - 1;
                    if (newState < minTemperature) {
                        newState = minTemperature;
                    }
                    await this.setStateAsync(`${deviceId}.target-temperature`, newState);
                    break;
                case 'mode-btn':
                    if (powerState === 0) {
                        throw new Error('Device power is off');
                    }
                    state = (await this.getStateAsync(`${deviceId}.mode`)).val;
                    newState = Number(state) + 1;
                    if (newState > 4) {
                        newState = 0;
                    }
                    await this.setStateAsync(`${deviceId}.mode`, newState);
                    break;
                case 'fan-btn':
                    if (powerState === 0) {
                        throw new Error('Device power is off');
                    }
                    state = (await this.getStateAsync(`${deviceId}.fan-speed`)).val;
                    newState = Number(state) + 1;
                    if (newState > 3) newState = 0;
                    await this.setStateAsync(`${deviceId}.fan-speed`, newState);
                    break;
                case 'turbo-btn':
                    if (powerState === 0) {
                        throw new Error('Device power is off');
                    }
                    state = (await this.getStateAsync(`${deviceId}.turbo`)).val;
                    newState = Number(state) + 1;
                    if (newState > 1) {
                        newState = 0;
                    }
                    await this.setStateAsync(`${deviceId}.turbo`, newState);
                    break;
                case 'display-btn':
                    state = (await this.getStateAsync(`${deviceId}.display-state`)).val;
                    newState = Number(state) + 1;
                    if (newState > 1) {
                        newState = 0;
                    }
                    await this.setStateAsync(`${deviceId}.display-state`, newState);
                    break;
                case 'temperature-unit-btn':
                    newState = temperatureUnit === 1 ? 0 : 1;
                    await this.setStateAsync(`${deviceId}.temperature-unit`, newState);
                    break;
            }
            result.result = 'Ok';
        } catch (error) {
            result.error = error.message;
        }
        if (obj.callback) this.sendTo(obj.from, obj.command, result, obj.callback);
    }

    async processGetDevicesCommand(obj) {
        const result = {};
        try {
            const allObjects = await this.getAdapterObjectsAsync();
            const deviceObjects = Object.keys(allObjects).map((key) => {
                const item = {
                    id: key,
                    value: allObjects[key]
                };
                return item;
            }
            )
                .filter((item) => item.id.split('.').length === 3 && item.value.type === 'device')
                .map((item) => {
                    const device = {
                        id: item.id,
                        name: item.value.common.name
                    };
                    return device;
                });
            let devices = await this.collectDeviceInfo(deviceObjects);
            devices = devices.sort((a, b) => (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0));
            result.result = devices;
        } catch (error) {
            result.error = error.message;
        }
        if (obj.callback) this.sendTo(obj.from, obj.command, result, obj.callback);
    }

    async collectDeviceInfo(deviceObjects) {
        const devicesInfo = [];
        for (let i = 0; i < deviceObjects.length; i++) {
            const deviceItem = deviceObjects[i];
            const deviceInfoState = (await this.getStateAsync(`${deviceItem.id}.deviceInfo`)).val.toString();
            const deviceObject = JSON.parse(deviceInfoState);
            const deviceInfo = {
                id: deviceObject.mac,
                ip: deviceObject.address,
                name: deviceItem.name,
            };
            for (let j = 0; j < propertiesMap.length; j++) {
                try {
                    const property = propertiesMap[j];
                    const state = (await this.getStateAsync(`${deviceItem.id}.${property.name}`)).val;
                    deviceInfo[property.name] = state;
                } catch { }// eslint-disable-line no-empty
            }
            const aliveState = (await this.getStateAsync(`${deviceItem.id}.alive`)).val;
            deviceInfo.alive = aliveState;
            devicesInfo.push(deviceInfo);
        }
        return devicesInfo;
    }

    sendError(error, message) {
        try {
            if (this.supportsFeature && this.supportsFeature('PLUGINS')) {
                const sentryInstance = this.getPluginInstance('sentry');
                if (sentryInstance) {
                    const Sentry = sentryInstance.getSentryObject();
                    if (Sentry) {
                        if (message) {
                            Sentry.configureScope(scope => {
                                scope.addBreadcrumb({
                                    type: 'error', // predefined types
                                    category: 'error message',
                                    level: Sentry.Severity.Error,
                                    message: message
                                });
                            });
                        }
                        if (typeof error == 'string') {
                            Sentry.captureException(new Error(error));
                        } else {
                            Sentry.captureException(error);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error in sendError:', error);
        }
    }
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

