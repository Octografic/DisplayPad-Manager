'use strict';
// Connexion au DisplayPad (VID 0x3282 / PID 0x0009) via la lib mountain-displaypad.
// Reconnexion automatique ; les événements de touches sont renvoyés avec un index 0-11.
//
// Points anti-fuite :
//  - ouverture faite ici (et non via openAsync) pour refermer le 1er handle USB si le 2e échoue ;
//  - à la déconnexion : minuteur interne de la lib annulé, file d'attente vidée, écouteurs retirés ;
//  - une image identique à celle déjà affichée n'est pas renvoyée, et une image en attente
//    pour la même touche est remplacée au lieu d'être empilée (file bornée à 12 éléments).

const EventEmitter = require('events');
const HID = require('node-hid');
const Displaypad = require('mountain-displaypad');

class DeviceManager extends EventEmitter {
  constructor() {
    super();
    this.pad = null;
    this.connecting = false;
    this.timer = null;
    this.shown = new Array(12).fill(undefined); // signature de l'image affichée par touche
  }

  start() {
    this._tick();
    this.timer = setInterval(() => this._tick(), 2500);
  }

  stop() {
    clearInterval(this.timer);
    this.timer = null;
    this._drop();
  }

  get connected() { return !!this.pad; }

  async _open() {
    const devs = (await HID.devicesAsync()).filter((d) => d.vendorId === Displaypad.VENDOR_ID && Displaypad.PRODUCT_IDS.includes(d.productId));
    const disp = devs.find((d) => d.interface === 1);
    const ctrl = devs.find((d) => d.interface === 3);
    if (!disp || !ctrl) return null;
    let display = null;
    try {
      display = await HID.HIDAsync.open(disp.path);
      const device = await HID.HIDAsync.open(ctrl.path);
      return new Displaypad(display, device);
    } catch (e) {
      if (display) { try { await display.close(); } catch (_) { /* ignore */ } }
      throw e;
    }
  }

  async _tick() {
    if (this.pad || this.connecting) return;
    this.connecting = true;
    try {
      const pad = await this._open();
      if (!pad) return;
      pad.on('down', (k) => this.emit('down', k - 1)); // la lib numérote 1..12
      pad.on('up', (k) => this.emit('up', k - 1));
      pad.on('error', () => this._drop());
      this.pad = pad;
      this.shown.fill(undefined);
      this.emit('status', true);
    } catch (_) {
      // Appareil occupé (ex. Base Camp ouvert) : on réessaiera.
    } finally {
      this.connecting = false;
    }
  }

  _drop() {
    const pad = this.pad;
    if (!pad) return;
    this.pad = null;
    clearTimeout(pad.timeout);     // sinon la lib tente un reset sur un handle fermé
    pad.queue.length = 0;
    pad.removeAllListeners();
    try { pad.close(); } catch (_) { /* ignore */ }
    this.emit('status', false);
  }

  // rgb : Buffer 102*102*3 (ordre R,G,B) ou null pour éteindre la touche ; sig : signature de l'image
  setKey(index, rgb, sig) {
    if (!this.pad) return;
    if (this.shown[index] === sig) return; // déjà affichée
    this.shown[index] = sig;
    const q = this.pad.queue;
    // index 0 = transfert en cours (ne pas toucher) ; au-delà : remplacer une demande en attente
    for (let i = 1; i < q.length; i++) {
      if (q[i].keyIndex === index) {
        q.splice(i, 1);
        break;
      }
    }
    try {
      if (rgb) this.pad.fillImage(index, rgb); else this.pad.clearKey(index);
    } catch (_) { this._drop(); }
  }
}

module.exports = { DeviceManager, ICON_SIZE: Displaypad.ICON_SIZE };
