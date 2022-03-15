# homebridge-actronair
> An unoffical Homebridge community plugin for ActronAir Airconditioners

## Disclaimers
This community plugin is not officially endorsed by Homebridge or ActronAir. Despite best efforts, there is no gaurentee the plugin will behave as expected. **Use at your own risk.**
Setup requries basic knowledge of HTTP protocol and browser inspectors.
## Acknowledgements
This plugin was inspired by [iainelliott's](https://github.com/iainelliott) work in progress, [`homebridge-actron`](https://www.npmjs.com/package/homebridge-actron).
## Features
- Support for multiple accessories
- Turn accessory on and off
- Set accessory mode to 'AUTO', 'HEAT' or 'COOL'
- View current temperature
- Set target temperature
- Install through Homebridge app

## Installation
**IMPORTANT:** This a plugin for Homebridge. For help getting started with Homebridge, consult their  [setup guides](https://github.com/homebridge/homebridge/wiki).

From your server's web interface, simply navigate to 'Plugins', search for `homebridge-actronair` and click 'INSTALL'.

To install using NPM, run the following in your server's root directory:
```
npm i homebridge-actronair
```
## Configuration
To configure the plugin using the server's web interface, navigate to 'Plugins' and click 'SETTINGS'. Add an accessory and complete the required details.

Key | Type | Example | Description
---|---|---|---
name | string | 'Kitchen Aircon' | The user-friendly display name to be shown in Homebridge and Home.
ip | string | '192.168.1.69' | The local IP address of the aircon unit. You will need to assign your unit a static local IP address.
mac | string | '00:00:5e:00:53:af' | The MAC Address of the aircon unit.
device_token | string | 'AIRCON_DJEE31JV21_AJ' | The unique device token of your aircon unit. See below for instruction to find your unit's ```device_token```.
user_token | string | 'JDh4g2jv423khj4MJ3l4g32DSk' | A unique access token generated for your user account. See below for instruction to get a ```user_token```.
zones | array | '[{name: 'Bedroom', index: 0}]' | An array of Zone for configuration. Set ```name``` to a user-friendly display name string. Set ```index``` to the position of the zone in the zones list (0 based because JS).

The ```Zone``` object is defined as:
```
{
    name: string
    index: number
}
```

You can also edit your config file directly, though it is not recommended.
### How to find device_token and user_token
Login to http://www.actronair.com.au/aconnect/#/Auth. Using the browser inspector (hit ```F12``` key for Google Chrome), start capturing network events. Toggle your aircon state (ON or OFF) and inspect the PUT request sent. Extract the ```device_token``` and ```user_token``` from the destination URL. Example destination URL:
```
https://que.actronair.com.au/rest/v0/device/device_token?user_access_token=user_token
```
Use the extracted ```device_token``` and ```user_token``` in the plugin config. 
## Planned Features and ToDo
[X] Allow toggling of zones

[] Simplify config file

[] Auto fetch ```user_token``` and ```device_token``` from supplied username and password

[X] Siri compatibility

[] Convert GETs to async update characteristics

## Issues
Report issues on [GitHub](https://github.com/Snakey42069/homebridge-actronair/issues).



