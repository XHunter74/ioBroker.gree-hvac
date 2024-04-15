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

const proptiesMap = [
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
    new PropertyMapItem('wind-speed', 'WdSpd',
        '{"type": "state", ' +
        '"common": { ' +
        '"name": "Wind speed, 0 - Auto, 1-4",' +
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
    new PropertyMapItem('display-state', 'Lig',
        '{"type": "state", ' +
        '"common": { ' +
        '"name": "Display On(1)/Off(2)",' +
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
    )
]

module.exports = proptiesMap;