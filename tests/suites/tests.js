/* ================= APPOINTMENT-WEIGHT TEST SUITE (appended after game.js) ================= */
let PASS=0,FAIL=0;
function T(name,cond,detail){if(cond){PASS++;console.log("  ok  "+name);}else{FAIL++;console.log("  FAIL "+name+(detail?" — "+detail:""));}}
const CFG=(over={})=>({seed:12345,name:"Test Gov",party:"D",bgId:"leg",
  attrs:{CHA:4,INS:9,FIS:6,COA:7,FED:3,OPR:4},promises:["no_taxes","build_500k","fix_insurance"],scenario:"aswritten",...over});

console.log("— candidate data integrity —");
{
  const codes=AGENCIES.map(a=>a[0]);
  T("all 9 agencies have candidate slates",codes.every(c=>CAB_CANDIDATES[c]&&CAB_CANDIDATES[c].length===3));
  const seen=new Set();let dup=null;
  for(const c of codes)for(const cand of CAB_CANDIDATES[c]){if(seen.has(cand.nm))dup=cand.nm;seen.add(cand.nm);}
  T("27 distinct names, nobody holds two jobs",!dup&&seen.size===27,dup);
  T("every candidate has tag+bio+perk",codes.every(c=>CAB_CANDIDATES[c].every(x=>x.tag&&x.bio&&x.perk&&Object.keys(x.perk).length)));
  T("every candidate perk renders a description",codes.every(c=>CAB_CANDIDATES[c].every(x=>perkDesc(x.perk).length>3)));
  T("types are holdover/ally/reformer in order",codes.every(c=>CAB_CANDIDATES[c].map(x=>x.type).join()==="holdover,ally,reformer"));
}

console.log("— seating, signals, and perk gating —");
{
  const g=newGame(CFG());
  T("transition opens for non-continuity",g.transitionOpen===true&&g.cabinet.length===0);
  const seiu0=g.actors.seiu,chamber0=g.actors.chamber,ccpoa0=g.actors.ccpoa;
  transitionPick(g,"DOF","holdover");
  T("DOF holdover seats instantly",g.cabinet.some(c=>c.agency==="DOF"&&!c.pending&&c.nm==="M. Delgado"));
  T("DOF budget perk live once seated",cabPerk(g,"budget")===0.7,String(cabPerk(g,"budget")));
  transitionPick(g,"LWDA","ally");
  T("ally pick fires its political signal (SEIU +6, doubled? no cons match)",g.actors.seiu>seiu0,g.actors.seiu+" vs "+seiu0);
  T("ally pick angers the Chamber",g.actors.chamber<chamber0);
  T("LWDA strike perk live",cabPerk(g,"strike")===0.03);
  transitionPick(g,"CDCR","reformer");
  const cd=g.cabinet.find(c=>c.agency==="CDCR");
  T("reformer goes to Rules pending",cd&&cd.pending===true&&cd.nm==="Y. Kimura");
  T("pending nominee contributes NO perk",cabPerk(g,"prison")===0);
  T("pending nominee's political signal NOT yet fired",g.actors.ccpoa===ccpoa0);
  T("budget preview includes DOF credibility",budgetPreview(g,{cuts:5,taxes:0,reserves:2,gimmicks:2,rosy:2}).cred===5+0+1.6+0.7+0.7,String(budgetPreview(g,{cuts:5,taxes:0,reserves:2,gimmicks:2,rosy:2}).cred));
}

