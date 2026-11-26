'use strict';
// Table blanche des touches autorisées -> codes virtuels Windows (VK).
// Aucune chaîne utilisateur n'est jamais transmise à PowerShell : seuls des nombres issus de cette table.

const VK = {
  ctrl: 0x11, shift: 0x10, alt: 0x12, win: 0x5b,
  enter: 0x0d, esc: 0x1b, tab: 0x09, space: 0x20, backspace: 0x08,
  delete: 0x2e, insert: 0x2d, home: 0x24, end: 0x23, pageup: 0x21, pagedown: 0x22,
  left: 0x25, up: 0x26, right: 0x27, down: 0x28, printscreen: 0x2c,
  playpause: 0xb3, nexttrack: 0xb0, prevtrack: 0xb1, stopmedia: 0xb2,
  volumeup: 0xaf, volumedown: 0xae, mute: 0xad,
};
for (let i = 0; i < 26; i++) VK[String.fromCharCode(97 + i)] = 0x41 + i;
for (let i = 0; i <= 9; i++) VK[String(i)] = 0x30 + i;
for (let i = 1; i <= 24; i++) VK['f' + i] = 0x6f + i;

const MODIFIERS = ['ctrl', 'shift', 'alt', 'win'];
const EXTENDED = new Set([0x2d, 0x2e, 0x24, 0x23, 0x21, 0x22, 0x25, 0x26, 0x27, 0x28, 0x2c, 0x5b]);

// event.code (navigateur) -> nom de touche interne (utilisé par l'enregistreur de raccourcis)
function fromEventCode(code) {
  let m;
  if ((m = /^Key([A-Z])$/.exec(code))) return m[1].toLowerCase();
  if ((m = /^Digit([0-9])$/.exec(code))) return m[1];
  if ((m = /^Numpad([0-9])$/.exec(code))) return m[1];
  if ((m = /^F([0-9]{1,2})$/.exec(code))) return 'f' + m[1];
  const map = {
    ControlLeft: 'ctrl', ControlRight: 'ctrl', ShiftLeft: 'shift', ShiftRight: 'shift',
    AltLeft: 'alt', AltRight: 'alt', MetaLeft: 'win', MetaRight: 'win',
    Enter: 'enter', NumpadEnter: 'enter', Escape: 'esc', Tab: 'tab', Space: 'space', Backspace: 'backspace',
    Delete: 'delete', Insert: 'insert', Home: 'home', End: 'end', PageUp: 'pageup', PageDown: 'pagedown',
    ArrowLeft: 'left', ArrowUp: 'up', ArrowRight: 'right', ArrowDown: 'down', PrintScreen: 'printscreen',
    MediaPlayPause: 'playpause', MediaTrackNext: 'nexttrack', MediaTrackPrevious: 'prevtrack',
    MediaStop: 'stopmedia', AudioVolumeUp: 'volumeup', AudioVolumeDown: 'volumedown', AudioVolumeMute: 'mute',
  };
  return map[code] || null;
}

// Valide une combinaison ; renvoie la liste normalisée (modificateurs d'abord) ou null.
function normalizeCombo(keys) {
  if (!Array.isArray(keys) || keys.length === 0 || keys.length > 6) return null;
  const seen = new Set();
  for (const k of keys) {
    if (typeof k !== 'string') return null;
    const n = k.toLowerCase();
    if (!Object.prototype.hasOwnProperty.call(VK, n)) return null;
    seen.add(n);
  }
  const mods = MODIFIERS.filter((k) => seen.has(k));
  const rest = [...seen].filter((k) => !MODIFIERS.includes(k));
  return [...mods, ...rest];
}

// Ligne de commande envoyée au processus d'aide : uniquement des chiffres et des virgules.
function comboToLine(keys) {
  const c = normalizeCombo(keys);
  if (!c) return null;
  return c.map((k) => VK[k] + (EXTENDED.has(VK[k]) ? 'e' : '')).join(',');
}

module.exports = { VK, MODIFIERS, normalizeCombo, comboToLine, fromEventCode };
