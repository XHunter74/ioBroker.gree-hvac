/*global $, location, socket, document, window, io, alert, load, systemDictionary, systemLang, translateAll*/
const path = location.pathname;
const parts = path.split('/');
parts.splice(-3);

// const socket = io.connect('/', { path: parts.join('/') + '/socket.io' });
const socket = io.connect('http://172.23.215.95:8081/', { path: 'socket.io' });

var query = (window.location.search || '').replace(/^\?/, '').replace(/#.*$/, '');
var args = {};
let theme = null;

// parse parameters
query.trim().split('&').filter(function (t) { return t.trim(); }).forEach(function (b, i) {
    const parts = b.split('=');
    if (!i && parts.length === 1 && !isNaN(parseInt(b, 10))) {
        args.instance = parseInt(b, 10);
    }
    var name = parts[0];
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

var instance = args.instance;

// const namespace = 'gree-hvac.' + instance;
const namespace = 'gree-hvac.0';

socket.emit('subscribe', namespace + '.*');

socket.on('stateChange', function (id, state) {
    // only watch our own states
    if (id.substring(0, namespace.length) !== namespace) return;
    // console.log('stateChange', id, state);
    const controlId = id.substring(namespace.length + 1).replace('.', '-');
    const parts = id.split('.');
    const stateId = parts[parts.length - 1];
    const deviceId = parts[parts.length - 2];
    switch (stateId) {
        case 'target-temperature':
            $('#' + controlId).text(state.val);
            break;
        case 'mode':
            switch (state.val) {
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
            if (state.val === 1) {
                $('#' + `${deviceId}-on-off-btn`).addClass('power-on');
            } else {
                $('#' + `${deviceId}-on-off-btn`).removeClass('power-on');
            }
            break;
        case 'fan-speed':
            if (state.val === 0) {
                $('#' + `${deviceId}-fan-mode`).css('display', 'block');
                $('#' + `${deviceId}-fan-speed`).css('display', 'none');
            } else {
                $('#' + `${deviceId}-fan-mode`).css('display', 'none');
                $('#' + `${deviceId}-fan-speed`).css('display', 'block');
                if (state.val === 1) {
                    $('#' + `${deviceId}-fan-speed`).text('signal_cellular_alt_1_bar');
                } else if (state.val === 3) {
                    $('#' + `${deviceId}-fan-speed`).text('signal_cellular_alt_2_bar');
                } else if (state.val === 5) {
                    $('#' + `${deviceId}-fan-speed`).text('signal_cellular_alt');
                }
            }
    }
});

let common = null; // common information of adapter
const host = null; // host object on which the adapter runs
const changed = false;
let systemConfig;
let certs = [];
let adapter = '';
const onChangeSupported = false;
let devices = [];

const tmp = window.location.pathname.split('/');
adapter = tmp[tmp.length - 2];
// const _adapterInstance = 'system.adapter.' + adapter + '.' + instance;
const _adapterInstance = 'system.adapter.gree-hvac.0';

$(document).ready(function () {
    'use strict';
    loadSystemConfig(function () {
        if (typeof translateAll === 'function') {
            translateAll();
        }
        loadSettings(function () {
            getDevices();
        });
    });
});


function getDevices() {
    sendTo('gree-hvac.0', 'getDevices', {}, function (msg) {
        if (msg) {
            if (msg.error) {
                console.log('Error: ' + msg.error);
            } else {
                console.log('msg: ' + msg);
                devices = JSON.parse(msg);
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
        assignClickEvents(d);
    }
}

function getCard(device) {
    let html = '';
    html += `<div id="${device.id}" class="device-card">`;
    html += `   <div style="display:flex;justify-content: center;margin-top: 10px;">`;
    html += `       <span style="font-size: 14px;">${device.id}</span>`;
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
    html += `               <span class="degree">°C</span>`;
    html += '           </div>';
    html += '       </div>';
    html += `   </div>`;
    html += '   <div style="display:flex;justify-content: center;margin-bottom: 10px;">';
    html += `           <a id="${device.id}-on-off-btn" class="oval-btn ctrl-btn" style="color: black;" href="#"><span>On/Off</span></a>`;
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

function assignClickEvents(device) {
    $('.ctrl-btn').click(function () {
        const btn = this.id;
        const parts = btn.split('-');
        const command = parts.slice(1).join('-');
        console.log('clicked: ' + btn);
        const deviceId = $(this).parents('.device-card').attr('id');
        console.log('deviceId: ' + deviceId);
        console.log('command: ' + command);
        sendTo(namespace, 'sendCommand', { deviceId: deviceId, command: command }, function (data) {
            if (data) {
                if (data.error) {
                    console.log('Error: ' + data.error);
                } else {
                    console.log('msg: ' + data);
                }
            }
        });
    });
}

// Read language settings
function loadSystemConfig(callback) {
    socket.emit('getObject', 'system.config', function (err, res) {
        if (!err && res && res.common) {
            systemLang = res.common.language || systemLang;
            systemConfig = res;
        }
        if (callback) callback();
    });
}

function loadSettings(callback) {
    socket.emit('getObject', _adapterInstance, function (err, res) {
        if (!err && res && res.native) {
            $('.adapter-instance').html(adapter + '.' + instance);
            $('.adapter-config').html('system.adapter.' + adapter + '.' + instance);
            common = res.common;
            if (res.common && res.common.name) $('.adapter-name').html(res.common.name);
            if (res.native) $('#devicelist').val(res.native.devicelist);
            if (res.native) $('#pollInterval').val(res.native.pollInterval);
            if (typeof load === 'undefined') {
                // alert('Please implement save function in your admin/index.html');
            } else {
                // detect, that we are now in react container (themeNames = ['dark', 'blue', 'colored', 'light'])

                const _query = query.split('&');

                for (var q = 0; q < _query.length; q++) {
                    if (_query[q].indexOf('react=') !== -1) {
                        $('.adapter-container').addClass('react-' + _query[q].substring(6));
                        theme = 'react-' + _query[q].substring(6);
                    }
                }

                load(res.native, onChange);
            }
            if (typeof callback === 'function') {
                callback();
            }
        } else {
            if (typeof callback === 'function') {
                callback();
            }
            alert('error loading settings for ' + _adapterInstance + '\n\n' + err);
        }
    });
}

function sendTo(_adapter_instance, command, message, callback) {
    socket.emit('sendTo', (_adapter_instance || adapter + '.' + instance), command, message, callback);
}

function sendToHost(host, command, message, callback) {
    socket.emit('sendToHost', host || common.host, command, message, callback);
}

function onChange(isChanged) {
    //
}

function showMessage(message, title, icon) {
    var $dialogMessage;
    // noinspection JSJQueryEfficiency
    $dialogMessage = $('#dialog-message');
    if (!$dialogMessage.length) {
        $('body').append(
            '<div class="m"><div id="dialog-message" class="modal modal-fixed-footer">' +
            '    <div class="modal-content">' +
            '        <h6 class="dialog-title title"></h6>' +
            '        <p><i class="large material-icons dialog-icon"></i><span class="dialog-text"></span></p>' +
            '    </div>' +
            '    <div class="modal-footer">' +
            '        <a class="modal-action modal-close waves-effect waves-green btn-flat translate">Ok</a>' +
            '    </div>' +
            '</div></div>');
        $dialogMessage = $('#dialog-message');
    }
    if (icon) {
        $dialogMessage.find('.dialog-icon')
            .show()
            .html(icon);
    } else {
        $dialogMessage.find('.dialog-icon').hide();
    }
    if (title) {
        $dialogMessage.find('.dialog-title').html(title).show();
    } else {
        $dialogMessage.find('.dialog-title').hide();
    }
    $dialogMessage.find('.dialog-text').html(message);
    $dialogMessage.modal().modal('open');
}