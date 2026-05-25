export interface Device {
    mac: string;
    name: string;
    address: string;
    port: number;
    key: string | Buffer;
    encVersion: 1 | 2;
    cid?: string;
    [key: string]: unknown;
}

export type DeviceStatus = Record<string, number | string | boolean>;
