import {launch} from './cdp.mjs';
import fs from 'node:fs';
const b=await launch(9337);
await b.goto('http://localhost:8790/slides/index.html',1920,1080,1);
await b.evalJS('document.fonts.ready.then(()=>1)'); await b.sleep(800);
const n=await b.evalJS('document.querySelectorAll(".s").length');
// overflow check: any element extending past its slide
console.log('slides',n, await b.evalJS(`JSON.stringify([...document.querySelectorAll('.s')].map((s,i)=>{const R=s.getBoundingClientRect();let worst=0;s.querySelectorAll('*').forEach(e=>{if(e.closest('.crop')&&e.tagName==='IMG')return;const r=e.getBoundingClientRect();worst=Math.max(worst,r.bottom-R.bottom+0)});return i+1+':'+Math.round(worst)}))`));
const dir=process.argv[2]||'slides/png'; fs.mkdirSync(dir,{recursive:true});
for(let i=0;i<n;i++){const r=await b.rect(`.s:nth-of-type(${i+1})`);await b.shotRect(`${dir}/slide-${i+1}.png`,r)}
const pdf=await b.send('Page.printToPDF',{preferCSSPageSize:true,printBackground:true});
fs.writeFileSync('slides/LIFELINE-slides.pdf',Buffer.from(pdf.data,'base64'));
b.close();
