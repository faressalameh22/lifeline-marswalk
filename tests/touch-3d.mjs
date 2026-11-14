// Touch test of the 3D view on a phone-sized screen: node tests/touch-3d.mjs (serve the repo on port 8790 first, or set URL).
// Pinch to zoom, one-finger tilt, Reset view. Fails on errors, page scrolling, a camera under the ground, or no zoom.
import {launch} from '../slides/cdp.mjs';
const URL=process.env.URL||'http://localhost:8790/';
import fs from 'node:fs';
const b=await launch(9370);const ev=[];b.on(m=>{if(m.method==='Runtime.exceptionThrown')ev.push('exception '+m.params.exceptionDetails.text);if(m.method==='Runtime.consoleAPICalled'&&['error','warning'].includes(m.params.type))ev.push(m.params.type+' '+m.params.args.map(a=>a.value).join(' '))});
await b.send('Runtime.enable');
await b.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:3,mobile:true});await b.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
await b.send('Page.navigate',{url:URL+'?'+Date.now()});await b.sleep(3000);
await b.evalJS(`document.getElementById('mode3d').click()`);for(let i=0;i<40&&!await b.evalJS('!!window.__lifeline3d');i++)await b.sleep(250);
await b.evalJS(`document.getElementById('v3d').scrollIntoView({block:'center'})`);await b.sleep(500);
const r=JSON.parse(await b.evalJS(`JSON.stringify(document.getElementById('v3d').getBoundingClientRect())`));console.log('3D panel on screen at y',Math.round(r.y),'scrollY',await b.evalJS('Math.round(scrollY)'));
const shot=async n=>{const o=await b.send('Page.captureScreenshot',{format:'jpeg',quality:70,clip:{x:r.x,y:r.y+await b.evalJS('scrollY'),width:r.width,height:r.height,scale:1}});if(process.env.SHOTS)fs.writeFileSync(`${process.env.SHOTS}/pinch-${n}.jpg`,Buffer.from(o.data,'base64'))};
const S=async()=>JSON.parse(await b.evalJS('JSON.stringify(__lifeline3d.stats())'));const s0=await S();const y0=await b.evalJS('Math.round(scrollY)');console.log('start  ',JSON.stringify(s0));await shot('0');
// pinch out around a point in the lower third of the panel (near the stops), several times
const cx=r.x+r.width*0.4,cy=r.y+r.height*0.7;
const pinch=async(from,to)=>{const steps=12;await b.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:cx-from,y:cy,id:1},{x:cx+from,y:cy,id:2}]});
  for(let k=1;k<=steps;k++){const d=from+(to-from)*k/steps;await b.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:cx-d,y:cy,id:1},{x:cx+d,y:cy,id:2}]});await b.sleep(16)}
  await b.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await b.sleep(400)};
for(let k=0;k<6;k++)await pinch(20,120);
const s1=await S();console.log('pinched',JSON.stringify(s1));await shot('1');
for(let k=0;k<6;k++)await pinch(20,120);
console.log('more   ',await b.evalJS('JSON.stringify(__lifeline3d.stats())'));await shot('2');
// one-finger rotate down toward the horizon
await b.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:cx,y:r.y+r.height*0.8,id:1}]});for(let k=1;k<=15;k++){await b.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:cx,y:r.y+r.height*0.8-k*10,id:1}]});await b.sleep(16)}await b.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await b.sleep(500);
const s3=await S();console.log('tilted ',JSON.stringify(s3));await shot('3');
await b.evalJS(`document.getElementById('v3dReset').click()`);await b.sleep(400);console.log('reset  ',await b.evalJS('JSON.stringify(__lifeline3d.stats())'));
const s4=await S();const y1=await b.evalJS('Math.round(scrollY)');
const fails=[];if(!(s1.distance<s0.distance/3))fails.push('pinch did not zoom in');if(s1.distance<999)fails.push('zoomed closer than the 1 km limit');
for(const [n,x] of [['pinched',s1],['tilted',s3]])if(x.clearance!==null&&x.clearance<39)fails.push(n+': camera below ground clearance');
if(s3.clearance===s1.clearance&&s3.distance===s1.distance)fails.push('one-finger tilt had no effect');if(y1!==y0)fails.push('the page scrolled during 3D gestures');
if(Math.abs(s4.distance-s0.distance)>200)fails.push('Reset view did not return to the start');if(ev.length)fails.push('console: '+ev.slice(0,3).join(' | '));
console.log(fails.length?'FAIL\n  '+fails.join('\n  '):'Touch 3D: all checks passed.');b.close();process.exit(fails.length?1:0);
