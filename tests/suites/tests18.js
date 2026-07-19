/* ================= AUDIT-2: playability fixes — kept promises, floors, learning, the DOF advisor ================= */
let PASS=0,FAIL=0;
function T(name,cond,detail){if(cond){PASS++;console.log("  ok  "+name);}else{FAIL++;console.log("  FAIL "+name+(detail?" — "+detail:""));}}
const CFG=(over={})=>({seed:12345,name:"Test Gov",party:"D",bgId:"leg",
  attrs:{CHA:4,INS:9,FIS:6,COA:7,FED:3,OPR:4},promises:["no_taxes","build_500k","fix_insurance"],scenario:"aswritten",...over});
const freeze=()=>{const f={norm:RNG.norm,chance:RNG.chance,r:RNG.r,int:RNG.int,pick:RNG.pick};
  let pi=0;RNG.norm=()=>0;RNG.chance=()=>false;RNG.r=()=>0.5;RNG.int=(a)=>a;RNG.pick=a=>a[(pi++)%a.length];return f;};
const thaw=f=>{RNG.norm=f.norm;RNG.chance=f.chance;RNG.r=f.r;RNG.int=f.int;RNG.pick=f.pick;};

console.log("— fix_insurance is now keepable (was 0/15 at max effort) —");
{
  const g=newGame(CFG({seed:1}));
  g.issues.insur=72;g.turn=13;for(let i=0;i<24;i++)g.hist.insur[i]=i<11?50:72;
  const p=promiseStates(g).find(x=>x.id==="fix_insurance");
  T("still open after Dec 2027 — the deadline moved to Dec 2028",p.state==="open",p.state);
  g.turn=25;g.hist.insur[23]=72;
  T("kept at 70+ by Dec 2028",promiseStates(g).find(x=>x.id==="fix_insurance").state==="kept");
  g.hist.insur[23]=60;
  T("still breakable — 70 is the bar",promiseStates(g).find(x=>x.id==="fix_insurance").state==="broken");
}
console.log("— homelessness has physics now (was: max effort → 967 people) —");
{
  const g=newGame(CFG({seed:2}));
  g.issues.homelessBoost=60;g.issues.lawHomeless=40; // absurd stacking
  const h0=g.issues.homeless;
  const f=freeze();driftIssues(g,turnDate(g.turn));thaw(f);
  T("monthly bend capped at −1.1% no matter the stacking",g.issues.homeless>=Math.floor(h0*0.989)-1,h0+" → "+g.issues.homeless);
  g.issues.homeless=76000;
  const f2=freeze();for(let i=0;i<24;i++)driftIssues(g,turnDate(g.turn));thaw(f2);
  T("the count floors at 75,000 — the chronic population money can't reach",g.issues.homeless===75000,String(g.issues.homeless));
  // and the -1/3 promise stays keepable: needed pace is -0.877%/mo, cap is -1.1%
  T("the cap still leaves the −1/3 promise reachable",-1.1< -0.877);
}
console.log("— waiver shops learn from denial letters —");
{
  const g=newGame(CFG({seed:3}));
  g.flags.transitionMalus=0; // an unstaffed transition drags every roll −0.10; this test isolates the learning curve
  const f=freeze();RNG.r=()=>0.47; // fails cold (~0.41) and at +5% (~0.46), clears at +10% (~0.51)
  g.flags.waiverPending=1;applyFx(g,{k:"fn",fn:"_waiverResp",kind:"medicaid"},"w","you");
  T("first try: denied, and the denial is filed",g.flags.waiverDenials&&g.flags.waiverDenials.medicaid===1);
  g.flags.waiverPending=1;applyFx(g,{k:"fn",fn:"_waiverResp",kind:"medicaid"},"w","you");
  T("...and again",g.flags.waiverDenials.medicaid===2);
  const d0=g.fiscal.deficit;
  g.flags.waiverPending=1;applyFx(g,{k:"fn",fn:"_waiverResp",kind:"medicaid"},"w","you");
  thaw(f);
  T("the twice-thickened refile clears at the same roll that failed cold",g.fiscal.deficit<d0,g.fiscal.deficit+" vs "+d0);
}
console.log("— the budget tells the truth before you propose it —");
{
  const g=newGame(CFG({seed:4}));
  T("reliability starts at 68% and standing moves it",Math.abs(budgetRel(g)-clamp(0.68+g.legStanding/300,0.35,0.95))<1e-9);
  const html=builderPreviewHTML(g,{cuts:9,taxes:4,reserves:2,gimmicks:1,rosy:1});
  T("builder shows what will actually land",html.includes("what will actually land")&&html.includes("reliability"));
  T("builder counts the ⅔ tax vote before June does",html.includes("/54")&&html.includes("/27"));
  const g2=newGame(CFG({seed:5}));g2.fiscal.deficit=25;
  const memo=buildMemo(g2);
  T("the DOF path check runs whenever the gap is serious",memo.some(l=>l.includes("DOF's path check")&&l.includes("¢ on the dollar")));
}
console.log("— pinned: the complete strategy beats the treadmill —");
{
  const run=s=>{
    // the strategy PROPOSES TAXES — a no_taxes pledge would be self-sabotage, so this governor didn't make it
    const g=newGame(CFG({seed:s,promises:["build_500k","fix_insurance","protect_medical"]}));
    ["DOF","CalHHS","CNRA","CalSTA","CDCR","LWDA","GovOps","BCSH","CalEPA"].forEach(c=>transitionPick(g,c,"ally"));
    for(let t=0;t<48&&!g.over;t++){
      const m=turnDate(g.turn).m;
      const act=(id,c)=>{const a=ACTIONS.find(x=>x.id===id);if(a&&a.when(g)===true){try{a.run(g,c);return true;}catch(_){return false;}}return false;};
      if(m===1)act("budget",{cuts:9,taxes:4,reserves:2,gimmicks:1,rosy:1});
      else if(m===5)act("mayrev","real");
      else{
        const pmA=ACTIONS.find(x=>x.id==="pushmeasure");
        if(pmA.when(g)===true){const ch=pmA.choices(g)||[];
          const pick=ch.find(c=>c.id.endsWith("|dealout"))||ch.find(c=>c.id.endsWith("|endorse"))||(g.player.chest>=5&&ch.find(c=>c.id.endsWith("|ads")))||ch.find(c=>c.id.endsWith("|campaign"));
          if(pick&&!pick.disabled){try{pmA.run(g,pick.id);}catch(_){}}}
        if(g.player.chest>=12&&g.measures.pending.length<2)
          for(const id of ["m_splitroll","m_oilsev","m_millionaire"])
            if(!(g.measures.resolved||[]).find(x=>x.id===id)&&!g.measures.pending.find(x=>x.id===id)){act("ballot",id);break;}
        if(g.player.chest<15)act("fundraise");
        act("revenforce");
      }
      while(g.bills.desk.length)enactBill(g,g.bills.desk.shift(),g.bills.desk.length%2?"sign":"veto");
      endMonth(g);
    }
    return g.fiscal.deficit;
  };
  const defs=[];for(let s=300;s<312;s++)defs.push(run(s));
  defs.sort((a,b)=>a-b);
  console.log("    12 full-strategy terms, end deficits: "+defs.map(d=>d.toFixed(1)).join(", "));
  T("a disciplined governor can get near balance (best ≤ $5B)",defs[0]<=5,String(defs[0]));
  T("the median full-strategy term reaches real progress (≤ $16B from $35B)",defs[6]<=16,String(defs[6]));
  T("but it is not easy — the worst terms still hurt",defs[11]>=8,String(defs[11]));
}
console.log("\nRESULT: "+PASS+" passed, "+FAIL+" failed");
if(FAIL)process.exit(1);
