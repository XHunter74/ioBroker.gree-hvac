'use strict';

import * as utils from '@iobroker/adapter-core';
import { DeviceManager } from './lib/device_manager';
import propertiesMap from './lib/properties_map';
import { DeviceState } from './lib/device-state';
import AdapterUtils from './lib/adapter-utils';
import type { Device, DeviceStatus } from './lib/types';

const MinPollInterval = 1000;
const MaxPollInterval = 60000;
const CheckDevicesTimeoutMs = 1000;
const CheckDevicesTimeout = 'CheckDevices';
const MinCelsiusTemperature = 16;
const MaxCelsiusTemperature = 30;
const MinFahrenheitTemperature = 60;
const MaxFahrenheitTemperature = 86;

interface DeviceObjectInfo {
    id: string;
    name: ioBroker.StringOrTranslated;
}

interface CollectedDeviceInfo {
    id: string;
    ip: string;
    name: ioBroker.StringOrTranslated;
    alive: ioBroker.StateValue;
    [key: string]: unknown;
}

class GreeHvac extends utils.Adapter {
    private deviceManager: DeviceManager | undefined;
    private timeouts: Record<string, ioBroker.Timeout | undefined> = {};
    private activeDevices: DeviceState[] = [];

    constructor(options?: Partial<utils.AdapterOptions>) {
        super({
            ...options,
            name: 'gree-hvac',
        });
        try {
            this.on('ready', this.onReady.bind(this));
            this.on('stateChange', this.onStateChange.bind(this));
            this.on('message', this.onMessage.bind(this));
            this.on('unload', this.onUnload.bind(this));
        } catch (error) {
            this.log.error(`Error in constructor: ${error}`);
            this.sendError(error as Error, 'Error in constructor');
        }
    }

    async onReady(): Promise<void> {
        try {
            this.log.info(`Device list: ${JSON.stringify(this.config.devicelist)}`);
            this.log.info(`Poll interval: ${this.config.pollInterval}`);

            if (
                !this.config.devicelist ||
                this.config.devicelist.length === 0 ||
                !AdapterUtils.validateIPList(this.config.devicelist)
            ) {
                this.log.error(`Invalid device list: ${JSON.stringify(this.config.devicelist)}`);
                this.stop?.();
                return;
            }

            if (
                this.config.pollInterval < MinPollInterval ||
                isNaN(this.config.pollInterval) ||
                this.config.pollInterval > MaxPollInterval
            ) {
                this.log.error(`Invalid poll interval: ${this.config.pollInterval}`);
                this.stop?.();
                return;
            }

            await this.setStateAsync('info.connection', { val: false, ack: true });

            const adapterObjects = await this.getAdapterObjectsAsync();

            for (const key in adapterObjects) {
                if (Object.prototype.hasOwnProperty.call(adapterObjects, key) && key.endsWith('.alive') === true) {
                    await this.setStateAsync(key, { val: false, ack: true });
                }
            }

            const devicesArray = this.config.devicelist.map(item => item.deviceIp);
            const devices = devicesArray.join(';');

            this.subscribeStates('*');

            this.deviceManager = new DeviceManager(devices, this.log, this.config.requestTimeoutMs);

            this.deviceManager.on('device_bound', async (deviceId: string, device: Device) => {
                try {
                    await this.processDevice(deviceId, device);
                    await this.pollDevices(deviceId, true);
                } catch (error) {
                    this.log.error(`Error in device_bound event for device ${deviceId}: ${error}`);
                }
            });
            this.checkDevices();
        } catch (error) {
            this.log.error(`Error in onReady: ${error}`);
            this.sendError(error as Error, 'Error in onReady');
        }
    }

