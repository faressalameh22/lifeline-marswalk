// LIFELINE walk-back model: terrain, path finding, plans, gates, crises, validation. No DOM.
const W=TERRAIN.w,H=TERRAIN.h,CELL=TERRAIN.cell;
const GEO={lon0:TERRAIN.lon0,lat0:TERRAIN.lat0,mpd:TERRAIN.mpd};
const toXY=(lat,lon)=>({x:Math.round((lon-GEO.lon0)*GEO.mpd/CELL-.5),y:Math.round((GEO.lat0-lat)*GEO.mpd/CELL-.5)});
const toLL=(x,y)=>({lat:GEO.lat0-(y+.5)*CELL/GEO.mpd,lon:GEO.lon0+(x+.5)*CELL/GEO.mpd});
const HAB_LL={lat:MISSION.habitat.lat,lon:MISSION.habitat.lon};
const HAB=toXY(HAB_LL.lat,HAB_LL.lon);
const STOPS=MISSION.stops;
for(const s of STOPS){const p=toXY(s.lat,s.lon);s.x=p.x;s.y=p.y}
const TRACK=ROVER.map(r=>{const p=toXY(r[0],r[1]);return [p.x,p.y]}).filter(p=>p[0]>=0&&p[0]<W&&p[1]>=0&&p[1]<H);
const RATE={drive:700/1050,work:1,walk:1200/1050};

function smooth(v){v=Math.max(0,Math.min(1,v));return v*v*(3-2*v)}
function hash(x,y){const s=Math.sin(x*127.1+y*311.7)*43758.5453;return s-Math.floor(s)}
const cellXY=(x,y)=>Math.round(Math.max(0,Math.min(H-1,y)))*W+Math.round(Math.max(0,Math.min(W-1,x)));

function buildTerrain(){
  const n=W*H,z=new Float32Array(n),slope=new Float32Array(n),sand=new Uint8Array(n),ridge=new Uint8Array(n);
  const bin=typeof atob==='function'?atob(TERRAIN.b64):Buffer.from(TERRAIN.b64,'base64').toString('binary');
  for(let i=0;i<n;i++){const v=bin.charCodeAt(2*i)|(bin.charCodeAt(2*i+1)<<8);z[i]=v/5-5000}
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const i=y*W+x,xl=Math.max(0,x-1),xr=Math.min(W-1,x+1),yu=Math.max(0,y-1),yd=Math.min(H-1,y+1);
    const gx=(z[y*W+xr]-z[y*W+xl])/((xr-xl)*CELL),gy=(z[yd*W+x]-z[yu*W+x])/((yd-yu)*CELL);
    slope[i]=Math.atan(Math.hypot(gx,gy))*180/Math.PI;
  }
  return {z,slope,sand,ridge};
}
function demAt(lat,lon){const fx=(lon-GEO.lon0)*GEO.mpd/CELL-.5,fy=(GEO.lat0-lat)*GEO.mpd/CELL-.5;const x0=Math.max(0,Math.min(W-2,Math.floor(fx))),y0=Math.max(0,Math.min(H-2,Math.floor(fy))),dx=fx-x0,dy=fy-y0,Z=T.z;return Z[y0*W+x0]*(1-dx)*(1-dy)+Z[y0*W+x0+1]*dx*(1-dy)+Z[(y0+1)*W+x0]*(1-dx)*dy+Z[(y0+1)*W+x0+1]*dx*dy}
function dijkstra(v,sources){
  const n=W*H,time=new Float64Array(n).fill(Infinity),parent=new Int32Array(n).fill(-1),heap=[];
  const push=(t,i)=>{heap.push([t,i]);let c=heap.length-1;while(c>0){const p=(c-1)>>1;if(heap[p][0]<=heap[c][0])break;[heap[p],heap[c]]=[heap[c],heap[p]];c=p}};
  const pop=()=>{const top=heap[0],last=heap.pop();if(heap.length){heap[0]=last;let c=0;for(;;){let l=2*c+1,r=l+1,m=c;if(l<heap.length&&heap[l][0]<heap[m][0])m=l;if(r<heap.length&&heap[r][0]<heap[m][0])m=r;if(m===c)break;[heap[m],heap[c]]=[heap[c],heap[m]];c=m}}return top};
  for(const s of sources){time[s]=0;push(0,s)}
  while(heap.length){
    const [t,i]=pop();if(t>time[i])continue;
    const x=i%W,y=(i-x)/W;
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
      if(!dx&&!dy)continue;const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=W||ny>=H)continue;
      const j=ny*W+nx;if(v[j]<=0||v[i]<=0)continue;
      const nt=t+CELL*(dx&&dy?Math.SQRT2:1)/1000/((v[i]+v[j])/2)*60;
      if(nt<time[j]){time[j]=nt;parent[j]=i;push(nt,j)}
    }
  }
  return {time,parent};
}
function pathTo(f,from){const out=[];let i=from,g=0;while(i>=0&&g++<5000){out.push(i);if(f.time[i]===0)break;i=f.parent[i]}return out}

