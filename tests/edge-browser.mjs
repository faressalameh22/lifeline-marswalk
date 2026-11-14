// Edge-state test in a real browser (headless Chrome). Serve the repo first:
//   python3 -m http.server 8790   then   node tests/edge-browser.mjs
// Fails on: any console error or exception, "NaN"/"undefined"/"Infinity" in the page text,
// or a verdict that disagrees with an independent re-run of the model on the same inputs.
import {launch} from '../slides/cdp.mjs';
const URL=process.env.URL||'http://localhost:8790/';
const b=await launch(9340);
const problems=[];const _push=problems.push.bind(problems);problems.push=(...a)=>{a.forEach(x=>console.log('\nPROBLEM '+x));return _push(...a)};let scenario='load';
const events=[];
b.on(m=>{
  if(m.method==='Runtime.exceptionThrown')events.push('exception: '+(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text).split('\n')[0]);
  if(m.method==='Runtime.consoleAPICalled'&&['error','warning','assert'].includes(m.params.type))events.push('console.'+m.params.type+': '+m.params.args.map(a=>a.value??a.description).join(' '));
  // SwiftShader (the software WebGL used headless) logs 'GL Driver Message ... Performance' notes when the 3D view
  // starts; they are driver performance hints, not page errors, and do not appear with a real GPU. Every other entry fails.
  if(m.method==='Log.entryAdded'&&/GL Driver Message \(OpenGL, Performance/.test(m.params.entry.text))return;
  if(m.method==='Log.entryAdded'&&['error','warning'].includes(m.params.entry.level))events.push('log '+m.params.entry.level+': '+m.params.entry.text+(m.params.entry.url?' '+m.params.entry.url:''));
});
await b.send('Runtime.enable');await b.send('Log.enable');
await b.goto(URL,1440,1400,1);
const check=async(label)=>{process.stdout.write('.');
  const r=await b.evalJS(`(()=>{
    const txt=document.body.innerText;
    const bad=['NaN','undefined','Infinity','null'].filter(w=>new RegExp('\\\\b'+w+'\\\\b').test(txt));
    const ids=['pSpeed','pO2','pH2O','pEmerg','pPad','pGate','pLoad','pSlope','pSand','pRover','pRoverE','pStation','pWarn','pMax'];
    const keys=['speed','o2','h2o','emerg','pad','gate','load','slope','sand','rover','roverE','station','warn','maxh'];
    const p={};ids.forEach((id,k)=>{const el=document.getElementById(id);const v=parseFloat(el.value);p[keys[k]]=isFinite(v)?v:parseFloat(el.defaultValue)});
    const shown=document.getElementById('verdict').textContent.trim();
    return {bad,shown,p};
  })()`);
  // independent oracle: fresh fields, same inputs as the page uses after its own clamping
  const o=await b.evalJS(`(()=>{const p=window.__lifelineParams?window.__lifelineParams():null;if(!p)return null;const D=derived(p),F=buildFields(p,STOPS),E=evaluateDesign(F,p,D,STOPS);
    const ok=E.sc.worst.m>=0&&E.sc.ride.m>=0&&E.timeSpare>=0&&isFinite(E.end);
    return {grade:E.grade,ok,walk:E.sc.worst.m,ride:E.sc.ride.m,spare:E.timeSpare}})()`);
  const expected=o?(o.grade==='danger'?'NO-GO':o.grade==='tight'?'GO, MARGIN TIGHT':'GO FOR EVA'):null;
  if(r.bad.length)problems.push(`[${label}] page text contains ${r.bad.join(', ')}`);
  if(events.length){problems.push(`[${label}] ${events.slice(0,3).join(' | ')}`);events.length=0}
  if(o&&r.shown!==expected)problems.push(`[${label}] verdict shown "${r.shown}" but model says "${expected}"`);
  if(o&&r.shown!=='NO-GO'&&!o.ok)problems.push(`[${label}] GO shown although a limit fails (walk ${o.walk}, ride ${o.ride}, spare ${o.spare})`);
  return {shown:r.shown,o};
};
const setInput=(id,v)=>b.evalJS(`(()=>{const e=document.getElementById('${id}');e.value=${JSON.stringify(String(v))};e.dispatchEvent(new Event('change',{bubbles:true}));return 1})()`);
const resetInputs=()=>b.evalJS(`(()=>{['pSpeed','pO2','pH2O','pEmerg','pPad','pGate','pLoad','pSlope','pSand','pRover','pRoverE','pStation','pWarn','pMax'].forEach(id=>{const e=document.getElementById(id);if(e.value!==e.defaultValue){e.value=e.defaultValue;e.dispatchEvent(new Event('change',{bubbles:true}))}});document.getElementById('clear').click();return 1})()`);
const crisis=(name)=>b.evalJS(`[...document.querySelectorAll('[data-cr]')].find(x=>x.dataset.cr==='${name}').click()`);
const slider=(v)=>b.evalJS(`(()=>{const s=document.getElementById('tSlider');s.value=${v};s.dispatchEvent(new Event('input',{bubbles:true}));return +s.max})()`);
const sweep=async(label,step=7)=>{const max=await slider(0);for(let t=0;t<=max;t+=step){await slider(t);const r=await b.evalJS(`document.body.innerText.match(/\\b(NaN|undefined|Infinity)\\b/)?.[0]||''`);if(r){problems.push(`[${label} t=${t}] page text contains ${r}`);break}}await slider(Math.min(40,max))};

// 1. default
let s=await check('default');console.log('default verdict:',s.shown);
await sweep('default sweep',1);
// 2. every crisis combination, slider swept
const names=['rover','suit','injured','storm'];
for(let m=1;m<16;m++){const on=names.filter((_,k)=>m>>k&1);for(const n of on)await crisis(n);await check('crisis '+on.join('+'));await sweep('crisis '+on.join('+'));await b.evalJS(`document.getElementById('clear').click()`)}
await b.evalJS(`document.getElementById('modeWalk').click()`);for(const n of names)await crisis(n);await sweep('walk view, all crises');await check('walk view, all crises');await b.evalJS(`document.getElementById('clear').click();document.getElementById('modePlan').click()`);
// 3. running late many times, at several times of day
for(const t of [0,40,100,150,200]){await b.evalJS(`document.getElementById('clear').click()`);await slider(t);for(let k=0;k<12;k++){await b.evalJS(`document.getElementById('late').click()`);await check(`late x${k+1} at t=${t}`)}await sweep(`late x12 at t=${t}`)}
await b.evalJS(`document.getElementById('clear').click()`);
// 4. assumption inputs: min, max, beyond, empty, negative, text
const lims=await b.evalJS(`JSON.stringify(['pSpeed','pO2','pH2O','pEmerg','pPad','pGate','pLoad','pSlope','pSand','pRover','pRoverE','pStation','pWarn','pMax'].map(id=>{const e=document.getElementById(id);return [id,+e.min,+e.max]}))`);
for(const [id,mn,mx] of JSON.parse(lims)){
  for(const v of [mn,mx,0,-5,mx*10,'','1e9',mn-0.01,mx+0.01]){await setInput(id,v);await check(`${id}=${JSON.stringify(v)}`);}
  await resetInputs();
}
// 5. drag stops with real mouse events: corners, steep ground, onto the habitat, all on one cell, C far away
const rect=JSON.parse(await b.evalJS(`JSON.stringify((()=>{const r=document.getElementById('map').getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}})())`));
const toPx=(cx,cy)=>({x:rect.x+(cx+.5)/W_*rect.w,y:rect.y+(cy+.5)/H_*rect.h});
const W_=await b.evalJS('W'),H_=await b.evalJS('H');
const drag=async(id,tx,ty,label)=>{
  await b.evalJS(`window.scrollTo(0,0)`);
  Object.assign(rect,JSON.parse(await b.evalJS(`JSON.stringify((()=>{const r=document.getElementById('map').getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}})())`)));
  const st=JSON.parse(await b.evalJS(`JSON.stringify(STOPS.find(s=>s.id==='${id}'))`));
  const a=toPx(st.x,st.y),z=toPx(tx,ty);
  await b.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:a.x,y:a.y});
  await b.send('Input.dispatchMouseEvent',{type:'mousePressed',x:a.x,y:a.y,button:'left',clickCount:1});
  for(let k=1;k<=12;k++)await b.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:a.x+(z.x-a.x)*k/12,y:a.y+(z.y-a.y)*k/12,button:'left',buttons:1});
  await b.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:z.x,y:z.y,button:'left',clickCount:1});
  await b.sleep(300);
  const after=JSON.parse(await b.evalJS(`JSON.stringify(STOPS.find(s=>s.id==='${id}'))`));
  if(after.x===st.x&&after.y===st.y&&(st.x!==tx||st.y!==ty))console.log(`  (stop ${id} did not move from ${st.x},${st.y}: target refused)`);
  const r=await check(label);await sweep(label,10);r.at=after.x+','+after.y;return r;
};
const hab=JSON.parse(await b.evalJS('JSON.stringify(HAB)'));const st0C=JSON.parse(await b.evalJS(`JSON.stringify(STOPS.find(s=>s.id==='C'))`));
const steep=await b.evalJS(`(()=>{let best=0,bi=0;for(let i=0;i<W*H;i++)if(T.slope[i]>best){best=T.slope[i];bi=i}return JSON.stringify({x:bi%W,y:Math.floor(bi/W),s:best})})()`);
const st=JSON.parse(steep);
const cases=[['C',1,1,'C to top-left corner'],['C',W_-2,H_-2,'C to bottom-right corner'],['A',W_-2,1,'A to top-right corner'],['B',1,H_-2,'B to bottom-left corner'],['C',st.x,st.y,`C onto steepest cell (${st.s.toFixed(0)} deg)`],['A',hab.x,hab.y,'A onto the habitat'],['B',hab.x,hab.y,'B onto the habitat too'],['C',hab.x,hab.y,'all three on the habitat']];
for(const [id,x,y,l] of cases){const r=await drag(id,x,y,l);console.log(l.padEnd(34),'-> at',r.at.padEnd(8),r.shown)}
// 5b. 3D view: opens (or shows its fallback message), follows crises and drags, closes with Plan/Walk
await b.goto(URL,1440,1400,1);
await b.evalJS(`document.getElementById('mode3d').click()`);
for(let i=0;i<60;i++){if(await b.evalJS(`!!document.querySelector('#v3d canvas')||!document.getElementById('v3dMsg')?.textContent.startsWith('Loading')`))break;await b.sleep(250)}
const v3state=await b.evalJS(`JSON.stringify({canvas:!!document.querySelector('#v3d canvas'),msg:document.getElementById('v3dMsg')?.textContent||null,left:getComputedStyle(document.getElementById('leftCol')).display,box:!document.getElementById('view3dBox').hidden})`);
console.log('\n3D view state:',v3state);
if(!JSON.parse(v3state).box)problems.push('[3D] panel did not open');
await check('3D open');
for(const n of names){await crisis(n);await check('3D + crisis '+n)}await sweep('3D, all crises',15);await b.evalJS(`document.getElementById('clear').click()`);
const r3=await drag('C',W_-2,H_-2,'3D open: drag C to a corner');console.log('3D open: drag C to a corner'.padEnd(34),'-> at',r3.at.padEnd(8),r3.shown);
await drag('C',st0C.x,st0C.y,'3D open: drag C back');
await b.evalJS(`document.getElementById('modeWalk').click()`);await check('3D then Walk');
if(await b.evalJS(`!document.getElementById('view3dBox').hidden`))problems.push('[3D] panel still open in Walk view');
await b.evalJS(`document.getElementById('mode3d').click()`);await b.sleep(500);await b.evalJS(`document.getElementById('modePlan').click()`);await check('3D then Plan');
if(await b.evalJS(`!document.getElementById('view3dBox').hidden`))problems.push('[3D] panel still open in Plan view');
// 6. reload and check the clean state once more
await b.goto(URL,1440,1400,1);
s=await check('after reload');
console.log('\n'+(problems.length?problems.length+' problem(s):\n'+problems.join('\n'):'No problems found.'));
b.close();process.exit(problems.length?1:0);
