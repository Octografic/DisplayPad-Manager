'use strict';
// Simule un DisplayPad lent : la file d'envoi doit rester bornée, sans fuite d'écouteurs.
const assert = require('assert');
const EventEmitter = require('events');
const { DeviceManager } = require('../src/device');

class FakePad extends EventEmitter {
  constructor() { super(); this.queue = []; this.timeout = setTimeout(() => {}, 0); this.closed = false; }
  fillImage(k, buf) { this.queue.push({ keyIndex: k, pixels: buf }); }
  clearKey(k) { this.queue.push({ keyIndex: k, pixels: null }); }
  close() { this.closed = true; }
}

const dm = new DeviceManager();
const pad = new FakePad();
dm.pad = pad;
const buf = Buffer.alloc(102 * 102 * 3);
for (let round = 0; round < 5000; round++) {
  for (let k = 0; k < 12; k++) dm.setKey(k, buf, 'img-' + round); // l'appareil ne consomme jamais rien
}
assert.ok(pad.queue.length <= 13, 'file bornée, obtenu ' + pad.queue.length);
const before = pad.queue.length;
for (let k = 0; k < 12; k++) dm.setKey(k, buf, 'img-4999'); // images identiques : rien n'est renvoyé
assert.strictEqual(pad.queue.length, before);

pad.on('down', () => {});
dm._drop();
assert.ok(pad.closed && pad.queue.length === 0 && pad.listenerCount('down') === 0 && dm.pad === null);
console.log('OK : file bornée à', before, 'éléments après 60 000 envois ; déconnexion propre');
