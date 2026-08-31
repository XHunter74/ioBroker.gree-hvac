import type { DeviceStates } from './types';

/** Mirrors adapter.FORBIDDEN_CHARS of the js-controller, used by main.ts nameToId(). */
const FORBIDDEN_CHARS = /[\][*,;'"`<>\\?]/g;

/** Reproduces main.ts nameToId(): how a MAC becomes an ioBroker object id. */
export function macToObjectId(mac: string): string {
    return (mac || '').replace(FORBIDDEN_CHARS, '_');
}

/**
 * Resolves the ioBroker object id of a device returned by `getDevices`.
 *
 * `getDevices` reports the raw MAC, while the objects are keyed by nameToId(MAC).
 * Every device publishes `<objectId>.deviceInfo` containing its MAC, so the state
 * snapshot gives an exact mapping; the other two tiers are fallbacks for the case
 * where that state has not arrived yet.
 */
export function resolveObjectId(mac: string, states: DeviceStates): string {
    for (const objectId of Object.keys(states)) {
        const raw = states[objectId].deviceInfo;
        if (typeof raw === 'string') {
            try {
                if ((JSON.parse(raw) as { mac?: string }).mac === mac) {
                    return objectId;
                }
            } catch {
                // malformed deviceInfo - fall through to the next device
            }
        }
    }

    const candidate = macToObjectId(mac);
    if (states[candidate]) {
        return candidate;
    }

    const caseInsensitive = Object.keys(states).find(key => key.toLowerCase() === candidate.toLowerCase());
    if (caseInsensitive) {
        return caseInsensitive;
    }

    return candidate;
}

/** `common.name` may be a plain string or a translation object. */
export function resolveName(name: ioBroker.StringOrTranslated, lang: ioBroker.Languages): string {
    if (typeof name === 'string') {
        return name;
    }
    if (name && typeof name === 'object') {
        return name[lang] || name.en || Object.values(name)[0] || '';
    }
    return '';
}

/** States are numbers in ioBroker; anything else means "not reported yet". */
export function asNumber(value: ioBroker.StateValue | undefined): number | undefined {
    return typeof value === 'number' ? value : undefined;
}
