'use strict';
const assert = require('assert');
const { comboToLine, normalizeCombo } = require('../src/keys');
const { sanitizeData, sanitizeAction } = require('../src/store');

assert.strictEqual(comboToLine(['m', 'shift', 'ctrl']), '17,16,77');
assert.strictEqual(comboToLine(['left', 'alt']), '18,37e');
assert.strictEqual(comboToLine(['f13']), '124');
assert.strictEqual(comboToLine(['calc.exe']), null);
assert.strictEqual(comboToLine(['a"; Remove-Item *']), null);
assert.strictEqual(normalizeCombo([]), null);
assert.strictEqual(normalizeCombo(Array(7).fill('a')), null);

assert.deepStrictEqual(sanitizeAction({ type: 'url', url: 'javascript:alert(1)' }), { type: 'none' });
assert.deepStrictEqual(sanitizeAction({ type: 'url', url: 'file:///c:/x' }), { type: 'none' });
assert.strictEqual(sanitizeAction({ type: 'url', url: 'https://exemple.com' }).type, 'url');
assert.deepStrictEqual(sanitizeAction({ type: 'launch', path: 'calc.exe' }), { type: 'none' }); // chemin relatif refusé
assert.strictEqual(sanitizeAction({ type: 'launch', path: 'C:\\Windows\\notepad.exe', args: '' }).type, 'launch');

const d = sanitizeData({ profiles: [{ id: '<script>', name: '<img src=x onerror=alert(1)>', keys: [{ label: 'x'.repeat(500), image: 'data:text/html;base64,AAAA', bg: 'red;}', action: { type: 'profile', profileId: 'zzzz' } }] }] });
assert.strictEqual(d.profiles.length, 1);
assert.strictEqual(d.profiles[0].pages[0].keys.length, 12);
assert.strictEqual(d.profiles[0].pages[0].keys[0].label.length, 40);
assert.strictEqual(d.profiles[0].pages[0].keys[0].image, null);
assert.strictEqual(d.profiles[0].pages[0].keys[0].bg, '#000000');
assert.strictEqual(d.profiles[0].pages[0].keys[0].action.type, 'none');
assert.ok(/^[a-f0-9]{16}$/.test(d.profiles[0].id));
assert.strictEqual(sanitizeData('garbage').profiles.length, 1);
// v2 : migration et pages
const m = sanitizeData({ profiles: [{ id: 'aaaaaaaaaaaaaaaa', name: 'P', keys: [{ label: 'a', action: { type: 'page', pageId: 'bbbbbbbbbbbbbbbb' } }] }] });
assert.strictEqual(m.profiles[0].pages.length, 1);
assert.strictEqual(m.profiles[0].pages[0].keys[0].label, 'a');
assert.strictEqual(m.profiles[0].pages[0].keys[0].action.type, 'none'); // page inexistante
const two = sanitizeData({ profiles: [{ pages: [{ id: '1111111111111111', keys: [{ action: { type: 'page', pageId: '2222222222222222' } }] }, { id: '2222222222222222', global: 1 }] }] });
assert.strictEqual(two.profiles[0].pages[0].keys[0].action.type, 'page');
assert.strictEqual(two.profiles[0].pages[1].global, true);
assert.deepStrictEqual(sanitizeAction({ type: 'page', pageId: '../../x' }), { type: 'none' });
console.log('OK : tous les tests passent');