    async pollDevices(deviceId: string, isFirst: boolean): Promise<void> {
        if (isFirst) {
            try {
                await this.getDeviceStatus(deviceId);
            } catch {
                /* ignore first-poll errors */
            }
        }
        this.timeouts[deviceId] = this.setTimeout(async () => {
            try {
                await this.getDeviceStatus(deviceId);
                this.clearTimeout(this.timeouts[deviceId]);
            } catch {
                /* ignore polling errors */
            }
            await this.pollDevices(deviceId, false);
        }, this.config.pollInterval);
    }

    checkDevices(): void {
        this.timeouts[CheckDevicesTimeout] = this.setTimeout(async () => {
            const allActive =
                this.activeDevices.length > 0 && this.activeDevices.every(device => device.isActive === true);
            await this.setStateAsync('info.connection', { val: allActive, ack: true });
            this.clearTimeout(this.timeouts[CheckDevicesTimeout]);
            this.checkDevices();
        }, CheckDevicesTimeoutMs);
    }

    async getDeviceStatus(deviceId: string): Promise<void> {
        const deviceItem = this.activeDevices.find(device => device.id === deviceId);

        try {
            const deviceStatus = await this.deviceManager!.getDeviceStatus(deviceId);
            if (deviceItem && deviceItem.isActive === false) {
                this.log.info(`Device ${deviceId} is responding again`);
                deviceItem.isActive = true;
            }
            if (deviceItem) {
                deviceItem.lastSeen = new Date();
            }
            void this.processDeviceStatus(deviceId, deviceStatus);
        } catch (error) {
            await this.setStateAsync(`${deviceId}.alive`, { val: false, ack: true });
            if (deviceItem && deviceItem.isActive === true) {
                this.log.error(`Error in getDeviceStatus for device ${deviceId}: ${error}`);
                deviceItem.isActive = false;
            }
        }
    }

    async processDeviceStatus(deviceId: string, deviceStatus: DeviceStatus): Promise<void> {
        try {
            deviceId = this.nameToId(deviceId);
            await this.setStateAsync(`${deviceId}.alive`, { val: true, ack: true });
            for (const key in deviceStatus) {
                if (Object.prototype.hasOwnProperty.call(deviceStatus, key)) {
                    let value: unknown = deviceStatus[key];
                    const mapItem = propertiesMap.find(item => item.hvacName === key);
                    if (!mapItem) {
                        this.log.warn(`Property ${key} not found in the map`);
                        continue;
                    }
                    value = AdapterUtils.mapValue(value, mapItem);
                    value = AdapterUtils.convertValue(deviceStatus, value, mapItem);
                    await this.setStateAsync(`${deviceId}.${mapItem.name}`, {
                        val: value as ioBroker.StateValue,
                        ack: true,
                    });
                }
            }
        } catch (error) {
            this.log.error(`Error in processDeviceStatus for device ${deviceId}: ${error}`);
            this.sendError(error as Error, `Error in processDeviceStatus for device ${deviceId}`);
        }
    }

