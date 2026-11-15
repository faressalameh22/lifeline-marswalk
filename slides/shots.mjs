// Captures the screenshots used in the slides from the live tool (serve the repo on port 8790 first): node slides/shots.mjs
import {launch} from './cdp.mjs';
const b=await launch(9335), O='slides/shots/';
const click=t=>b.evalJS(`[...document.querySelectorAll('button')].find(x=>x.textContent.trim()===${JSON.stringify(t)}).click()`);
const setT=v=>b.evalJS(`(()=>{const s=document.getElementById('tSlider');s.value=${v};s.dispatchEvent(new Event('input',{bubbles:true}))})()`);
const rect=sel=>b.rect(sel);
const fs=await import('node:fs');
const shot=async(file,r)=>{const o=await b.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:r.x,y:r.y,width:r.width,height:r.height,scale:1}});fs.writeFileSync(O+file,Buffer.from(o.data,'base64'))};
await b.goto('http://localhost:8790/?'+Date.now(),1440,1300,2);
await setT(40);await b.sleep(800);
await shot('plan-go.png',{x:80,y:0,width:1280,height:1300});
await shot('why-go.png',await rect('#whyCard'));
await shot('validation.png',await rect('#validCard'));
await shot('environment.png',await rect('.env'));
// crisis: rover fails at T+1:30
await setT(90);await b.sleep(300);await click('Rover fails');await b.sleep(900);
await shot('crisis-rover.png',{x:80,y:0,width:1280,height:1300});
await click('Clear all');await b.sleep(300);
// running late once at A
await setT(40);await click('Running late +15 min');await b.sleep(600);await setT(90);await b.sleep(600);
await shot('late-right.png',await rect('#rightCol'));
await click('Clear all');await b.sleep(300);
// wrist display
await b.evalJS(`document.getElementById('modeWalk').click()`);await setT(90);await b.sleep(800);
const wr=await b.evalJS(`JSON.stringify((()=>{const r=document.getElementById('rightCol').getBoundingClientRect();return {x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height}})())`);await shot('walk.png',JSON.parse(wr));
await b.evalJS(`document.getElementById('modePlan').click()`);
// 3D: crew view with fence at two times, plus profile
await b.evalJS(`document.getElementById('mode3d').click()`);for(let i=0;i<60&&!await b.evalJS('!!window.__lifeline3d');i++)await b.sleep(250);await b.sleep(2500);
const box=async()=>JSON.parse(await b.evalJS(`JSON.stringify((()=>{const r=document.getElementById('v3d').getBoundingClientRect();return {x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height}})())`));
const prof=async()=>JSON.parse(await b.evalJS(`JSON.stringify((()=>{const r=document.getElementById('v3dProfile').getBoundingClientRect();return {x:r.x+scrollX,y:r.y+scrollY-4,width:r.width,height:r.height+30}})())`));
await setT(150);await b.sleep(900);await b.evalJS(`document.querySelector('[data-view=crew]').click()`);await b.sleep(1800);await shot('3d-crew.png',await box());
for(const [t,name] of [[40,'3d-top-t1'],[150,'3d-top-t2']]){await setT(t);await b.sleep(900);await b.evalJS(`document.querySelector('[data-view=top]').click()`);await b.sleep(1800);await shot(name+'.png',await box())}
await setT(90);await b.sleep(600);await b.evalJS(`document.querySelector('[data-view=overview]').click()`);await b.sleep(1800);await shot('3d-overview.png',await box());await shot('profile.png',await prof());
console.log(await b.evalJS(`document.getElementById('v3dFenceNote').textContent`));
b.close();process.exit(0);
