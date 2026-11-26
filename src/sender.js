'use strict';
// Envoi de raccourcis clavier via un unique processus PowerShell persistant (aucun module natif).
// Protocole stdin : une ligne = codes VK séparés par des virgules (suffixe "e" = touche étendue).
// Les lignes sont revalidées ici par une regex stricte : impossible d'injecter autre chose que des nombres.

const { spawn } = require('child_process');
const { comboToLine } = require('./keys');

const LINE_RE = /^[0-9]{1,3}e?(,[0-9]{1,3}e?){0,5}$/;

const PS_SCRIPT = `
$ErrorActionPreference = 'Stop'
Add-Type -Namespace W -Name K -MemberDefinition '[System.Runtime.InteropServices.DllImport("user32.dll")] public static extern void keybd_event(byte vk, byte scan, int flags, int extra);'
while (($l = [Console]::In.ReadLine()) -ne $null) {
  if ($l -notmatch '^[0-9]{1,3}e?(,[0-9]{1,3}e?){0,5}$') { continue }
  $keys = @()
  foreach ($t in $l.Split(',')) {
    $ext = 0; if ($t.EndsWith('e')) { $ext = 1; $t = $t.TrimEnd('e') }
    $keys += ,@([byte]([int]$t), $ext)
  }
  foreach ($k in $keys) { [W.K]::keybd_event($k[0], 0, $k[1], 0) }
  [array]::Reverse($keys)
  foreach ($k in $keys) { [W.K]::keybd_event($k[0], 0, ($k[1] -bor 2), 0) }
}
`;

class KeySender {
  constructor() { this.proc = null; }

  _ensure() {
    if (process.platform !== 'win32') return false;
    if (this.proc && !this.proc.killed) return true;
    const encoded = Buffer.from(PS_SCRIPT, 'utf16le').toString('base64');
    this.proc = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-EncodedCommand', encoded], {
      windowsHide: true, stdio: ['pipe', 'ignore', 'ignore'],
    });
    this.proc.on('exit', () => { this.proc = null; });
    this.proc.on('error', () => { this.proc = null; });
    this.proc.stdin.on('error', () => {});
    return true;
  }

  send(keys) {
    const line = comboToLine(keys);
    if (!line || !LINE_RE.test(line)) throw new Error('Raccourci invalide');
    if (!this._ensure()) throw new Error('Envoi de raccourcis disponible uniquement sous Windows');
    this.proc.stdin.write(line + '\n');
  }

  close() { try { this.proc && this.proc.kill(); } catch (_) { /* ignore */ } this.proc = null; }
}

module.exports = { KeySender };
