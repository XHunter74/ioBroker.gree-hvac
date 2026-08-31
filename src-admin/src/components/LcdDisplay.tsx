import { Box } from '@mui/material';
import type { JSX } from 'react';

import { FAN_ICONS, MODE_ICONS } from '../consts';
import MSymbol from './MSymbol';

interface LcdDisplayProps {
    mode: number | undefined;
    fanSpeed: number | undefined;
    targetTemperature: number | undefined;
    /** `temperature-unit`: 0 = Celsius, 1 = Fahrenheit */
    unit: number | undefined;
}

/** The green LCD panel of the remote: mode glyph, fan speed and the 7-segment temperature. */
export default function LcdDisplay({ mode, fanSpeed, targetTemperature, unit }: LcdDisplayProps): JSX.Element {
    const isAuto = fanSpeed === 0;

    return (
        <Box className="gree-lcd">
            <Box sx={{ ml: '4px', pt: '5px' }}>
                <MSymbol
                    name={MODE_ICONS[mode ?? 1] || MODE_ICONS[1]}
                    size={20}
                />
            </Box>
            <Box sx={{ ml: '7px' }}>
                <Box sx={{ display: 'flex' }}>
                    <span>FAN</span>
                    {isAuto ? (
                        <Box
                            component="span"
                            sx={{ ml: '5px' }}
                        >
                            AUTO
                        </Box>
                    ) : null}
                </Box>
                <Box sx={{ display: 'flex', height: '15px' }}>
                    {!isAuto && fanSpeed !== undefined && FAN_ICONS[fanSpeed] ? (
                        <MSymbol
                            name={FAN_ICONS[fanSpeed]}
                            size={20}
                        />
                    ) : null}
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <Box
                        component="span"
                        className="gree-temperature"
                        sx={{ ml: '10px' }}
                    >
                        {targetTemperature ?? '--'}
                    </Box>
                    <Box
                        component="span"
                        className="gree-degree"
                    >
                        {unit === 1 ? '°F' : '°C'}
                    </Box>
                </Box>
            </Box>
        </Box>
    );
}
