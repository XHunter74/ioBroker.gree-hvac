class PropertyMapItem {
    name = '';
    hvacName = '';
    definition = '';
    fromConverter = null;
    toConverter = null;

    constructor(name, hvacName, definition, fromConverter = null, toConverter = null) {
        this.name = name;
        this.hvacName = hvacName;
        this.definition = definition;
        this.fromConverter = fromConverter;
        this.toConverter = toConverter;
    }
}

const propertiesMap = [
    new PropertyMapItem('power', 'Pow',
        '{"type": "state", ' +
        '"common": { ' +
        '"name": "Power", ' +
        '"desc": "Power state of conditioner", ' +
        '"type": "number", ' +
        '"role": "switch", ' +
        '"read": true, ' +
        '"write": true, ' +
        '"min": 0, ' +
        '"max": 1,' +
        '"states": {"0": "OFF", "1": "ON"} ' +
        '}, ' +
        '"native": {} ' +
        '}'
    ),
    new PropertyMapItem('mode', 'Mod',
        '{"type": "state", ' +
        '"common": { ' +
        '"name": "Conditioner mode ", ' +
        '"desc": "Conditioner mode(0: Auto, 1: Cooling, 4: Heating, 3: Ventilation, 2: Drying) ", ' +
        '"type": "number", ' +
        '"role": "level.mode.airconditioner", ' +
        '"read": true, ' +
        '"write": true, ' +
        '"min": 0, ' +
        '"max": 4, ' +
        ' "states": {"0": "Auto", "1": "Cooling", "4": "Heating", "3": "Ventilation", "2": "Drying"}' +
        '}, ' +
        '"native": {} ' +
        '}'
    ),
    new PropertyMapItem('temperature-unit', 'TemUn',
        '{"type": "state", ' +
        '"common": { ' +
        '"name": "Temperature unit",' +
        '"desc": "Temperature unit: 0 - °C, 1 - °F",' +
        '"type": "number", ' +
        '"role": "state", ' +
        '"read": true, ' +
        '"write": true, ' +
        '"min": 0, ' +
        '"max": 1, ' +
        '"states": {"0": "°C", "1": "°F"} ' +
        '}, ' +
        '"native": {} ' +
        '}'
    ),
    new PropertyMapItem('target-temperature', 'SetTem',
        '{"type": "state", ' +
        '"common": { ' +
        '"name": "Temperature",' +
        '"type": "number", ' +
        '"role": "value.temperature", ' +
        '"read": true, ' +
        '"write": true, ' +
        '"min": 16, ' +
        '"max": 86' +
        '}, ' +
        '"native": {} ' +
        '}',
        (values, value) => {
            var tempUnit = values['TemUn'];
            if (tempUnit === 0) {
                return value;
            }
            let farenheitValue = value * 1.8 + 32;
            const tempRec = values['TemRec'];
            if (tempRec === 0) {
                farenheitValue = Math.floor(farenheitValue);
            } else {
                farenheitValue = Math.ceil(farenheitValue);
            }
            return farenheitValue;
        },
        (payload) => {
            if (payload['TemUn'] === 1) {
                const celsius = Math.round((payload['SetTem'] - 32) * 5 / 9);
                const tempRec = (((payload['SetTem'] - 32) * 5 / 9) - celsius) >= 0 ? 1 : 0;
                payload['TemRec'] = tempRec;
                payload['SetTem'] = celsius;
            }
            return payload;
        }
    ),
    new PropertyMapItem('temp-rec', 'TemRec',
        '{"type": "state", ' +
        '"common": { ' +
        '"name": "TempRec", ' +
        '"desc": "This bit is used to distinguish between two Fahrenheit values", ' +
        '"type": "number", ' +
        '"role": "state", ' +
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
        '"name": "Fan speed", ' +
        '"desc": "Fan speed, 0 - Auto, 1, 2, 3",' +
        '"type": "number", ' +
        '"role": "level.mode.fan", ' +
        '"read": true, ' +
        '"write": true, ' +
        '"min": 0, ' +
        '"max": 3, ' +
        '"states": {"0": "Auto", "1": "1", "2": "2", "3": "3"} ' +
        '}, ' +
        '"native": {' +
        '"valuesMap": [' +
        '{"value": 0, "targetValue": 0},' +
        '{"value": 1, "targetValue": 1},' +
        '{"value": 2, "targetValue": 3},' +
        '{"value": 3, "targetValue": 5}' +
        ']' +
        '} ' +
        '}'
    ),
    new PropertyMapItem('air-mode', 'Air',
        '{"type": "state", ' +
        '"common": { ' +
        '"name": "Fresh air valve state", ' +
        '"desc": "Controls the state of the fresh air valve (not available on all units) On(1)/Off(0)",' +
        '"type": "number", ' +
        '"role": "switch", ' +
        '"read": true, ' +
        '"write": true, ' +
        '"min": 0, ' +
        '"max": 1, ' +
        '"states": {"0": "OFF", "1": "ON"} ' +
        '}, ' +
        '"native": {} ' +
        '}'
    ),
    new PropertyMapItem('x-fan-mode', 'Blo',
        '{"type": "state", ' +
        '"common": { ' +
        '"name": "X-Fan mode", ' +
        '"desc": "X-Fan mode, this function keeps the fan running for a while after shutting down. On(1)/Off(0)",' +
        '"type": "number", ' +
        '"role": "switch", ' +
        '"read": true, ' +
        '"write": true, ' +
        '"min": 0, ' +
        '"max": 1, ' +
        '"states": {"0": "OFF", "1": "ON"} ' +
        '}, ' +
        '"native": {} ' +
        '}'
    ),
    new PropertyMapItem('health-mode', 'Health',
        '{"type": "state", ' +
        '"common": { ' +
        '"name": "Health (Cold plasma) mode", ' +
        '"desc": "Health (Cold plasma) mode, only for devices equipped with anion generator. On(1)/Off(0)",' +
        '"type": "number", ' +
        '"role": "switch", ' +
        '"read": true, ' +
        '"write": true, ' +
        '"min": 0, ' +
        '"max": 1, ' +
        '"states": {"0": "OFF", "1": "ON"} ' +
        '}, ' +
        '"native": {} ' +
        '}'
    ),
    new PropertyMapItem('sleep-mode', 'SwhSlp',
        '{"type": "state", ' +
        '"common": { ' +
        '"name": "Sleep mode", ' +
        '"desc": "Sleep mode, which gradually changes the temperature. On(1)/Off(0)",' +
        '"type": "number", ' +
        '"role": "switch", ' +
        '"read": true, ' +
        '"write": true, ' +
        '"min": 0, ' +
        '"max": 1, ' +
        '"states": {"0": "OFF", "1": "ON"} ' +
        '}, ' +
        '"native": {} ' +
        '}'
    ),
    new PropertyMapItem('display-state', 'Lig',
        '{"type": "state", ' +
        '"common": { ' +
        '"name": "Display state", ' +
        '"desc": "Display On(1)/Off(0)",' +
        '"type": "number", ' +
        '"role": "switch", ' +
        '"read": true, ' +
        '"write": true, ' +
        '"min": 0, ' +
        '"max": 1, ' +
        '"states": {"0": "OFF", "1": "ON"} ' +
        '}, ' +
        '"native": {} ' +
        '}'
    ),
    new PropertyMapItem('swing-left-right', 'SwingLfRig',
        '{"type": "state", ' +
        '"common": { ' +
        '"name": "Swing left/right", ' +
        '"desc": "Swing left/right On(1)/Off(0), Fixed position(2-6) ",' +
        '"type": "number", ' +
        '"role": "level.mode.swing", ' +
        '"read": true, ' +
        '"write": true, ' +
        '"min": 0, ' +
        '"max": 6, ' +
        '"states": {"0": "OFF", "1": "ON", "2": "2", "3": "3", "4": "4", "5": "5", "6": "6"} ' +
        '}, ' +
        '"native": {} ' +
        '}'
    ),
    new PropertyMapItem('swing-up-down', 'SwUpDn',
        '{"type": "state", ' +
        '"common": { ' +
        '"name": "Swing up/down", ' +
        '"desc": "Swing up/down On(1)/Off(0), Fixed position(2-6) ",' +
        '"type": "number", ' +
        '"role": "level.mode.swing", ' +
        '"read": true, ' +
        '"write": true, ' +
        '"min": 0, ' +
        '"max": 6, ' +
        '"states": {"0": "OFF", "1": "ON", "2": "2", "3": "3", "4": "4", "5": "5", "6": "6"} ' +
        '}, ' +
        '"native": {} ' +
        '}'
    ),
    new PropertyMapItem('quiet', 'Quiet',
        '{"type": "state", ' +
        '"common": { ' +
        '"name": "Quiet mode", ' +
        '"desc": "Quiet mode On(1)/Off(0)",' +
        '"type": "number", ' +
        '"role": "switch", ' +
        '"read": true, ' +
        '"write": true, ' +
        '"min": 0, ' +
        '"max": 1, ' +
        '"states": {"0": "OFF", "1": "ON"} ' +
        '}, ' +
        '"native": {} ' +
        '}'
    ),
    new PropertyMapItem('turbo', 'Tur',
        '{"type": "state", ' +
        '"common": { ' +
        '"name": "Turbo", ' +
        '"desc": "Turbo On(1)/Off(0)",' +
        '"type": "number", ' +
        '"role": "switch", ' +
        '"read": true, ' +
        '"write": true, ' +
        '"min": 0, ' +
        '"max": 1, ' +
        '"states": {"0": "OFF", "1": "ON"} ' +
        '}, ' +
        '"native": {} ' +
        '}'
    ),
    new PropertyMapItem('maintain-room-temperature', 'StHt',
        '{"type": "state", ' +
        '"common": { ' +
        '"name": "Maintain the room temperature", ' +
        '"desc": "Maintain the room temperature steadily at 8°C and prevent the room from freezing by heating operation. On(1)/Off(0)",' +
        '"type": "number", ' +
        '"role": "switch", ' +
        '"read": true, ' +
        '"write": true, ' +
        '"min": 0, ' +
        '"max": 1, ' +
        '"states": {"0": "OFF", "1": "ON"} ' +
        '}, ' +
        '"native": {} ' +
        '}'
    ),
    new PropertyMapItem('room-temperature', 'TemSen',
        '{"type": "state", ' +
        '"common": { ' +
        '"name": "Room temperature", ' +
        '"type": "number", ' +
        '"role": "value.temperature", ' +
        '"read": true ' +
        '}, ' +
        '"native": {} ' +
        '}'
    ),
    new PropertyMapItem('energy-saving', 'SvSt',
        '{"type": "state", ' +
        '"common": { ' +
        '"name": "Energy saving mode", ' +
        '"desc": "Energy saving mode. On(1)/Off(0)",' +
        '"type": "number", ' +
        '"role": "switch", ' +
        '"read": true, ' +
        '"write": true, ' +
        '"min": 0, ' +
        '"max": 1, ' +
        '"states": {"0": "OFF", "1": "ON"} ' +
        '}, ' +
        '"native": {} ' +
        '}'
    )
];

module.exports = propertiesMap, PropertyMapItem;