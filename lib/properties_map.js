class PropertyMapItem {
    name = '';
    hvacName = '';
    definition = '';

    constructor(name, hvacName, definition) {
        this.name = name;
        this.hvacName = hvacName;
        this.definition = definition;
    }
}

const propertiesMap = [
    new PropertyMapItem('power', 'Pow',
        '{"type": "state", ' +
        '"common": { ' +
        '"name": "Power state of conditioner", ' +
        '"type": "number", ' +
        '"role": "indicator", ' +
        '"read": true, ' +
        '"write": true, ' +
        '"min": 0, ' +
        '"max": 1' +
        '}, ' +
        '"native": {} ' +
        '}'
    ),
    new PropertyMapItem('mode', 'Mod',
        '{"type": "state", ' +
        '"common": { ' +
        '"name": "Conditioner mode(0: Auto, 1: Cooling, 4: Heating, 3: Ventilation, 2: Drying) ", ' +
        '"type": "number", ' +
        '"role": "indicator", ' +
        '"read": true, ' +
        '"write": true, ' +
        '"min": 0, ' +
        '"max": 4' +
        '}, ' +
        '"native": {} ' +
        '}'
    ),
    new PropertyMapItem('temperature-unit', 'TemUn',
        '{"type": "state", ' +
        '"common": { ' +
        '"name": "Temperature unit: 0 - °C, 1 - °F",' +
        '"type": "number", ' +
        '"role": "indicator", ' +
        '"read": true, ' +
        '"write": true, ' +
        '"min": 0, ' +
        '"max": 1' +
        '}, ' +
        '"native": {} ' +
        '}'
    ),
    new PropertyMapItem('target-temperature', 'SetTem',
        '{"type": "state", ' +
        '"common": { ' +
        '"name": "Temperature",' +
        '"type": "number", ' +
        '"role": "indicator", ' +
        '"read": true, ' +
        '"write": true, ' +
        '"min": 16, ' +
        '"max": 30' +
        '}, ' +
        '"native": {} ' +
        '}'
    ),
    new PropertyMapItem('temp-rec', 'TemRec',
        '{"type": "state", ' +
        '"common": { ' +
        '"name": "This bit is used to distinguish between two Fahrenheit values", ' +
        '"type": "number", ' +
        '"role": "indicator", ' +
        '"read": true, ' +
        '"write": true, ' +
        '"min": 0, ' +
        '"max": 1' +
        '}, ' +
        '"native": {} ' +
        '}'
    ),
    new PropertyMapItem('fan-speed', 'WdSpd',
        '{"type": "state", ' +
        '"common": { ' +
        '"name": "Fan speed, 0 - Auto, 1, 3, 5",' +
        '"type": "number", ' +
        '"role": "indicator", ' +
        '"read": true, ' +
        '"write": true, ' +
        '"min": 0, ' +
        '"max": 4' +
        '}, ' +
        '"native": {} ' +
        '}'
    ),
    new PropertyMapItem('air-mode', 'Air',
        '{"type": "state", ' +
        '"common": { ' +
        '"name": "Controls the state of the fresh air valve (not available on all units) On(1)/Off(0)",' +
        '"type": "number", ' +
        '"role": "indicator", ' +
        '"read": true, ' +
        '"write": true, ' +
        '"min": 0, ' +
        '"max": 1' +
        '}, ' +
        '"native": {} ' +
        '}'
    ),
    new PropertyMapItem('x-fan-mode', 'Blo',
        '{"type": "state", ' +
        '"common": { ' +
        '"name": "X-Fan mode, this function keeps the fan running for a while after shutting down. On(1)/Off(0)",' +
        '"type": "number", ' +
        '"role": "indicator", ' +
        '"read": true, ' +
        '"write": true, ' +
        '"min": 0, ' +
        '"max": 1' +
        '}, ' +
        '"native": {} ' +
        '}'
    ),
    new PropertyMapItem('health-mode', 'Health',
        '{"type": "state", ' +
        '"common": { ' +
        '"name": "Health (Cold plasma) mode, only for devices equipped with anion generator. On(1)/Off(0)",' +
        '"type": "number", ' +
        '"role": "indicator", ' +
        '"read": true, ' +
        '"write": true, ' +
        '"min": 0, ' +
        '"max": 1' +
        '}, ' +
        '"native": {} ' +
        '}'
    ),
    new PropertyMapItem('sleep-mode', 'SwhSlp',
        '{"type": "state", ' +
        '"common": { ' +
        '"name": "Sleep mode, which gradually changes the temperature. On(1)/Off(0)",' +
        '"type": "number", ' +
        '"role": "indicator", ' +
        '"read": true, ' +
        '"write": true, ' +
        '"min": 0, ' +
        '"max": 1' +
        '}, ' +
        '"native": {} ' +
        '}'
    ),
    new PropertyMapItem('display-state', 'Lig',
        '{"type": "state", ' +
        '"common": { ' +
        '"name": "Display On(1)/Off(0)",' +
        '"type": "number", ' +
        '"role": "indicator", ' +
        '"read": true, ' +
        '"write": true, ' +
        '"min": 0, ' +
        '"max": 1' +
        '}, ' +
        '"native": {} ' +
        '}'
    ),
    new PropertyMapItem('swing-left-right', 'SwingLfRig',
        '{"type": "state", ' +
        '"common": { ' +
        '"name": "Swing left/right On(1)/Off(0), Fixed position(2-6) ",' +
        '"type": "number", ' +
        '"role": "indicator", ' +
        '"read": true, ' +
        '"write": true, ' +
        '"min": 0, ' +
        '"max": 6' +
        '}, ' +
        '"native": {} ' +
        '}'
    ),
    new PropertyMapItem('swing-up-down', 'SwUpDn',
        '{"type": "state", ' +
        '"common": { ' +
        '"name": "Swing up/down On(1)/Off(0), Fixed position(2-6) ",' +
        '"type": "number", ' +
        '"role": "indicator", ' +
        '"read": true, ' +
        '"write": true, ' +
        '"min": 0, ' +
        '"max": 6' +
        '}, ' +
        '"native": {} ' +
        '}'
    ),
    new PropertyMapItem('quiet', 'Quiet',
        '{"type": "state", ' +
        '"common": { ' +
        '"name": "Quiet mode On(1)/Off(0)",' +
        '"type": "number", ' +
        '"role": "indicator", ' +
        '"read": true, ' +
        '"write": true, ' +
        '"min": 0, ' +
        '"max": 1' +
        '}, ' +
        '"native": {} ' +
        '}'
    ),
    new PropertyMapItem('turbo', 'Tur',
        '{"type": "state", ' +
        '"common": { ' +
        '"name": "Turbo On(1)/Off(0)",' +
        '"type": "number", ' +
        '"role": "indicator", ' +
        '"read": true, ' +
        '"write": true, ' +
        '"min": 0, ' +
        '"max": 1' +
        '}, ' +
        '"native": {} ' +
        '}'
    ),
    new PropertyMapItem('maintain-room-temperature', 'StHt',
        '{"type": "state", ' +
        '"common": { ' +
        '"name": "Maintain the room temperature steadily at 8°C and prevent the room from freezing by heating operation. On(1)/Off(0)",' +
        '"type": "number", ' +
        '"role": "indicator", ' +
        '"read": true, ' +
        '"write": true, ' +
        '"min": 0, ' +
        '"max": 1' +
        '}, ' +
        '"native": {} ' +
        '}'
    ),
    new PropertyMapItem('room-temperature', 'TemSen',
        '{"type": "state", ' +
        '"common": { ' +
        '"name": "Room temperature",' +
        '"type": "number", ' +
        '"role": "indicator", ' +
        '"read": true ' +
        '}, ' +
        '"native": {} ' +
        '}'
    ),
    new PropertyMapItem('energy-saving', 'SvSt',
        '{"type": "state", ' +
        '"common": { ' +
        '"name": "Energy saving mode. On(1)/Off(0)",' +
        '"type": "number", ' +
        '"role": "indicator", ' +
        '"read": true, ' +
        '"write": true, ' +
        '"min": 0, ' +
        '"max": 1' +
        '}, ' +
        '"native": {} ' +
        '}'
    )
];

module.exports = propertiesMap;