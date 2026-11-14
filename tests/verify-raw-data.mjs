// Verifies the raw data in data/ against the original public sources: node tests/verify-raw-data.mjs
// 1. Terrain: reads the HRSC GeoTIFF header from Zenodo, checks layout and georeferencing, then compares
//    every cell of data/terrain.js with the original float32 values (one HTTP range request, ~6.7 MB).
// 2. Mission points: compares the habitat and stops A, B with NASA's current Curiosity waypoint file.
// Needs network access. Prints a report; exits 1 if a check fails.
import fs from 'node:fs';import vm from 'node:vm';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'..');
const ctx={};vm.createContext(ctx);
for(const f of ['data/terrain.js','data/rover-track.js','js/mission.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);
const T=ctx.TERRAIN,M=ctx.MISSION;
const TIF='https://zenodo.org/api/records/5808354/files/hrsc_km09_h1938_h1927_h1916-dtm-mosaic.tif/content';
const WP='https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_waypoints.json';
let fails=0;const ok=(c,msg)=>{console.log((c?'PASS  ':'FAIL  ')+msg);if(!c)fails++};
const range=async(a,b)=>{for(let k=0;k<6;k++){const r=await fetch(TIF,{headers:{Range:`bytes=${a}-${b}`,'User-Agent':'lifeline-data-check/1.0','Accept':'*/*'}}).catch(e=>({status:0,e}));
  if(r.status===206)return Buffer.from(await r.arrayBuffer());
  const wait=r.status===429?Math.max(30,+(r.headers?.get('retry-after')||0))*1000:3000*(k+1);console.log(`  (Zenodo answered ${r.status}; waiting ${wait/1000} s)`);await new Promise(z=>setTimeout(z,wait))}
  throw new Error('Zenodo did not serve the range')};

// ---- 1. TIFF header
const head=await range(0,262143);const le=head.toString('latin1',0,2)==='II';const u16=o=>le?head.readUInt16LE(o):head.readUInt16BE(o),u32=o=>le?head.readUInt32LE(o):head.readUInt32BE(o);
const ifd=u32(4),n=u16(ifd),tags={};const TS={1:1,2:1,3:2,4:4,5:8,11:4,12:8,16:8};
for(let i=0;i<n;i++){const e=ifd+2+i*12,tag=u16(e),type=u16(e+2),cnt=u32(e+4),sz=(TS[type]||1)*cnt,off=sz<=4?e+8:u32(e+8);tags[tag]={type,cnt,off}}
const val=(tag,k=0)=>{const t=tags[tag];if(!t)return undefined;const o=t.off+k*(TS[t.type]||1);if(o+8>head.length)return undefined;return t.type===3?u16(o):t.type===4?u32(o):t.type===12?(le?head.readDoubleLE(o):head.readDoubleBE(o)):t.type===2?head.toString('latin1',t.off,t.off+t.cnt-1):u32(o)};
const Wd=val(256),Hd=val(257),bits=val(258),comp=val(259),rps=val(278),fmt=val(339),nod=val(42113);
const so0=val(273,0),so1=val(273,1),sbc0=val(279,0);
const scaleX=val(33550,0),scaleY=val(33550,1),tpX=val(33922,3),tpY=val(33922,4);
console.log(`TIFF: ${Wd} x ${Hd}, ${bits}-bit, sample format ${fmt} (3 = float), compression ${comp} (1 = none), rows per strip ${rps}, nodata ${nod}`);
console.log(`      strip 0 at byte ${so0}, strip 1 at ${so1}, strip size ${sbc0}; pixel ${scaleX} x ${scaleY} m; tiepoint x0 ${tpX}, y0 ${tpY}`);
ok(Wd===7584&&Hd===10275&&bits===32&&fmt===3&&comp===1&&rps===1,'File layout matches CLAUDE.md: 7584 x 10275 float32, uncompressed, one row per strip');
ok(so0===82821&&sbc0===30336&&so1-so0===30336,'Strip 0 at byte 82821, 30336 bytes per row, rows stored back to back');
// georeferencing of the slice: west edge of column 2893 and north edge of row 3420
const R=3396190,mpd=R*Math.PI/180;
const lon0=(tpX+2893*scaleX)/mpd,lat0=(tpY-3420*scaleY)/mpd;
console.log(`      slice west edge lon ${lon0.toFixed(9)} (terrain.js ${T.lon0.toFixed(9)}), north edge lat ${lat0.toFixed(9)} (terrain.js ${T.lat0.toFixed(9)}), m/deg ${mpd.toFixed(5)} (terrain.js ${T.mpd.toFixed(5)})`);
ok(Math.abs(lon0-T.lon0)*mpd<0.5&&Math.abs(lat0-T.lat0)*mpd<0.5&&Math.abs(mpd-T.mpd)<1e-3&&Math.abs(scaleX-T.cell)<1e-6,'Georeferencing of the slice matches the GeoTIFF (within 0.5 m)');

// ---- 2. every terrain cell
const buf=Buffer.from(T.b64,'base64');const ours=(x,y)=>buf.readUInt16LE(2*(y*T.w+x))/5-5000;
let maxd=0,sum=0,cnt=0,nodata=0,worst=null;const rows=[...Array(T.h).keys()];
// rows are stored back to back, so one range request covers the whole slice (~6.7 MB)
const first=so0+3420*30336,block=await range(first,so0+(3420+T.h)*30336-1);
const work=async y=>{const base=y*30336+2893*4;
  for(let x=0;x<T.w;x++){const z=le?block.readFloatLE(base+4*x):block.readFloatBE(base+4*x);if(z===nod||z<-30000){nodata++;continue}const d=Math.abs(ours(x,y)-z);sum+=d;cnt++;if(d>maxd){maxd=d;worst={x,y,z,o:ours(x,y)}}}};
for(const y of rows)await work(y);
console.log(`Terrain: compared ${cnt} cells (${nodata} nodata in source); mean |diff| ${(sum/cnt).toFixed(3)} m, max |diff| ${maxd.toFixed(3)} m at column ${worst?.x}, row ${worst?.y} (source ${worst?.z.toFixed(2)} m, ours ${worst?.o.toFixed(2)} m)`);
ok(cnt===T.w*T.h&&nodata===0,'Every cell of the slice has data in the source');
ok(maxd<=0.1+1e-3,'Every stored elevation equals the Zenodo value to within the 0.1 m storage rounding');

// ---- 3. mission points vs the current Curiosity waypoint file
const wpj=await (await fetch(WP)).json();const feats=wpj.features||wpj;
const pts=feats.map(f=>{const p=f.properties||f;const c=f.geometry?.coordinates;return {sol:+p.sol,lat:+(p.lat??c?.[1]),lon:+(p.lon??c?.[0]),site:p.site,drive:p.drive}}).filter(p=>isFinite(p.lat)&&isFinite(p.lon));
const dist=(a,b)=>Math.hypot((a.lat-b.lat)*mpd,(a.lon-b.lon)*mpd*Math.cos(a.lat*Math.PI/180));
console.log(`Waypoint file: ${pts.length} points, sols ${Math.min(...pts.map(p=>p.sol))} to ${Math.max(...pts.map(p=>p.sol))}`);
const check=(name,P,sol)=>{const near=[...pts].sort((a,b)=>dist(P,a)-dist(P,b))[0];const same=pts.filter(p=>p.sol===sol);const bestSol=same.length?same.sort((a,b)=>dist(P,a)-dist(P,b))[0]:null;
  console.log(`${name.padEnd(9)} ${P.lat.toFixed(5)}, ${P.lon.toFixed(5)} | nearest waypoint: sol ${near.sol} at ${dist(P,near).toFixed(1)} m${sol!=null?` | waypoint(s) on sol ${sol}: ${same.length}${bestSol?`, closest ${dist(P,bestSol).toFixed(1)} m (${bestSol.lat.toFixed(5)}, ${bestSol.lon.toFixed(5)})`:''}`:''}`);
  return {near,bestSol};};
const h=check('Habitat',M.habitat,3038);ok(h.bestSol&&dist(M.habitat,h.bestSol)<5,'Habitat is a Curiosity waypoint of sol 3038 (within 5 m)');
const A=M.stops.find(s=>s.id==='A'),B=M.stops.find(s=>s.id==='B'),C=M.stops.find(s=>s.id==='C');
const a=check('Stop A',A,4564);const nextA=pts.filter(p=>p.sol>a.near.sol).sort((x,y)=>x.sol-y.sol)[0];
console.log(`          rover reached it on sol ${a.near.sol} (site ${a.near.site}, drive ${a.near.drive}); next waypoint sol ${nextA.sol}`);
ok(dist(A,a.near)<5&&a.near.sol<=4564&&nextA.sol>4564,'Stop A is where Curiosity stood on the drill sol 4564 (waypoint within 5 m, no drive in between)');
const b=check('Stop B',B,null);console.log(`          site ${b.near.site}, drive ${b.near.drive}`);ok(dist(B,b.near)<5&&b.near.sol===4687,`Stop B is the Curiosity waypoint of sol 4687, where the stop B image was taken (within 5 m)`);
const sorted=[...pts].sort((x,y)=>x.sol-y.sol||x.drive-y.drive);const lx=p=>({x:(p.lon-C.lon)*mpd*Math.cos(C.lat*Math.PI/180),y:(p.lat-C.lat)*mpd});
let line={m:1e9};for(let i=1;i<sorted.length;i++){const p0=lx(sorted[i-1]),p1=lx(sorted[i]),dx=p1.x-p0.x,dy=p1.y-p0.y,L=dx*dx+dy*dy;const t=L?Math.max(0,Math.min(1,-(p0.x*dx+p0.y*dy)/L)):0;const m=Math.hypot(p0.x+t*dx,p0.y+t*dy);if(m<line.m)line={m,s0:sorted[i-1].sol,s1:sorted[i].sol}}
const cNear=[...pts].sort((x,y)=>dist(C,x)-dist(C,y))[0];
console.log(`Stop C    ${C.lat.toFixed(5)}, ${C.lon.toFixed(5)} | nearest waypoint sol ${cNear.sol} at ${dist(C,cNear).toFixed(0)} m | nearest point of the drive line ${line.m.toFixed(0)} m (between sols ${line.s0} and ${line.s1})`);
ok(line.m>40,`Stop C has not been visited: the rover's path passes no closer than ${line.m.toFixed(0)} m (as of the current file)`);
// the rover-track.js copy against the live file
const miss=ctx.ROVER.filter(r=>{const q={lat:+r[0],lon:+r[1]};return !pts.some(p=>dist(q,p)<0.5)}).length;
ok(miss===0,`All ${ctx.ROVER.length} waypoints in data/rover-track.js are in the current NASA file within 0.5 m (${miss} not found)`);
console.log(`\n${fails?fails+' check(s) failed.':'All raw-data checks passed.'}`);process.exit(fails?1:0);
