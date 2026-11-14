import {launch} from './cdp.mjs';
const b=await launch(9335), O='slides/shots/';
const click=t=>b.evalJS(`[...document.querySelectorAll('button')].find(x=>x.textContent.trim()===${JSON.stringify(t)}).click()`);
const setT=v=>b.evalJS(`(()=>{const s=document.getElementById('tSlider');s.value=${v};s.dispatchEvent(new Event('input',{bubbles:true}));s.dispatchEvent(new Event('change',{bubbles:true}))})()`);
await b.goto('http://localhost:8790/');
// 1. Default plan: header + map + right column
await b.shotRect(O+'plan-go.png',{x:80,y:0,width:1280,height:1230});
await b.shotRect(O+'why-go.png',await b.rect('#whyCard'));
await b.shotRect(O+'validation.png',await b.rect('#validCard'));
await b.shotRect(O+'backup.png',await b.rect('#backupCard'));
// 2. Rover fails at T+1:30
await setT(90); await b.sleep(500); await click('Rover fails'); await b.sleep(1200);
const top=await b.evalJS(`(()=>{const r=document.getElementById('alertbar').getBoundingClientRect();return [r.y+scrollY,r.height]})()`);
console.log('alertbar',top);
await b.shotRect(O+'crisis-rover.png',{x:80,y:0,width:1280,height:1230});
await b.shotRect(O+'crisis-right.png',await b.rect('#rightCol'));
// 3. Running late +30 min
await click('Clear all'); await b.sleep(500); await click('Running late +15 min'); await click('Running late +15 min'); await b.sleep(400); await setT(150); await b.sleep(1200);
await b.shotRect(O+'late-right.png',await b.rect('#rightCol'));
await b.shotRect(O+'late-map.png',{x:80,y:0,width:1280,height:1230});
console.log(await b.evalJS(`document.getElementById('verdict').textContent+' | '+document.getElementById('lateNote').textContent`));
b.close();
