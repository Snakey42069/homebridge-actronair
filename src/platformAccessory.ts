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

  /**
   * These are just used to create a working example
   * You should implement your own code to track the state of your accessory
   */
  private exampleStates = {
    On: false,
    Brightness: 100,
  };

  constructor(
    private readonly platform: ExampleHomebridgePlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    // set accessory information
    this.accessory
      .getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'ActronAir')
      .setCharacteristic(this.platform.Characteristic.Model, 'ESP-Ultima')
      .setCharacteristic(
        this.platform.Characteristic.SerialNumber,
        '123-456-789',
      );

    // get the LightBulb service if it exists, otherwise create a new LightBulb service
    // you can create multiple services for each accessory
    this.service =
      this.accessory.getService(this.platform.Service.Switch) ||
      this.accessory.addService(this.platform.Service.Switch);

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.service.setCharacteristic(
      this.platform.Characteristic.Name,
      accessory.context.device.name,
    );

    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/Lightbulb

    // register handlers for the On/Off Characteristic
    this.service
      .getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.setOn.bind(this)) // SET - bind to the `setOn` method below
      .onGet(this.getOn.bind(this)); // GET - bind to the `getOn` method below

    /**
     * Creating multiple services of the same type.
     *
     * To avoid "Cannot add a Service with the same UUID another Service without also defining a unique 'subtype' property." error,
     * when creating multiple services of the same type, you need to use the following syntax to specify a name and subtype id:
     * this.accessory.getService('NAME') || this.accessory.addService(this.platform.Service.Lightbulb, 'NAME', 'USER_DEFINED_SUBTYPE_ID');
     *
     * The USER_DEFINED_SUBTYPE must be unique to the platform accessory (if you platform exposes multiple accessories, each accessory
     * can use the same sub type id.)
     */

    /**
     * Updating characteristics values asynchronously.
     *
     * Example showing how to update the state of a Characteristic asynchronously instead
     * of using the `on('get')` handlers.
     * Here we change update the motion sensor trigger states on and off every 10 seconds
     * the `updateCharacteristic` method.
     *
     */
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, turning on a Light bulb.
   */
  async setOn(value: CharacteristicValue) {
    // implement your own code to turn your device on/off
    // try {
    //   const { data } = await got
    //     .post(`http://${this.accessory.context.device.ip}`, {
    //       method: 'GET',
    //       timeout: { request: 5000 },
    //       json: {
    //         DA: { amOn: !!value },
    //       },
    //     })
    //     .json();
    //   this.platform.log.debug('Data recieved from actron POST req ->', data);
    //   this.platform.log.debug('Get Characteristic On ->', value);
    // } catch (error) {
    //   this.platform.log.debug('Actron Error in SET->', error);
    //   throw new this.platform.api.hap.HapStatusError(
    //     this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE,
    //   );
    // }
    // eslint-disable-next-line max-len
    const url = `https://que.actronair.com.au/rest/v0/device/${this.accessory.context.device.device_token}`;
    request({

      url: url,
      body: JSON.stringify({'DA':{'amOn': value} }),
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      timeout: 5000,
      qs: {'user_access_token': this.accessory.context.device.user_token},
    }, (error, response, body) => {
      if (error) {
        this.platform.log.debug('Actron Error in SET->', error);
        throw new this.platform.api.hap.HapStatusError(
          this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE,
        );
      } else {
        this.platform.log.debug('Data recieved from actron POST req ->', body);
        this.platform.log.debug('Get Characteristic On ->', value);
      }
    });

  }

  /**
   * Handle the "GET" requests from HomeKit
   * These are sent when HomeKit wants to know the current state of the accessory, for example, checking if a Light bulb is on.
   *
   * GET requests should return as fast as possbile. A long delay here will result in
   * HomeKit being unresponsive and a bad user experience in general.
   *
   * If your device takes time to respond you should update the status of your device
   * asynchronously instead using the `updateCharacteristic` method instead.

   * @example
   * this.service.updateCharacteristic(this.platform.Characteristic.On, true)
   */
  async getOn(): Promise<CharacteristicValue> {
    return new Promise<CharacteristicValue>((resolve, reject) => {


      request({
        url: `http://${this.accessory.context.device.ip}/4.json`,
        method: 'GET',
        timeout: 5000,
      }, (error, response, body) => {
        if (error) {
          this.platform.log.debug('Actron Error in GET->', error);
          reject(new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
        }
        let b: Record<string, string>;
        if (typeof body === 'string') {
          b = JSON.parse(body);
        } else {
          b = body;
        }
        this.platform.log.debug('Data recieved from actron GET req ->', b);
        this.platform.log.debug('Get Characteristic On ->', !!b['amOn']);
        resolve(!!body.amOn as CharacteristicValue);
      });

    });


    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, changing the Brightness
   */
}