function shelterCells(T,lim){
  const out=[];
  for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){
    const i=y*W+x;if(T.slope[i]>10)continue;
    let near=false;for(let dy=-1;dy<=1&&!near;dy++)for(let dx=-1;dx<=1;dx++)if(T.slope[(y+dy)*W+x+dx]>Math.min(lim,18)){near=true;break}
    if(near)out.push(i);
  }
  return out;
}

const T=buildTerrain();

function buildFields(p,stops){
  const n=W*H,wv=new Float32Array(n),rv=new Float32Array(n),sf=1-p.sand/100;
  for(let i=0;i<n;i++){
    const s=T.slope[i];
    wv[i]=s>p.slope?0:Math.exp(-0.045*s)*(T.sand[i]?sf:1);
    rv[i]=s>p.slope?0:Math.exp(-0.02*s)*(T.sand[i]?0.75:1);
  }
  const hab=cellXY(HAB.x,HAB.y),sh=shelterCells(T,p.slope);
  const F={wv,rv,sh,wHome:dijkstra(wv,[hab]),wShel:dijkstra(wv,sh),rHome:dijkstra(rv,[hab]),rShel:dijkstra(rv,sh),rStop:{}};
  for(const s of stops)F.rStop[s.id]=dijkstra(rv,[cellXY(s.x,s.y)]);
  return F;
}

function derived(p){
  const loadSpeed=Math.max(0.4,1-0.005*p.load),loadRate=1+0.01*p.load;
  return {walkSpeed:p.speed*loadSpeed,walkRate:RATE.walk*loadRate,pad:1+p.pad/100,cap:Math.min(p.o2,p.h2o)*60,limiting:p.h2o<p.o2?'cooling water':'oxygen'};
}

function driveSeg(F,p,fromCell,stop,t0){
  const field=stop?F.rStop[stop.id]:F.rHome,tu=field.time[fromCell];
  const dur=isFinite(tu)?tu/p.rover:Infinity;
  return {type:'drive',t0,t1:t0+dur,field,tu,from:fromCell,stop,path:pathTo(field,fromCell),rate:RATE.drive};
}
function simulate(F,p,startCell,t0,list,delays){
  const segs=[];let pos=startCell,t=t0;
  for(const s of list){
    const d=driveSeg(F,p,pos,s,t);segs.push(d);t=d.t1;
    const dur=p.station+(delays[s.id]||0);segs.push({type:'work',t0:t,t1:t+dur,stop:s,cell:cellXY(s.x,s.y),rate:RATE.work});t+=dur;pos=cellXY(s.x,s.y);
  }
  const back=driveSeg(F,p,pos,null,t);segs.push(back);
  return segs;
}
function posAt(segs,t){
  for(const s of segs){
    if(t<=s.t1||s===segs[segs.length-1]){
      if(s.type==='work'){const c=s.cell;return {x:c%W,y:Math.floor(c/W),cell:c,seg:s}}
      const f=s.t1>s.t0?Math.max(0,Math.min(1,(t-s.t0)/(s.t1-s.t0))):1,target=s.tu*(1-f),P=s.path;
      if(!P.length)return {x:HAB.x,y:HAB.y,cell:cellXY(HAB.x,HAB.y),seg:s};
      let k=0;while(k<P.length-1&&s.field.time[P[k+1]]>target)k++;
      const a=P[k],b=P[Math.min(k+1,P.length-1)],ta=s.field.time[a],tb=s.field.time[b],g=ta>tb?(ta-target)/(ta-tb):0;
      const ax=a%W,ay=Math.floor(a/W),bx=b%W,by=Math.floor(b/W),x=ax+(bx-ax)*Math.max(0,Math.min(1,g)),y=ay+(by-ay)*Math.max(0,Math.min(1,g));
      return {x,y,cell:cellXY(x,y),seg:s};
    }
  }
}
function consumed(segs,t){let c=0;for(const s of segs){if(t<=s.t0)break;c+=s.rate*(Math.min(t,s.t1)-s.t0)}const last=segs[segs.length-1];if(t>last.t1)c+=RATE.work*0+0;return c}
function walkMargin(F,p,D,i,used){return (D.cap-used)/D.walkRate-D.pad*F.wHome.time[i]/D.walkSpeed}
function rideMargin(F,p,D,i){return p.emerg-D.pad*F.rHome.time[i]/p.roverE}

