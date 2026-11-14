// LIFELINE 3D view: the real HRSC terrain as a surface.
// Two looks: "Terrain" (colours from the real elevation, with the route, stops and crew drawn on top) and
// "Safety margins" (the live 2D map itself as the surface). View only: no model logic lives here.
// Stops are dragged on the 2D map and this view follows. Loaded on demand the first time 3D is pressed.
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';

export const EXAGGERATION = 3; // vertical exaggeration, shown on screen
const K = 6;                   // terrain texture pixels per 30 m cell (the elevation data itself stays 30 m)

// Mars-like colours by height, low to high (not a photo).
const RAMP = [[0,[74,36,26]],[0.25,[120,56,34]],[0.5,[166,88,48]],[0.72,[196,132,82]],[0.88,[218,174,122]],[1,[236,212,170]]];
const ramp = h => { for(let i=1;i<RAMP.length;i++){ const [a,ca]=RAMP[i-1],[b,cb]=RAMP[i]; if(h<=b){ const f=(h-a)/(b-a); return ca.map((c,k)=>c+(cb[k]-c)*f); } } return RAMP[RAMP.length-1][1]; };

function terrainBase(zmin, zmax){
  const cw=W*K, ch=H*K, c=document.createElement('canvas'); c.width=cw; c.height=ch;
  const g=c.getContext('2d'), img=g.createImageData(cw,ch), d=img.data, Z=T.z;
  const zAt=(fx,fy)=>{ fx=Math.max(0,Math.min(W-1.001,fx)); fy=Math.max(0,Math.min(H-1.001,fy)); const x0=Math.floor(fx),y0=Math.floor(fy),dx=fx-x0,dy=fy-y0,i=y0*W+x0;
    return Z[i]*(1-dx)*(1-dy)+Z[i+1]*dx*(1-dy)+Z[i+W]*(1-dx)*dy+Z[i+W+1]*dx*dy; };
  const step=CELL/K, sx=-0.6, sy=-0.6, sz=0.53; // sun from the north-west, 32 degrees up
  for(let y=0;y<ch;y++) for(let x=0;x<cw;x++){
    const fx=(x+.5)/K-.5, fy=(y+.5)/K-.5, z=zAt(fx,fy);
    const gx=(zAt(fx+1/K,fy)-zAt(fx-1/K,fy))/(2*step), gy=(zAt(fx,fy+1/K)-zAt(fx,fy-1/K))/(2*step);
    const n=1/Math.hypot(gx*3,gy*3,1), shade=Math.max(0,(-gx*3*sx-gy*3*sy+sz)*n);   // relief shaded with the same ×3
    const col=ramp((z-zmin)/(zmax-zmin)), l=0.45+0.75*shade, o=(y*cw+x)*4;
    d[o]=Math.min(255,col[0]*l); d[o+1]=Math.min(255,col[1]*l); d[o+2]=Math.min(255,col[2]*l); d[o+3]=255;
  }
  g.putImageData(img,0,0); return c;
}

