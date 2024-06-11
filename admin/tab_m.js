/*global $, io, systemLang, translateAll*/
const debugServer = 'http://172.23.215.95:8081/';
const path = location.pathname;

let isDebug = false;

const parts = path.split('/');
parts.splice(-3);

const query = (window.location.search || '').replace(/^\?/, '').replace(/#.*$/, '');
const args = {};

// parse parameters
query.trim().split('&').filter((t) => { return t.trim(); }).forEach((b, i) => {
    const parts = b.split('=');
    if (!i && parts.length === 1 && !isNaN(parseInt(b, 10))) {
        args.instance = parseInt(b, 10);
    }
    const name = parts[0];
    args[name] = parts.length === 2 ? parts[1] : true;

    if (name === 'instance') {
        args.instance = parseInt(args.instance, 10) || 0;
    }

    if (args[name] === 'true') {
        args[name] = true;
    } else if (args[name] === 'false') {
        args[name] = false;
    }
});

if (args.debug) {
    isDebug = true;
}

instance = args.instance; // eslint-disable-line no-undef

if (typeof instance === 'undefined') {
    instance = 0; // eslint-disable-line no-undef
}

const namespace = 'gree-hvac.' + instance; // eslint-disable-line no-undef
// const namespace = 'gree-hvac.0';

if (isDebug) {
    socket = io.connect(debugServer, { path: 'socket.io' }); // eslint-disable-line no-undef
} else {
    socket = io.connect('/', { path: parts.join('/') + '/socket.io' }); // eslint-disable-line no-undef
}

const Materialize = (typeof M !== 'undefined') ? M : Materialize;// eslint-disable-line no-undef

socket.emit('subscribeStates', namespace + '.*'); // eslint-disable-line no-undef

socket.on('stateChange', (id, state) => { // eslint-disable-line no-undef
    if (id.substring(0, namespace.length) !== namespace) return;
    const parts = id.split('.');
    const stateId = parts[parts.length - 1];
    const deviceId = parts[parts.length - 2];
    processStateChange(deviceId, stateId, state.val);
});

function processStateChange(deviceId, stateId, stateVal) {
    switch (stateId) {
        case 'target-temperature':
            $('#' + `${deviceId}-target-temperature`).text(stateVal);
            break;
        case 'mode':
            switch (stateVal) {
                case 0:
                    $('#' + `${deviceId}-hvac-mode`).text('autorenew');
                    break;
                case 1:
                    $('#' + `${deviceId}-hvac-mode`).text('mode_cool');
                    break;
                case 2:
                    $('#' + `${deviceId}-hvac-mode`).text('water_drop');
                    break;
                case 3:
                    $('#' + `${deviceId}-hvac-mode`).text('mode_fan');
                    break;
                case 4:
                    $('#' + `${deviceId}-hvac-mode`).text('sunny');
                    break;
            }
            break;
        case 'power':
            if (stateVal === 1) {
                $('#' + `${deviceId}-on-off-btn`).addClass('power-on');
            } else {
                $('#' + `${deviceId}-on-off-btn`).removeClass('power-on');
            }
            break;
        case 'turbo':
            if (stateVal === 1) {
                $('#' + `${deviceId}-turbo-btn`).addClass('turbo-on');
            } else {
                $('#' + `${deviceId}-turbo-btn`).removeClass('turbo-on');
            }
            break;
        case 'display-state':
            if (stateVal === 1) {
                $('#' + `${deviceId}-display-btn`).addClass('display-on');
            } else {
                $('#' + `${deviceId}-display-btn`).removeClass('display-on');
            }
            break;
        case 'fan-speed':
            if (stateVal === 0) {
                $('#' + `${deviceId}-fan-mode`).addClass('show-element');
                $('#' + `${deviceId}-fan-mode`).removeClass('hide-element');
                $('#' + `${deviceId}-fan-speed`).addClass('hide-element');
                $('#' + `${deviceId}-fan-speed`).removeClass('show-element');
            } else {
                $('#' + `${deviceId}-fan-mode`).addClass('hide-element');
                $('#' + `${deviceId}-fan-mode`).removeClass('show-element');
                $('#' + `${deviceId}-fan-speed`).addClass('show-element');
                $('#' + `${deviceId}-fan-speed`).removeClass('hide-element');
                if (stateVal === 1) {
                    $('#' + `${deviceId}-fan-speed`).text('signal_cellular_alt_1_bar');
                } else if (stateVal === 2) {
                    $('#' + `${deviceId}-fan-speed`).text('signal_cellular_alt_2_bar');
                } else if (stateVal === 3) {
                    $('#' + `${deviceId}-fan-speed`).text('signal_cellular_alt');
                }
            }
            break;
        case 'alive':
            if (stateVal === true) {
                $('#' + `${deviceId}-alive`).addClass('hide-element');
                $('#' + `${deviceId}-alive`).removeClass('show-element');
            } else {
                $('#' + `${deviceId}-alive`).addClass('show-element');
                $('#' + `${deviceId}-alive`).removeClass('hide-element');
            }
            break;
        case 'temperature-unit':
            if (stateVal === 1) {
                $('#' + `${deviceId}-temperature-unit`).text('°F');
                $('#' + `${deviceId}-temperature-unit-btn > span`).text('°C');
            } else {
                $('#' + `${deviceId}-temperature-unit`).text('°C');
                $('#' + `${deviceId}-temperature-unit-btn > span`).text('°F');
            }
            break;
    }
}

let systemConfig; // eslint-disable-line no-unused-vars
let devices = [];

$(() => {
    'use strict';
    loadSystemConfig(() => {
        if (typeof translateAll === 'function') {
            translateAll();
        }
        getDevices();
    });
});


function getDevices() {
    sendTo(namespace, 'getDevices', {}, (data) => {
        if (data) {
            if (data.error) {
                console.log('Error: ' + data.error);
            } else {
                console.log('Devices: ' + JSON.stringify(data.result));
                devices = data.result;
                showDevices();
            }
        }
    });
}

function showDevices() {
    let html = '';
    if (!devices || !devices.length || devices.length === 0) {
        return;
    } else {
        for (let i = 0; i < devices.length; i++) {
            const d = devices[i];
            const card = getCard(d);
            html += card;
        }
    }
    $('#devices').html(html);
    for (let i = 0; i < devices.length; i++) {
        const d = devices[i];
        for (const key in d) {
            if (Object.prototype.hasOwnProperty.call(d, key)) {
                const stateId = key;
                const state = d[key];
                processStateChange(d.id, stateId, state);
            }
        }
    }
    assignClickEvents();
}

// function isDeviceShown(deviceId) {
//     return $('#' + deviceId).length > 0;
// }

function getCard(device) {
    let html = '';
    html += `<div id="${device.id}" class="device-card">`;
    html += `   <div style="display:flex;justify-content: center;margin-top: 10px;">`;
    html += `       <span id="${device.id}-alive" class="material-symbols-outlined alive-icon hide-element">wifi_off</span>`;
    html += `       <span id="${device.id}-device-name" style="font-size: 14px;">${device.name}</span>`;
    html += `       <span id="${device.id}-edit" class="material-symbols-outlined edit-btn">edit</span>`;
    html += `   </div>`;
    html += `   <div class="lcd-display">`;
    html += '       <div style="margin-left: 4px;padding-top: 5px;">';
    html += `           <span id="${device.id}-hvac-mode" class="material-symbols-outlined" style="font-size: 20px;">mode_cool</span>`;
    html += '       </div>';
    html += '       <div style="margin-left: 7px;">';
    html += '           <div style="display: flex;">';
    html += '               <span class="">FAN</span>';
    html += `               <span id="${device.id}-fan-mode" class="" style="margin-left: 5px;">AUTO</span>`;
    html += '           </div>';
    html += '           <div style="display: flex;height: 15px;">';
    html += `               <span id="${device.id}-fan-speed" class="material-symbols-outlined" style="font-size: 20px;">signal_cellular_alt</span>`;
    html += '           </div>';
    html += '           <div style="display: flex;justify-content: center;align-items: center;">';
    html += `               <span id="${device.id}-target-temperature" style="margin-left: 10px;" class="temperature">${device['target-temperature']}</span>`;
    html += `               <span id="${device.id}-temperature-unit" class="degree">°C</span>`;
    html += '           </div>';
    html += '       </div>';
    html += `   </div>`;
    html += '   <div style="display:flex;justify-content: space-between;margin-bottom: 20px;margin-left: 15px;margin-right: 15px;">';
    html += `           <a id="${device.id}-on-off-btn" class="round-btn ctrl-btn" href="#"><span class="material-symbols-outlined">power_settings_new</span></a>`;
    html += `           <a id="${device.id}-display-btn" class="round-btn ctrl-btn" href="#"><span class="material-symbols-outlined">wb_incandescent</span></a>`;
    html += `           <a id="${device.id}-temperature-unit-btn" class="round-btn-txt ctrl-btn" href="#"><span class="material-symbols-outlined">°C</span></a>`;
    html += '   </div>';
    html += '   <div style="display:flex;justify-content: center;margin-bottom: 40px;">';
    html += '       <div style="display: flex;flex-direction: column;gap: 55px;">';
    html += `           <a id="${device.id}-temperature-up-btn" class="round-btn ctrl-btn" href="#"><span class="material-symbols-outlined">expand_less</span></a>`;
    html += `           <a id="${device.id}-temperature-down-btn" class="round-btn ctrl-btn" href="#"><span class="material-symbols-outlined">expand_more</span></a>`;
    html += `       </div>`;
    html += '       <div style="display: flex;flex-direction: column;">';
    html += `           <a id="${device.id}-mode-btn" class="oval-btn ctrl-btn" href="#"><span>Mode</span></a>`;
    html += `           <a id="${device.id}-fan-btn" class="oval-btn ctrl-btn" href="#"><span>Fan</span></a>`;
    html += `           <a id="${device.id}-turbo-btn" class="oval-btn ctrl-btn" href="#"><span>Turbo</span></a>`;
    html += '       </div>';
    html += '   </div>';
    html += '</div>';
    return html;
}

function assignClickEvents() {
    $('.ctrl-btn').click((event) => {
        const btn = event.currentTarget.id;
        const parts = btn.split('-');
        const command = parts.slice(1).join('-');
        console.log('clicked: ' + btn);
        const deviceId = $(event.currentTarget).parents('.device-card').attr('id');
        // console.log('deviceId: ' + deviceId);
        // console.log('command: ' + command);
        sendTo(namespace, 'remoteCommand', { deviceId: deviceId, command: command }, (data) => {
            if (data) {
                if (data.error) {
                    console.log('Error: ' + data.error);
                } else {
                    console.log('Result: ' + data.result);
                }
            }
        });
    });
    $('.edit-btn').click((event) => {
        const deviceId = $(event.currentTarget).parents('.device-card').attr('id');
        const deviceName = $(`#${deviceId}-device-name`).text();
        // console.log('deviceId: ' + deviceId);
        // console.log('deviceName: ' + deviceName);
        $('#modaledit').find('input[id=\'d_name\']').val(deviceName);
        $('#modaledit a.btn[name=\'save\']').unbind('click');
        $('#modaledit a.btn[name=\'save\']').click(() => {
            const newName = $('#modaledit').find('input[id=\'d_name\']').val();
            console.log('newName: ' + newName);
            sendTo(namespace, 'renameDevice', { deviceId: deviceId, name: newName }, (data) => {
                if (data) {
                    if (data.error) {
                        console.log('Error: ' + data.error);
                    } else {
                        console.log('New device name: ' + data.result.name);
                        $(`#${deviceId}-device-name`).text(data.result.name);
                    }
                }
            });
        });

        $('#modaledit').modal();
        $('#modaledit').modal('open');
        $('#modaledit').find('input[id=\'d_name\']').focus();

        Materialize.updateTextFields();
    });
}

// Read language settings
function loadSystemConfig(callback) {
    socket.emit('getObject', 'system.config', (err, res) => { // eslint-disable-line no-undef
        if (!err && res && res.common) {
            // @ts-ignore
            systemLang = res.common.language || systemLang; // eslint-disable-line no-global-assign
            // @ts-ignore
            systemConfig = res;
        }
        if (callback) callback();
    });
}

function sendTo(_adapter_instance, command, message, callback) {
    socket.emit('sendTo', _adapter_instance, command, message, callback); // eslint-disable-line no-undef
}
