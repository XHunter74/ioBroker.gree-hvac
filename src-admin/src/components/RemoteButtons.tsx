import { Box, ButtonBase, Tooltip } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import { I18n } from '@iobroker/adapter-react-v5';
import type { JSX, ReactNode } from 'react';

import { ACTIVE_BG, ACTIVE_FG } from '../consts';
import type { GreeCommand } from '../types';
import MSymbol from './MSymbol';

interface RemoteButtonsProps {
    power: number | undefined;
    display: number | undefined;
    turbo: number | undefined;
    /** `temperature-unit`: 0 = Celsius, 1 = Fahrenheit */
    unit: number | undefined;
    offline: boolean;
    onCommand: (command: GreeCommand) => void;
}

const roundSx: SxProps<Theme> = {
    width: 40,
    height: 40,
    minWidth: 40,
    borderRadius: '50%',
    border: '1px solid',
    borderColor: 'divider',
    // the faceplate controls are drawn in the accent colour, as on the original tab
    color: 'primary.main',
};

const ovalSx: SxProps<Theme> = {
    // stretch to the column, so Mode / Fan / Turbo all end up the same width
    width: '100%',
    height: 40,
    px: '20px',
    borderRadius: '50px',
    border: '1px solid',
    borderColor: 'divider',
    mb: '7px',
    fontSize: 18,
    color: 'primary.main',
};

function RemoteButton(props: {
    title: string;
    active?: boolean;
    disabled?: boolean;
    /** let the button fill the wrapper, so a column of them is uniformly wide */
    stretch?: boolean;
    sx: SxProps<Theme>;
    onClick: () => void;
    children: ReactNode;
}): JSX.Element {
    const { title, active, disabled, stretch, sx, onClick, children } = props;
    return (
        <Tooltip title={title}>
            {/* a disabled ButtonBase does not emit the events the Tooltip listens to */}
            <span style={stretch ? { display: 'flex', width: '100%' } : undefined}>
                <ButtonBase
                    aria-label={title}
                    disabled={disabled}
                    onClick={onClick}
                    sx={{
                        ...sx,
                        ...(active ? { backgroundColor: ACTIVE_BG, color: ACTIVE_FG } : {}),
                        opacity: disabled ? 0.5 : 1,
                    }}
                >
                    {children}
                </ButtonBase>
            </span>
        </Tooltip>
    );
}

/** Power / display / unit row plus the temperature arrows and the Mode/Fan/Turbo ovals. */
export default function RemoteButtons({
    power,
    display,
    turbo,
    unit,
    offline,
    onCommand,
}: RemoteButtonsProps): JSX.Element {
    return (
        <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: '20px', mx: '15px' }}>
                <RemoteButton
                    title={I18n.t('Power On/Off')}
                    active={power === 1}
                    disabled={offline}
                    sx={roundSx}
                    onClick={() => onCommand('on-off-btn')}
                >
                    <MSymbol
                        name="power_settings_new"
                        size={30}
                    />
                </RemoteButton>
                <RemoteButton
                    title={I18n.t('Display On/Off')}
                    active={display === 1}
                    disabled={offline}
                    sx={roundSx}
                    onClick={() => onCommand('display-btn')}
                >
                    <MSymbol
                        name="wb_incandescent"
                        size={30}
                    />
                </RemoteButton>
                <RemoteButton
                    title={I18n.t('Temperature unit')}
                    disabled={offline}
                    sx={{ ...roundSx, fontSize: 21 }}
                    onClick={() => onCommand('temperature-unit-btn')}
                >
                    {/* the button offers the unit you would switch to */}
                    {unit === 1 ? '°C' : '°F'}
                </RemoteButton>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: '40px' }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: '55px' }}>
                    <RemoteButton
                        title={I18n.t('Increase temperature')}
                        disabled={offline}
                        sx={roundSx}
                        onClick={() => onCommand('temperature-up-btn')}
                    >
                        <MSymbol
                            name="expand_less"
                            size={30}
                        />
                    </RemoteButton>
                    <RemoteButton
                        title={I18n.t('Decrease temperature')}
                        disabled={offline}
                        sx={roundSx}
                        onClick={() => onCommand('temperature-down-btn')}
                    >
                        <MSymbol
                            name="expand_more"
                            size={30}
                        />
                    </RemoteButton>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', width: 120, ml: '10px' }}>
                    {/* The labels are silkscreen on a remote control button and stay English -
                        a translation would not fit the oval. Only the tooltips are translated. */}
                    <RemoteButton
                        title={I18n.t('Mode')}
                        disabled={offline}
                        stretch
                        sx={ovalSx}
                        onClick={() => onCommand('mode-btn')}
                    >
                        Mode
                    </RemoteButton>
                    <RemoteButton
                        title={I18n.t('Fan speed')}
                        disabled={offline}
                        stretch
                        sx={ovalSx}
                        onClick={() => onCommand('fan-btn')}
                    >
                        Fan
                    </RemoteButton>
                    <RemoteButton
                        title={I18n.t('Turbo On/Off')}
                        active={turbo === 1}
                        disabled={offline}
                        stretch
                        sx={ovalSx}
                        onClick={() => onCommand('turbo-btn')}
                    >
                        Turbo
                    </RemoteButton>
                </Box>
            </Box>
        </>
    );
}
