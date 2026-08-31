import {
    Alert,
    AppBar,
    Box,
    CssBaseline,
    IconButton,
    LinearProgress,
    MenuItem,
    Select,
    StyledEngineProvider,
    ThemeProvider,
    Toolbar,
    Tooltip,
    Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
    AdminConnection,
    GenericApp,
    I18n,
    Loader,
    type GenericAppProps,
    type GenericAppSettings,
    type GenericAppState,
} from '@iobroker/adapter-react-v5';
import type { JSX } from 'react';

import DeviceCard from './components/DeviceCard';
import RenameDialog from './components/RenameDialog';
import { ADAPTER_NAME } from './consts';
import type { DeviceInfo, DeviceStates, GreeCommand, MessageResponse, RawDevice } from './types';
import { resolveName, resolveObjectId } from './utils';

import logo from './assets/air-conditioner.png';
import './gree.css';

import enLang from './i18n/en.json';
import deLang from './i18n/de.json';
import ruLang from './i18n/ru.json';
import ptLang from './i18n/pt.json';
import nlLang from './i18n/nl.json';
import frLang from './i18n/fr.json';
import itLang from './i18n/it.json';
import esLang from './i18n/es.json';
import plLang from './i18n/pl.json';
import ukLang from './i18n/uk.json';
import zhCnLang from './i18n/zh-cn.json';

/** The vite dev server runs on this port range and has to talk to a real admin elsewhere. */
const DEV_PORT_FROM = 3000;
const DEV_PORT_TO = 3100;
/** The initial subscribeState replay delivers ~21 states per device - coalesce them. */
const FLUSH_DELAY_MS = 50;

declare global {
    interface Window {
        sentryDSN: string;
    }
}

interface AppState extends GenericAppState {
    /** instance numbers of all gree-hvac instances */
    instances: number[];
    selectedInstance: number;
    /** identity of the devices, from the getDevices message */
    devices: DeviceInfo[];
    /** live values, from the state subscription */
    states: DeviceStates;
    loadingDevices: boolean;
    renameDevice: DeviceInfo | null;
}

export default class App extends GenericApp<GenericAppProps, AppState> {
    private statesBuffer: DeviceStates = {};
    private flushTimer: ReturnType<typeof setTimeout> | null = null;
    private subscribedPattern = '';

    constructor(props: GenericAppProps) {
        const port = parseInt(window.location.port, 10);
        const extendedProps: GenericAppSettings = {
            ...props,
            adapterName: ADAPTER_NAME,
            // this.socket is typed as AdminConnection, while the default would be the base
            // Connection. GenericAppProps.Connection is typed as an instance although
            // GenericApp uses it as a constructor, hence the cast.
            Connection: AdminConnection as unknown as GenericAppSettings['Connection'],
            // this is a tab, not a configuration page
            bottomButtons: false,
            encryptedFields: [],
            doNotLoadAllObjects: true,
            translations: {
                en: enLang,
                de: deLang,
                ru: ruLang,
                pt: ptLang,
                nl: nlLang,
                fr: frLang,
                it: itLang,
                es: esLang,
                pl: plLang,
                uk: ukLang,
                'zh-cn': zhCnLang,
            },
            sentryDSN: window.sentryDSN,
        };

        if (port >= DEV_PORT_FROM && port <= DEV_PORT_TO) {
            // vite dev server: the admin lives somewhere else, see index.html
            const query = new URLSearchParams(window.location.search);
            extendedProps.socket = {
                port: parseInt(query.get('port') || '8081', 10),
                host: query.get('host') || window.location.hostname,
            };
        }

        super(props, extendedProps);

        this.state = {
            ...this.state,
            instances: [],
            selectedInstance: this.instance,
            devices: [],
            states: {},
            loadingDevices: false,
            renameDevice: null,
        };
    }

    private get namespace(): string {
        return `${ADAPTER_NAME}.${this.state.selectedInstance}`;
    }

