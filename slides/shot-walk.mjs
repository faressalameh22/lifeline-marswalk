import {launch} from './cdp.mjs';
const b=await launch(9336);
await b.goto('http://localhost:8790/');
await b.evalJS(`document.getElementById('modeWalk').click()`); await b.sleep(1500);
console.log(await b.evalJS(`[...document.querySelectorAll('section,aside,div')].filter(e=>e.id&&e.offsetParent).map(e=>{const r=e.getBoundingClientRect();return e.id+' '+[r.x,r.y+scrollY,r.width,r.height].map(Math.round)}).slice(0,25).join('\\n')`));
await b.shotRect('slides/shots/walk.png',{x:0,y:0,width:1440,height:900});
b.close();
