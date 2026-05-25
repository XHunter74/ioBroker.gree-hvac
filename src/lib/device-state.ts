export class DeviceState {
    id: string;
    isActive: boolean;
    lastSeen: Date;

    constructor(id: string) {
        this.id = id;
        this.isActive = true;
        this.lastSeen = new Date();
    }
}
