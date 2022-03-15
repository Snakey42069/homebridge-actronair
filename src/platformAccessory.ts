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
  private zones = {};
  private zonesDump = [];
  // private last_state: {amOn: boolean; tempTarget: number; mode: number; fanSpeed: number; enabledZones: number[]} = {};

  constructor(
    private readonly platform: ExampleHomebridgePlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    // set accessory information
    this.accessory
      .getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(
        this.platform.Characteristic.Manufacturer,
        'ActronAir',
      );

    // get the LightBulb service if it exists, otherwise create a new LightBulb service
    // you can create multiple services for each accessory
    this.service =
      this.accessory.getService(this.platform.Service.Thermostat) ||
      this.accessory.addService(this.platform.Service.Thermostat);

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
    this.platform.log.info('Actoren SETUP zconfig ->', zConfig, this.accessory.context.device.zones);
    if (zConfig && Array.isArray(zConfig) && zConfig.length > 0) {
      for (const z of zConfig) {
        this.platform.log.info('Actoren SETUP Z now ->', z);
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
        this.platform.log.info('Actoren SETUP REGISTERED ->', z, z.index, this.zones[String(z.index)]);
      }
    }

    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/Lightbulb

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
            this.platform.log.info('Aircon HC state ->', 'OFF');
            resolve(
              this.platform.Characteristic.CurrentHeatingCoolingState.OFF,
            );
          } else if (m === 0 || m === 2 || m === 3) {
            this.platform.log.info('Aircon HC state ->', 'COOL');
            resolve(
              this.platform.Characteristic.CurrentHeatingCoolingState.COOL,
            );
          } else {
            this.platform.log.info('Aircon HC state ->', 'HEAT');
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
            this.platform.log.info('Aircon target state ->', 'OFF');
            resolve(this.platform.Characteristic.TargetHeatingCoolingState.OFF);
          } else if (m === 0) {
            this.platform.log.info('Aircon target state ->', 'AUTO');
            resolve(
              this.platform.Characteristic.TargetHeatingCoolingState.AUTO,
            );
          } else if (m === 1) {
            this.platform.log.info('Aircon target state ->', 'HEAT');
            resolve(
              this.platform.Characteristic.TargetHeatingCoolingState.HEAT,
            );
          } else if (m === 2 || m === 3) {
            this.platform.log.info('Aircon target state ->', 'COOL/FAN');
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
          this.platform.log.info('Aircon target state set to ->', value);
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
          this.platform.log.info('Aircon current temp ->', b.roomTemp_oC);
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
          this.platform.log.info('Aircon current setPoint temp ->', b.setPoint);
          resolve(b.setPoint as CharacteristicValue);
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
        body: JSON.stringify({ DA: { setPoint: value } }),
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
          this.platform.log.info('Aircon setPoint set to ->', value);
        }
      },
    );
  }

  async handleZoneOnGet(index) {
    return new Promise<CharacteristicValue>((resolve, reject) => {
      // eslint-disable-next-line max-len
      this.platform.log.info('Actron INDEX PLZ WORK ->', index);
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
    // eslint-disable-next-line max-len
    const url = `https://que.actronair.com.au/rest/v0/device/${this.accessory.context.device.device_token}?user_access_token=${this.accessory.context.device.user_token}`;
    if (this.zonesDump.length === 0) {
      throw new Error('zonedump error');
    }
    this.platform.log.info('Actoren ARGAS ->', value, index);
    const a = this.zonesDump as number[];
    a[index] = value;
    this.platform.log.info('Actoren ZONES ->', a);
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
          this.platform.log.info('Aircon zones SET ->', index, value);
        }
      },
    );
  }
}
