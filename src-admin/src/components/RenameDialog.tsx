import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material';
import { I18n } from '@iobroker/adapter-react-v5';
import { useState } from 'react';
import type { JSX } from 'react';

import type { DeviceInfo } from '../types';

interface RenameDialogProps {
    /** `null` closes the dialog. */
    device: DeviceInfo | null;
    onClose: () => void;
    onSave: (device: DeviceInfo, name: string) => void;
}

/**
 * The caller has to key this component by the device, so that opening it for a
 * different device remounts it with the right initial name.
 */
export default function RenameDialog({ device, onClose, onSave }: RenameDialogProps): JSX.Element {
    const [name, setName] = useState(device ? device.name : '');

    const trimmed = name.trim();
    const canSave = !!device && !!trimmed && trimmed !== device.name;

    const save = (): void => {
        if (device && canSave) {
            onSave(device, trimmed);
            onClose();
        }
    };

    return (
        <Dialog
            open={!!device}
            onClose={onClose}
            maxWidth="xs"
            fullWidth
        >
            <DialogTitle>{I18n.t('Rename device')}</DialogTitle>
            <DialogContent>
                <TextField
                    autoFocus
                    fullWidth
                    variant="standard"
                    margin="dense"
                    label={I18n.t('Name')}
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onKeyUp={e => {
                        if (e.key === 'Enter') {
                            save();
                        }
                    }}
                />
            </DialogContent>
            <DialogActions>
                <Button
                    variant="contained"
                    color="primary"
                    disabled={!canSave}
                    onClick={save}
                >
                    {I18n.t('Save')}
                </Button>
                <Button
                    variant="outlined"
                    color="grey"
                    onClick={onClose}
                >
                    {I18n.t('Cancel')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
