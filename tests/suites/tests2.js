/* ================= LEGISLATION OVERHAUL TEST SUITE ================= */
let PASS=0,FAIL=0;
function T(name,cond,detail){if(cond){PASS++;console.log("  ok  "+name);}else{FAIL++;console.log("  FAIL "+name+(detail?" — "+detail:""));}}
const CFG=(over={})=>({seed:12345,name:"Test Gov",party:"D",bgId:"leg",
  attrs:{CHA:4,INS:9,FIS:6,COA:7,FED:3,OPR:4},promises:["no_taxes","build_500k","fix_insurance"],scenario:"aswritten",...over});
function proposeIfJan(g){const d=turnDate(g.turn);
  if(d.m===1&&!g.fiscal.budget.proposed)proposeBudget(g,{cuts:5,taxes:0,reserves:2,gimmicks:2,rosy:3},"The Blend");
  if(g.fiscal.budget.awaiting)finishEnactment(g,false);
}
function runMonths(g,n,auto){for(let i=0;i<n;i++){proposeIfJan(g);
  if(auto&&g.bills.desk.length&&turnDate(g.turn).m===9)for(const b of g.bills.desk.slice())enactBill(g,b,RNG.chance(0.7)?"sign":"veto"),g.bills.desk=g.bills.desk.filter(x=>x!==b);
  endMonth(g);if(g.over)break;}return g;}
const sponsorAction=ACTIONS.find(a=>a.id==="sponsor");
const pushAction=ACTIONS.find(a=>a.id==="pushbill");

console.log("— pool integrity —");
{
  const ids=new Set();let dup=null;
  for(const b of BILL_POOL){if(ids.has(b.id))dup=b.id;ids.add(b.id);}
  T("bill pool has "+BILL_POOL.length+" bills (was 16), all unique",BILL_POOL.length>=40&&!dup,dup);
  const actorIds=new Set(ACTORS.map(a=>a.id));
  const badActor=BILL_POOL.find(b=>[...(b.backers||[]),...(b.opps||[]),...Object.keys(b.sign.act||{}),...Object.keys(b.veto.act||{})].some(x=>!actorIds.has(x)));
  T("every backer/opp/fx actor exists",!badActor,badActor&&badActor.id);
  const okIssue=new Set(["housingBoost","homelessBoost","insurBoost","medicalBoost","prisonRelief","pensionCut","grid"]);
  const badIssue=BILL_POOL.find(b=>Object.keys(b.sign.issue||{}).some(k=>!okIssue.has(k)));
  T("every sign.issue key is handled by enactBill",!badIssue,badIssue&&badIssue.id);
  const yrs=BILL_POOL.map(b=>b.yr||2027);
  T("year-gated bills exist for 2028/2029/2030",yrs.includes(2028)&&yrs.includes(2029)&&yrs.includes(2030));
}

console.log("— sponsor menu: volume, hygiene, yearly refresh —");
{
  const g=newGame(CFG());
  const menu0=sponsorAction.choices(g);
  T("2027 sponsor menu is big (>15 options, was 10)",menu0.length>15,String(menu0.length));
  T("legOnly bills never sponsorable",!menu0.find(c=>c.id.startsWith("b_smallbiz")||c.id.startsWith("b_rebate")));
  T("2028+ bills not offered in 2027",!menu0.find(c=>c.id.startsWith("b_calcare")||c.id.startsWith("b_theft")||c.id.startsWith("b_backstop")));
  // sponsor one → leaves the menu (#5)
  sponsorAction.run(g,"b_upzone");
  const menu1=sponsorAction.choices(g);
  T("sponsored bill leaves the menu",!menu1.find(c=>c.id==="b_upzone"),"");
  T("bill entered pipeline at committee",g.bills.pipeline.some(b=>b.id==="b_upzone"&&b.stage==="committee"));
  // kill it → gone for THIS session, back next year
  const b=g.bills.pipeline.find(x=>x.id==="b_upzone");
  billDied(g,b,"died in policy committee");g.bills.pipeline=g.bills.pipeline.filter(x=>x.stage!=="dead");
  T("dead bill not offered again this session",!sponsorAction.choices(g).find(c=>c.id==="b_upzone"));
  g.turn=13; // Jan 2028
  const menu28=sponsorAction.choices(g);
  T("dead bill returns next session",!!menu28.find(c=>c.id==="b_upzone"));
  T("2028 bills unlock in 2028 with NEW label",!!menu28.find(c=>c.id==="b_waterrights"&&c.nm.includes("NEW THIS SESSION")));
  T("urgency variants offered",!!menu28.find(c=>c.id==="b_insur|U"));
}

