// Node-RED function to
// a) extract data from TelldusLive API, and
// b) send that data to MQTT for later consumption by various MQTT clients
//
// The code below relies on the following modules to be installed in the Node-RED environment, including being set up
// in the functionGlobalContext section of the Node-RED settings.js config file (see last section of http://nodered.org/docs/writing-functions.html page)
//
// a) MQTT module (https://www.npmjs.com/package/mqtt)
// b) Telldus-Live module (https://github.com/TheThingSystem/node-telldus-live)
//
//
// Code below borrows a lot from the test script at https://github.com/TheThingSystem/node-telldus-live, with main addition being the use of MQTT client to publish such messages.
//

// Define Telldus Live API credentials
var publicKey    = '<enter your public key here>'
  , privateKey   = '<enter your private key here>'
  , token        = '<enter your token here>'
  , tokenSecret  = '<enter your token secret here>'
  , cloud
  ;

var mqtt = context.global.mqttModule;
var mqttClient = mqtt.connect('mqtt://<IP of your mqtt broker>');

var batteryStatus;


// Convenience function to format datetimes in nice human readable format
function formatDate(d){
  if(typeof d === 'number') d = new Date(d);
  if(!(d instanceof Date)) return d;
  function pad(n){return n<10 ? '0'+n : n}
  return d.getFullYear()+'-'
        + pad(d.getMonth()+1)+'-'
        + pad(d.getDate())+' '
        + pad(d.getHours()) + ":"
        + pad(d.getMinutes()) + ":"
        + pad(d.getSeconds());
}


// Create and log into new TelldusAPI object
cloud = new context.global.telldusLive.TelldusAPI({ publicKey  : publicKey
                                  , privateKey : privateKey });