    async processDevice(deviceId: string, device: Device): Promise<void> {
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
                native: {},
            });
            await this.setStateAsync(`${deviceId}.deviceInfo`, { val: JSON.stringify(device), ack: true });

            await this.setObjectNotExistsAsync(`${deviceId}.alive`, {
                type: 'state',
                common: {
                    name: 'Is alive',
                    type: 'boolean',
                    read: true,
                    write: false,
                    role: 'indicator.state',
                },
                native: {},
            });
            await this.setStateAsync(`${deviceId}.alive`, { val: true, ack: true });

            for (const property of propertiesMap) {
                try {
                    const propertyObjectName = `${deviceId}.${property.name}`;
                    if ((await this.objectExists(propertyObjectName)) === true) {
                        const propertyObject = await this.getObjectAsync(propertyObjectName);
                        if (
                            propertyObject &&
                            AdapterUtils.areObjectsTheSame(propertyObject, JSON.parse(property.definition)) === false
                        ) {
                            await this.delObjectAsync(propertyObjectName);
                            await this.setObjectNotExistsAsync(propertyObjectName, JSON.parse(property.definition));
                        }
                    } else {
                        await this.setObjectNotExistsAsync(propertyObjectName, JSON.parse(property.definition));
                    }
                } catch (error) {
                    this.log.error(`Error in processDevice for device ${deviceId}: ${error}`);
                    this.log.error(`Property ${property.name}, definition '${property.definition}'`);
                    this.sendError(error as Error, `Property ${property.name}, definition '${property.definition}'`);
                }
            }
        } catch (error) {
            this.log.error(`Error in processDevice for device ${deviceId}: ${error}`);
            this.sendError(error as Error, `Error in processDevice for device ${deviceId}`);
        }
    }

    nameToId(pName: string): string {
        return (pName || '').replace(this.FORBIDDEN_CHARS, '_');
    }

    onUnload(callback: () => void): void {
        try {
            for (const deviceId in this.timeouts) {
                this.clearTimeout(this.timeouts[deviceId]);
            }
            if (this.deviceManager) {
                this.deviceManager.close();
            }
            callback();
        } catch (error) {
            this.log.error(`Error in onUnload: ${error}`);
            this.sendError(error as Error, 'Error in onUnload');
            callback();
        }
    }

    async onStateChange(id: string, state: ioBroker.State | null | undefined): Promise<void> {
        try {
            if (state && state.ack === false) {
                const deviceInfo = this.getDeviceInfo(id);
                if (!deviceInfo) {
                    return;
                }
                const { deviceId, devicePath, property } = deviceInfo;
                if (property === 'temperature-unit') {
                    await this.onTemperatureUnitChange(devicePath, state.val as number);
                }
                const mapItem = propertiesMap.find(item => item.name === property);
                if (mapItem) {
                    const payload = await this.createPayload(devicePath);
                    const cmdResult = await this.deviceManager!.setDeviceState(deviceId, payload);
                    if (cmdResult) {
                        await this.processDeviceStatus(deviceId, cmdResult);
                    }
                }
            }
        } catch (error) {
            this.log.error(`Error in onStateChange for state ${id}: ${error}`);
            this.sendError(error as Error, `Error in onStateChange for state ${id}`);
        }
    }

    async onTemperatureUnitChange(devicePath: string, temperatureUnit: number): Promise<void> {
        const temperature = Number((await this.getStateAsync(`${devicePath}.target-temperature`))?.val ?? 0);
        const roomTemperature = Number((await this.getStateAsync(`${devicePath}.room-temperature`))?.val ?? 0);
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

    async createPayload(deviceId: string): Promise<Record<string, number | string | boolean>> {
        try {
            let payload: Record<string, number | string | boolean> = {};
            for (const property of propertiesMap.filter(e => !e.isReadOnly())) {
                if ((await this.objectExists(`${deviceId}.${property.name}`)) === true) {
                    const state = await this.getStateAsync(`${deviceId}.${property.name}`);
                    if (state && state.val !== null) {
                        const definition = JSON.parse(property.definition) as {
                            native?: {
                                valuesMap?: Array<{
                                    value: number | string | boolean;
                                    targetValue: number | string | boolean;
                                }>;
                            };
                        };
                        if (definition.native?.valuesMap) {
                            const valuesMap = definition.native.valuesMap;
                            const valueMap = valuesMap.find(item => item.value === state.val);
                            if (valueMap) {
                                payload[property.hvacName] = valueMap.targetValue;
                            } else {
                                payload[property.hvacName] = state.val as number | string | boolean;
                            }
                        } else {
                            payload[property.hvacName] = state.val as number | string | boolean;
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
            this.sendError(error as Error, 'Error in createPayload');
            return {};
        }
    }

    getDeviceInfo(id: string): { deviceId: string; devicePath: string; property: string } | null {
        try {
            const parts = id.split('.');
            const deviceId = parts[2];
            const devicePath = parts.slice(0, -1).join('.');
            const property = parts[parts.length - 1];
            return { deviceId, devicePath, property };
        } catch (error) {
            this.log.error(`Error in getDeviceInfo: ${error}`);
            this.sendError(error as Error, `Error in getDeviceInfo, id: ${id}`);
            return null;
        }
    }

    async onMessage(obj: ioBroker.Message): Promise<void> {
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
                default: {
                    this.log.warn(`Unknown command ${obj.command}`);
                    const result = { error: `Unknown command ${obj.command}` };
                    if (obj.callback) {
                        this.sendTo(obj.from, obj.command, result, obj.callback);
                    }
                    break;
                }
            }
        }
    }

    async processRenameDevice(obj: ioBroker.Message): Promise<void> {
        const result: { result?: unknown; error?: string } = {};
        try {
            const msg = obj.message as { deviceId: string; name: string };
            const deviceId = msg.deviceId;
            const deviceName = msg.name;
            const deviceObject = await this.getObjectAsync(deviceId);
            if (!deviceObject) {
                this.log.warn(`Device ${deviceId} not found`);
                return;
            }
            await this.extendObjectAsync(deviceId, { common: { name: deviceName } });
            this.log.info(`Device ${(deviceObject.common as { name: string }).name} renamed to ${deviceName}`);
            result.result = { deviceId: deviceId, name: deviceName };
        } catch (error) {
            result.error = (error as Error).message;
        }
        if (obj.callback) {
            this.sendTo(obj.from, obj.command, result, obj.callback);
        }
    }

    async processRemoteCommand(obj: ioBroker.Message): Promise<void> {
        const result: { result?: string; error?: string } = {};
        try {
            const msg = obj.message as { command: string; deviceId: string };
            const command = msg.command;
            const deviceId = msg.deviceId;
            let state: ioBroker.StateValue;
            const powerState = (await this.getStateAsync(`${deviceId}.power`))?.val;
            const isAlive = (await this.getStateAsync(`${deviceId}.alive`))?.val;
            const temperatureUnit = (await this.getStateAsync(`${deviceId}.temperature-unit`))?.val ?? 0;
            let minTemperature = MinCelsiusTemperature;
            let maxTemperature = MaxCelsiusTemperature;
            if (temperatureUnit === 1) {
                minTemperature = MinFahrenheitTemperature;
                maxTemperature = MaxFahrenheitTemperature;
            }
            if (isAlive === false) {
                throw new Error('Device is not responding');
            }
            let newState: number;
            switch (command) {
                case 'on-off-btn':
                    newState = powerState === 1 ? 0 : 1;
                    await this.setStateAsync(`${deviceId}.power`, newState);
                    break;
                case 'temperature-up-btn':
                    if (powerState === 0) {
                        throw new Error('Device power is off');
                    }
                    state = (await this.getStateAsync(`${deviceId}.target-temperature`))?.val ?? 0;
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
                    state = (await this.getStateAsync(`${deviceId}.target-temperature`))?.val ?? 0;
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
                    state = (await this.getStateAsync(`${deviceId}.mode`))?.val ?? 0;
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
                    state = (await this.getStateAsync(`${deviceId}.fan-speed`))?.val ?? 0;
                    newState = Number(state) + 1;
                    if (newState > 4) {
                        newState = 0;
                    }
                    await this.setStateAsync(`${deviceId}.fan-speed`, newState);
                    break;
                case 'turbo-btn':
                    if (powerState === 0) {
                        throw new Error('Device power is off');
                    }
                    state = (await this.getStateAsync(`${deviceId}.turbo`))?.val ?? 0;
                    newState = Number(state) + 1;
                    if (newState > 1) {
                        newState = 0;
                    }
                    await this.setStateAsync(`${deviceId}.turbo`, newState);
                    break;
                case 'display-btn':
                    state = (await this.getStateAsync(`${deviceId}.display-state`))?.val ?? 0;
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
            result.error = (error as Error).message;
        }
        if (obj.callback) {
            this.sendTo(obj.from, obj.command, result, obj.callback);
        }
    }

    async processGetDevicesCommand(obj: ioBroker.Message): Promise<void> {
        const result: { result?: CollectedDeviceInfo[]; error?: string } = {};
        try {
            const allObjects = await this.getAdapterObjectsAsync();
            const deviceObjects: DeviceObjectInfo[] = Object.keys(allObjects)
                .map(key => ({ id: key, value: allObjects[key] }))
                .filter(item => item.id.split('.').length === 3 && item.value.type === 'device')
                .map(item => ({
                    id: item.id,
                    name: item.value.common.name as ioBroker.StringOrTranslated,
                }));

            let devices = await this.collectDeviceInfo(deviceObjects);
            devices = devices.sort((a, b) => {
                const nameA = String(a.name);
                const nameB = String(b.name);
                return nameA > nameB ? 1 : nameB > nameA ? -1 : 0;
            });
            result.result = devices;
        } catch (error) {
            result.error = (error as Error).message;
        }
        if (obj.callback) {
            this.sendTo(obj.from, obj.command, result, obj.callback);
        }
    }

    async collectDeviceInfo(deviceObjects: DeviceObjectInfo[]): Promise<CollectedDeviceInfo[]> {
        const devicesInfo: CollectedDeviceInfo[] = [];
        for (let i = 0; i < deviceObjects.length; i++) {
            const deviceItem = deviceObjects[i];
            const deviceInfoState = ((await this.getStateAsync(`${deviceItem.id}.deviceInfo`))?.val ?? '{}').toString();
            const deviceObject = JSON.parse(deviceInfoState) as { mac: string; address: string };
            const deviceInfo: CollectedDeviceInfo = {
                id: deviceObject.mac,
                ip: deviceObject.address,
                name: deviceItem.name,
                alive: null,
            };
            for (let j = 0; j < propertiesMap.length; j++) {
                try {
                    const property = propertiesMap[j];
                    const state = (await this.getStateAsync(`${deviceItem.id}.${property.name}`))?.val;
                    deviceInfo[property.name] = state;
                } catch {
                    /* ignore property state errors */
                }
            }
            const aliveState = (await this.getStateAsync(`${deviceItem.id}.alive`))?.val ?? false;
            deviceInfo.alive = aliveState;
            devicesInfo.push(deviceInfo);
        }
        return devicesInfo;
    }

    sendError(error: Error | string, message?: string): void {
        try {
            const adapter = this as unknown as {
                supportsFeature?: (feature: string) => boolean;
                getPluginInstance?: (name: string) => { getSentryObject?: () => unknown } | null;
            };
            if (adapter.supportsFeature && adapter.supportsFeature('PLUGINS')) {
                const sentryInstance = adapter.getPluginInstance?.('sentry');
                if (sentryInstance) {
                    const Sentry = sentryInstance.getSentryObject?.() as
                        | {
                              configureScope?: (fn: (scope: unknown) => void) => void;
                              captureException?: (err: unknown) => void;
                              Severity?: { Error: string };
                          }
                        | undefined;
                    if (Sentry) {
                        if (message) {
                            Sentry.configureScope?.(scope => {
                                (
                                    scope as {
                                        addBreadcrumb?: (b: unknown) => void;
                                    }
                                ).addBreadcrumb?.({
                                    type: 'error',
                                    category: 'error message',
                                    level: Sentry.Severity?.Error,
                                    message: message,
                                });
                            });
                        }
                        if (typeof error === 'string') {
                            Sentry.captureException?.(new Error(error));
                        } else {
                            Sentry.captureException?.(error);
                        }
                    }
                }
            }
        } catch (err) {
            console.error('Error in sendError:', err);
        }
    }
}

if (require.main !== module) {
    module.exports = (options?: Partial<utils.AdapterOptions>) => new GreeHvac(options);
} else {
    new GreeHvac();
}
