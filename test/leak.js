// Test d'endurance : N cycles de modifications, mesure de la mémoire (après GC) des processus principal et d'affichage.
const { app, BrowserWindow } = require('electron');
require('../main.js');
const N = +process.env.N || 300;
const mb = (b) => (b / 1048576).toFixed(1);
app.whenReady().then(async () => {
  await new Promise((r) => setTimeout(r, 1500));
  const w = BrowserWindow.getAllWindows()[0];
  const cycle = (n) => w.webContents.executeJavaScript(`(async()=>{
    const ev=(id,t)=>document.getElementById(id).dispatchEvent(new Event(t));
    if(document.getElementById('pageSelect').options.length<2){document.getElementById('btnNewPage').click();await new Promise(r=>setTimeout(r,300));}
    for(let i=0;i<${n};i++){
      const ps=document.getElementById('pageSelect'); ps.value=ps.options[i%2].value; ev('pageSelect','change');
      await new Promise(r=>setTimeout(r,20));
      document.querySelectorAll('.key')[i%12].click();
      const l=document.getElementById('label'); l.value='K'+i; ev('label','input');
      const t=document.getElementById('actionType'); t.value=i%2?'shortcut':'page'; ev('actionType','change');
      const o=document.getElementById('optGlobal'); o.checked=!o.checked; ev('optGlobal','change');
      document.querySelectorAll('.flag')[i%3].click();
      await new Promise(r=>setTimeout(r,30));
    }
    await new Promise(r=>setTimeout(r,1500));
    for(let i=0;i<5;i++){ window.gc(); await new Promise(r=>setTimeout(r,100)); }
    return performance.memory.usedJSHeapSize;
  })()`);
  const measure = async (n) => {
    const r = await cycle(n);
    for (let i = 0; i < 5; i++) global.gc();
    const m = process.memoryUsage();
    return { renderer: r, mainHeap: m.heapUsed, mainRss: m.rss };
  };
  await measure(50); // chauffe
  const a = await measure(N);
  const b = await measure(N);
  const c = await measure(N);
  console.log('RESULT', [a, b, c].map((x, i) => `après ${(i + 1) * N + 50} cycles : rendu ${mb(x.renderer)} Mo | principal tas ${mb(x.mainHeap)} Mo, RSS ${mb(x.mainRss)} Mo`).join('\n'));
  app.exit(0);
});