console.log("— Senate Rules resolution honors risk & fires fx —");
{
  // run many seeds; count confirmations of a HIGH-risk vs LOW-risk resume with identical stats
  let hi=0,lo=0,N=300;
  for(let s=0;s<N;s++){
    const g1=newGame(CFG({seed:9000+s}));
    transitionPick(g1,"CDCR","reformer");            // risk +0.05
    for(let i=0;i<3;i++){proposeIfJan(g1);endMonth(g1);}
    if(g1.cabinet.some(c=>c.nm==="Y. Kimura"&&!c.pending))hi++;
    const g2=newGame(CFG({seed:9000+s}));
    transitionPick(g2,"DOF","reformer");             // risk −0.03 (LAO alum)
    for(let i=0;i<3;i++){proposeIfJan(g2);endMonth(g2);}
    if(g2.cabinet.some(c=>c.nm==="V. Okoye"&&!c.pending))lo++;
  }
  console.log("    confirm rate: high-risk "+(hi/N*100).toFixed(1)+"% vs low-risk "+(lo/N*100).toFixed(1)+"%");
  T("low-risk resume confirms more often than high-risk",lo>hi,lo+" vs "+hi);
  // fx-on-confirm: find a seed where Kimura confirms, check CCPOA moved
  let checked=false;
  for(let s=0;s<80&&!checked;s++){
    const g=newGame(CFG({seed:5000+s}));
    const before=g.actors.ccpoa;
    transitionPick(g,"CDCR","reformer");
    for(let i=0;i<3;i++){proposeIfJan(g);endMonth(g);}
    const m=g.cabinet.find(c=>c.nm==="Y. Kimura");
    if(m&&!m.pending){T("confirmed reformer fires constituency fx (CCPOA drops)",g.actors.ccpoa<before,g.actors.ccpoa+" vs "+before);
      T("confirmed reformer's perk goes live",cabPerk(g,"prison")===0.07);checked=true;}
  }
  if(!checked)T("found a confirming seed to verify fx",false);
}

console.log("— weights move the world (noise-frozen drift isolation) —");
function proposeIfJan(g){const d=turnDate(g.turn);
  if(d.m===1&&!g.fiscal.budget.proposed)proposeBudget(g,{cuts:5,taxes:0,reserves:2,gimmicks:2,rosy:3},"The Blend");
  if(g.fiscal.budget.awaiting)finishEnactment(g,false);
  if(g.pendingCard)g.pendingCard=null;
}
function runMonths(g,n){for(let i=0;i<n;i++){proposeIfJan(g);endMonth(g);if(g.over)break;}return g;}
{
  const frozen={norm:RNG.norm,chance:RNG.chance,r:RNG.r,int:RNG.int,pick:RNG.pick};
  RNG.norm=()=>0;RNG.chance=()=>false;RNG.r=()=>0.5;RNG.int=(a,b)=>a;RNG.pick=arr=>arr[0];
  const mk=()=>{const g=newGame(CFG({seed:777}));g.market.mode="exuberant";return g;};
  const A=mk(),B=mk();
  for(const [code,type] of [["CDCR","holdover"],["CalHHS","holdover"],["BCSH","reformer"],["CalEPA","reformer"]]){
    transitionPick(B,code,type);
    const m=B.cabinet.find(c=>c.agency===code);m.pending=false; // seat directly for isolation
  }
  for(let i=0;i<24;i++){driftIssues(A,turnDate(i+1));driftIssues(B,turnDate(i+1));}
  RNG.norm=frozen.norm;RNG.chance=frozen.chance;RNG.r=frozen.r;RNG.int=frozen.int;RNG.pick=frozen.pick;
  console.log("    A(unstaffed): prison "+A.issues.prison.toFixed(2)+"% grid "+A.issues.grid.toFixed(2)+" mediCal "+A.issues.mediCal.toFixed(2)+"M housing "+A.issues.housingCum.toFixed(0)+"k");
  console.log("    B(staffed):   prison "+B.issues.prison.toFixed(2)+"% grid "+B.issues.grid.toFixed(2)+" mediCal "+B.issues.mediCal.toFixed(2)+"M housing "+B.issues.housingCum.toFixed(0)+"k");
  T("CDCR pick slows prison crowding (24mo: −0.72pt)",Math.abs((A.issues.prison-B.issues.prison)-0.03*24)<0.01,String(A.issues.prison-B.issues.prison));
  T("CalHHS pick keeps people on Medi-Cal (+0.24M)",Math.abs((B.issues.mediCal-A.issues.mediCal)-0.01*24)<0.01,String(B.issues.mediCal-A.issues.mediCal));
  T("BCSH pick builds more housing",B.issues.housingCum>A.issues.housingCum+8,String(B.issues.housingCum-A.issues.housingCum));
  T("CalEPA pick preserves grid margin (+0.04x24)",Math.abs((B.issues.grid-A.issues.grid)-0.04*24)<0.01,String(B.issues.grid-A.issues.grid));
  T("grid erodes without a CalEPA hand on permits",A.issues.grid<18);
}
console.log("— HSR courtship: CalSTA rolodex —");
{
  let win0=0,win1=0,N=400;
  for(let s=0;s<N;s++){
    const g0=newGame(CFG({seed:20000+s}));g0.flags.hsrTried=1;
    const r0=roll(g0,"COA",0.28-0.06,(g0.actors.trades)/300+(g0.player.attrs.FED-5)*0.015+cabPerk(g0,"hsr"));
    if(r0.ok)win0++;
    const g1=newGame(CFG({seed:20000+s}));g1.flags.hsrTried=1;
    transitionPick(g1,"CalSTA","holdover");g1.cabinet.find(c=>c.agency==="CalSTA").perk={hsr:0.14}; // simulate the confirmed reformer's weight
    const r1=roll(g1,"COA",0.28-0.06,(g1.actors.trades)/300+(g1.player.attrs.FED-5)*0.015+cabPerk(g1,"hsr"));
    if(r1.ok)win1++;
  }
  console.log("    courtship success: bare "+(win0/N*100).toFixed(1)+"% vs with rolodex "+(win1/N*100).toFixed(1)+"%");
  T("CalSTA weight raises courtship odds",win1>win0,win1+" vs "+win0);
}