function scan(F,p,D,segs,from,priorUsed){
  let worst={m:Infinity,t:from,kind:'walk',cell:0},ride={m:Infinity,t:0,cell:0};
  const end=segs[segs.length-1].t1;if(!isFinite(end))return {worst:{m:-Infinity,t:from,kind:'unreachable',cell:segs[0].from},ride:{m:-Infinity,t:from,cell:segs[0].from}};
  for(let t=from;t<=Math.ceil(end);t+=1){
    const q=posAt(segs,t),used=priorUsed+consumed(segs,t)-consumed(segs,from);
    const m=walkMargin(F,p,D,q.cell,used);if(m<worst.m)worst={m,t,kind:'walk',cell:q.cell,seg:q.seg};
    const r=rideMargin(F,p,D,q.cell);if(r<ride.m)ride={m:r,t,cell:q.cell,seg:q.seg};
  }
  return {worst,ride};
}
function farthestFirst(F,stops){return [...stops].sort((a,b)=>F.wHome.time[cellXY(b.x,b.y)]-F.wHome.time[cellXY(a.x,a.y)])}

function execute(F,p,D,stops,delays){
  let list=farthestFirst(F,stops),plan='A',gates=[],segs=[],pos=cellXY(HAB.x,HAB.y),t=0,switches=[{t:0,plan:'A'}];
  while(list.length){
    const s=list.shift(),d=driveSeg(F,p,pos,s,t);segs.push(d);t=d.t1;
    const dur=p.station+(delays[s.id]||0);segs.push({type:'work',t0:t,t1:t+dur,stop:s,cell:cellXY(s.x,s.y),rate:RATE.work});t+=dur;pos=cellXY(s.x,s.y);
    if(!list.length)break;
    const used=consumed(segs,t),here=walkMargin(F,p,D,pos,used);
    if(here<p.gate){plan='C';switches.push({t,plan});gates.push({t,stop:s,cls:'ab',text:`Leaving ${s.id} at ${fmtClock(t)}: margin here is ${fmtDur(here)}, under the gate. Plan C: drive home now.`});list=[];break}
    const fut=simulate(F,p,pos,t,list,delays),sc=scan(F,p,D,fut,t,used).worst,endT=fut[fut.length-1].t1;
    if(sc.m>=p.gate&&endT<=p.maxh*60){gates.push({t,stop:s,cls:'ok',text:`Leaving ${s.id} at ${fmtClock(t)}: margin ${fmtDur(sc.m)}, home by ${fmtClock(endT)}. Continue plan ${plan}.`});continue}
    const why=sc.m<p.gate?`margin ahead drops to ${fmtDur(sc.m)}`:`home by ${fmtClock(endT)} is past the ${p.maxh} h suit limit`;
    const low=[...list].sort((a,b)=>a.value-b.value)[0],rest=list.filter(x=>x!==low);
    if(rest.length){
      const fut2=simulate(F,p,pos,t,rest,delays),sc2=scan(F,p,D,fut2,t,used).worst,end2=fut2[fut2.length-1].t1;
      if(sc2.m>=p.gate&&end2<=p.maxh*60){plan='B';switches.push({t,plan});list=rest;gates.push({t,stop:s,cls:'sw2',text:`Leaving ${s.id} at ${fmtClock(t)}: ${why}. Plan B: skip stop ${low.id} (lowest science), home by ${fmtClock(end2)}.`});continue}
    }
    plan='C';switches.push({t,plan});gates.push({t,stop:s,cls:'ab',text:`Leaving ${s.id} at ${fmtClock(t)}: ${why}. Plan C: drive home now.`});list=[];
  }
  segs.push(driveSeg(F,p,pos,null,t));
  return {segs,gates,switches,end:segs[segs.length-1].t1,planAt:tt=>{let pl='A';for(const s of switches)if(s.t<=tt)pl=s.plan;return pl}};
}

