import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require('request');
import { ExampleHomebridgePlatform } from './platform';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class ExamplePlatformAccessory {
  private service: Service;
  private fanService: Service;
  private zones = {};
  private zonesDump = [];

  constructor(
    private readonly platform: ExampleHomebridgePlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    this.accessory
      .getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(
        this.platform.Characteristic.Manufacturer,
        'ActronAir',
      );


    this.service =
      this.accessory.getService(this.platform.Service.Thermostat) ||
      this.accessory.addService(this.platform.Service.Thermostat);

    // Setup fan speed service
    this.fanService =
      this.accessory.getService(this.platform.Service.Fanv2) ||
      this.accessory.addService(this.platform.Service.Fanv2);

    this.fanService.setCharacteristic(
      this.platform.Characteristic.Name,
      `${accessory.context.device.name} Fan`,
    );

    this.fanService
      .getCharacteristic(this.platform.Characteristic.RotationSpeed)
      .setProps({
        minStep: 34,    // Step value of 33 (maps to 3 levels: 33, 66, 100)
        minValue: 33,   // Minimum value is 33
        maxValue: 100,  // Maximum value is 100
      })
      .onGet(this.handleFanSpeedGet.bind(this))
      .onSet(this.handleFanSpeedSet.bind(this));

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.service.setCharacteristic(
      this.platform.Characteristic.Name,
      accessory.context.device.name,
    );

    this.service.setCharacteristic(
      this.platform.Characteristic.TemperatureDisplayUnits,
      this.platform.Characteristic.TemperatureDisplayUnits.CELSIUS,
    );

    const zConfig: Record<string, string>[] =
      this.accessory.context.device.zones;
    this.platform.log.debug('Actoren SETUP zconfig ->', zConfig, this.accessory.context.device.zones);
    if (zConfig && Array.isArray(zConfig) && zConfig.length > 0) {
      for (const z of zConfig) {
        this.platform.log.debug('Actoren SETUP Z now ->', z);
        this.zones[String(z.index)] =
          this.accessory.getService(z.name) ||
          this.accessory.addService(
            this.platform.Service.Switch,
            z.name,
            `zone-${z.index}`,
          );
        this.zones[String(z.index)].setCharacteristic(
          this.platform.Characteristic.Name,
          z.name,
        );
        this.zones[String(z.index)]
          .getCharacteristic(this.platform.Characteristic.On)
          .onGet(this.handleZoneOnGet.bind(this, z.index))
          .onSet(this.handleZoneOnSet.bind(this, z.index));
        this.platform.log.debug('Actoren SETUP REGISTERED ->', z, z.index, this.zones[String(z.index)]);
      }
    }

    this.service
      .getCharacteristic(
        this.platform.Characteristic.CurrentHeatingCoolingState,
      )
      .onGet(this.handleCurrentHeatingCoolingStateGet.bind(this));

    this.service
      .getCharacteristic(this.platform.Characteristic.TargetHeatingCoolingState)
      .onGet(this.handleTargetHeatingCoolingStateGet.bind(this))
      .onSet(this.handleTargetHeatingCoolingStateSet.bind(this));

    this.service
      .getCharacteristic(this.platform.Characteristic.CurrentTemperature)
      .onGet(this.handleCurrentTemperatureGet.bind(this));

    this.service
      .getCharacteristic(this.platform.Characteristic.TargetTemperature)
      .onGet(this.handleTargetTemperatureGet.bind(this))
      .onSet(this.handleTargetTemperatureSet.bind(this));
  }

  async handleCurrentHeatingCoolingStateGet(): Promise<CharacteristicValue> {
    return new Promise<CharacteristicValue>((resolve, reject) => {
      // eslint-disable-next-line max-len
      const url = `https://que.actronair.com.au/rest/v0/device/${this.accessory.context.device.device_token}?user_access_token=${this.accessory.context.device.user_token}`;
      request(
        {
          url: url,
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          timeout: 5000,
        },
        (error, response, body) => {
          if (error) {
            this.platform.log.debug('Actron Error in GET->', error);
            reject(
              new this.platform.api.hap.HapStatusError(
                this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE,
              ),
            );
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let b: Record<any, any>;
          if (typeof body === 'string') {
            b = JSON.parse(body);
          } else {
            b = body;
          }
          const m = b.data.last_data.DA.mode;
          this.platform.log.debug(
            'Data recieved from actron currentHeaterCool GET req ->',
            b,
          );
          if (!b.data.last_data.DA.amOn) {
            this.platform.log.debug('Aircon HC state ->', 'OFF');
            resolve(
              this.platform.Characteristic.CurrentHeatingCoolingState.OFF,
            );
          } else if (m === 0 || m === 2 || m === 3) {
            this.platform.log.debug('Aircon HC state ->', 'COOL');
            resolve(
              this.platform.Characteristic.CurrentHeatingCoolingState.COOL,
            );
          } else {
            this.platform.log.debug('Aircon HC state ->', 'HEAT');
            resolve(
              this.platform.Characteristic.CurrentHeatingCoolingState.HEAT,
            );
          }
        },
      );
    });
  }

  async handleTargetHeatingCoolingStateGet(): Promise<CharacteristicValue> {
    return new Promise<CharacteristicValue>((resolve, reject) => {
      // eslint-disable-next-line max-len
      const url = `https://que.actronair.com.au/rest/v0/device/${this.accessory.context.device.device_token}?user_access_token=${this.accessory.context.device.user_token}`;
      request(
        {
          url: url,
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          timeout: 5000,
        },
        (error, response, body) => {
          if (error) {
            this.platform.log.debug('Actron Error in GET->', error);
            reject(
              new this.platform.api.hap.HapStatusError(
                this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE,
              ),
            );
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let b: Record<any, any>;
          if (typeof body === 'string') {
            b = JSON.parse(body);
          } else {
            b = body;
          }
          const m = b.data.last_data.DA.mode;
          this.platform.log.debug(
            'Data recieved from actron currentHeaterCool GET req ->',
            b,
          );
          this.platform.log.debug(
            'Get TargetHeatingCoolingState Characteristic ->',
            m,
          );
          if (!b.data.last_data.DA.amOn) {
            this.platform.log.debug('Aircon target state ->', 'OFF');
            resolve(this.platform.Characteristic.TargetHeatingCoolingState.OFF);
          } else if (m === 0) {
            this.platform.log.debug('Aircon target state ->', 'AUTO');
            resolve(
              this.platform.Characteristic.TargetHeatingCoolingState.AUTO,
            );
          } else if (m === 1) {
            this.platform.log.debug('Aircon target state ->', 'HEAT');
            resolve(
              this.platform.Characteristic.TargetHeatingCoolingState.HEAT,
            );
          } else if (m === 2 || m === 3) {
            this.platform.log.debug('Aircon target state ->', 'COOL/FAN');
            resolve(
              this.platform.Characteristic.TargetHeatingCoolingState.COOL,
            );
          }
        },
      );
    });
  }

  handleTargetHeatingCoolingStateSet(value) {
    // eslint-disable-next-line max-len
    const url = `https://que.actronair.com.au/rest/v0/device/${this.accessory.context.device.device_token}?user_access_token=${this.accessory.context.device.user_token}`;
    this.platform.log.debug('ActronURL ->', url);
    let d = value;
    if (value === this.platform.Characteristic.TargetHeatingCoolingState.OFF) {
      d = { DA: { amOn: false } };
    } else if (
      value === this.platform.Characteristic.TargetHeatingCoolingState.HEAT
    ) {
      d = { DA: { amOn: true, mode: 1 } };
    } else if (
      value === this.platform.Characteristic.TargetHeatingCoolingState.COOL
    ) {
      d = { DA: { amOn: true, mode: 2 } };
    } else {
      d = { DA: { amOn: true, mode: 0 } };
    }
    request(
      {
        url: url,
        body: JSON.stringify(d),
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000,
        qs: { user_access_token: this.accessory.context.device.user_token },
      },
      (error, response, body) => {
        if (error) {
          this.platform.log.debug('Actron Error in SET->', error);
          throw new this.platform.api.hap.HapStatusError(
            this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE,
          );
        } else {
          this.platform.log.debug(
            'Data recieved from actron POST req ->',
            body,
          );
          this.platform.log.debug('Aircon target state set to ->', value);
        }
      },
    );
  }

  async handleCurrentTemperatureGet() {
    return new Promise<CharacteristicValue>((resolve, reject) => {
      // eslint-disable-next-line max-len
      const url = `http://${this.accessory.context.device.ip}/6.json`;
      request(
        {
          url: url,
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          timeout: 5000,
        },
        (error, response, body) => {
          if (error) {
            this.platform.log.debug('Actron Error in GET->', error);
            reject(
              new this.platform.api.hap.HapStatusError(
                this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE,
              ),
            );
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let b: Record<any, any>;
          if (typeof body === 'string') {
            b = JSON.parse(body);
          } else {
            b = body;
          }
          this.platform.log.debug('Data recieved from actron GET req ->', b);
          this.platform.log.debug('Aircon current temp ->', b.roomTemp_oC);
          resolve(b.roomTemp_oC as CharacteristicValue);
        },
      );
    });
  }

  async handleTargetTemperatureGet(): Promise<CharacteristicValue> {
    return new Promise<CharacteristicValue>((resolve, reject) => {
      // eslint-disable-next-line max-len
      const url = `http://${this.accessory.context.device.ip}/6.json`;
      request(
        {
          url: url,
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          timeout: 5000,
        },
        (error, response, body) => {
          if (error) {
            this.platform.log.debug('Actron Error in GET->', error);
            reject(
              new this.platform.api.hap.HapStatusError(
                this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE,
              ),
            );
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let b: Record<any, any>;
          if (typeof body === 'string') {
            b = JSON.parse(body);
          } else {
            b = body;
          }
          this.platform.log.debug('Data recieved from actron GET req ->', b);
          this.platform.log.debug('Aircon current tempTarget temp ->', b.tempTarget);
          resolve(b.tempTarget as CharacteristicValue);
        },
      );
    });
  }

  handleTargetTemperatureSet(value) {
    // eslint-disable-next-line max-len
    const url = `https://que.actronair.com.au/rest/v0/device/${this.accessory.context.device.device_token}?user_access_token=${this.accessory.context.device.user_token}`;
    this.platform.log.debug('ActronURL ->', url);
    request(
      {
        url: url,
        body: JSON.stringify({ DA: { tempTarget: value } }),
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000,
        qs: { user_access_token: this.accessory.context.device.user_token },
      },
      (error, response, body) => {
        if (error) {
          this.platform.log.debug('Actron Error in SET->', error);
          throw new this.platform.api.hap.HapStatusError(
            this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE,
          );
        } else {
          this.platform.log.debug(
            'Data recieved from actron POST req ->',
            body,
          );
          this.platform.log.debug('Aircon tempTarget set to ->', value);
        }
      },
    );
  }

  async handleZoneOnGet(index) {
    return new Promise<CharacteristicValue>((resolve, reject) => {
      // eslint-disable-next-line max-len
      this.platform.log.debug('Actron INDEX PLZ WORK ->', index);
      const url = `http://${this.accessory.context.device.ip}/6.json`;
      request(
        {
          url: url,
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          timeout: 5000,
        },
        (error, response, body) => {
          if (error) {
            this.platform.log.debug('Actron Error in GET->', error);
            reject(
              new this.platform.api.hap.HapStatusError(
                this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE,
              ),
            );
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let b: Record<any, any>;
          if (typeof body === 'string') {
            b = JSON.parse(body);
          } else {
            b = body;
          }
          const zs = b.enabledZones;
          this.zonesDump = b.enabledZones;
          resolve(zs[index]);
        },
      );
    });
  }

  handleZoneOnSet(value, index) {
    const temp = index;
    index = value;
    value = temp;

    // eslint-disable-next-line max-len
    const url = `https://que.actronair.com.au/rest/v0/device/${this.accessory.context.device.device_token}?user_access_token=${this.accessory.context.device.user_token}`;
    this.platform.log.debug('Actoren ARGAS value ->', value, 'idnex ->', index);
    const a = this.zonesDump as number[];
    a[index] = value;
    this.platform.log.debug('Actoren ZONES ->', a);
    request(
      {
        url: url,
        body: JSON.stringify({ DA: { enabledZones: a } }),
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000,
        qs: { user_access_token: this.accessory.context.device.user_token },
      },
      (error, response, body) => {
        if (error) {
          this.platform.log.debug('Actron Error in SET->', error);
          throw new this.platform.api.hap.HapStatusError(
            this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE,
          );
        } else {
          this.platform.log.debug(
            'Data recieved from actron POST req ->',
            body,
          );
          this.platform.log.debug('Aircon zones SET ->', index, value);
        }
      },
    );

  }

  // Get fan speed from the API
  async handleFanSpeedGet(): Promise<CharacteristicValue> {
    return new Promise<CharacteristicValue>((resolve, reject) => {
      // eslint-disable-next-line max-len
      const url = `https://que.actronair.com.au/rest/v0/device/${this.accessory.context.device.device_token}?user_access_token=${this.accessory.context.device.user_token}`;
      request(
        {
          url: url,
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          timeout: 5000,
        },
        (error, response, body) => {
          if (error) {
            this.platform.log.debug('Actron Error in GET Fan Speed->', error);
            reject(
              new this.platform.api.hap.HapStatusError(
                this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE,
              ),
            );
          }
          let data;
          if (typeof body === 'string') {
            data = JSON.parse(body);
          } else {
            data = body;
          }
          const fanSpeed = data.data.last_data.DA.fanSpeed; // Assuming the API returns fan speed as 0, 1, or 2
          this.platform.log.debug('Fan speed fetched ->', fanSpeed);

          const fanSpeedMap = [33, 67, 100];  // Map 0 -> 33, 1 -> 67, 2 -> 100
          const fanSpeedLevel = fanSpeedMap[fanSpeed];
          resolve(fanSpeedLevel);
        },
      );
    });
  }

  // Set fan speed via the API
  handleFanSpeedSet(value: CharacteristicValue) {
    // eslint-disable-next-line max-len
    const url = `https://que.actronair.com.au/rest/v0/device/${this.accessory.context.device.device_token}?user_access_token=${this.accessory.context.device.user_token}`;

    let fanSpeed: number;
    if (value === 33) {
      fanSpeed = 0;
    } else if (value === 67) {
      fanSpeed = 1;
    } else {
      fanSpeed = 2;
    }

    const requestBody = {
      DA: {
        fanSpeed: fanSpeed,
      },
    };

    this.platform.log.debug('Setting fan speed to ->', fanSpeed);

    request(
      {
        url: url,
        body: JSON.stringify(requestBody),
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000,
        qs: { user_access_token: this.accessory.context.device.user_token },
      },
      (error, response, body) => {
        if (error) {
          this.platform.log.debug('Actron Error in SET Fan Speed->', error);
          throw new this.platform.api.hap.HapStatusError(
            this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE,
          );
        } else {
          this.platform.log.debug(
            'Data recieved from actron POST req ->',
            body,
          );
          this.platform.log.debug('Fan speed set to ->', fanSpeed);
        }
      },
    );
  }
}
