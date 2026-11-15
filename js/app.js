// LIFELINE user interface: map drawing, panels and controls.
// The UI runs inside its own function: older Safari (iOS) mis-scopes functions declared directly inside an if-block
// at the top level, and failed with 'Can't find variable: params'. A function scope behaves the same everywhere.
if(typeof document!=='undefined')(function(){
  const $=id=>document.getElementById(id);
  const cv=$('map'),ctx=cv.getContext('2d',{willReadFrequently:true}),S=cv.width/W; // CPU canvas: the 3D view reads it as a texture without a GPU stall
  const off=document.createElement('canvas');off.width=W;off.height=H;const octx=off.getContext('2d');
  const state={t:40,cr:{rover:false,suit:false,injured:false,storm:false},delays:{},mode:'plan',sel:'C',probe:null,drag:null,moved:false};
  const IDS=['pSpeed','pO2','pH2O','pEmerg','pPad','pGate','pLoad','pSlope','pSand','pRover','pRoverE','pStation','pWarn','pMax','pStart'];
  const KEYS=['speed','o2','h2o','emerg','pad','gate','load','slope','sand','rover','roverE','station','warn','maxh','start'];
  // Read the assumption inputs. Empty or non-numeric text falls back to the default; values outside the
  // input's min/max are clamped and written back, so a typed 0, negative or huge value can never reach the model.
  // The inputs are type="text" (inputmode decimal) so every browser shows Latin digits 0-9, whatever its language;
  // Arabic-Indic digits typed on an Arabic keyboard are read as the same numbers.
  const latin=s=>String(s).replace(/[\u0660-\u0669]/g,d=>d.charCodeAt(0)-0x660).replace(/[\u06F0-\u06F9]/g,d=>d.charCodeAt(0)-0x6F0).replace(/[\u066B,]/g,'.');
  const params=()=>{const o={};IDS.forEach((id,k)=>{const el=$(id);let v=parseFloat(latin(el.value));if(!isFinite(v))v=parseFloat(el.defaultValue);
    const mn=parseFloat(el.min),mx=parseFloat(el.max);if(isFinite(mn))v=Math.max(mn,v);if(isFinite(mx))v=Math.min(mx,v);
    if(el.value!==String(v))el.value=String(v);o[KEYS[k]]=v});return o};
  window.__lifelineParams=()=>params();
  IDS.forEach((id,k)=>{if(DEFAULTS[KEYS[k]]!==undefined){$(id).value=DEFAULTS[KEYS[k]];$(id).defaultValue=String(DEFAULTS[KEYS[k]])}});
  let p,D,F,X,E;
  const COL={safe:[46,173,107],tight:[242,176,30],danger:[217,52,43]};
  const anyCrisis=()=>state.cr.rover||state.cr.suit||state.cr.injured||state.cr.storm;

  function rebuildFields(){p=params();D=derived(p);F=buildFields(p,STOPS);replan()}
  function replan(){
    p=params();D=derived(p);
    E=evaluateDesign(F,p,D,STOPS);
    X=execute(F,p,D,STOPS,state.delays);
    const end=isFinite(X.end)?X.end:480;$('tSlider').max=Math.max(60,Math.ceil(end));
    if(state.t>end)state.t=Math.floor(end);
    render();renderValid();
  }

  function usedAt(t){return consumed(X.segs,t)}
  function fieldMargin(i,used){
    if(anyCrisis())return crisisAt(F,p,D,state.cr,i,used).m;
    return walkMargin(F,p,D,i,used);
  }

  function drawBase(used){
    const img=octx.createImageData(W,H),d=img.data;
    let zmin=Infinity,zmax=-Infinity;for(const v of T.z){if(v<zmin)zmin=v;if(v>zmax)zmax=v}
    const L=$('lyImg').checked,Lm=$('lyMargin').checked,Ls=$('lySlope').checked,Ld=$('lySand').checked,Lr=$('lyRide').checked&&!state.cr.rover;
    const edge=[],rideOK=new Uint8Array(W*H);if(Lr)for(let i=0;i<W*H;i++)rideOK[i]=rideMargin(F,p,D,i)>=0?1:0;
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){
      const i=y*W+x,k=(T.z[i]-zmin)/(zmax-zmin),xr=Math.min(W-1,x+1),yd=Math.min(H-1,y+1);
      const shade=Math.max(.45,Math.min(1.5,1+((T.z[i]-T.z[y*W+xr])+(T.z[yd*W+x]-T.z[i]))*.09));
      let r,g,b;
      if(L){r=(91+110*k)*shade;g=(53+85*k)*shade;b=(36+54*k)*shade;if(T.ridge[i]){r+=18;g+=14;b+=10}}
      else{r=44*shade;g=52*shade;b=62*shade}
      const mix=(c,a)=>{r=r*(1-a)+c[0]*a;g=g*(1-a)+c[1]*a;b=b*(1-a)+c[2]*a};
      if(Ls){const s=Math.min(1,T.slope[i]/p.slope);mix([40+196*s,60+60*s,90+165*s],.6)}
      if(Ld&&T.sand[i])mix([244,220,150],.65);
      if(T.slope[i]>p.slope)mix([20,20,24],.7);
      else if(Lm)mix(COL[grade(fieldMargin(i,used),p.gate)],.32);
      if(Lr&&rideOK[i]&&((x>0&&!rideOK[i-1])||(x<W-1&&!rideOK[i+1])||(y>0&&!rideOK[i-W])||(y<H-1&&!rideOK[i+W])))edge.push(i);
      d[i*4]=r;d[i*4+1]=g;d[i*4+2]=b;d[i*4+3]=255;
    }
    octx.putImageData(img,0,0);ctx.imageSmoothingEnabled=true;ctx.drawImage(off,0,0,cv.width,cv.height);
    ctx.fillStyle='#F2F0EB';for(const i of edge){if(((i%W)+Math.floor(i/W))%2)continue;ctx.beginPath();ctx.arc(px(i%W),px(Math.floor(i/W)),2.6,0,7);ctx.fill()}
  }
  const px=v=>(v+.5)*S;
  function strokeCells(cells,color,w,dash){ctx.beginPath();cells.forEach((c,k)=>{const x=px(c%W),y=px(Math.floor(c/W));k?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.setLineDash(dash||[]);ctx.lineWidth=w;ctx.strokeStyle=color;ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke();ctx.setLineDash([])}
  function strokePts(pts,color,w,dash){strokeCells(pts.map(q=>q[1]*W+q[0]),color,w,dash)}
  function label(txt,x,y,align){ctx.font='500 15px "IBM Plex Sans",sans-serif';ctx.textAlign=align||'left';ctx.lineWidth=4;ctx.strokeStyle='rgba(15,20,25,.85)';ctx.strokeText(txt,x,y);ctx.fillStyle='#F2F0EB';ctx.fillText(txt,x,y)}

  function drawOverlay(pos,used){
    if($('lyTrack').checked){strokePts(TRACK,'rgba(242,240,235,.5)',2,[3,7]);label('Curiosity track, sols 1500 to 5073 (NASA)',cv.width-12,26,'right')}
    if($('lyShelter').checked){const seen=[];for(const i of F.sh){const x=i%W,y=Math.floor(i/W);if(seen.some(q=>Math.hypot(q[0]-x,q[1]-y)<22))continue;seen.push([x,y]);const cx=px(x),cy=px(y);ctx.beginPath();ctx.moveTo(cx,cy-9);ctx.lineTo(cx+9,cy+7);ctx.lineTo(cx-9,cy+7);ctx.closePath();ctx.fillStyle='rgba(15,20,25,.85)';ctx.fill();ctx.lineWidth=2;ctx.strokeStyle='#F2F0EB';ctx.stroke()}}
    const plannedIdx=X.segs.filter(s=>s.type==='drive');
    for(const s of plannedIdx){const cells=s.path;if(cells.length>1){strokeCells(cells,'rgba(15,20,25,.75)',8);strokeCells(cells,'#3DD6F5',4)}}
    const done=X.segs.filter(s=>s.type==='drive'&&s.t1<=state.t);for(const s of done)strokeCells(s.path,'rgba(15,20,25,.55)',4);
    if(anyCrisis()){
      const c=crisisAt(F,p,D,state.cr,pos.cell,used);
      const fld=c.mode==='ride'?(c.dest==='home'?F.rHome:F.rShel):(c.dest==='home'?F.wHome:F.wShel);
      strokeCells(pathTo(fld,pos.cell),c.dest==='shelter'?'#FFD772':'#FFFFFF',3,[8,6]);
    }
    ctx.fillStyle='#0F1419';ctx.strokeStyle='#F2F0EB';ctx.lineWidth=2;ctx.beginPath();ctx.rect(px(HAB.x)-13,px(HAB.y)-13,26,26);ctx.fill();ctx.stroke();
    ctx.font='600 16px "IBM Plex Sans",sans-serif';ctx.textAlign='center';ctx.fillStyle='#F2F0EB';ctx.fillText('H',px(HAB.x),px(HAB.y)+6);label('Habitat',px(HAB.x),px(HAB.y)+34,'center');
    const visited=new Set(X.segs.filter(s=>s.type==='work').map(s=>s.stop.id));
    for(const s of STOPS){
      const skipped=!visited.has(s.id);
      ctx.beginPath();ctx.arc(px(s.x),px(s.y),10,0,7);ctx.fillStyle='#0F1419';ctx.fill();ctx.lineWidth=state.sel===s.id?4:2;ctx.strokeStyle=skipped?'#9AA4AF':state.sel===s.id?'#F2F0EB':'#3DD6F5';ctx.setLineDash(skipped?[4,3]:[]);ctx.stroke();ctx.setLineDash([]);
      ctx.font='600 12px "IBM Plex Sans",sans-serif';ctx.textAlign='center';ctx.fillStyle=skipped?'#9AA4AF':'#F2F0EB';ctx.fillText(s.id,px(s.x),px(s.y)+4);
      if(skipped)label('skipped',px(s.x),px(s.y)+32,'center');
    }
    if(state.probe){const q=state.probe,i=q.y*W+q.x;ctx.beginPath();ctx.arc(px(q.x),px(q.y),7,0,7);ctx.strokeStyle='#F2F0EB';ctx.lineWidth=2;ctx.setLineDash([3,3]);ctx.stroke();ctx.setLineDash([]);
      const txt=(T.slope[i]>p.slope?'Too steep to cross':'Walk home '+fmtDur(F.wHome.time[i]/D.walkSpeed)+', margin '+fmtDur(fieldMargin(i,used)))+' · '+Math.round(T.z[i])+' m';label(txt,px(q.x)+12,px(q.y)-10,q.x>70?'right':'left')}
    ctx.beginPath();ctx.arc(px(pos.x),px(pos.y),9,0,7);ctx.fillStyle='#F2F0EB';ctx.fill();ctx.lineWidth=4;ctx.strokeStyle='#3DD6F5';ctx.stroke();
    const kmPx=1000/CELL*S;ctx.fillStyle='rgba(15,20,25,.75)';ctx.fillRect(18,cv.height-44,kmPx+20,30);ctx.fillStyle='#F2F0EB';ctx.fillRect(28,cv.height-24,kmPx,3);ctx.font='500 13px "IBM Plex Mono",monospace';ctx.textAlign='left';ctx.fillText('1 km',28,cv.height-29);
  }

  function segLabel(seg){if(!seg)return 'At the habitat';if(seg.type==='work')return 'Working at stop '+seg.stop.id;return seg.stop?'Driving to stop '+seg.stop.id:'Driving home'}
  function nextTarget(pos){const s=pos.seg;if(!s)return {name:'Habitat',km:0};const tgt=s.type==='work'?X.segs[X.segs.indexOf(s)+1]:s;const c=tgt&&tgt.stop?cellXY(tgt.stop.x,tgt.stop.y):cellXY(HAB.x,HAB.y);return {name:tgt&&tgt.stop?'Stop '+tgt.stop.id:'Habitat',km:Math.hypot(c%W-pos.x,Math.floor(c/W)-pos.y)*CELL/1000}}

  function command(pos,used){
    const atHome=state.t>=X.end;
    if(anyCrisis()){
      const c=crisisAt(F,p,D,state.cr,pos.cell,used),g=grade(c.m,p.gate),cr=state.cr;
      let name=[cr.rover&&'Rover failed',cr.suit&&'Suit failure',cr.injured&&'Crew injured',cr.storm&&'Solar storm'].filter(Boolean).join(' + ');
      let cmd,why;
      if(c.dest==='shelter'){cmd=c.m>=0?'Shelter now':'Shelter now, nearest cover';why=`Nearest terrain shelter is ${fmtDur(c.travel)} away ${c.mode==='ride'?'by rover':'on foot'}. Assumed warning: ${p.warn} min. Home afterwards: ${fmtDur(c.mHome)} margin.`}
      else if(c.mode==='ride'){cmd=c.m>=0?'Return by rover now':'Return now, reserve will not cover it';why=`${fmtDur(c.travel)} to the habitat at ${p.roverE} km/h. ${cr.suit?'Emergency oxygen: '+p.emerg+' min.':'Reserve: '+fmtDur(c.avail)+'.'}`}
      else{cmd=c.m>=0?'Walk home now':'Walk-back not covered';why=`${fmtDur(c.travel)} on foot${cr.injured?' at half speed':''}. ${cr.suit?'Emergency oxygen: '+p.emerg+' min.':'Reserve: '+fmtDur(c.avail)+'.'}`}
      if(cr.storm&&c.dest==='home')why+=` Solar storm: nearest shelter ${fmtDur(c.shelterTravel)} away, ${c.shelterTravel<=p.warn?'reachable':'not reachable'} within the ${p.warn} min warning; getting home is the tighter limit.`;
      const plan=cr.suit||cr.storm?'D':'C';
      return {name,cmd,why,m:c.m,g,plan,crisis:true};
    }
    if(atHome)return {name:'EVA complete',cmd:'Back at the habitat',why:'',m:Infinity,g:'safe',plan:X.planAt(state.t),crisis:false};
    const plan=X.planAt(state.t);
    const m=walkMargin(F,p,D,pos.cell,used);
    return {name:'',cmd:plan==='A'?'On plan A':'Switched to plan '+plan,why:'',m,g:grade(m,p.gate),plan,crisis:false};
  }

  function renderAlert(c){
    const bar=$('alertbar');
    const show=c.crisis||c.plan!=='A';
    bar.className='alertbar'+(show?' on '+c.g+'-c':'');
    if(!show)return;
    $('alertCmd').textContent=(c.crisis?c.name+'. ':'')+c.cmd;
    $('alertWhy').textContent=c.crisis?c.why+' Plan '+c.plan+'.':X.gates.filter(g=>g.cls!=='ok'&&g.t<=state.t).map(g=>g.text).slice(-1)[0]||'';
    $('alertCount').textContent=isFinite(c.m)?fmtDur(c.m)+' spare':'';
  }

  function ladderHTML(active){
    const rungs=[['A','Full mission','Stops A, B, C in order, then home'],['B','Shortened','Skip the lowest-science stop'],['C','Return early','Go home now, by rover or on foot'],['D','Emergency','Suit failure or storm: ride home or shelter']];
    return '<div class="ladder">'+rungs.map(r=>`<div class="rung${r[0]===active?' on':''}"><div class="l">${r[0]}</div><div><div>${r[1]}</div><div class="d">${r[2]}</div></div></div>`).join('')+'</div>';
  }

  // A dragged stop keeps its photo and notes, which belong to the original site; say so instead of "Curiosity site".
  function siteNote(s){const o=toXY(s.lat,s.lon),km=Math.hypot(s.x-o.x,s.y-o.y)*CELL/1000;
    if(s.x===o.x&&s.y===o.y)return s.real?'Curiosity site':'new site';
    return 'moved '+(km<1?Math.round(km*1000)+' m':km.toFixed(1)+' km')+' from the original site; the '+(s.orbital?'orbital view':'photo')+' and notes show the original site';}
  function renderRight(pos,used,c){
    const i=pos.cell,home=F.wHome.time[i]/D.walkSpeed,m=walkMargin(F,p,D,i,used),g=grade(m,p.gate);
    const turn=state.t+(m)*D.walkRate/RATE.work,nt=nextTarget(pos);
    const sel=STOPS.find(s=>s.id===state.sel),sc=cellXY(sel.x,sel.y);
    if(state.mode==='walk'){
      $('rightCol').className='card walk';
      $('rightCol').innerHTML=`<h2>Wrist display</h2><div class="bigcmd ${c.g}-c">${c.cmd.toUpperCase()}</div><div class="tiles">
        <div class="tile ${c.g}"><div class="k">${c.crisis?'Margin ('+c.name.toLowerCase()+')':'Margin (rover fails)'}</div><div class="v">${fmtDur(c.m)}</div></div>
        <div class="tile"><div class="k">Home on foot</div><div class="v">${fmtDur(home)}</div></div>
        <div class="tile"><div class="k">Next: ${nt.name} (straight line)</div><div class="v">${nt.km.toFixed(1)} km</div></div>
        <div class="tile"><div class="k">Turn back by</div><div class="v">${fmtClock(turn)}</div></div>
        <div class="tile"><div class="k">Active plan</div><div class="v">${c.plan}</div></div></div>
        <p class="small">Same model as the plan view, cut to what a gloved hand can read at a glance.</p>`;
      return;
    }
    const gl=X.gates.filter(gt=>gt.t<=state.t+0.5);
    $('rightCol').className='card';
    $('rightCol').innerHTML=`<h2>Right now</h2><div class="tiles">
      <div class="tile ${g}"><div class="k">Margin if the rover fails here</div><div class="v">${fmtDur(m)}</div></div>
      <div class="tile ${grade(rideMargin(F,p,D,i),p.gate)}"><div class="k">Margin if the suit fails here</div><div class="v">${fmtDur(rideMargin(F,p,D,i))}</div></div>
      <div class="tile"><div class="k">Walk home from here</div><div class="v">${fmtDur(home)}</div></div></div>
      <div class="status"><b>${segLabel(pos.seg)}</b><br>Reserve left: ${fmtDur((D.cap-used))} of ${D.limiting} at work rate.</div>
      <h2>Plan ladder</h2>${ladderHTML(c.plan)}
      <h2>Decision gates</h2><div class="gates">${gl.length?gl.map(gt=>`<div class="${gt.cls}">${gt.text}</div>`).join(''):'<div>First gate: leaving the first stop.</div>'}</div>
      <h2>Selected stop</h2><div class="stop"><div class="name">${sel.name}</div>
      ${sel.img?`<figure class="pic${sel.orbital?' orb':''}"><div class="frame"><img src="${sel.img}" alt="${sel.photo}"${sel.focus?` style="object-position:${sel.focus}"`:''}>${sel.orbital?'<span class="ring"></span><span class="otag">ORBITAL</span>':''}</div><figcaption>${sel.cap} <span class="cr">Credit: ${sel.credit}</span></figcaption></figure>`:`<div class="photo">${sel.photo}</div>`}<div class="small">${(()=>{const ll=toLL(sel.x,sel.y);return ll.lat.toFixed(5)+", "+ll.lon.toFixed(5)+" · "+Math.round(T.z[sc])+" m · "+siteNote(sel)})()}</div>
      <div>${sel.goal}</div>
      <label for="val">Science value (1 to 5)<input id="val" type="text" inputmode="numeric" autocomplete="off" min="1" max="5" value="${sel.value}"></label>
      <div class="small">Walk home from here: ${fmtDur(F.wHome.time[sc]/D.walkSpeed)}</div></div>`;
    $('val').addEventListener('change',e=>{const v=Math.max(1,Math.min(5,Math.round(parseFloat(latin(e.target.value))||1)));sel.value=v;replan()});
  }

  function fixesFor(){
    const trials=[];
    for(const s of [...STOPS].sort((a,b)=>a.value-b.value)){const rest=STOPS.filter(x=>x!==s);const ev=evaluateDesign(F,p,D,rest);trials.push({t:`Skip stop ${s.id} (science value ${s.value})`,m:ev.minM})}
    if(p.station>30){const q={...p,station:30};const ev=evaluateDesign(F,q,derived(q),STOPS);trials.push({t:'Cut each stop to 30 min',m:ev.minM})}
    if(p.load>=5){const q={...p,load:p.load-5};const ev=evaluateDesign(F,q,derived(q),STOPS);trials.push({t:`Carry 5 kg less (${p.load-5} kg)`,m:ev.minM})}
    return trials.filter(x=>x.m>=0).sort((a,b)=>b.m-a.m);
  }

  function renderWhy(){
    const g=E.grade,sc=E.sc,b=E.binding==='ride'?sc.ride:sc.worst;
    const sl=segLabel(b.seg),where=sl.charAt(0).toLowerCase()+sl.slice(1),when=fmtClock(b.t);
    let reason;
    if(!isFinite(E.minM))reason='A stop cannot be reached over passable terrain. Move it or raise the slope limit.';
    else if(E.binding==='time')reason=E.timeKind==='sunrise'?`The walk starts at ${fmtLocal(p.start*60)}, before sunrise at ${fmtLocal(DAYLIGHT.sunrise)} (Curiosity REMS), by ${fmtDur(-E.timeSpare)}.`:E.timeKind==='sunset'?`The crew is out for ${fmtDur(E.end)} from ${fmtLocal(p.start*60)}; sunset is at ${fmtLocal(DAYLIGHT.sunset)} (Curiosity REMS), leaving ${fmtDur(E.timeSpare)} of daylight.`:`The plan keeps the crew in their suits for ${fmtDur(E.end)}. The limit is ${p.maxh} h, leaving ${fmtDur(E.timeSpare)}.`;
    else if(E.binding==='ride')reason=`If a suit fails while ${where} (${when}), the ride home takes ${fmtDur(F.rHome.time[b.cell]/p.roverE)}, padded to ${fmtDur(D.pad*F.rHome.time[b.cell]/p.roverE)}. Emergency oxygen lasts ${p.emerg} min.`;
    else reason=`If the rover fails while ${where} (${when}), the walk home takes ${fmtDur(F.wHome.time[b.cell]/D.walkSpeed)}, padded to ${fmtDur(D.pad*F.wHome.time[b.cell]/D.walkSpeed)}. The suits have ${fmtDur(b.m+D.pad*F.wHome.time[b.cell]/D.walkSpeed)} of walking left, limited by ${D.limiting}.`;
    const spare=E.binding==='time'?E.timeSpare:b.m;
    let html=`<h2>${g==='danger'?'Why NO-GO':'Why GO'}</h2><p class="reason">${g==='danger'?'Short by '+fmtDur(-Math.min(spare,E.minM))+'. ':'Tightest limit: '+fmtDur(spare)+' spare. '}${reason}</p>`;
    if(g==='danger'){
      const fx=fixesFor();
      html+=fx.length?`<table class="fixes"><thead><tr><th>Change that makes it GO</th><th style="text-align:right">Margin after</th></tr></thead><tbody>${fx.map(f=>`<tr><td>${f.t}</td><td class="n">${fmtDur(f.m)}</td></tr>`).join('')}</tbody></table>`:'<p class="small">No single change fixes this plan. Move the farthest stop closer.</p>';
      html+='<p class="small">Lowering the safety pad is never offered as a fix.</p>';
    }else html+=`<p class="small">${g==='tight'?'Feasible, but close to a limit. Expect the gates to switch to plan B if anything runs late.':'All three limits clear: rover failure ('+fmtDur(sc.worst.m)+', above the '+p.gate+' min gate), suit failure ('+fmtDur(sc.ride.m)+'; the ride home only has to fit the emergency oxygen, tight below 10 min) and time in suit ('+fmtDur(E.timeSpare)+').'}</p>`;
    $('whyCard').innerHTML=html;
  }

  function renderBackup(){
    const rows=X.segs.filter(s=>s.type==='work').map(s=>{
      const c=s.cell,used=consumed(X.segs,s.t1),m=walkMargin(F,p,D,c,used),latest=s.t1+(m-p.gate)*D.walkRate/RATE.work;
      return `<tr><td>Stop ${s.stop.id}</td><td class="n">${fmtClock(s.t0)}</td><td class="n">${fmtClock(latest)}</td><td class="n">${fmtDur(F.wHome.time[c]/D.walkSpeed)}</td></tr>`}).join('');
    $('backupCard').innerHTML=`<h2>Backup card</h2><p class="small">Printed and carried by both crew before the EVA, in case LIFELINE itself fails.</p>
      <table class="fixes"><thead><tr><th>Stop</th><th style="text-align:right">Arrive</th><th style="text-align:right">Leave by</th><th style="text-align:right">Walk home</th></tr></thead><tbody>${rows}</tbody></table>
      <p class="small">Leave by keeps the ${p.gate} min gate if the rover then fails. Lost or blinded by dust: follow the route you came in on.</p>`;
  }

  const FLAT=flatChecks();
  function renderValid(){
    const all=[...FLAT,...planChecks(F,p,D,E)];
    $('checks').innerHTML=all.map(c=>`<div class="chk"><div class="b ${c.ok?'pass':'fail'}">${c.ok?'PASS':'FAIL'}</div><div><div class="t">${c.t}</div><div class="d">${c.d}</div></div></div>`).join('');
    const S2=sensitivity(F,p,STOPS),vals=[S2.base,0,...S2.rows.flatMap(r=>[r.ml,r.mh])].filter(isFinite),mn=Math.min(...vals),mx=Math.max(...vals),pos=v=>(14+(v-mn)/(mx-mn||1)*70).toFixed(2)+'%';
    $('tornado').innerHTML=S2.rows.map(r=>{const a=Math.min(r.ml,r.mh),b=Math.max(r.ml,r.mh);return `<div class="trow"><div class="lab">${r.lab}</div><div class="track"><div class="zero" style="left:${pos(0)}"></div><div class="rng" style="left:${pos(a)};width:calc(${pos(b)} - ${pos(a)})"></div><div class="base" style="left:${pos(S2.base)}"></div><span class="lo" style="left:calc(${pos(a)} - 4px);transform:translateX(-100%)">${fmtDur(r.ml<=r.mh?r.ml:r.mh)}</span><span class="hi" style="left:calc(${pos(b)} + 4px)">${fmtDur(r.ml<=r.mh?r.mh:r.ml)}</span></div></div>`}).join('')+`<div class="small">Red line: zero margin. Today: ${fmtDur(S2.base)}.</div>`;
  }
  function render(){
    const used=usedAt(state.t),pos=posAt(X.segs,state.t);
    drawBase(used);drawOverlay(pos,used);
    const c=command(pos,used);renderAlert(c);renderRight(pos,used,c);renderWhy();renderBackup();
    $('clock').textContent=fmtClock(state.t);$('tSlider').value=state.t;
    const g=E.grade,v=$('verdict');v.className='verdict '+g+'-c';v.textContent=g==='danger'?'NO-GO':g==='tight'?'GO, MARGIN TIGHT':'GO FOR EVA';
    const lateTot=Object.values(state.delays).reduce((a,b)=>a+b,0);$('lateNote').textContent=lateTot?'Delays so far: +'+lateTot+' min':'';
    $('leftCol').style.display=state.mode==='walk'?'none':'';
    if(v3d)v3d.update();
    if(state.mode==='3d')drawProfile();
    // RAD and REMS in the result: surface dose for the planned time outside, and the daylight window the plan must fit
    $('radWalk').textContent=isFinite(E.end)?(0.64*E.end/1440).toFixed(2)+' mSv in '+fmtDur(E.end):'no plan';
    $('dayWin').textContent=DAYLIGHT?fmtLocal(DAYLIGHT.sunrise)+' to '+fmtLocal(DAYLIGHT.sunset):'no data';
  }

  $('tSlider').addEventListener('input',e=>{state.t=+e.target.value;render()});
  ['lyImg','lyMargin','lyRide','lySlope','lySand','lyShelter','lyTrack'].forEach(id=>$(id).addEventListener('change',render));
  IDS.forEach(id=>$(id).addEventListener('change',()=>{(id==='pSlope'||id==='pSand')?rebuildFields():replan()}));
  document.querySelectorAll('[data-cr]').forEach(b=>b.addEventListener('click',()=>{state.cr[b.dataset.cr]=!state.cr[b.dataset.cr];b.setAttribute('aria-pressed',String(state.cr[b.dataset.cr]));render()}));
  $('late').addEventListener('click',()=>{
    const pos=posAt(X.segs,state.t),s=pos.seg;let stop=null;
    if(s&&s.type==='work')stop=s.stop;else if(s&&s.stop)stop=s.stop;
    if(!stop){$('lateNote').textContent='No stop ahead to be late at.';return}
    state.delays[stop.id]=(state.delays[stop.id]||0)+15;replan();
  });
  $('clear').addEventListener('click',()=>{for(const k in state.cr)state.cr[k]=false;document.querySelectorAll('[data-cr]').forEach(b=>b.setAttribute('aria-pressed','false'));state.delays={};state.probe=null;replan()});
  // 3D view: loaded on first use, view only (the 2D canvas is its surface texture).
  let v3d=null,v3dLoading=null;
  const open3d=()=>{
    $('view3dBox').hidden=false;document.body.classList.add('with3d');
    if(v3d||v3dLoading)return;
    let ok=false;try{const t=document.createElement('canvas');ok=!!(t.getContext('webgl2')||t.getContext('webgl'))}catch(e){}
    if(!ok){$('v3dMsg').textContent='This device or browser cannot show 3D (WebGL is not available). The 2D map has everything the 3D view shows.';return}
    v3dLoading=import('./view3d.js').then(m=>{v3d=m.start($('v3d'),cv,scene3d,fenceNote);window.__lifeline3d=v3d;setLook($('lookMargins').getAttribute('aria-pressed')==='true'?'margins':'mars');drawProfile();$('v3dMsg').remove()}).catch(e=>{console.warn('3D view failed to load:',e);v3dLoading=null;$('v3dMsg').textContent='The 3D view could not start on this browser (it needs WebGL, a recent browser such as Safari 16.4 or later, and an internet connection the first time). The 2D map has everything the 3D view shows.'});
  };
  // What the 3D "Terrain" look draws on top of the relief: the same route, stops, crew and crisis path as the 2D map.
  function scene3d(){
    if(!X)return null;const pos=posAt(X.segs,state.t),visited=new Set(X.segs.filter(s=>s.type==='work').map(s=>s.stop.id));
    let crisisPath=null,crisisShelter=false;
    if(anyCrisis()){const used=usedAt(state.t),c=crisisAt(F,p,D,state.cr,pos.cell,used);const fld=c.mode==='ride'?(c.dest==='home'?F.rHome:F.rShel):(c.dest==='home'?F.wHome:F.wShel);crisisPath=pathTo(fld,pos.cell);crisisShelter=c.dest==='shelter'}
    // Safety fence: cells whose walk home (rover failed now) still fits the reserve: wHome/speed*pad <= (cap-used)/walkRate
    const used=usedAt(state.t),limit=Math.max(0,(D.cap-used)/D.walkRate)*D.walkSpeed/D.pad;
    return {drives:X.segs.filter(s=>s.type==='drive').map(s=>({cells:s.path,done:s.t1<=state.t})),stops:STOPS.map(s=>({id:s.id,x:s.x,y:s.y,skipped:!visited.has(s.id)})),hab:HAB,crew:{x:pos.x,y:pos.y},crisisPath,crisisShelter,
      fence:{field:F.wHome.time,limit,on:$('v3dFence').checked},slopeLimit:p.slope};
  }
  // One line above the 3D view says what the safety fence shows right now, so it is understood at first glance.
  function fenceNote(info){
    const el=$('v3dFenceNote');if(!el)return;const t=fmtClock(state.t);el.className='v3d-fence-note '+info.state;
    el.textContent=info.state==='hidden'?'Safety fence hidden.':info.state==='none'?`Safety fence at ${t}: the reserve could no longer cover a walk home from anywhere. Turn back now.`:
      info.state==='all'?`Safety fence at ${t}: every point on this map is still within walking reach of home if the rover failed. Move the time slider to watch the fence close in.`:
      info.km<1?`Safety fence at ${t}: only ${info.km.toFixed(1)} km of fence, at the edge of this map; almost all of it is still within walking reach of home. Move the time slider to watch the fence close in.`:
      `Safety fence at ${t}: ${info.km.toFixed(1)} km of fence on this map. Beyond the teal wall the crew could not walk home if the rover failed now.`;
  }
  function drawProfile(){
    const c=$('v3dProfile');if(!c||$('view3dBox').hidden||!X)return;
    const dpr=Math.min(window.devicePixelRatio||1,2),w=c.clientWidth,h=c.clientHeight;if(!w||!h)return;
    if(c.width!==Math.round(w*dpr)){c.width=Math.round(w*dpr);c.height=Math.round(h*dpr)}
    const g=c.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,w,h);
    const pts=[],marks=[];let dist=0,prev=null;const seen=new Set();
    for(const s of X.segs){
      if(s.type==='work'){if(!seen.has(s.stop.id)){seen.add(s.stop.id);marks.push({d:dist,id:s.stop.id})}continue}
      for(const cell of s.path){const x=cell%W,y=Math.floor(cell/W);if(prev){const st=Math.hypot(x-prev[0],y-prev[1])*CELL;if(!st)continue;dist+=st}
        pts.push({d:dist,z:T.z[cell],s:T.slope[cell]});prev=[x,y]}
    }
    if(pts.length<2)return;
    let zl=Infinity,zh=-Infinity,up=0,down=0;pts.forEach((q,k)=>{zl=Math.min(zl,q.z);zh=Math.max(zh,q.z);if(k){const dz=q.z-pts[k-1].z;dz>0?up+=dz:down-=dz}});
    const L=56,R=10,Tp=20,B=20,X0=d=>L+(w-L-R)*d/dist,Y0=z=>Tp+(h-Tp-B)*(1-(z-zl)/Math.max(1,zh-zl));
    g.fillStyle='rgba(193,68,14,.22)';g.beginPath();g.moveTo(X0(0),h-B);pts.forEach(q=>g.lineTo(X0(q.d),Y0(q.z)));g.lineTo(X0(dist),h-B);g.closePath();g.fill();
    for(let k=1;k<pts.length;k++){const q=pts[k],s=q.s;g.strokeStyle=s>15?(s>p.slope?'#D9342B':'#F2B01E'):'#3DD6F5';g.lineWidth=2;g.beginPath();g.moveTo(X0(pts[k-1].d),Y0(pts[k-1].z));g.lineTo(X0(q.d),Y0(q.z));g.stroke()}
    g.font='11px "IBM Plex Sans",sans-serif';g.fillStyle='#9AA3AD';g.textAlign='right';g.fillText(Math.round(zh)+' m',L-4,Tp+4);g.fillText(Math.round(zl)+' m',L-4,h-B);
    g.textAlign='center';g.fillText((dist/1000).toFixed(1)+' km',w-R-14,h-5);g.fillText('0',L,h-5);
    let lastX=-99,row=0;for(const m of marks){const mx=X0(m.d);row=mx-lastX<14?row+1:0;lastX=mx;g.strokeStyle='rgba(242,240,235,.35)';g.setLineDash([3,3]);g.beginPath();g.moveTo(mx,Tp);g.lineTo(mx,h-B);g.stroke();g.setLineDash([]);g.fillStyle='#F2F0EB';g.fillText(m.id,mx+row*10,Tp-6)}
    g.fillStyle='#F2F0EB';g.fillText('H',X0(0)+6,Tp-6);g.fillText('H',X0(dist)-6,Tp-6);
    // crew position along the route
    const pos=posAt(X.segs,state.t);let best=0,bd=1e9;pts.forEach((q,k)=>{});{let d2=0,pv=null,k=0;
      for(const s of X.segs){if(s.t0>state.t)break;if(s.type==='work'){continue}const P=s.path,f=s.t1>s.t0?Math.max(0,Math.min(1,(state.t-s.t0)/(s.t1-s.t0))):1;
        for(let j=0;j<P.length;j++){const x=P[j]%W,y=Math.floor(P[j]/W);if(pv){d2+=Math.hypot(x-pv[0],y-pv[1])*CELL}pv=[x,y];if(state.t<s.t1&&j>=Math.round(f*(P.length-1)))break}if(state.t<s.t1)break}best=d2}
    const zc=T.z[pos.cell];g.beginPath();g.arc(X0(Math.min(best,dist)),Y0(zc),5,0,7);g.fillStyle='#F2F0EB';g.fill();g.lineWidth=2;g.strokeStyle='#0F1419';g.stroke();
    $('v3dProfileNote').textContent=`Route elevation along the plan: ${(dist/1000).toFixed(1)} km, climb ${Math.round(up)} m, descent ${Math.round(down)} m. Blue: under 15°; amber: 15° to ${p.slope}° (walking slows); white dot: crew now.`;
  }
  const setLook=l=>{$('lookTerrain').setAttribute('aria-pressed',String(l==='mars'));$('lookMargins').setAttribute('aria-pressed',String(l==='margins'));$('v3dLegend').textContent=l==='mars'?'Realistic Mars: the shape is the real HRSC elevation (30 m cells; heights exaggerated by the Height slider). Colours, rock bands, ripples and pebbles are illustrative detail generated by code from height and slope; not a photo. Blue: route ahead. Grey: route done. Faded stop: skipped by a gate.':'Safety Overlay: the same colours as the 2D map (green safe, yellow tight, red no return) on the real terrain.';if(v3d)v3d.setLook(l)};
  const close3d=()=>{$('view3dBox').hidden=true;document.body.classList.remove('with3d')};
  const setMode=m=>{state.mode=m;$('modePlan').setAttribute('aria-pressed',String(m==='plan'));$('modeWalk').setAttribute('aria-pressed',String(m==='walk'));$('mode3d').setAttribute('aria-pressed',String(m==='3d'));m==='3d'?open3d():close3d();render()};
  $('mode3d').addEventListener('click',()=>setMode('3d'));$('v3dEx').addEventListener('input',e=>{$('v3dExVal').textContent='×'+e.target.value;if(v3d)v3d.setExaggeration(e.target.value)});
  $('v3dFence').addEventListener('change',()=>{if(v3d)v3d.update()});$('v3dSteep').addEventListener('change',e=>{if(v3d)v3d.setSteep(e.target.checked)});
  document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{if(v3d)v3d.setView(b.dataset.view)}));
  window.addEventListener('resize',()=>{if(state.mode==='3d')drawProfile()});$('lookTerrain').addEventListener('click',()=>setLook('mars'));$('lookMargins').addEventListener('click',()=>setLook('margins'));
  $('modePlan').addEventListener('click',()=>setMode('plan'));$('modeWalk').addEventListener('click',()=>setMode('walk'));

  const toCell=e=>{const r=cv.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width*W-.5,y:(e.clientY-r.top)/r.height*H-.5}};
  let raf=0;
  cv.addEventListener('pointerdown',e=>{const q=toCell(e);const hitO=STOPS.map(s=>({s,d:Math.hypot(s.x-q.x,s.y-q.y)})).filter(o=>o.d<3.5).sort((a,b)=>a.d-b.d)[0],hit=hitO&&hitO.s;state.moved=false;if(hit){state.drag=hit;state.sel=hit.id;cv.setPointerCapture(e.pointerId)}});
  cv.addEventListener('pointermove',e=>{if(!state.drag)return;const q=toCell(e),x=Math.round(Math.max(1,Math.min(W-2,q.x))),y=Math.round(Math.max(1,Math.min(H-2,q.y)));
    if(T.slope[y*W+x]>p.slope)return;if(x===state.drag.x&&y===state.drag.y)return;state.drag.x=x;state.drag.y=y;state.moved=true;
    if(!raf)raf=requestAnimationFrame(()=>{raf=0;F.rStop[state.drag?state.drag.id:'C']=dijkstra(F.rv,[cellXY((state.drag||STOPS[2]).x,(state.drag||STOPS[2]).y)]);replan()})});
  cv.addEventListener('pointerup',e=>{if(state.drag){const s=state.drag;state.drag=null;F.rStop[s.id]=dijkstra(F.rv,[cellXY(s.x,s.y)]);state.probe=null;replan();return}
    const q=toCell(e);state.probe={x:Math.round(Math.max(0,Math.min(W-1,q.x))),y:Math.round(Math.max(0,Math.min(H-1,q.y)))};render()});

  rebuildFields();
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(render);
})();

// Environment panel: real REMS readings for the boxwork sols (data/rems-weather.js). Shows only what the feed gave.
(function(){
  if(typeof REMS==='undefined'||!REMS.rows.length)return;
  const r=REMS.rows,n=r.length,mn=Math.min(...r.map(x=>x[2])),mx=Math.max(...r.map(x=>x[3])),
    pl=Math.min(...r.map(x=>x[4])),ph=Math.max(...r.map(x=>x[4])),sky={};
  r.forEach(x=>sky[x[5]]=(sky[x[5]]||0)+1);
  const set=(id,t)=>{const e=document.getElementById(id);if(e)e.textContent=t};
  set('remsT',`${mn} to ${mx} °C`);
  set('remsP',`${pl} to ${ph} Pa`);
  set('remsS',Object.entries(sky).map(([k,v])=>`${k} ${v} of ${n} sols`).join(', '));
  set('remsNote',`Curiosity REMS daily values, sols ${REMS.fromSol} to ${REMS.toSol} (${r[0][1]} to ${r[n-1][1]}), the stretch between drill sites A and B. ${n} sols in the feed. Source: NASA MSL weather feed, Centro de Astrobiología.`);
})();