function evaluateDesign(F,p,D,stops){
  const segs=simulate(F,p,cellXY(HAB.x,HAB.y),0,farthestFirst(F,stops),{});
  const sc=scan(F,p,D,segs,0,0),end=segs[segs.length-1].t1,timeSpare=p.maxh*60-end;
  const slack=[['walk',sc.worst.m-p.gate,sc.worst.m],['ride',sc.ride.m-10,sc.ride.m],['time',timeSpare-15,timeSpare]].sort((a,b)=>a[1]-b[1]);
  const minM=Math.min(sc.worst.m,sc.ride.m,timeSpare);
  const g=!isFinite(minM)||minM<0?'danger':slack[0][1]<0?'tight':'safe';
  const bind=minM<0?[['walk',sc.worst.m],['ride',sc.ride.m],['time',timeSpare]].sort((a,b)=>a[1]-b[1])[0][0]:slack[0][0];
  return {segs,sc,minM,timeSpare,end,grade:g,binding:bind};
}
function grade(m,gate){return m<0?'danger':m<gate?'tight':'safe'}
function fmtDur(m){if(!isFinite(m))return m>0?'none':'no path';const neg=m<0;m=Math.round(Math.abs(m));const h=Math.floor(m/60),mm=m%60;return (neg?'−':'')+(h?h+' h '+String(mm).padStart(2,'0'):mm+' min')}
function fmtClock(m){if(!isFinite(m))return '—';m=Math.max(0,Math.round(m));return 'T+'+Math.floor(m/60)+':'+String(m%60).padStart(2,'0')}