    onConnectionReady(): void {
        void this.socket
            .getAdapterInstances(ADAPTER_NAME)
            .then(list => {
                const instances = list
                    .map(obj => parseInt(obj._id.split('.').pop() as string, 10))
                    .filter(num => !isNaN(num))
                    .sort((a, b) => a - b);
                // The tab is a singleton, so admin does not pass ?instance= and GenericApp
                // always reports 0. Fall back to the first existing instance instead.
                const selectedInstance = instances.includes(this.instance) ? this.instance : (instances[0] ?? 0);
                this.setState({ instances, selectedInstance }, () => this.startInstance());
            })
            .catch(e => this.showAlert(`Cannot read instances: ${e}`, 'error'));
    }

    componentWillUnmount(): void {
        this.unsubscribe();
        if (this.flushTimer) {
            clearTimeout(this.flushTimer);
            this.flushTimer = null;
        }
        super.componentWillUnmount();
    }

    private startInstance(): void {
        this.unsubscribe();
        this.statesBuffer = {};
        this.setState({ devices: [], states: {} }, () => {
            this.subscribedPattern = `${this.namespace}.*`;
            // this also replays the current value of every matching state
            void this.socket.subscribeState(this.subscribedPattern, this.onStateChange);
            void this.loadDevices();
        });
    }

    private unsubscribe(): void {
        if (this.subscribedPattern) {
            this.socket.unsubscribeState(this.subscribedPattern, this.onStateChange);
            this.subscribedPattern = '';
        }
    }

    private onStateChange = (id: string, state: ioBroker.State | null | undefined): void => {
        const prefix = `${this.namespace}.`;
        if (!id.startsWith(prefix)) {
            return;
        }
        const parts = id.substring(prefix.length).split('.');
        // only <objectId>.<stateId>, i.e. not info.connection
        if (parts.length !== 2 || parts[0] === 'info') {
            return;
        }
        const [objectId, stateId] = parts;
        this.statesBuffer[objectId] ||= {};
        this.statesBuffer[objectId][stateId] = state ? state.val : null;

        this.flushTimer ||= setTimeout(() => this.flushStates(), FLUSH_DELAY_MS);
    };

    private flushStates(): void {
        this.flushTimer = null;
        const buffer = this.statesBuffer;
        this.statesBuffer = {};

        this.setState(prev => {
            const states: DeviceStates = { ...prev.states };
            for (const objectId of Object.keys(buffer)) {
                states[objectId] = { ...(states[objectId] || {}), ...buffer[objectId] };
            }
            // a late deviceInfo state can still correct the MAC -> objectId mapping
            const devices = prev.devices.map(device => {
                const objectId = resolveObjectId(device.mac, states);
                return objectId === device.objectId ? device : { ...device, objectId };
            });
            return { states, devices };
        });
    }

    private async loadDevices(): Promise<void> {
        this.setState({ loadingDevices: true });
        try {
            const response = await this.socket.sendTo<MessageResponse<RawDevice[]>>(this.namespace, 'getDevices', {});
            if (response?.error) {
                throw new Error(response.error);
            }
            const lang = I18n.getLanguage();
            this.setState(prev => ({
                loadingDevices: false,
                // only the identity is taken from here - live values come from the subscription
                devices: (response?.result || []).map(raw => ({
                    mac: raw.id,
                    ip: raw.ip,
                    name: resolveName(raw.name, lang) || raw.id,
                    objectId: resolveObjectId(raw.id, prev.states),
                })),
            }));
        } catch (e) {
            this.setState({ loadingDevices: false });
            this.showAlert(I18n.t((e as Error).message), 'error');
        }
    }

    private onCommand = async (objectId: string, command: GreeCommand): Promise<void> => {
        try {
            const response = await this.socket.sendTo<MessageResponse<string>>(this.namespace, 'remoteCommand', {
                deviceId: objectId,
                command,
            });
            if (response?.error) {
                this.showAlert(I18n.t(response.error), 'error');
            }
            // no optimistic update: the adapter acks the state and the subscription brings it back
        } catch (e) {
            this.showAlert(I18n.t((e as Error).message), 'error');
        }
    };

