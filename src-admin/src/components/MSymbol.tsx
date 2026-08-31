import { Box } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import type { JSX } from 'react';

interface MSymbolProps {
    /** The Material Symbols ligature, e.g. `power_settings_new`. */
    name: string;
    size?: number;
    sx?: SxProps<Theme>;
}

/** The single place that knows about the Material Symbols ligature font. */
export default function MSymbol({ name, size, sx }: MSymbolProps): JSX.Element {
    return (
        <Box
            component="span"
            className="material-symbols-outlined"
            sx={{ fontSize: size ? `${size}px` : undefined, ...sx }}
        >
            {name}
        </Box>
    );
}
