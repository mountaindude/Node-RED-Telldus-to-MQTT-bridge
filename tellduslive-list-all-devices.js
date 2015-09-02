// Node-RED function to
// a) list all Telldus devices (device = everything in Telldus Live except sensors)
//
// The code below relies on the following modules to be installed in the Node-RED environment, including being set up
// in the functionGlobalContext section of the Node-RED settings.js config file (see last section of http://nodered.org/docs/writing-functions.html page)
//
// a) Telldus-Live module (https://github.com/TheThingSystem/node-telldus-live)
//
//
// The function will fire one output message for each device it gets information about from Telldus Live.
// By default the device id and name is included in the messages, but this can be customised as needed.
//

// Define Telldus Live API credentials
var publicKey    = '<enter your public key here>'
  , privateKey   = '<enter your private key here>'
  , token        = '<enter your token here>'
  , tokenSecret  = '<enter your token secret here>'
  , cloud
  ;


// Create and log into new TelldusAPI object
cloud = new context.global.telldusLive.TelldusAPI({ publicKey  : publicKey
                                  , privateKey : privateKey });

cloud.login(token, tokenSecret, function(err, user) {
  if (!!err) return console.log('login error: ' + err.message);

  // Get list of all devices. Use async call to avoid blocking
  cloud.getDevices(function(err, devices) {
    var f, i;

    if (!!err) return console.log('getDevices: ' + err.message);

    f = function(offset, p, s) {
      return function(err, device) {
        var d, type, types;

        if (!!err) return console.log(s + ' id=' + p.id + ': ' + err.message);

        var devInfo = 'Device list, id=' + device.id + ', name=' + device.name;
        node.log (devInfo);

        // Fire one output message for each pass of this function.
        // An effect of this function being a callback (which is async by its nature) is that the devices
        // will be returned in random order (i.e. not sorted from lowest to highest)
        node.send({payload:devInfo});

        return;
      };
    };

    // Loop over all devices, asynchcronously get the data for each
    for (i = 0; i < devices.length; i++) {
      if (devices[i].type === 'device') cloud.getDeviceInfo(devices[i], f(i, devices[i], 'getDeviceInfo'));
    }
  });
}).on('error', function(err) {
  console.log('background error: ' + err.message);
});


return;
