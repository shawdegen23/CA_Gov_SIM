/* ================= LEG-4: pool of 61, fiscal signs, pass/fail menu integrity ================= */
let PASS=0,FAIL=0;
function T(name,cond,detail){if(cond){PASS++;console.log("  ok  "+name);}else{FAIL++;console.log("  FAIL "+name+(detail?" — "+detail:""));}}
const CFG=(over={})=>({seed:12345,name:"Test Gov",party:"D",bgId:"leg",
  attrs:{CHA:4,INS:9,FIS:6,COA:7,FED:3,OPR:4},promises:["no_taxes","build_500k","fix_insurance"],scenario:"aswritten",...over});
const spon=ACTIONS.find(a=>a.id==="sponsor");

console.log("— pool integrity at 61 —");
{
  const ids=new Set();let dup=null;
  for(const b of BILL_POOL){if(ids.has(b.id))dup=b.id;ids.add(b.id);}
  T("pool now holds "+BILL_POOL.length+" unique bills (41 → 61)",BILL_POOL.length===61&&!dup,dup||String(BILL_POOL.length));
  const actorIds=new Set(ACTORS.map(a=>a.id));
  const badActor=BILL_POOL.find(b=>[...(b.backers||[]),...(b.opps||[]),...Object.keys(b.sign.act||{}),...Object.keys(b.veto.act||{})].some(x=>!actorIds.has(x)));
  T("every actor reference valid",!badActor,badActor&&badActor.id);
  const okIssue=new Set(["housingBoost","homelessBoost","insurBoost","medicalBoost","prisonRelief","pensionCut","grid"]);
  const badIssue=BILL_POOL.find(b=>Object.keys(b.sign.issue||{}).some(k=>!okIssue.has(k)));
  T("every issue key handled by enactBill",!badIssue,badIssue&&badIssue.id);
  const rev=BILL_POOL.filter(b=>b.sign.gf>0).length,cost=BILL_POOL.filter(b=>b.sign.gf<0).length,neut=BILL_POOL.filter(b=>!b.sign.gf).length;
  console.log("    fiscal mix: "+rev+" revenue · "+cost+" cost · "+neut+" neutral");
  T("real fiscal mix: revenue, cost, AND neutral bills",rev>=8&&cost>=25&&neut>=10,rev+"/"+cost+"/"+neut);
  T("a deliberate CUT bill exists (film credit sunset)",BILL_POOL.find(b=>b.id==="b_filmsunset").sign.gf===0.75);
}
console.log("— fiscal signs on every label —");
{
  T("tag: revenue",billFiscalTag(BILL_POOL.find(b=>b.id==="b_estate"))==="raises $2.2B/yr");
  T("tag: cost",billFiscalTag(BILL_POOL.find(b=>b.id==="b_ihss"))==="costs $0.6B/yr");
  T("tag: neutral",billFiscalTag(BILL_POOL.find(b=>b.id==="b_payday"))==="fiscally neutral");
  const g=newGame(CFG({seed:1}));
  const menu=spon.choices(g);
  T("sponsor menu carries the fiscal tag on every entry",menu.filter(c=>!c.id.endsWith("|U")).every(c=>/raises \$|costs \$|fiscally neutral/.test(c.cost)),menu.find(c=>!/raises|costs|neutral/.test(c.cost))?.id);
  // neutral bills say so in the outcome ledger
  const f={r:RNG.r};RNG.r=()=>0.5;
  enactBill(g,{...BILL_POOL.find(b=>b.id==="b_erpo")},"sign",true);RNG.r=f.r;
  const o=g.bills.outcomeLog[0];
  T("neutral signature says so in the ledger",o.eff.includes("fiscally neutral"),o.eff);
}
console.log("— passed bills never return; failed ones return LABELED —");
{
  const g=newGame(CFG({seed:2}));
  enactBill(g,{...BILL_POOL.find(b=>b.id==="b_firewall")},"sign",true);   // PASSED
  enactBill(g,{...BILL_POOL.find(b=>b.id==="b_pla")},"veto");             // VETOED (failed)
  (g.bills.deadSess=g.bills.deadSess||{})["b_ai"]=2027;                    // DIED in process (failed)
  g.turn=13; // next session
  const menu=spon.choices(g);
  T("SIGNED bill never reappears",!menu.some(c=>c.id==="b_firewall"||c.id==="b_firewall|U"));
  const pla=menu.find(c=>c.id==="b_pla"),ai=menu.find(c=>c.id==="b_ai");
  T("VETOED bill returns, tagged REINTRODUCTION",pla&&pla.nm.includes("REINTRODUCTION"));
  T("DIED bill returns next session, tagged REINTRODUCTION",ai&&ai.nm.includes("REINTRODUCTION"));
  T("fresh bills carry no tag",!menu.find(c=>c.id==="b_adu").nm.includes("REINTRODUCTION"));
  // the full-term invariant, 10 seeds
  let leaks=0;
  for(let s=0;s<10;s++){
    const gg=newGame(CFG({seed:81000+s}));
    for(let t=0;t<48&&!gg.over&&gg.phase==="play";t++){
      const d=turnDate(gg.turn);
      if(d.m===1&&!gg.fiscal.budget.proposed)proposeBudget(gg,{cuts:5,taxes:0,reserves:2,gimmicks:2,rosy:3},"B");
      if(gg.fiscal.budget.awaiting)finishEnactment(gg,false);
      if(d.m===9)for(const b of gg.bills.desk.slice()){enactBill(gg,b,(s+t)%4?"sign":"veto");gg.bills.desk=gg.bills.desk.filter(x=>x!==b);}
      endMonth(gg);
      if(spon.when(gg)===true)for(const c of spon.choices(gg)){
        const bid=c.id.endsWith("|U")?c.id.slice(0,-2):c.id;
        if(gg.bills.enactedIds.includes(bid))leaks++;}
    }
  }
  T("10 full terms: zero enacted-bill leaks into the menu",leaks===0,String(leaks));
}
console.log("— passing bills makes things HAPPEN —");
{
  const g=newGame(CFG({seed:3}));g.turn=9;
  const d0=g.fiscal.deficit;
  const f={r:RNG.r};RNG.r=()=>0.5;
  enactBill(g,{...BILL_POOL.find(b=>b.id==="b_filmsunset")},"sign",true); // +0.75 cut
  enactBill(g,{...BILL_POOL.find(b=>b.id==="b_carecourt")},"sign",true);  // −0.3 cost + homeless law
  RNG.r=f.r;
  const fiscalQ=g.lag.filter(l=>l.label.includes("fiscal effect"));
  T("fiscal effects queue for Jan 1 (both signs)",fiscalQ.length===2&&fiscalQ.every(q=>q.due===13),JSON.stringify(fiscalQ.map(q=>q.fx.d)));
  T("cut bill queues +0.75 relief, cost bill queues −0.3",fiscalQ.some(q=>q.fx.d===-0.75)&&fiscalQ.some(q=>q.fx.d===0.3));
  T("policy effect queues to the LAW column",g.lag.some(l=>l.fx.k==="law"&&l.fx.key==="lawHomeless"&&l.fx.d===3));
  for(const l of g.lag.slice())if(l.fx.k==="deficit"||l.fx.k==="law"){applyFx(g,l.fx,l.label,l.by);g.lag=g.lag.filter(x=>x!==l);}
  T("net fiscal ramification lands on the deficit",Math.abs((d0-g.fiscal.deficit)-0.45)<0.001,String(d0-g.fiscal.deficit));
  T("homelessness law on the books",g.issues.lawHomeless===3);
}
console.log("\nRESULT: "+PASS+" passed, "+FAIL+" failed");
if(FAIL)process.exit(1);
