/* ================= YEAR-2+ BUDGET WINDOW REGRESSION (BUG-1) ================= */
let PASS=0,FAIL=0;
function T(name,cond,detail){if(cond){PASS++;console.log("  ok  "+name);}else{FAIL++;console.log("  FAIL "+name+(detail?" — "+detail:""));}}
const CFG=(over={})=>({seed:12345,name:"Test Gov",party:"D",bgId:"leg",
  attrs:{CHA:4,INS:9,FIS:6,COA:7,FED:3,OPR:4},promises:["no_taxes","build_500k","fix_insurance"],scenario:"aswritten",...over});
const budgetAction=ACTIONS.find(a=>a.id==="budget");
const MIX={cuts:5,taxes:0,reserves:2,gimmicks:2,rosy:3};

console.log("— the January window opens every year —");
{
  const g=newGame(CFG());
  const windows={};
  for(let i=0;i<48&&!g.over;i++){
    const d=turnDate(g.turn);
    if(d.m===1){
      windows[d.y]=budgetAction.when(g)===true;         // gate DURING January's action phase
      if(windows[d.y])proposeBudget(g,MIX,"The Blend");
    }
    if(g.fiscal.budget.awaiting)finishEnactment(g,false);
    endMonth(g);
  }
  T("window open Jan 2027",windows[2027]===true);
  T("window open Jan 2028 (the reported bug)",windows[2028]===true);
  T("window open Jan 2029",windows[2029]===true);
  T("window open Jan 2030",windows[2030]===true);
  T("LAO never blasted a proposal-less February",!g.flags.laoBlast);
  T("game completes to report",g.phase==="report");
  const grades=g.feed.filter(f=>f.src==="LAO"&&f.hl.startsWith("LAO review:")).length;
  T("LAO graded a real proposal all four Februaries",grades===4,String(grades));
}
console.log("— the skip path punishes legitimately now —");
{
  const g=newGame(CFG({seed:777}));
  // year 1: propose properly
  proposeBudget(g,MIX,"The Blend");
  let janGateOpen=null,abdCondition=null;
  for(let i=0;i<15&&!g.over;i++){
    const d=turnDate(g.turn);
    if(d.y===2028&&d.m===1){janGateOpen=budgetAction.when(g)===true;abdCondition=!g.fiscal.budget.proposed;}
    if(g.fiscal.budget.awaiting)finishEnactment(g,false);
    endMonth(g); // never propose in 2028
  }
  T("Jan 2028 gate was open even though we skipped",janGateOpen===true);
  T("abdication warning condition true during Jan 2028",abdCondition===true);
  T("LAO blast fires in Feb 2028 for a REAL miss",g.flags.laoBlast===true);
}
console.log("— December edge cases —");
{
  const g=newGame(CFG({seed:31337}));
  for(let i=0;i<48&&!g.over;i++){const d=turnDate(g.turn);
    if(d.m===1&&budgetAction.when(g)===true)proposeBudget(g,MIX,"The Blend");
    if(g.fiscal.budget.awaiting)finishEnactment(g,false);
    endMonth(g);}
  T("no phantom 'due Jan 10' reminder after the final December",!(g.inbox||[]).some(i=>i.txt.includes("Jan 10")&&i.t>=48));
  const g2=newGame(CFG({seed:4}));
  for(let i=0;i<12;i++){const d=turnDate(g2.turn);
    if(d.m===1)proposeBudget(g2,MIX,"The Blend");
    if(g2.fiscal.budget.awaiting)finishEnactment(g2,false);
    endMonth(g2);}
  T("Dec endMonth pre-arms the Jan reminder",(g2.inbox||[]).some(i=>i.txt.includes("Jan 10")));
  T("budget object fresh entering Jan 2028",g2.fiscal.budget.proposed===false&&g2.fiscal.budget.enacted===false);
  T("May Revision gate NOT falsely open in Jan (needs a proposal first)",ACTIONS.find(a=>a.id==="mayrev").when(g2)!==true);
}
console.log("\nRESULT: "+PASS+" passed, "+FAIL+" failed");
if(FAIL)process.exit(1);
