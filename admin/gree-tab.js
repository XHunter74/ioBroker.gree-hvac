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
    html += `   <div>${device.id}</div>`;
    html += `   <div style="width: 100%;text-align: center;">`;
    html += `       <h1 id="${device.id}-target-temperature" style="font-family: \'Digital-7 Mono\'; font-weight: normal;">${device['target-temperature']}'</h1>`;
    html += `</div>`;
    html += '    <div style="display:flex; flex-direction:column;align-items:center">';
    html += `       <div style="height:40px;width:100px"><a id="${device.id}-power" href="#" class="btn btn-white btn-animate">ON/OFF</a></div>`;
    html += `       <div style="display: flex;width: 100%;flex-direction: column;align-items: center;margin-top: 5px;">`;
    html += `           <div style="height:40px;width:50px"><a id="${device.id}-power" href="#" class="btn btn-white btn-animate">UP</a></div>`;
    html += '           <div style="height: 80px;display: flex;align-items: center;width: 100%;justify-content: space-between;">';
    html += `               <div style="width:45px;height:75px"><a id="${device.id}-power" href="#" class="vertical-btn btn btn-white btn-animate">TURBO</a></div>`;
    html += `               <div style="width:70px;height:70px;"><a id="${device.id}-power" style="width:70px;height:70px;padding-top: 17px;padding-left: 0px;text-align: center;padding-right: 0px;" href="#" class="btn btn-white btn-animate">MODE</a></div>`;
    html += `               <div style="width:45px;height:75px"><a id="${device.id}-power" href="#" class="vertical-btn btn btn-white btn-animate">FAN</a></div>`;
    html += '           </div>';
    html += `           <div style="height:40px;width: 82px;margin-top: 5px;"><a id="${device.id}-power" href="#" class="btn btn-white btn-animate">Down</a></div>`;
    html += `       </div>`;
    html += `   </div>`;
    html += '</div>';
    return html;
}

function assignClickEvents(device) {
    $(`#${device.id}-power`).click(function () {
        console.log('clicked');
    });
}

function sendCommand(deviceId) {
    sendTo('gree-hvac.0', 'sendCommand', { id: deviceId, command: 'power' }, function (msg) {
        if (msg) {
            if (msg.error) {
                console.log('Error: ' + msg.error);
            } else {
                console.log('msg: ' + msg);
            }
        }
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

function prepareTooltips() {
    $('.admin-icon').each(function () {
        let id = $(this).data('id');
        if (!id) {
            let $prev = $(this).prev();
            let $input = $prev.find('input');
            if (!$input.length) $input = $prev.find('select');
            if (!$input.length) $input = $prev.find('textarea');

            if (!$input.length) {
                $prev = $prev.parent();
                $input = $prev.find('input');
                if (!$input.length) $input = $prev.find('select');
                if (!$input.length) $input = $prev.find('textarea');
            }
            if ($input.length) id = $input.attr('id');
        }

        if (!id) return;

        let tooltip = '';
        if (systemDictionary['tooltip_' + id]) {
            tooltip = systemDictionary['tooltip_' + id][systemLang] || systemDictionary['tooltip_' + id].en;
        }

        let icon = '';
        let link = $(this).data('link');
        if (link) {
            if (link === true) {
                if (common.readme) {
                    link = common.readme + '#' + id;
                } else {
                    link = 'https://github.com/ioBroker/ioBroker.' + common.name + '#' + id;
                }
            }
            if (!link.match('^https?:\/\/')) {
                if (common.readme) {
                    link = common.readme + '#' + link;
                } else {
                    link = 'https://github.com/ioBroker/ioBroker.' + common.name + '#' + link;
                }
            }
            icon += '<a class="admin-tooltip-link" target="config_help" href="' + link + '" title="' + (tooltip || systemDictionary.htooltip[systemLang]) + '"><img class="admin-tooltip-icon" src="../../img/info.png" /></a>';
        } else if (tooltip) {
            icon += '<img class="admin-tooltip-icon" title="' + tooltip + '" src="../../img/info.png"/>';
        }

        if (icon) {
            $(this).html(icon);
        }
    });
    $('.admin-text').each(function () {
        let id = $(this).data('id');
        if (!id) {
            let $prev = $(this).prev();
            let $input = $prev.find('input');
            if (!$input.length) $input = $prev.find('select');
            if (!$input.length) $input = $prev.find('textarea');
            if (!$input.length) {
                $prev = $prev.parent();
                $input = $prev.find('input');
                if (!$input.length) $input = $prev.find('select');
                if (!$input.length) $input = $prev.find('textarea');
            }
            if ($input.length) id = $input.attr('id');
        }

        if (!id) return;

        // check if translation for this exist
        if (systemDictionary['info_' + id]) {
            $(this).html('<span class="admin-tooltip-text">' + (systemDictionary['info_' + id][systemLang] || systemDictionary['info_' + id].en) + '</span>');
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