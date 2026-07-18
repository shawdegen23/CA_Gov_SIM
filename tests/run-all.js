#!/usr/bin/env node
/* Golden State test runner.
   Extracts the engine out of index.html, concatenates stub + engine + each suite,
   and runs them as plain node scripts. Suites self-report and exit non-zero on
   failure; this runner aggregates and exits non-zero if anything failed.
   Usage: node tests/run-all.js [suiteName ...]   (no args = all suites) */
const fs=require("fs"),path=require("path"),{spawnSync}=require("child_process");
const ROOT=path.join(__dirname,"..");
const BUILD=path.join(__dirname,".build");

const html=fs.readFileSync(path.join(ROOT,"index.html"),"utf8");
const m=html.match(/<script>([\s\S]*?)<\/script>/);
if(!m){console.error("Could not find the <script> block in index.html");process.exit(2);}
fs.mkdirSync(BUILD,{recursive:true});
const stub=fs.readFileSync(path.join(__dirname,"stub.js"),"utf8");
const engine=m[1];

const suiteDir=path.join(__dirname,"suites");
let suites=fs.readdirSync(suiteDir).filter(f=>f.endsWith(".js"))
  .sort((a,b)=>(parseInt(a.replace(/\D/g,""))||1)-(parseInt(b.replace(/\D/g,""))||1));
const pick=process.argv.slice(2);
if(pick.length)suites=suites.filter(s=>pick.some(p=>s.includes(p)));

let failed=0,totalPass=0;
for(const s of suites){
  const out=path.join(BUILD,"run-"+s);
  fs.writeFileSync(out,stub+"\n"+engine+"\n"+fs.readFileSync(path.join(suiteDir,s),"utf8"));
  const r=spawnSync(process.execPath,[out],{encoding:"utf8",timeout:300000});
  const tail=(r.stdout||"").trim().split("\n").pop()||"";
  const pass=(tail.match(/(\d+) passed/)||[])[1]||"?";
  if(r.status!==0){
    failed++;
    console.log(`FAIL  ${s}`);
    console.log((r.stdout||"")+(r.stderr||""));
  }else{
    totalPass+=Number(pass)||0;
    console.log(`ok    ${s}  (${pass} assertions)`);
  }
}
console.log(`\n${suites.length} suites, ${totalPass} assertions passed${failed?`, ${failed} SUITE(S) FAILED`:", all green"}`);
process.exit(failed?1:0);
