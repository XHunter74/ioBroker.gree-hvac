/** `mode` state value -> Material Symbols ligature. */
export const MODE_ICONS: Record<number, string> = {
    0: 'autorenew',
    1: 'mode_cool',
    2: 'water_drop',
    3: 'mode_fan',
    4: 'sunny',
};

/**
 * `fan-speed` state value -> Material Symbols ligature. 0 means "auto" and is
 * rendered as text instead. The old tab had no icon for 4 and kept showing the
 * previous glyph, so 4 is mapped to the full bars here.
 */
export const FAN_ICONS: Record<number, string> = {
    1: 'signal_cellular_alt_1_bar',
    2: 'signal_cellular_alt_2_bar',
    3: 'signal_cellular_alt',
    4: 'signal_cellular_alt',
};

/** Background of an engaged button (power / display / turbo), as on the original faceplate. */
export const ACTIVE_BG = 'rgb(248, 209, 176)';
/** The peach background needs dark text - the theme colour would be unreadable in dark mode. */
export const ACTIVE_FG = 'rgba(0, 0, 0, 0.87)';

/** Faceplate colour of the remote, as on the original tab. Only used in the light theme. */
export const CARD_BG_LIGHT = 'rgb(238, 233, 233)';

export const CARD_WIDTH = 200;

export const ADAPTER_NAME = 'gree-hvac';
