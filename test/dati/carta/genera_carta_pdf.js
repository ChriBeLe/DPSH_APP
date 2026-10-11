// La carta intestata in PDF (due pagine: la prima con la fascia e la banda laterale, la seconda più
// leggera), fatta col browser. node genera_carta_pdf.js
const path = require('path');
const { chromium } = require('/opt/node-tools/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await b.newPage();
  await p.setContent(`<style>@page{size:A4;margin:0}body{margin:0;font-family:Arial}.f{width:210mm;height:297mm;position:relative;page-break-after:always;overflow:hidden}
    .testa{position:absolute;left:0;top:0;width:210mm;height:32mm;background:#0d9488;color:#fff;font:bold 22pt Arial;display:flex;align-items:center;padding-left:30mm;box-sizing:border-box}
    .banda{position:absolute;left:0;top:32mm;width:10mm;height:265mm;background:#99f6e4}
    .piede{position:absolute;left:20mm;right:20mm;bottom:8mm;border-top:1px solid #0d9488;padding-top:2mm;font:9pt Arial;color:#0f766e;display:flex;justify-content:space-between}
    .testa2{position:absolute;left:20mm;top:10mm;font:bold 12pt Arial;color:#0d9488}</style>
    <div class="f"><div class="testa">STUDIO GEOLOGICO ROSSI</div><div class="banda"></div><div class="piede"><span>Tel. 0832 000000</span><span>info@studiorossi.it</span><span>P.IVA 01234567890</span></div></div>
    <div class="f"><div class="testa2">Studio Geologico Rossi</div><div class="piede"><span>Tel. 0832 000000</span><span>info@studiorossi.it</span></div></div>`);
  await p.pdf({ path: path.join(__dirname, 'carta.pdf'), format: 'A4', printBackground: true, preferCSSPageSize: true });
  await b.close();
  console.log('ok');
})();
