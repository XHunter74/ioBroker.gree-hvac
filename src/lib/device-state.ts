export class DeviceState {
    id: string;
    isActive: boolean;
    lastSeen: Date;
    consecutiveFailures: number;

    constructor(id: string) {
        this.id = id;
        this.isActive = true;
        this.consecutiveFailures = 0;
        this.lastSeen = new Date();
    }
}