export function start(container, mapCanvas, getScene){
  const renderer = new THREE.WebGLRenderer({antialias:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.setAttribute('aria-label', 'Three-dimensional view of the terrain with the planned Marswalk and stops');
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0f13);

  const sizeX = W*CELL, sizeY = H*CELL;
  let zmin=Infinity, zmax=-Infinity; for(let i=0;i<W*H;i++){const z=T.z[i]; if(z<zmin)zmin=z; if(z>zmax)zmax=z}
  const zmid = (zmin+zmax)/2;

  const geo = new THREE.PlaneGeometry(sizeX-CELL, sizeY-CELL, W-1, H-1);
  const pos = geo.attributes.position;
  for(let y=0;y<H;y++) for(let x=0;x<W;x++) pos.setZ(y*W+x, (T.z[y*W+x]-zmid)*EXAGGERATION);
  geo.computeVertexNormals();

  // "Terrain" texture: cached colour relief plus a drawn overlay of route, stops and crew.
  const base = terrainBase(zmin, zmax);
  const tcan = document.createElement('canvas'); tcan.width=base.width; tcan.height=base.height; const tg=tcan.getContext('2d');
  const terrainTex = new THREE.CanvasTexture(tcan), marginTex = new THREE.CanvasTexture(mapCanvas);
  for(const t of [terrainTex, marginTex]){ t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); }
  let look = 'terrain';
  const mat = new THREE.MeshLambertMaterial({map:terrainTex});
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI/2;
  scene.add(mesh);

  const P = c => [((c%W)+.5)*K, (Math.floor(c/W)+.5)*K];
  const path = (cells, color, w, dash) => { if(!cells||cells.length<2) return; tg.beginPath(); cells.forEach((c,k)=>{const [x,y]=P(c); k?tg.lineTo(x,y):tg.moveTo(x,y)}); tg.setLineDash(dash||[]); tg.lineWidth=w; tg.strokeStyle=color; tg.lineJoin='round'; tg.stroke(); tg.setLineDash([]); };
  const drawTerrain = () => {
    tg.drawImage(base,0,0);
    const s = getScene(); if(!s) return;
    for(const seg of s.drives){ path(seg.cells,'rgba(15,20,25,.8)',16); path(seg.cells, seg.done?'#7d8a94':'#3DD6F5', 8); }
    if(s.crisisPath) path(s.crisisPath, s.crisisShelter?'#FFD772':'#FFFFFF', 7, [20,14]);
    const dot = (cx,cy,r,fill,stroke,txt) => { tg.beginPath(); tg.arc(cx,cy,r,0,7); tg.fillStyle=fill; tg.fill(); tg.lineWidth=5; tg.strokeStyle=stroke; tg.stroke();
      if(txt){ tg.font='600 30px "IBM Plex Sans",sans-serif'; tg.textAlign='center'; tg.textBaseline='middle'; tg.fillStyle='#F2F0EB'; tg.fillText(txt,cx,cy+1); } };
    for(const st of s.stops){ const [x,y]=[(st.x+.5)*K,(st.y+.5)*K]; dot(x,y,24,st.skipped?'rgba(15,20,25,.55)':'#0F1419',st.skipped?'#7d8a94':'#3DD6F5',st.id); }
    const [hx,hy]=[(s.hab.x+.5)*K,(s.hab.y+.5)*K]; tg.fillStyle='#0F1419'; tg.fillRect(hx-26,hy-26,52,52); tg.lineWidth=5; tg.strokeStyle='#F2F0EB'; tg.strokeRect(hx-26,hy-26,52,52);
    tg.font='600 32px "IBM Plex Sans",sans-serif'; tg.textAlign='center'; tg.textBaseline='middle'; tg.fillStyle='#F2F0EB'; tg.fillText('H',hx,hy+1);
    dot((s.crew.x+.5)*K,(s.crew.y+.5)*K,15,'#F2F0EB','#0F1419');
    terrainTex.needsUpdate = true;
  };

  scene.add(new THREE.AmbientLight(0xffffff, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.4); sun.position.set(-sizeX, sizeX*0.8, -sizeY*0.6); scene.add(sun);

  const camera = new THREE.PerspectiveCamera(40, 1, 2, sizeY*10);
  const home=()=>camera.position.set(0, sizeY*0.95, sizeY*0.62); // from the south, looking north, about 57° down
  home();
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI*0.47;   // stay above the horizon
  controls.minDistance = 1000; controls.maxDistance = sizeY*2.5;  // closest ~1 km: the terrain has 30 m cells, closer shows only blur
  controls.zoomToCursor = true;          // wheel and pinch zoom toward the pointer / between the fingers
  controls.screenSpacePanning = false;   // two-finger / right-drag pan slides over the ground
  controls.update();

  // OrbitControls 0.160 mixes pageX/pageY (document) with getBoundingClientRect (viewport) when it centres a pinch,
  // so on a scrolled page the zoom drifts off the fingers. Hand it viewport coordinates instead.
  for(const type of ['pointerdown','pointermove','pointerup'])
    renderer.domElement.addEventListener(type, e => {
      Object.defineProperty(e,'pageX',{value:e.clientX}); Object.defineProperty(e,'pageY',{value:e.clientY});
    }, {capture:true});

  // Keep the camera at least 40 m above the terrain under it, so a close look never goes inside a hill.
  const groundAt = (x, z) => {
    const col = Math.round((x + (sizeX-CELL)/2)/CELL), row = Math.round((z + (sizeY-CELL)/2)/CELL);
    if(col<0||row<0||col>=W||row>=H) return -Infinity;
    return (T.z[row*W+col]-zmid)*EXAGGERATION;
  };
  // The point the camera orbits sits on the terrain surface, so tilting looks at the hills, not into them.
  controls.addEventListener('change', () => {
    const t = groundAt(controls.target.x, controls.target.z); if(isFinite(t)) controls.target.y = t;
    const g = groundAt(camera.position.x, camera.position.z) + 40; if(camera.position.y < g) camera.position.y = g;
  });

  let frame = 0;
  const draw = () => { frame = 0; if(controls.update()) request(); renderer.render(scene, camera); };
  const request = () => { if(!frame) frame = requestAnimationFrame(draw); };
  controls.addEventListener('change', request);

  const resize = () => {
    const w = container.clientWidth, h = container.clientHeight;
    if(!w || !h) return;
    renderer.setSize(w, h, false); renderer.domElement.style.width='100%'; renderer.domElement.style.height='100%';
    camera.aspect = w/h; camera.updateProjectionMatrix(); request();
  };
  const ro = new ResizeObserver(resize); ro.observe(container); resize();
  drawTerrain();

  return {
    // called after every 2D render
    update(){ if(look==='terrain') drawTerrain(); else marginTex.needsUpdate = true; request(); },
    setLook(l){ look = l==='margins'?'margins':'terrain'; mat.map = look==='terrain'?terrainTex:marginTex; mat.needsUpdate = true; this.update(); },
    reset(){ home(); controls.target.set(0,0,0); controls.update(); request(); },
    // read-only numbers for the browser tests
    stats(){ const g=groundAt(camera.position.x,camera.position.z); return {distance:Math.round(camera.position.distanceTo(controls.target)), clearance:Math.round(camera.position.y-g), target:[Math.round(controls.target.x),Math.round(controls.target.z)], look}; },
  };
}
