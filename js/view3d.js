// LIFELINE 3D view: the real HRSC terrain as a surface, draped with the live 2D map canvas.
// View only: it adds no model logic. Stops are dragged on the 2D map and this view follows.
// Loaded on demand (dynamic import) the first time the 3D button is pressed.
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';

export const EXAGGERATION = 3; // vertical exaggeration, shown on screen

export function start(container, mapCanvas){
  // Terrain globals come from js/model.js (T, W, H, CELL).
  const renderer = new THREE.WebGLRenderer({antialias:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.setAttribute('aria-label', 'Three-dimensional view of the terrain with the planned Marswalk, margins and stops');
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0f13);

  const sizeX = W*CELL, sizeY = H*CELL;
  let zmin=Infinity, zmax=-Infinity; for(let i=0;i<W*H;i++){const z=T.z[i]; if(z<zmin)zmin=z; if(z>zmax)zmax=z}
  const zmid = (zmin+zmax)/2;

  // One vertex per terrain cell centre; rows run north to south like the 2D canvas, so default UVs line up.
  const geo = new THREE.PlaneGeometry(sizeX-CELL, sizeY-CELL, W-1, H-1);
  const pos = geo.attributes.position;
  for(let y=0;y<H;y++) for(let x=0;x<W;x++) pos.setZ(y*W+x, (T.z[y*W+x]-zmid)*EXAGGERATION);
  geo.computeVertexNormals();

  const tex = new THREE.CanvasTexture(mapCanvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const mat = new THREE.MeshLambertMaterial({map:tex});
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI/2; // lie flat: +y of the plane becomes north
  scene.add(mesh);

  scene.add(new THREE.AmbientLight(0xffffff, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.4); sun.position.set(-sizeX, sizeX*0.8, -sizeY*0.6); scene.add(sun);

  const camera = new THREE.PerspectiveCamera(40, 1, 10, sizeY*10);
  const home=()=>camera.position.set(0, sizeY*0.95, sizeY*0.62); // from the south, looking north, about 57° down
  home();
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI*0.47;   // stay above the ground
  controls.minDistance = sizeX*0.25; controls.maxDistance = sizeY*2.5;
  controls.update();

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

  return {
    // called after every 2D render: re-upload the 2D map as the surface texture
    update(){ tex.needsUpdate = true; request(); },
    reset(){ home(); controls.target.set(0,0,0); controls.update(); request(); },
  };
}
