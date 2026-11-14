// Runs the LIFELINE validation checks headless: node tests/run-tests.js
// Loads the same data and model files the page loads, then runs every check in the Validation panel.
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..');
const files=['data/terrain.js','data/rover-track.js','js/mission.js','js/model.js'];
const harness=`
(function(){
  const p=Object.assign({},DEFAULTS),D=derived(p),F=buildFields(p,STOPS),E=evaluateDesign(F,p,D,STOPS);
  const checks=[...flatChecks(),...planChecks(F,p,D,E)];
  return {verdict:E.grade,binding:E.binding,checks,sens:sensitivity(F,p,STOPS)};
})()`;
const src=files.map(f=>fs.readFileSync(path.join(root,f),'utf8')).join('\n;\n')+'\n;'+harness;
const r=vm.runInThisContext(src,{filename:'lifeline-bundle.js'});
let failed=0;
for(const c of r.checks){if(!c.ok)failed++;console.log(`${c.ok?'PASS':'FAIL'}  ${c.t}\n      ${c.d}`)}
console.log(`\nVerdict with default assumptions: ${r.verdict==='danger'?'NO-GO':r.verdict==='tight'?'GO, margin tight':'GO'} (tightest limit: ${r.binding})`);
console.log('\nSensitivity of the tightest walk-back margin (min), assumption at low / high value:');
for(const s of r.sens.rows)console.log(`  ${s.lab.padEnd(18)} ${String(Math.round(s.ml)).padStart(5)} / ${String(Math.round(s.mh)).padStart(5)}`);
console.log(`\n${r.checks.length-failed} of ${r.checks.length} checks passed.`);
process.exit(failed?1:0);
