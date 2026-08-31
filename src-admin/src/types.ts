/** stateId (last id segment) -> value */
export type StatesMap = Record<string, ioBroker.StateValue>;

/** ioBroker object id of the device (without namespace) -> its states */
export type DeviceStates = Record<string, StatesMap>;

/** Exactly what the `getDevices` message returns (see src/main.ts collectDeviceInfo). */
export interface RawDevice {
    /** MAC address of the device */
    id: string;
    ip: string;
    name: ioBroker.StringOrTranslated;
    alive: boolean | null;
    [key: string]: unknown;
}

/** Device identity only - live values live in `DeviceStates`. */
export interface DeviceInfo {
    /** last segment of the ioBroker object id, i.e. gree-hvac.<n>.<objectId> */
    objectId: string;
    mac: string;
    ip: string;
    /** already resolved to the current language */
    name: string;
}

/** Commands accepted by the `remoteCommand` message (see src/main.ts processRemoteCommand). */
export type GreeCommand =
    | 'on-off-btn'
    | 'display-btn'
    | 'temperature-unit-btn'
    | 'temperature-up-btn'
    | 'temperature-down-btn'
    | 'mode-btn'
    | 'fan-btn'
    | 'turbo-btn';

export interface MessageResponse<T> {
    result?: T;
    error?: string;
}