console.log("— push legislation: testify / trade / whip —");
{
  const g=newGame(CFG({seed:99}));
  T("pushbill gated until a bill exists",pushAction.when(g)!==true);
  sponsorAction.run(g,"b_insur");
  T("pushbill available with a bill in the building",pushAction.when(g)===true);
  let ch=pushAction.choices(g);
  T("committee stage offers testify",ch.length===1&&ch[0].id==="b_insur|testify",JSON.stringify(ch.map(c=>c.id)));
  // force testify success by trying seeds
  let g2=null;
  for(let s=0;s<40;s++){const t=newGame(CFG({seed:600+s}));sponsorAction.run(t,"b_insur");
    pushAction.run(t,"b_insur|testify");
    if(t.bills.pipeline[0].stage==="suspense"){g2=t;break;}}
  T("successful testimony advances committee→suspense NOW",!!g2);
  if(g2){
    ch=pushAction.choices(g2);
    T("suspense stage offers trade",ch[0].id==="b_insur|trade");
    let g3=null;
    for(let s=0;s<40;s++){const t=newGame(CFG({seed:700+s}));sponsorAction.run(t,"b_insur");
      t.bills.pipeline[0].stage="suspense";pushAction.run(t,"b_insur|trade");
      if(t.bills.pipeline[0].rescued){g3=t;break;}}
    T("successful trade secures the release",!!g3);
    if(g3){T("rescued bill survives the suspense file 100%",(suspenseFile(g3,"May"),g3.bills.pipeline[0].stage==="floor"));}
  }
  // whip stacking & cap & effect on the count
  let g4=null;
  for(let s=0;s<60;s++){const t=newGame(CFG({seed:800+s}));sponsorAction.run(t,"b_insur");
    t.bills.pipeline[0].stage="floor";
    pushAction.run(t,"b_insur|whip");
    if(t.bills.pipeline[0].whip===4){g4=t;break;}}
  T("successful whip adds +4",!!g4);
  if(g4){
    const before=voteModel(g4,false,{tax:false}).asm;
    const after=voteModel(g4,false,{bonusSeats:g4.bills.pipeline[0].whip,tax:false}).asm;
    T("whipped votes enter the actual count (+4 Asm)",after-before===4,after+" vs "+before);
    g4.bills.pipeline[0].whip=8;
    const chW=pushAction.choices(g4);
    T("whip capped at +8 in the UI",chW[0].cost.includes("capped"));
  }
}

console.log("— session end: volume, year gating, no dupes —");
{
  // 2027 session: desk should carry 5-8 leg bills + player floor bills
  let deskSizes=[],dupFound=false,badYear=false;
  for(let s=0;s<40;s++){
    const g=newGame(CFG({seed:3000+s}));
    g.turn=8;sessionEnd(g,2027); // direct August call
    deskSizes.push(g.bills.desk.length);
    const ids=g.bills.desk.map(b=>b.id);
    if(new Set(ids).size!==ids.length)dupFound=true;
    if(g.bills.desk.some(b=>(b.yr||2027)>2027))badYear=true;
  }
  const mn=Math.min(...deskSizes),mx=Math.max(...deskSizes);
  console.log("    desk sizes over 40 seeds: min "+mn+" max "+mx);
  T("September desk now carries 5–8 bills",mn>=5&&mx<=8,mn+"–"+mx);
  T("no duplicate bills on the desk",!dupFound);
  T("2028+ bills never on a 2027 desk",!badYear);
  // sponsored bill can't be double-sent by the legislature
  const g=newGame(CFG({seed:4001}));
  sponsorAction.run(g,"b_audit");g.bills.pipeline[0].stage="floor";g.bills.pipeline[0].whip=8;
  g.turn=8;sessionEnd(g,2027);
  const auditCopies=[...g.bills.desk.filter(b=>b.id==="b_audit")].length;
  T("no duplicate when player bill reaches the desk",auditCopies<=1,String(auditCopies));
}

console.log("— full-term with legislating: integrity + outcomes —");
{
  const g=newGame(CFG({seed:55555}));
  ["DOF","CalHHS","CNRA","CalSTA","CDCR","LWDA","GovOps","BCSH","CalEPA"].forEach(c=>transitionPick(g,c,"holdover"));
  let err=null;
  try{
    for(let i=0;i<60&&!g.over&&g.phase==="play";i++){
      const d=turnDate(g.turn);
      proposeIfJan(g);
      if(d.m===2&&sponsorAction.when(g)===true){const ch=sponsorAction.choices(g);if(ch.length)sponsorAction.run(g,ch[0].id);}
      if(d.m===4&&pushAction.when(g)===true){const ch=pushAction.choices(g);if(ch.length)pushAction.run(g,ch[0].id);}
      if(d.m===9&&g.bills.desk.length)for(const b of g.bills.desk.slice()){enactBill(g,b,"sign");g.bills.desk=g.bills.desk.filter(x=>x!==b);}
      endMonth(g);
    }
  }catch(e){err=e;}
  T("60 months of active legislating, no exceptions",!err,err&&err.stack&&err.stack.split("\n").slice(0,2).join(" | "));
  T("outcome log populated",(g.bills.outcomeLog||[]).length>0,String((g.bills.outcomeLog||[]).length));
  T("bills were signed across the term",g.bills.signed.length>=8,String(g.bills.signed.length));
  T("tracker panel renders",typeof legTrackerPanel(g)==="string");
  const g5=newGame(CFG({seed:9}));sponsorAction.run(g5,"b_insur|U");
  T("urgency sponsorship still works",g5.bills.pipeline[0].urgent===true);
  T("tracker renders urgency path",legTrackerPanel(g5).includes("⅔ monthly"));
}
console.log("\nRESULT: "+PASS+" passed, "+FAIL+" failed");
if(FAIL)process.exit(1);
