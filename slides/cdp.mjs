// Minimal Chrome DevTools Protocol helper (no dependencies). Used only to make slide screenshots and the PDF.
import { spawn } from 'node:child_process';
const CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
export async function launch(port=9333){
  const p=spawn(CHROME,['--headless=new','--disable-gpu','--hide-scrollbars',`--remote-debugging-port=${port}`,`--user-data-dir=/tmp/lifeline-chrome-${port}`,'about:blank'],{stdio:'ignore'});
  let tabs; for(let i=0;i<200;i++){try{tabs=await (await fetch(`http://127.0.0.1:${port}/json`)).json();if(tabs.find(t=>t.type==='page'))break}catch{}await new Promise(r=>setTimeout(r,200))}
  const ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl); await new Promise(r=>ws.onopen=r);
  let id=0; const pend=new Map(), waiters=[];
  ws.onmessage=e=>{const m=JSON.parse(e.data); if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id)} else waiters.forEach(w=>w(m))};
  const send=(method,params={})=>new Promise((res,rej)=>{const i=++id;pend.set(i,m=>m.error?rej(new Error(method+': '+m.error.message)):res(m.result));ws.send(JSON.stringify({id:i,method,params}))});
  const evalJS=async ex=>{const r=await send('Runtime.evaluate',{expression:ex,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails).slice(0,400));return r.result.value};
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  await send('Page.enable');
  return {send,evalJS,sleep,close:()=>{ws.close();p.kill()},
    async goto(url,w=1440,h=900,scale=2){await send('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:scale,mobile:false});await send('Page.navigate',{url});for(let i=0;i<300;i++){if(await evalJS('document.readyState')==='complete')break;await sleep(200)}await sleep(1500)},
    async shotRect(file,r,scale=2){const fs=await import('node:fs');const o=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:r.x,y:r.y,width:r.width,height:r.height,scale:1}});fs.writeFileSync(file,Buffer.from(o.data,'base64'))},
    async rect(sel){return evalJS(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});const r=e.getBoundingClientRect();return {x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height}})()`)},
  };
}
