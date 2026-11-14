// Recomputes every number the judges see from the model itself: node tests/audit-numbers.js
// Loads the same files as the page. Prints the results; compare them with README, SUBMISSION.md and the slides.
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..');
const files=['data/terrain.js','data/rover-track.js','js/mission.js','js/model.js'];
const harness=`
(function(){
  const p=Object.assign({},DEFAULTS),D=derived(p),F=buildFields(p,STOPS),E=evaluateDesign(F,p,D,STOPS);
  const out={};
  out.plan={end:E.end,timeSpare:E.timeSpare,worstWalk:E.sc.worst.m,worstWalkT:E.sc.worst.t,worstRide:E.sc.ride.m,worstRideT:E.sc.ride.t,grade:E.grade,binding:E.binding,minutesScanned:Math.ceil(E.end)+1};
  const rc=E.sc.ride.cell; out.rideDetail={rideHome:F.rHome.time[rc]/p.roverE,padded:D.pad*F.rHome.time[rc]/p.roverE,emerg:p.emerg,seg:E.sc.ride.seg&&E.sc.ride.seg.type,stop:E.sc.ride.seg&&E.sc.ride.seg.stop&&E.sc.ride.seg.stop.id};
  const combos={'Rover fails':{rover:1},'Suit fails':{suit:1},'Solar storm':{storm:1},'Crew injured (rover works)':{injured:1},'Suit fails + storm':{suit:1,storm:1},'Rover fails + injured':{rover:1,injured:1},'Rover fails + suit fails':{rover:1,suit:1},'Rover fails + storm':{rover:1,storm:1},'Injured + storm':{injured:1,storm:1},'All four':{rover:1,suit:1,storm:1,injured:1}};
  out.crises={};
  for(const [k,cr] of Object.entries(combos)){
    let worst=Infinity,unsafe=0,n=0,nan=0;
    for(let t=0;t<=Math.ceil(E.end);t++){const q=posAt(E.segs,t),u=consumed(E.segs,t),c=crisisAt(F,p,D,cr,q.cell,u);n++;if(Number.isNaN(c.m))nan++;if(c.m<worst)worst=c.m;if(c.m<0)unsafe++}
    out.crises[k]={worst,unsafe,n,nan};
  }
  const first=farthestFirst(F,STOPS)[0];out.firstStop=first.id;out.order=farthestFirst(F,STOPS).map(s=>s.id);
  out.late={};
  for(const L of [0,15,30,45,60]){const X=execute(F,p,D,STOPS,{[first.id]:L}),sc=scan(F,p,D,X.segs,0,0).worst;out.late[L]={plan:X.switches[X.switches.length-1].plan,end:X.end,worst:sc.m,gates:X.gates.map(g=>g.text)}}
  out.sens=sensitivity(F,p,STOPS);
  out.flat=flatChecks().map(c=>c.d);
  out.values=STOPS.map(s=>s.id+'='+s.value);
  return out;
})()`;
const src=files.map(f=>fs.readFileSync(path.join(root,f),'utf8')).join('\n;\n')+'\n;'+harness;
const r=vm.runInThisContext(src,{filename:'lifeline-audit.js'});
const f=m=>!isFinite(m)?String(m):(m<0?'-':'')+(Math.abs(m)>=60?Math.floor(Math.round(Math.abs(m))/60)+' h '+String(Math.round(Math.abs(m))%60).padStart(2,'0'):Math.round(Math.abs(m))+' min');
const clk=m=>'T+'+Math.floor(Math.round(m)/60)+':'+String(Math.round(m)%60).padStart(2,'0');
console.log('PLAN  end',f(r.plan.end),'| minutes scanned',r.plan.minutesScanned,'| time spare',f(r.plan.timeSpare),'| worst walk-back',f(r.plan.worstWalk),'at',clk(r.plan.worstWalkT),'| worst ride-back',f(r.plan.worstRide),'at',clk(r.plan.worstRideT),'| grade',r.plan.grade,'| binding',r.plan.binding);
console.log('RIDE  at',r.rideDetail.seg,'stop',r.rideDetail.stop,'| ride home',r.rideDetail.rideHome.toFixed(1),'min | padded',r.rideDetail.padded.toFixed(1),'| emergency O2',r.rideDetail.emerg);
console.log('ORDER',r.order.join(' > '),'| science values',r.values.join(' '));
console.log('\nCRISIS (every minute of the plan)             worst      unsafe/min  NaN');
for(const [k,v] of Object.entries(r.crises))console.log('  '+k.padEnd(30),f(v.worst).padStart(12),String(v.unsafe).padStart(6)+'/'+v.n,String(v.nan).padStart(4));
console.log('\nLATE at first stop',r.firstStop);
for(const [L,v] of Object.entries(r.late))console.log('  +'+L+' min  plan',v.plan,' home',clk(v.end),' worst walk-back',f(v.worst),'\n       '+v.gates.join('\n       '));
console.log('\nSENSITIVITY base',f(r.sens.base));for(const s of r.sens.rows)console.log('  '+s.lab.padEnd(18),f(s.ml).padStart(9),'/',f(s.mh).padStart(9));
console.log('\nFLAT CHECKS\n  '+r.flat.join('\n  '));