function flatChecks(){
  const n=W*H,v=new Float32Array(n).fill(1),c=cellXY(30,110),f=dijkstra(v,[c]),out=[];
  const t1=f.time[cellXY(70,110)],e1=40*CELL/1000*60;
  out.push({ok:Math.abs(t1-e1)<1e-6,t:'Path finder: straight line on flat ground',d:`40 cells east at 1 km/h: ${t1.toFixed(1)} min, exact answer ${e1.toFixed(1)} min.`});
  let worst=0;for(let i=0;i<n;i++){const dx=(i%W)-30,dy=Math.floor(i/W)-110;if(!dx&&!dy)continue;const d=Math.hypot(dx,dy)*CELL/1000*60;worst=Math.max(worst,f.time[i]/d-1)}
  out.push({ok:worst<0.0825,t:'Path finder: any direction on flat ground',d:`Worst overestimate vs a straight line: ${(worst*100).toFixed(1)}%. An 8-direction grid can overestimate by at most 8.2%, always on the safe side.`});
  let k=0;while(30+k+1<W&&f.time[cellXY(30+k+1,110)]/3.3<=57)k++;const r=k*CELL/1000;
  out.push({ok:Math.abs(r-3.1)<=CELL/1000+0.05,t:'Reproduces Apollo: 3.1 km walking radius',d:`Apollo inputs (0.95 h emergency oxygen, 3.3 km/h, flat ground): model gives ${r.toFixed(2)} km. Apollo planning gives 3.1 km. Grid step is ${CELL} m.`});
  let se=0,sm=0,nn=0;for(const r of ROVER){const d=demAt(r[0],r[1])-r[2];se+=d*d;sm+=d;nn++}const rm=Math.sqrt(se/nn);
  out.push({ok:rm<20,t:'Terrain matches Curiosity’s own altitudes',d:`${nn} rover waypoints in this map: RMSE ${rm.toFixed(1)} m, mean offset ${(sm/nn).toFixed(1)} m, across ${Math.round(Math.max(...ROVER.map(r=>r[2]))-Math.min(...ROVER.map(r=>r[2])))} m of relief.`});
  return out;
}
function planChecks(F,p,D,E){
  const out=[],mins=Math.round(E.end);
  out.push({ok:E.sc.worst.m>=0,t:'Rover failure tested at every minute',d:`${mins} simulated failures along the plan. Worst case: ${fmtDur(E.sc.worst.m)} spare.`});
  out.push({ok:E.sc.ride.m>=0,t:'Suit failure tested at every minute',d:`${mins} simulated failures. Worst case: ${fmtDur(E.sc.ride.m)} of emergency oxygen left on arrival.`});
  out.push({ok:E.timeSpare>=0,t:'Plan fits the time-in-suit limit',d:`${fmtDur(E.end)} planned against a ${p.maxh} h limit.`});
  let mono=true,prev=Infinity;const ci=cellXY(STOPS[0].x,STOPS[0].y);for(let t=0;t<=E.end;t+=5){const m=walkMargin(F,p,D,ci,consumed(E.segs,t));if(m>prev+1e-9)mono=false;prev=m}
  out.push({ok:mono,t:'Margin never grows while the suits run down',d:'Checked every 5 minutes at a fixed point.'});
  let bad=0,hc=cellXY(HAB.x,HAB.y),hx=HAB.x,hy=HAB.y;for(let i=0;i<W*H;i++){if(!isFinite(F.wHome.time[i]))continue;const d=Math.hypot((i%W)-hx,Math.floor(i/W)-hy)*CELL/1000*60;if(F.wHome.time[i]<d-1e-6)bad++}
  out.push({ok:bad===0,t:'Walk home is never shorter than a straight line',d:`Checked all ${W*H} cells: ${bad} violations.`});
  const first=farthestFirst(F,STOPS)[0],X2=execute(F,p,D,STOPS,{[first.id]:30}),sc2=scan(F,p,D,X2.segs,0,0).worst,pl=X2.switches[X2.switches.length-1].plan;
  out.push({ok:sc2.m>=0&&X2.end<=p.maxh*60,t:'Running 30 min late stays safe',d:`+30 min at stop ${first.id}: gates choose plan ${pl}, home by ${fmtClock(X2.end)}, worst margin ${fmtDur(sc2.m)}.`});
  return out;
}
function sensitivity(F,p,stops){
  const base=evaluateDesign(F,p,derived(p),stops).sc.worst.m;
  const vary=[['Walking speed','speed',.8,1.2],['Suit capacity','cap',.8,1.2],['Time at each stop','station',.8,1.2],['Rover speed','rover',.8,1.2],['Payload','load',null,null],['Safety pad','pad',null,null]];
  const rows=vary.map(([lab,key,a,b])=>{
    const mk=f=>{const q={...p};if(key==='cap'){q.o2=p.o2*f;q.h2o=p.h2o*f}else q[key]=p[key]*f;return q};
    let lo,hi,la,lb;
    if(key==='load'){lo={...p,load:0};hi={...p,load:20};la='0 kg';lb='20 kg'}
    else if(key==='pad'){lo={...p,pad:10};hi={...p,pad:30};la='10%';lb='30%'}
    else{lo=mk(a);hi=mk(b);la='−20%';lb='+20%'}
    const ml=evaluateDesign(F,lo,derived(lo),stops).sc.worst.m,mh=evaluateDesign(F,hi,derived(hi),stops).sc.worst.m;
    return {lab,ml,mh,la,lb,spread:Math.abs(mh-ml)};
  }).sort((x,y)=>y.spread-x.spread);
  return {base,rows};
}

function crisisAt(F,p,D,cr,i,used){
  const roverOK=!cr.rover,dest=cr.storm?'shelter':'home';
  let travel,rate;
  if(roverOK&&(cr.suit||cr.injured||cr.storm)){travel=(dest==='home'?F.rHome:F.rShel).time[i]/p.roverE;rate=RATE.drive}
  else{travel=(dest==='home'?F.wHome:F.wShel).time[i]/(D.walkSpeed*(cr.injured?0.5:1));rate=D.walkRate*(cr.injured?1.3:1)}
  const avail=cr.suit?p.emerg:(D.cap-used)/rate;
  let m=avail-D.pad*travel;
  if(cr.storm)m=Math.min(m,p.warn-travel);
  return {m,travel,avail,mode:roverOK&&(cr.suit||cr.injured||cr.storm)?'ride':'walk',dest};
}
