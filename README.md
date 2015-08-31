# Node-RED-Telldus-to-MQTT-bridge

## Summary

The code in this report will retrieve sensor and device data from Telldus Live, and then output that same data in a structured way to MQTT topics of your choice.
Devices are typically various kinds of actuators, for example radio controlled mains switches.

Other applications can then subscribe to the MQTT topics, and provide for example visualizations of the sensor data, send alerts when certain conditions occur, or store the data in some kind of database.

Please note that the code in this repo is intended to go inside a Node-RED function - it is *not* a Node-RED module in itself.


More related information, ideas and code can be found at
[www.ptarmiganlabs.com](https://www.ptarmiganlabs.com).


[![alt text](https://www.ptarmiganlabs.com/wp-content/uploads/2014/10/cropped-sylarna_201409291.jpg "Ptarmigan Labs")](https://www.ptarmiganlabs.com)



## Requirements
1. [Node-RED](http://nodered.org/). As of this writing, I am myself using Node-RED 0.11.1 and Node.js 0.12.7
2. MQTT node.js module (https://www.npmjs.com/package/mqtt)
3. Telldus-Live module  (https://github.com/TheThingSystem/node-telldus-live)
4. An MQTT broker to which messages can be posted. Mosquitto works well, for example.
5. Credentials to log into [Telldus Live](http://live.telldus.com/)

## Conceptual overview
The code first sets up a connection to the Telldus Live APIs, and to the MQTT broker.

Once that is in place, all information about all devices is downloaded and sent to the MQTT topics defined in the code. These topics can be modified at will (at least as long as a valid MQTT topic structure is used).

When processing of devices is done, the same process is started again for sensors - downloading all sensor data and attributed, for all sensors tracked by Telldus Live.

## Why get the data from Telldus Live, rather than directly from your Tellstick?
Good question. For some years I have done exactly that: Using a Tellstick Duo to listen on all device and sensor radio traffic, then having a small python script extract and store the data I was interested in.

It worked, but not very well. When new devices (radio controlled mains switches, typically) were introduced, the python script had to be updated. Also, that script and the Tellstick had to be installed/running on an always-on computer that was in a physical location with good radio reception from all devices and sensors. Not easy.

The current setup is much better:
* A centrally located Tellstick Net in the house. Out of the box it is connected to Telldus backend services, and from there takes instructions for both sending commands to devices, as well as reading incoming (over radio) sensor data, which is then forwarded back to Telldus Live. The Tellstick Net only requires power and a network connection, which means it can easily be hidden away in a closet in the center of the house.
* Telldus Live then becomes the master storage for all Tellstick related information. Telldus does offer storage of historical sensor data, but that can quite easily be handled on your own given the suggested setup. Just subscribe to the MQTT topic of interest, store any new data into a database and you are (more or less) done.  
* Using Telldus' service for on/off scheduling of lamps etc.
* The Node.js code in the tellduslive-to-mqtt-bridge.js file only reads data from Telldus Live, but it can be extended/modified to also turn devices on/off, thus providing a second way of controlling devces (if you don't trust Telldus' scheduler...). Also quite possible to use Node-RED and MQTT to control Tellstick devices.
* Given Node-RED's phenomenal palette of objects, having all the Telldus data in Node-RED opens up for all sorts of weird and wonderful ideas. Things like sending a tweet when the temperature drops below freezing, firing off an SMS when someone enters your house, sending an email to activate a certain lightning scenario in your home, .... The possibilities are endless.


## References
A lot of the Telldus related code is inspired by the test/sample code over at [TheThingSystem's Node.js module](https://github.com/TheThingSystem/node-telldus-live) for Telldus Live.
