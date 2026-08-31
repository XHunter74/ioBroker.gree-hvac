import { Box, Card, IconButton, Tooltip, Typography } from '@mui/material';
import { I18n } from '@iobroker/adapter-react-v5';
import type { JSX } from 'react';

import { CARD_BG_LIGHT, CARD_WIDTH } from '../consts';
import type { DeviceInfo, GreeCommand, StatesMap } from '../types';
import { asNumber } from '../utils';
import LcdDisplay from './LcdDisplay';
import MSymbol from './MSymbol';
import RemoteButtons from './RemoteButtons';

interface DeviceCardProps {
    device: DeviceInfo;
    states: StatesMap;
    onCommand: (objectId: string, command: GreeCommand) => void;
    onRename: (device: DeviceInfo) => void;
}

export default function DeviceCard({ device, states, onCommand, onRename }: DeviceCardProps): JSX.Element {
    const offline = states.alive === false;

    return (
        <Card
            // in the dark theme background.paper equals background.default, so the card
            // needs the elevation overlay to read as a separate surface
            elevation={4}
            sx={{
                width: CARD_WIDTH,
                // the dark theme keeps background.paper plus the elevation overlay
                backgroundColor: theme => (theme.palette.mode === 'dark' ? undefined : CARD_BG_LIGHT),
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: '15px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
            }}
        >
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: '10px' }}>
                {offline ? (
                    <Tooltip title={I18n.t('Device is offline')}>
                        <Box
                            component="span"
                            sx={{ display: 'flex', mr: '10px' }}
                        >
                            <MSymbol
                                name="wifi_off"
                                size={17}
                                sx={{ color: 'error.main' }}
                            />
                        </Box>
                    </Tooltip>
                ) : null}
                <Tooltip title={`${device.mac} - ${device.ip}`}>
                    <Typography
                        component="span"
                        sx={{ fontSize: 14 }}
                    >
                        {device.name}
                    </Typography>
                </Tooltip>
                <Tooltip title={I18n.t('Edit device name')}>
                    <IconButton
                        size="small"
                        aria-label={I18n.t('Edit device name')}
                        onClick={() => onRename(device)}
                        sx={{ ml: '6px' }}
                    >
                        <MSymbol
                            name="edit"
                            size={17}
                            sx={{ color: 'primary.main' }}
                        />
                    </IconButton>
                </Tooltip>
            </Box>

            <LcdDisplay
                mode={asNumber(states.mode)}
                fanSpeed={asNumber(states['fan-speed'])}
                targetTemperature={asNumber(states['target-temperature'])}
                unit={asNumber(states['temperature-unit'])}
            />

            <Box sx={{ width: '100%' }}>
                <RemoteButtons
                    power={asNumber(states.power)}
                    display={asNumber(states['display-state'])}
                    turbo={asNumber(states.turbo)}
                    unit={asNumber(states['temperature-unit'])}
                    offline={offline}
                    onCommand={command => onCommand(device.objectId, command)}
                />
            </Box>
        </Card>
    );
}
