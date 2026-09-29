// SPDX-License-Identifier: MPL-2.0
const assert=require('assert'),fs=require('fs'),P=require('./protocol-core.js'),S=require('./protocol-suite.js'),c=require('./sdk-contract.json'),fixtures=require('./fixtures/protocol/index.json');
const generated={window:{}};require('vm').runInNewContext(fs.readFileSync(__dirname+'/sdk-data.generated.js','utf8'),generated);assert.equal(P.stable(generated.window.DECKLAB_SDK_CONTRACT),P.stable(c));assert.equal(P.stable(generated.window.DECKLAB_SDK_FIXTURES),P.stable(fixtures));
assert.equal(c.apis.length,55);assert.equal(new Set(c.apis.map(a=>a.id)).size,55);
for(const a of c.apis){assert(a.fixtures.length,'No fixture '+a.id);for(const id of a.fixtures){const f=fixtures.find(f=>f.id===id);assert(f&&f.api===a.id);assert.deepEqual(JSON.parse(fs.readFileSync(__dirname+'/fixtures/protocol/'+id+'.json')),f);}}
const results=S.run(c,fixtures);const failures=results.filter(r=>!r.pass);for(const r of failures)console.error(r.id,r.errors);assert.equal(failures.length,0,'Fixture failures');
const coverage=P.coverage(c,results);assert.equal(P.coverage(c,[]).testedBehavior,0);assert.equal(coverage.hardwareValidated,0);assert(!coverage.rows.find(r=>r.event==='switchToProfile').testedBehavior);
const trace={version:'7.6',deviceModel:'plus',events:[{channel:'host->plugin',packet:{event:'keyDown',context:'a',device:'d',payload:{state:0}}}]};assert(P.compareTraces(trace,trace).match);const changed=P.clone(trace);changed.events[0].packet.payload.state=1;assert(!P.compareTraces(trace,changed).match);assert.throws(()=>P.compareTraces(trace,{...trace,events:[]}));
// A schema or unsupported rejection test must never create implementation coverage.
const rejectionOnly=results.filter(r=>r.kind==='rejection');assert.equal(P.coverage(c,rejectionOnly).testedBehavior,0);
const report={generatedAt:new Date().toISOString(),revision:c.revision,results,coverage};fs.writeFileSync(require('./scripts/test-support.cjs').artifactDir+'/protocol-test-results.json',JSON.stringify(report,null,2));
console.log(`PASS ${results.length} protocol fixtures; ${coverage.testedBehavior}/${coverage.total} current directional APIs have passing behavior cases; full=${coverage.full}; hardware=0.`);
