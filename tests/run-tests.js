// Runs the LIFELINE validation checks headless: node tests/run-tests.js
// Loads the same data and model files the page loads, then runs every check in the Validation panel.
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..');
const files=['data/terrain.js','data/rover-track.js','data/rems-weather.js','js/mission.js','js/model.js'];
const harness=`
(function(){
  const p=Object.assign({},DEFAULTS),D=derived(p),F=buildFields(p,STOPS),E=evaluateDesign(F,p,D,STOPS);
  const checks=[...flatChecks(),...planChecks(F,p,D,E)];
  // Extra property: adding any crisis never raises the margin (a storm adds a condition, it never replaces getting home).
  const K=['rover','suit','injured','storm'];let worse=0,cmp=0;
  for(let t=0;t<=Math.ceil(E.end);t++){const q=posAt(E.segs,t),u=consumed(E.segs,t);for(let m=1;m<16;m++)for(let k=0;k<4;k++){if(m>>k&1)continue;const a={},b={};K.forEach((x,j)=>{if(m>>j&1){a[x]=1;b[x]=1}});b[K[k]]=1;cmp++;if(crisisAt(F,p,D,b,q.cell,u).m>crisisAt(F,p,D,a,q.cell,u).m+1e-9)worse++}}
  return {verdict:E.grade,binding:E.binding,checks,sens:sensitivity(F,p,STOPS),mono:{worse,cmp}};
})()`;
const src=files.map(f=>fs.readFileSync(path.join(root,f),'utf8')).join('\n;\n')+'\n;'+harness;
const r=vm.runInThisContext(src,{filename:'lifeline-bundle.js'});
let failed=0;
for(const c of r.checks){if(!c.ok)failed++;console.log(`${c.ok?'PASS':'FAIL'}  ${c.t}\n      ${c.d}`)}
console.log(`\nVerdict with default assumptions: ${r.verdict==='danger'?'NO-GO':r.verdict==='tight'?'GO, margin tight':'GO'} (tightest limit: ${r.binding})`);
console.log('\nSensitivity of the tightest walk-back margin (min), assumption at low / high value:');
for(const s of r.sens.rows)console.log(`  ${s.lab.padEnd(18)} ${String(Math.round(s.ml)).padStart(5)} / ${String(Math.round(s.mh)).padStart(5)}`);
console.log(`\nExtra: adding a crisis never raises the margin: ${r.mono.worse?'FAIL':'holds'} (${r.mono.cmp} comparisons).`);if(r.mono.worse)failed++;
console.log(`\n${r.checks.length-failed} of ${r.checks.length} checks passed.`);
process.exit(failed?1:0);