    private onRenameSave = async (device: DeviceInfo, name: string): Promise<void> => {
        try {
            const response = await this.socket.sendTo<MessageResponse<{ deviceId: string; name: string }>>(
                this.namespace,
                'renameDevice',
                { deviceId: device.objectId, name },
            );
            if (response?.error) {
                this.showAlert(I18n.t(response.error), 'error');
                return;
            }
            const newName = response?.result?.name ?? name;
            this.setState(prev => ({
                devices: prev.devices.map(item =>
                    item.objectId === device.objectId ? { ...item, name: newName } : item,
                ),
            }));
            this.showAlert(I18n.t('Device renamed'), 'success');
        } catch (e) {
            this.showAlert(I18n.t((e as Error).message), 'error');
        }
    };

    private renderDevices(): JSX.Element | null {
        if (!this.state.devices.length) {
            return this.state.loadingDevices ? null : (
                <Typography sx={{ opacity: 0.6 }}>{I18n.t('No devices found')}</Typography>
            );
        }
        return (
            <>
                {this.state.devices.map(device => (
                    <DeviceCard
                        key={device.objectId}
                        device={device}
                        states={this.state.states[device.objectId] || {}}
                        onCommand={this.onCommand}
                        onRename={renameDevice => this.setState({ renameDevice })}
                    />
                ))}
            </>
        );
    }

    render(): JSX.Element {
        if (!this.state.loaded) {
            return (
                <StyledEngineProvider injectFirst>
                    <ThemeProvider theme={this.state.theme}>
                        <Loader themeType={this.state.themeType} />
                    </ThemeProvider>
                </StyledEngineProvider>
            );
        }

        return (
            <StyledEngineProvider injectFirst>
                <ThemeProvider theme={this.state.theme}>
                    <CssBaseline />
                    <Box
                        className="App"
                        sx={{
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                            backgroundColor: 'background.default',
                            color: 'text.primary',
                        }}
                    >
                        <AppBar
                            position="static"
                            color="default"
                            enableColorOnDark
                        >
                            <Toolbar variant="dense">
                                <img
                                    src={logo}
                                    alt=""
                                    style={{ height: 36, marginRight: 12 }}
                                />
                                <Typography
                                    variant="h6"
                                    sx={{ flexGrow: 1 }}
                                >
                                    {I18n.t('Gree-HVAC adapter')}
                                </Typography>
                                {this.state.instances.length > 1 ? (
                                    <Select
                                        size="small"
                                        variant="standard"
                                        value={this.state.selectedInstance}
                                        onChange={e =>
                                            this.setState({ selectedInstance: Number(e.target.value) }, () =>
                                                this.startInstance(),
                                            )
                                        }
                                        sx={{ mr: 2 }}
                                    >
                                        {this.state.instances.map(num => (
                                            <MenuItem
                                                key={num}
                                                value={num}
                                            >
                                                {`${I18n.t('Instance')} ${num}`}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                ) : null}
                                <Tooltip title={I18n.t('Refresh devices')}>
                                    <span>
                                        <IconButton
                                            aria-label={I18n.t('Refresh devices')}
                                            disabled={this.state.loadingDevices}
                                            onClick={() => void this.loadDevices()}
                                        >
                                            <RefreshIcon />
                                        </IconButton>
                                    </span>
                                </Tooltip>
                            </Toolbar>
                            {this.state.loadingDevices ? <LinearProgress /> : null}
                        </AppBar>

                        {/* GenericApp sets body { overflow: hidden }, so this container has to scroll */}
                        <Box
                            sx={{
                                flex: 1,
                                overflow: 'auto',
                                p: 2,
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: 2,
                                alignContent: 'flex-start',
                            }}
                        >
                            {this.state.connected ? null : (
                                <Alert
                                    severity="warning"
                                    sx={{ width: '100%' }}
                                >
                                    {I18n.t('Not connected to ioBroker')}
                                </Alert>
                            )}
                            {this.renderDevices()}
                        </Box>
                    </Box>

                    <RenameDialog
                        // remount per device so the text field starts with its current name
                        key={this.state.renameDevice?.objectId ?? 'none'}
                        device={this.state.renameDevice}
                        onClose={() => this.setState({ renameDevice: null })}
                        onSave={this.onRenameSave}
                    />
                    {this.renderHelperDialogs()}
                </ThemeProvider>
            </StyledEngineProvider>
        );
    }
}
