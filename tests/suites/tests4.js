/* ================= TAKE-ACTION OVERHAUL SUITE (ACT-1..4) ================= */
let PASS=0,FAIL=0;
function T(name,cond,detail){if(cond){PASS++;console.log("  ok  "+name);}else{FAIL++;console.log("  FAIL "+name+(detail?" — "+detail:""));}}
const CFG=(over={})=>({seed:12345,name:"Test Gov",party:"D",bgId:"leg",
  attrs:{CHA:4,INS:9,FIS:6,COA:7,FED:3,OPR:4},promises:["no_taxes","build_500k","fix_insurance"],scenario:"aswritten",...over});
const eoAction=ACTIONS.find(a=>a.id==="eo");
const freeze=()=>{const f={norm:RNG.norm,chance:RNG.chance,r:RNG.r,int:RNG.int,pick:RNG.pick};
  RNG.norm=()=>0;RNG.chance=()=>false;RNG.r=()=>0.5;RNG.int=(a)=>a;RNG.pick=a=>a[0];return f;};
const thaw=f=>{RNG.norm=f.norm;RNG.chance=f.chance;RNG.r=f.r;RNG.int=f.int;RNG.pick=f.pick;};

console.log("— ACT-1: homelessness only moves because you moved it —");
{
  const f=freeze();
  const A=newGame(CFG({seed:1}));A.market.mode="exuberant";
  const B=newGame(CFG({seed:1}));B.market.mode="exuberant";
  B.issues.homelessBoost=9;B.issues.lawHomeless=7;  // sustained programs + statutes
  const h0=A.issues.homeless;
  for(let i=0;i<24;i++){driftIssues(A,turnDate(i+1));driftIssues(B,turnDate(i+1));B.issues.homelessBoost=9;}
  thaw(f);
  console.log("    no action: "+h0.toLocaleString()+" → "+A.issues.homeless.toLocaleString()+" · all-in: → "+B.issues.homeless.toLocaleString());
  T("doing nothing lets the count RISE",A.issues.homeless>h0,String(A.issues.homeless));
  T("sustained programs + statutes bend it DOWN hard",B.issues.homeless<h0*0.85,String(B.issues.homeless));
}
console.log("— ACT-2: statutes stick, programs fade —");
{
  const f=freeze();
  const g=newGame(CFG({seed:2}));
  enactBill(g,BILL_POOL.find(b=>b.id==="b_upzone"),"sign",true);   // housing statute +12
  enactBill(g,BILL_POOL.find(b=>b.id==="b_audit"),"sign",true);    // homeless statute +3
  for(const l of g.lag.slice())if(l.fx.k==="law"){applyFx(g,l.fx,l.label,l.by);g.lag=g.lag.filter(x=>x!==l);}
  T("signed bills land in the LAW columns",g.issues.lawHousing===12&&g.issues.lawHomeless===3,JSON.stringify([g.issues.lawHousing,g.issues.lawHomeless]));
  T("program columns untouched by statutes",g.issues.housingBoost===0&&g.issues.homelessBoost===0);
  g.issues.homelessBoost=3; // a program the same size as the statute
  for(let i=0;i<50;i++)driftIssues(g,turnDate(i+1));
  T("50 months later the statute is still on the books",g.issues.lawHomeless===3);
  T("...while the same-size program has fully faded",g.issues.homelessBoost===0);
  const o=(g.bills.outcomeLog||[]).find(x=>x.num==="SB 320");
  T("outcome ledger says what the signature bought",o&&o.eff.includes("housing +12 on the books"),o&&o.eff);
  // voter measures are law too
  const g2=newGame(CFG({seed:3}));
  g2.measures.pending.push({...MEASURES.find(m=>m.id==="m_housing"),baseYes:99,electionTurn:1,oppose:[]});
  resolveMeasures(g2);
  T("passed measure queues a permanent LAW effect",g2.lag.some(l=>l.fx.k==="law"&&l.fx.key==="lawHousing"&&l.fx.d===20));
  thaw(f);
}
console.log("— ACT-3: executive orders — cooldowns, rolls, lawsuits —");
{
  const g=newGame(CFG({seed:4}));
  T("eo available fresh",eoAction.when(g)===true);
  const ids0=eoAction.choices(g).map(c=>c.id);
  T("eight orders on the menu",ids0.length===8,String(ids0.length));
  const f=freeze(); // r()=0.5 → OPR roll succeeds for this build; chance()=false → no suit
  eoAction.run(g,"homeless");
  thaw(f);
  T("cooldown recorded",g.flags.eoCd.homeless===g.turn+10);
  T("order leaves the menu during cooldown",!eoAction.choices(g).find(c=>c.id==="homeless"));
  g.turn+=11;
  T("order returns after the cooldown",!!eoAction.choices(g).find(c=>c.id==="homeless"));
  // hiring freeze: once a year, real money
  const g2=newGame(CFG({seed:5}));const d0=g2.fiscal.deficit;const f2=freeze();
  eoAction.run(g2,"freeze");thaw(f2);
  T("freeze sweeps real money",d0-g2.fiscal.deficit>=0.2,String(d0-g2.fiscal.deficit));
  T("freeze once per year",!eoAction.choices(g2).find(c=>c.id==="freeze"));
  g2.turn=14; // next January
  T("freeze available again next year",!!eoAction.choices(g2).find(c=>c.id==="freeze"));
  // implementation roll: force failure → 60% effect queued
  const g3=newGame(CFG({seed:6}));
  const f3=freeze();RNG.r=()=>0.999;RNG.chance=()=>false; // roll fails, no suit
  eoAction.run(g3,"insur");thaw(f3);
  const q=g3.lag.find(l=>l.fx.key==="insurBoost");
  T("botched implementation delivers 60% of the design",q&&q.fx.d===3,q&&String(q.fx.d));
  // lawsuit clawback
  const g4=newGame(CFG({seed:7}));g4.issues.housingBoost=5;
  const f4=freeze();RNG.chance=()=>false; // state LOSES (win chance 0.45 fails)
  applyFx(g4,{k:"fn",fn:"_eoSuit",key:"housingBoost",dmg:3},"EO challenged in court","world");thaw(f4);
  T("losing the EO suit claws the effect back",g4.issues.housingBoost===2,String(g4.issues.housingBoost));
  const g5=newGame(CFG({seed:8}));g5.issues.housingBoost=5;
  const f5=freeze();RNG.chance=()=>true; // state wins
  applyFx(g5,{k:"fn",fn:"_eoSuit",key:"housingBoost",dmg:3},"EO challenged in court","world");thaw(f5);
  T("winning the suit keeps the effect",g5.issues.housingBoost===5);
}
console.log("— ACT-4: the calendar is in your face —");
{
  const g=newGame(CFG({seed:9}));
  let html=seasonPanel(g);
  T("January setpiece demands the budget",html.includes("JANUARY BUDGET")&&html.includes('data-id="budget"'));
  g.slots=2;
  T("slot-starved January explains itself",seasonPanel(g).includes("needs all three"));
  g.slots=3;proposeBudget(g,{cuts:5,taxes:0,reserves:2,gimmicks:2,rosy:3},"The Blend");
  T("setpiece stands down once proposed",seasonPanel(g)==="");
  g.turn=5; // May 2027
  T("May Revision setpiece appears",seasonPanel(g).includes("MAY REVISION")&&seasonPanel(g).includes('data-id="mayrev"'));
  g.fiscal.budget.revised=true;
  T("stands down after the revision",seasonPanel(g)==="");
  // HSR tracker
  const gh=newGame(CFG({seed:10,promises:["finish_hsr","build_500k","fix_insurance"]}));
  T("HSR tracker shows ADVANCE button for the promised project",hsrTracker(gh).includes('data-id="hsrpush"'));
  const gn=newGame(CFG({seed:11}));
  T("no promise, no work started → no tracker",hsrTracker(gn)==="");
  gn.issues.hsrStage=1;hsrSetStage(gn,1);
  T("tracker appears once work begins, even unpromised",hsrTracker(gn).includes("High-Speed Rail"));
  T("budget-season gate explained on the tracker",hsrTracker(gn).includes("budget-season")||hsrTracker(gn).includes("May–Aug")||hsrTracker(gn).includes("Next window")||hsrTracker(gn).includes("⏸"));
  // ON THE BOOKS line
  const gi=newGame(CFG({seed:12}));gi.issues.lawHousing=12;gi.issues.lawInsur=14;
  T("issues panel shows the statute base",issuesPanel(gi).includes("ON THE BOOKS")&&issuesPanel(gi).includes("housing +12"));
}
console.log("— full-term integrity with the new toolkit —");
{
  const g=newGame(CFG({seed:31337}));
  ["DOF","CalHHS","CNRA","CalSTA","CDCR","LWDA","GovOps","BCSH","CalEPA"].forEach(c=>transitionPick(g,c,"holdover"));
  const spon=ACTIONS.find(a=>a.id==="sponsor");
  let err=null;
  try{
    for(let i=0;i<60&&!g.over&&g.phase==="play";i++){
      const d=turnDate(g.turn);
      if(d.m===1&&!g.fiscal.budget.proposed)proposeBudget(g,{cuts:5,taxes:0,reserves:2,gimmicks:2,rosy:3},"The Blend");
      if(g.fiscal.budget.awaiting)finishEnactment(g,false);
      if(d.m===2&&spon.when(g)===true){const ch=spon.choices(g);if(ch.length)spon.run(g,ch[0].id);}
      if(d.m===3&&eoAction.when(g)===true){const ch=eoAction.choices(g);if(ch.length)eoAction.run(g,ch[0].id);}
      if(d.m===9&&g.bills.desk.length)for(const b of g.bills.desk.slice()){enactBill(g,b,"sign");g.bills.desk=g.bills.desk.filter(x=>x!==b);}
      seasonPanel(g);hsrTracker(g);issuesPanel(g);legTrackerPanel(g); // renderers must never throw
      endMonth(g);
    }
  }catch(e){err=e;}
  T("60 months with EOs, bills, budgets — no exceptions",!err,err&&err.stack&&err.stack.split("\n").slice(0,2).join(" | "));
  T("statute base accumulated over the term",(g.issues.lawHousing||0)+(g.issues.lawHomeless||0)+(g.issues.lawInsur||0)+(g.issues.lawMedical||0)+(g.issues.lawPrison||0)>0);
  T("game reaches the report",g.phase==="report",g.phase);
}
console.log("\nRESULT: "+PASS+" passed, "+FAIL+" failed");
if(FAIL)process.exit(1);
