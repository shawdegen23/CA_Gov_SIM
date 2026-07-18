/* ================= REALISM DROP + DEBUG SESSION (fuzz & determinism) ================= */
let PASS=0,FAIL=0;
function T(name,cond,detail){if(cond){PASS++;console.log("  ok  "+name);}else{FAIL++;console.log("  FAIL "+name+(detail?" — "+detail:""));}}
const CFG=(over={})=>({seed:12345,name:"Test Gov",party:"D",bgId:"leg",
  attrs:{CHA:4,INS:9,FIS:6,COA:7,FED:3,OPR:4},promises:["no_taxes","build_500k","fix_insurance"],scenario:"aswritten",...over});
const freeze=()=>{const f={norm:RNG.norm,chance:RNG.chance,r:RNG.r,int:RNG.int,pick:RNG.pick};
  let pi=0; // rotating pick avoids deadlocking sessionEnd's distinct-pick loop
  RNG.norm=()=>0;RNG.chance=()=>false;RNG.r=()=>0.5;RNG.int=(a)=>a;RNG.pick=a=>a[(pi++)%a.length];return f;};
const thaw=f=>{RNG.norm=f.norm;RNG.chance=f.chance;RNG.r=f.r;RNG.int=f.int;RNG.pick=f.pick;};

console.log("— REAL-LEG-1: two-year bills —");
{
  const g=newGame(CFG({seed:1})); // 2027 = odd year
  g.bills.pipeline.push({...BILL_POOL.find(b=>b.id==="b_upzone"),stage:"suspense",sponsored:true});
  const f=freeze();RNG.chance=()=>true; // carryover roll succeeds
  billDied(g,g.bills.pipeline[0],"held in Appropriations");thaw(f);
  T("odd-year Appropriations death becomes a two-year bill",g.bills.pipeline[0].stage==="twoYear");
  T("two-year bill not marked dead for the session",!(g.bills.deadSess||{})["b_upzone"]);
  T("tracker renders the sleeping bill",legTrackerPanel(g).includes("TWO-YEAR BILL"));
  // January revival
  g.turn=12;const f2=freeze();endMonth(g);thaw(f2); // Dec end → Jan
  g.turn=13;const f3=freeze();endMonth(g);thaw(f3); // Jan end → revival fires in Jan block
  T("wakes in January, back in committee",["committee","suspense"].includes(g.bills.pipeline[0].stage),g.bills.pipeline[0].stage);
  // even-year deaths stay dead
  const g2=newGame(CFG({seed:2}));g2.turn=15; // 2028
  g2.bills.pipeline.push({...BILL_POOL.find(b=>b.id==="b_audit"),stage:"suspense",sponsored:true});
  const f4=freeze();RNG.chance=()=>true;billDied(g2,g2.bills.pipeline[0],"held in Appropriations");thaw(f4);
  T("even-year death is just dead",g2.bills.pipeline[0].stage==="dead");
}
console.log("— REAL-LEG-2: near-miss bills pass AS AMENDED —");
{
  const g=newGame(CFG({seed:3}));
  const b={...BILL_POOL.find(x=>x.id==="b_upzone"),stage:"floor",sponsored:true};
  g.bills.pipeline=[b];
  // force the floor count to land 2 short: freeze noise, then tune actors so v.asm ≈ 39-40
  const f=freeze();
  g.actors.progs=-10;g.actors.mods=-10;g.legStanding=-20; // drive the count down
  let v=voteModel(g,false,{});
  // adjust BOTH caucuses (one alone clamps and plateaus); frozen noise is -4 asm / -2 sen -> target post-noise 38-40
  let guard=0;
  const eff=()=>v.asm-4;
  while(!(eff()<41&&41-eff()<=3)&&guard++<400){const dd=eff()>=41?-1:1;g.actors.progs+=dd;g.actors.mods+=dd;v=voteModel(g,false,{});}
  sessionEnd(g,2027);thaw(f);
  const desk=g.bills.desk.find(x=>x.id==="b_upzone");
  T("near-miss floor bill reaches the desk AS AMENDED",!!desk&&desk.amended===true,desk?"amended":"died ("+(41-v.asm)+" short)");
  if(desk)T("amended effects scaled to 60%",desk.sign.issue.housingBoost===7.2,String(desk&&desk.sign.issue.housingBoost));
}
console.log("— REAL-LEG-3: statutes take effect Jan 1 —");
{
  const g=newGame(CFG({seed:4}));g.turn=9; // Sept 2027
  const f=freeze();
  enactBill(g,{...BILL_POOL.find(x=>x.id==="b_upzone")},"sign",true);
  thaw(f);
  const q=g.lag.find(l=>l.fx.k==="law"&&l.fx.key==="lawHousing");
  T("September signature → effect due in January (turn 13)",q&&q.due===13,q&&String(q.due));
  const g2=newGame(CFG({seed:5}));g2.turn=9;
  const f2=freeze();enactBill(g2,{...BILL_POOL.find(x=>x.id==="b_insur"),urgent:true},"sign",true);thaw(f2);
  const q2=g2.lag.find(l=>l.fx.k==="law"&&l.fx.key==="lawInsur");
  T("urgency statute lands in ~2 months instead",q2&&q2.due===11,q2&&String(q2.due));
  const o=g.bills.outcomeLog.find(x=>x.num==="SB 320");
  T("ledger notes the effective date",o&&o.eff.includes("effective Jan 1"));
}
console.log("— REAL-ECON-1: April is when the truth arrives —");
{
  const mk=(turn)=>{const g=newGame(CFG({seed:6}));g.turn=turn;g.market.mode="exuberant";
    g.market.hist=Array.from({length:14},(_,i)=>100*Math.pow(1.02,i));g.market.idx=g.market.hist[13];g.market.revApplied=0;return g;};
  const A=mk(15),B=mk(18); // Mar 2028 (April window) vs Jun 2028
  const f=freeze();stepMarket(A);stepMarket(B);thaw(f);
  const qa=A.lag.find(l=>l.fx.k==="rev"),qb=B.lag.find(l=>l.fx.k==="rev");
  T("both windows queued a revenue translation",!!qa&&!!qb);
  if(qa&&qb){
    T("April translates ~1.35× bigger",Math.abs(qa.fx.d/qb.fx.d-1.35)<0.03,qa.fx.d+" vs "+qb.fx.d);
    T("April lands faster (1-3mo vs 3-9mo)",qa.due-15<=3&&qb.due-18>=3,(qa.due-15)+","+(qb.due-18));
  }
}
console.log("— REAL-HML-1: the unsheltered share —");
{
  const f=freeze();
  const A=newGame(CFG({seed:7}));A.market.mode="exuberant";
  const B=newGame(CFG({seed:7}));B.market.mode="exuberant";B.issues.homelessBoost=6;B.issues.lawHomeless=3;
  for(let i=0;i<24;i++){driftIssues(A,turnDate(i+1));driftIssues(B,turnDate(i+1));B.issues.homelessBoost=6;}
  thaw(f);
  T("neglect pushes the unsheltered share UP",A.issues.unshelt>66,A.issues.unshelt.toFixed(1));
  T("programs shelter people (share falls hard)",B.issues.unshelt<52,B.issues.unshelt.toFixed(1));
  T("issues panel shows the share",issuesPanel(B).includes("unsheltered share"));
  const gApp=newGame(CFG({seed:8}));gApp.issues.unshelt=80;const a0=gApp.approval;
  const gApp2=newGame(CFG({seed:8}));gApp2.issues.unshelt=50;
  const f2=freeze();driftApproval(gApp);driftApproval(gApp2);thaw(f2);
  T("voters punish visible tents specifically",gApp2.approval>gApp.approval,gApp2.approval+" vs "+gApp.approval);
}
console.log("— DEBUG: 60-seed fuzz, invariants & no crashes —");
{
  let crashes=0,nanHits=0,clampHits=0,detail="";
  const numOK=x=>typeof x==="number"&&isFinite(x);
  for(let s=0;s<60;s++){
    const g=newGame(CFG({seed:40000+s*7,party:["D","R","I"][s%3],bgId:BACKGROUNDS[s%BACKGROUNDS.length].id,
      promises:[PROMISES[s%12].id,PROMISES[(s+3)%12].id,PROMISES[(s+6)%12].id].filter((v,i,a)=>a.indexOf(v)===i).slice(0,3)}));
    while(g.player.promises.length<3)g.player.promises.push(PROMISES[(s+g.player.promises.length*2)%12].id);
    try{
      for(let t=0;t<48&&!g.over&&g.phase==="play";t++){
        const d=turnDate(g.turn);
        if(d.m===1&&!g.fiscal.budget.proposed&&g.slots>=3)proposeBudget(g,BUDGET_MIXES[s%5].mix,BUDGET_MIXES[s%5].nm);
        if(g.fiscal.budget.awaiting)(s%4===0)?vetoBudget(g):finishEnactment(g,false);
        // random-ish action each month
        const avail=ACTIONS.filter(a=>{try{return a.when(g)===true&&a.slots<=g.slots&&a.pc<=g.pc&&!a.builder;}catch(_){return false;}});
        if(avail.length){const a=avail[(s+t)%avail.length];
          try{const ch=a.choices?a.choices(g):null;
            if(!ch||ch.length)execHeadless(g,a,ch?ch[(s+t)%ch.length].id:null);}catch(e){throw new Error(a.id+": "+e.message);}}
        if(d.m===9)for(const b of g.bills.desk.slice()){enactBill(g,b,(s+t)%3?"sign":"veto");g.bills.desk=g.bills.desk.filter(x=>x!==b);}
        endMonth(g);
        // invariants
        const I=g.issues,F=g.fiscal;
        for(const[k,v]of Object.entries({ap:g.approval,pc:g.pc,def:F.deficit,bsa:F.bsa,ins:I.insur,grid:I.grid,pri:I.prison,hm:I.homeless,un:I.unshelt,pen:F.pension}))
          if(!numOK(v)){nanHits++;detail=detail||("seed "+s+" turn "+g.turn+" "+k+"="+v);}
        if(g.approval<0||g.approval>100||g.pc<0||g.pc>110||I.insur<0||I.insur>100||I.grid<5-1e-9||I.prison>150+1e-9||F.bsa<-1e-9){clampHits++;detail=detail||("clamp seed "+s+" t"+g.turn);}
      }
    }catch(e){crashes++;if(!detail)detail="seed "+s+": "+e.message;}
  }
  function execHeadless(g,a,choice){spendSlots(g,a.slots);spendPC(g,a.pc);a.run(g,choice);}
  T("no crashes across 60 randomized full terms",crashes===0,detail);
  T("no NaN/Infinity in core state, ever",nanHits===0,detail);
  T("all clamps hold",clampHits===0,detail);
}
console.log("— DEBUG: save/load determinism —");
{
  const policy=g=>{const d=turnDate(g.turn);
    if(d.m===1&&!g.fiscal.budget.proposed)proposeBudget(g,{cuts:5,taxes:0,reserves:2,gimmicks:2,rosy:3},"The Blend");
    if(g.fiscal.budget.awaiting)finishEnactment(g,false);
    if(d.m===9)for(const b of g.bills.desk.slice()){enactBill(g,b,"sign");g.bills.desk=g.bills.desk.filter(x=>x!==b);}
    endMonth(g);};
  const A=newGame(CFG({seed:777777}));
  for(let i=0;i<10;i++)policy(A);
  const blob=JSON.stringify({v:SAVE_VERSION,rngState:RNG.state,rngCalls:RNG.calls,game:A});
  // continue A 14 more turns
  for(let i=0;i<14;i++)policy(A);
  const sig=g=>JSON.stringify({t:g.turn,ap:g.approval,pc:g.pc,def:Math.round(g.fiscal.deficit*100)/100,
    hm:g.issues.homeless,ins:Math.round(g.issues.insur*100)/100,act:g.actors,feed:g.feed.length});
  const sigA=sig(A);
  // reload from blob and replay the same 14 turns
  const env=JSON.parse(blob);
  const B=env.game;RNG.restore(env.rngState,env.rngCalls);
  for(let i=0;i<14;i++)policy(B);
  T("a reloaded save replays into an IDENTICAL future",sig(B)===sigA,"divergence detected");
}
console.log("\nRESULT: "+PASS+" passed, "+FAIL+" failed");
if(FAIL)process.exit(1);