cloud.login(token, tokenSecret, function(err, user) {

  if (!!err) return console.log('login error: ' + err.message);

  console.log('user: ');
  console.log(user);
  console.log('');
  console.log('');

  // 
  cloud.getSensors(function(err, sensors) {
    var f, i;

    if (!!err) return console.log('getSensors: ' + err.message);

    f = function(offset, p, s) {

      return function(err, sensor) {
        var i, prop, props, type;

        if (!!err) return console.log(s + ' id=' + p.id + ': ' + err.message);

        console.log('sensor #' + offset + ' ' + s + ': '); console.log(sensor);
        props =  { temp     : [ 'temperature', 'celcius',    'meteo' ]
                 , humidity : [ 'humidity',    'percentage', 'meteo' ]
                 };

        type = null;
        for (i = 0; i < sensor.data.length; i++) {
          type = props[sensor.data[i].name];
          if (!!type) break;
        }
        if (!type) return;

        console.log('/device/climate/' + (sensor.protocol || 'telldus') + '/' + type[2]);
        console.log('    uuid=teldus:' + sensor.id);
        console.log('    name: ' + sensor.name);
        console.log('    status: ' + (p.online === '1' ? 'present' : 'absent'));
        console.log('    battery: ' + sensor.battery);
        console.log('    lastSample: ' + sensor.lastUpdated * 1000);
        console.log('    lastSample: ' + '' + formatDate(sensor.lastUpdated * 1000));
        console.log('    info:');


        batteryStatus = '-'
        if (sensor.battery === '253') {
            batteryStatus = 'ok';
        } else if (sensor.battery === '254') {
            batteryStatus = 'unknown';
        } else if (sensor.battery === '255') {
            batteryStatus = 'low battery';
        } else {
            batteryStatus = sensor.battery;
        }


        mqttClient.publish('common/telldus live/' + sensor.clientName + '/sensors/' + sensor.name + '/telldus id', sensor.id);
        mqttClient.publish('common/telldus live/' + sensor.clientName + '/sensors/' + sensor.name + '/protocol', '' + sensor.protocol);
        mqttClient.publish('common/telldus live/' + sensor.clientName + '/sensors/' + sensor.name + '/last update', '' + sensor.lastUpdated * 1000);
        mqttClient.publish('common/telldus live/' + sensor.clientName + '/sensors/' + sensor.name + '/last update nice', '' + formatDate(sensor.lastUpdated * 1000));
        mqttClient.publish('common/telldus live/' + sensor.clientName + '/sensors/' + sensor.name + '/ignored', '' + sensor.ignored);
        mqttClient.publish('common/telldus live/' + sensor.clientName + '/sensors/' + sensor.name + '/editable', '' + sensor.editable);
        mqttClient.publish('common/telldus live/' + sensor.clientName + '/sensors/' + sensor.name + '/status', (p.online === '1' ? 'present' : 'absent'));
        mqttClient.publish('common/telldus live/' + sensor.clientName + '/sensors/' + sensor.name + '/sensor id', sensor.sensorId);
        mqttClient.publish('common/telldus live/' + sensor.clientName + '/sensors/' + sensor.name + '/timezone offset', '' + sensor.timezoneoffset);
        mqttClient.publish('common/telldus live/' + sensor.clientName + '/sensors/' + sensor.name + '/battery status', batteryStatus);
        mqttClient.publish('common/telldus live/' + sensor.clientName + '/sensors/' + sensor.name + '/mqtt last update', '' + Date.now());
        mqttClient.publish('common/telldus live/' + sensor.clientName + '/sensors/' + sensor.name + '/mqtt last update nice', '' + formatDate(Date.now()));

        for (i = 0; i < sensor.data.length; i++) {
          prop =  props[sensor.data[i].name];
          if (prop) console.log('      ' + prop[0] + ': "' + prop[1] + '"');
        }
        console.log('    values:');
        for (i = 0; i < sensor.data.length; i++) {
          prop =  props[sensor.data[i].name];
          if (prop) console.log('      ' + prop[0] + ': ' + sensor.data[i].value);
          mqttClient.publish('common/telldus live/' + sensor.clientName + '/sensors/' + sensor.name + '/data/' + prop[0] + '/value', sensor.data[i].value);
          mqttClient.publish('common/telldus live/' + sensor.clientName + '/sensors/' + sensor.name + '/data/' + prop[0] + '/unit', prop[1]);
        }
        console.log('');
      };
    };

    for (i = 0; i < sensors.length; i++) cloud.getSensorInfo(sensors[i], f(i, sensors[i], 'getSensorInfo'));

  }).getDevices(function(err, devices) {
    var f, i;

    if (!!err) return console.log('getDevices: ' + err.message);

    f = function(offset, p, s) {
      return function(err, device) {
        var d, type, types;

        if (!!err) return console.log(s + ' id=' + p.id + ': ' + err.message);

        console.log('device #' + offset + ' ' + s + ': '); console.log(device);
        types = { 'selflearning-switch' : 'onoff'
                , 'selflearning-dimmer' : 'dimmer'
                , 'codeswitch'          : 'onoff' };

        type = null;
        d = device.model.split(':');
        type = types[d[0]];
        if (!type) return;

        console.log('/device/switch' + '/' + (d[d.length - 1] || 'telldus') + '/' + type);
        console.log('    uuid=teldus:' + device.id);
        console.log('    perform: off, on');
        console.log('    name: ' + device.name);
        console.log('last update: ' + device.lastUpdated*1000);
        console.log('    status: ' + (device.online === '0' ? 'absent' : device.status));
        console.log('    info:');
        if (type === 'dimmer') console.log('      dimmer: percentage');
        console.log('    values:');
        if (type === 'dimmer') console.log('      dimmer: ' + Math.round((1-(255 - device.statevalue)/255)*100) + '%');
        console.log('');

        mqttClient.publish('common/telldus live/' + device.client + '/devices/' + device.name + '/telldus id', device.id);
        mqttClient.publish('common/telldus live/' + device.client + '/devices/' + device.name + '/protocol', '' + device.protocol);
        mqttClient.publish('common/telldus live/' + device.client + '/devices/' + device.name + '/model', '' + device.model);
        mqttClient.publish('common/telldus live/' + device.client + '/devices/' + device.name + '/state', '' + device.state);
        mqttClient.publish('common/telldus live/' + device.client + '/devices/' + device.name + '/state value', '' + device.statevalue);
        mqttClient.publish('common/telldus live/' + device.client + '/devices/' + device.name + '/methods', '' + device.methods);
        mqttClient.publish('common/telldus live/' + device.client + '/devices/' + device.name + '/type', '' + type);
        mqttClient.publish('common/telldus live/' + device.client + '/devices/' + device.name + '/client', '' + device.client);
        mqttClient.publish('common/telldus live/' + device.client + '/devices/' + device.name + '/online', '' + device.online);
        mqttClient.publish('common/telldus live/' + device.client + '/devices/' + device.name + '/editable', '' + device.editable);
        mqttClient.publish('common/telldus live/' + device.client + '/devices/' + device.name + '/status', '' + (device.online === '0' ? 'absent' : device.status));
        mqttClient.publish('common/telldus live/' + device.client + '/devices/' + device.name + '/mqtt last update', '' + Date.now());
        mqttClient.publish('common/telldus live/' + device.client + '/devices/' + device.name + '/mqtt last update nice', '' + formatDate(Date.now()));

        for (j = 0; j < device.parameter.length; j++) {
          mqttClient.publish('common/telldus live/' + device.client + '/devices/' + device.name + '/data/' + device.parameter[j].name , '' + device.parameter[j].value);
        }
      };
    };

    for (i = 0; i < devices.length; i++) {
      if (devices[i].type === 'device') cloud.getDeviceInfo(devices[i], f(i, devices[i], 'getDeviceInfo'));
    }
  });
}).on('error', function(err) {
  console.log('background error: ' + err.message);
});


return msg;
