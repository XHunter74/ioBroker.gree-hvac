import type { PropertyMapItem } from './properties_map';

interface ValuesMapEntry {
    value: unknown;
    targetValue: unknown;
}

interface PropertyDefinition {
    native?: {
        valuesMap?: ValuesMapEntry[];
    };
    common: Record<string, unknown>;
}

/**
 *
 */
class AdapterUtils {
    /**
     *
     */
    static fahrenheitToCelsius(fahrenheit: number): number {
        return Math.round(((fahrenheit - 32) * 5) / 9);
    }

    /**
     *
     */
    static celsiusToFahrenheit(celsius: number): number {
        return Math.round(celsius * 1.8 + 32);
    }

    /**
     *
     */
    static validateIPList(ipList: Array<{ deviceIp: string }>): boolean {
        try {
            const ipPattern =
                /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
            for (const networkItem of ipList) {
                if (!ipPattern.test(networkItem.deviceIp)) {
                    return false;
                }
            }
            return true;
        } catch {
            return false;
        }
    }

    /**
     *
     */
    static convertValue(values: Record<string, unknown>, value: unknown, mapItem: PropertyMapItem): unknown {
        if (!mapItem.fromConverter) {
            return value;
        }
        return mapItem.fromConverter(values, value);
    }

    /**
     *
     */
    static mapValue(value: unknown, mapItem: PropertyMapItem): unknown {
        const definition = JSON.parse(mapItem.definition) as PropertyDefinition;
        if (definition.native?.valuesMap) {
            const valuesMap = definition.native.valuesMap;
            const valueMap = valuesMap.find(item => item.targetValue === value);
            if (valueMap) {
                return valueMap.value;
            }
        }
        return value;
    }

    /**
     *
     */
    static areObjectsTheSame(
        adapterObject: ioBroker.Object,
        definition: { common: unknown; native: unknown },
    ): boolean {
        let result = JSON.stringify(adapterObject.common) === JSON.stringify(definition.common);
        result = result && JSON.stringify(adapterObject.native) === JSON.stringify(definition.native);
        return result;
    }
}

export default AdapterUtils;