console.log("— CONTINUITY inherits weighted holdovers —");
{
  const g=newGame(CFG({bgId:"ltgov",seed:4242}));
  T("fully staffed at start",g.cabinet.length===9&&!g.transitionOpen);
  T("inherited cabinet carries tags",g.cabinet.every(c=>c.tag&&c.bio));
  T("inherited weights live (budget 0.7, fire 0.4...)",cabPerk(g,"budget")===0.7&&cabPerk(g,"fire")===0.4&&cabPerk(g,"housing")===2);
}

console.log("— full-term integrity (48 months, no crashes) —");
{
  const g=newGame(CFG({seed:31337}));
  transitionPick(g,"DOF","holdover");transitionPick(g,"CalHHS","ally");transitionPick(g,"CNRA","holdover");
  transitionPick(g,"CalSTA","ally");transitionPick(g,"CDCR","holdover");transitionPick(g,"LWDA","ally");
  transitionPick(g,"GovOps","reformer");transitionPick(g,"BCSH","holdover");transitionPick(g,"CalEPA","ally");
  let err=null;
  try{runMonths(g,60);}catch(e){err=e;}
  T("no exceptions across a full term",!err,err&&err.stack&&err.stack.split("\n")[0]);
  T("game reaches the report",g.phase==="report",g.phase+" turn "+g.turn);
  T("legacy built",!!g.legacy&&Array.isArray(g.legacy.achievements));
  // caretaker path: unstaffed game still auto-fills at end of March
  const g2=newGame(CFG({seed:31338}));
  runMonths(g2,5);
  T("caretakers auto-named after March",g2.cabinet.filter(c=>c.type==="caretaker").length===9);
  T("caretakers contribute zero perk",cabPerk(g2,"budget")===0&&cabPerk(g2,"vetting")===0);
  // UI renderers don't throw with the new fields
  let uiErr=null;
  try{const gg=newGame(CFG({seed:1}));transitionPick(gg,"CDCR","reformer");transitionPick(gg,"DOF","holdover");
    transitionPanel(gg);politicalPanel(gg);buildMemo(gg);
    const app=ACTIONS.find(a=>a.id==="appoint");
    const gg2=newGame(CFG({seed:2}));runMonths(gg2,5);app.when(gg2)===true&&app.choices(gg2);
    const hsr=ACTIONS.find(a=>a.id==="hsrpush");hsr.choices(gg);
  }catch(e){uiErr=e;}
  T("UI renderers handle new candidate fields",!uiErr,uiErr&&uiErr.stack&&uiErr.stack.split("\n")[0]);
}
console.log("\nRESULT: "+PASS+" passed, "+FAIL+" failed");
if(FAIL)process.exit(1);
