class AdapterUtils {

    static fahrenheitToCelsius(fahrenheit) {
        const celsius = Math.round((fahrenheit - 32) * 5 / 9);
        return celsius;
    }

    static celsiusToFahrenheit(celsius) {
        const fahrenheit = Math.round((celsius * 1.8) + 32);
        return fahrenheit;
    }

    /**
    * @param {any[]} ipList
    */
    static validateIPList(ipList) {
        try {
            // Regular expression for IP address
            const ipPattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

            // Validate each IP
            for (const networkItem of ipList) {
                if (!ipPattern.test(networkItem.deviceIp)) {
                    return false;
                }
            }

            // If all IPs are valid
            return true;
        } catch {
            return false;
        }
    }

    static convertValue(values, value, mapItem) {
        if (!mapItem.fromConverter) {
            return value;
        }
        value = mapItem.fromConverter(values, value);
        return value;
    }

    /**
     * @param {any} value
     * @param {any} mapItem
     */
    static mapValue(value, mapItem) {
        const definition = JSON.parse(mapItem.definition);
        if (definition.native && definition.native.valuesMap) {
            const valuesMap = definition.native.valuesMap;
            const valueMap = valuesMap.find(item => item.targetValue === value);
            if (valueMap) {
                value = valueMap.value;
            }
        }
        return value;
    }

    /**
     * @param {ioBroker.Object} adapterObject
     * @param {{ common: any; native: any; }} definition
     */
    static areObjectsTheSame(adapterObject, definition) {
        let result = JSON.stringify(adapterObject.common) === JSON.stringify(definition.common);
        result = result && JSON.stringify(adapterObject.native) === JSON.stringify(definition.native);
        return result;
    }
}

module.exports = AdapterUtils;