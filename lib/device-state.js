class DeviceState {
    id;
    isActive;
    lastSeen;

    /**
     * @param {string} id
     */
    constructor(id) {
        this.id = id;
        this.isActive = true;
        this.lastSeen = new Date();
    }
}

module.exports = DeviceState;