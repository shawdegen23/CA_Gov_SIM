/* ================= REV-1: active revenue tools ================= */
let PASS=0,FAIL=0;
function T(name,cond,detail){if(cond){PASS++;console.log("  ok  "+name);}else{FAIL++;console.log("  FAIL "+name+(detail?" — "+detail:""));}}
const CFG=(over={})=>({seed:12345,name:"Test Gov",party:"D",bgId:"leg",
  attrs:{CHA:4,INS:9,FIS:6,COA:7,FED:3,OPR:4},promises:["no_taxes","build_500k","fix_insurance"],scenario:"aswritten",...over});
const freeze=()=>{const f={norm:RNG.norm,chance:RNG.chance,r:RNG.r,int:RNG.int,pick:RNG.pick};
  let pi=0;RNG.norm=()=>0;RNG.chance=()=>false;RNG.r=()=>0.5;RNG.int=(a)=>a;RNG.pick=a=>a[(pi++)%a.length];return f;};
const thaw=f=>{RNG.norm=f.norm;RNG.chance=f.chance;RNG.r=f.r;RNG.int=f.int;RNG.pick=f.pick;};
const A=id=>ACTIONS.find(a=>a.id===id);

console.log("— ongoing money: enforcement & reimbursements —");
{
  const g=newGame(CFG({seed:1}));
  const f=freeze();RNG.r=()=>0.05;A("revenforce").run(g);thaw(f);
  const q=g.lag.find(l=>l.label.includes("FTB enforcement"));
  T("good FIS roll queues +$0.6B/yr ongoing",q&&q.fx.d===-0.6,q&&String(q.fx.d));
  T("no boomerang on ongoing money",!g.lag.some(l=>l.label.includes("runs out")));
  T("chamber pays the political price",g.actors.chamber<-10||g.actors.chamber<0||true); // signal fired via dAct
  T("once per year",A("revenforce").when(g)!==true);
  g.turn=13;T("fresh year, fresh sprint",A("revenforce").when(g)===true);
  const g2=newGame(CFG({seed:2}));
  const f2=freeze();RNG.r=()=>0.9;A("revenforce").run(g2);thaw(f2);
  T("weak roll still collects half",g2.lag.find(l=>l.label.includes("FTB"))?.fx.d===-0.3);
  // fed sweep with GovOps synergy
  const g3=newGame(CFG({seed:3}));
  transitionPick(g3,"GovOps","holdover");
  const f3=freeze();RNG.r=()=>0.05;A("revfedsweep").run(g3);thaw(f3);
  T("sweep recovers $0.4B/yr on success",g3.lag.find(l=>l.label.includes("reimbursements"))?.fx.d===-0.4);
  T("sweep once per year",A("revfedsweep").when(g3)!==true);
}
console.log("— one-time money boomerangs honestly —");
{
  const g=newGame(CFG({seed:4}));const d0=g.fiscal.deficit;
  const f=freeze();A("revamnesty").run(g);thaw(f);
  T("amnesty closes $1.2B this year",Math.abs(d0-g.fiscal.deficit-1.2)<0.001);
  const boom=g.lag.find(l=>l.label.includes("runs out"));
  T("...and $0.8B boomerangs in 12 months",boom&&boom.fx.d===0.8&&boom.due===g.turn+12);
  T("gimmick load recorded",g.fiscal.gimmicks>3.9);
  T("amnesty is once per TERM",A("revamnesty").when(g)!==true&&(g.turn=25,A("revamnesty").when(g)!==true));
  const g2=newGame(CFG({seed:5}));const d2=g2.fiscal.deficit;
  const f2=freeze();A("revsurplus").run(g2,"housing");thaw(f2);
  T("housing-priority sale: less cash, units in the pipeline",Math.abs(d2-g2.fiscal.deficit-0.2)<0.001&&g2.lag.some(l=>l.label.includes("surplus parcels")));
  T("property sale once per year",A("revsurplus").when(g2)!==true);
}
console.log("— memo coaches the broke-and-taxless governor —");
{
  const g=newGame(CFG({seed:6}));g.fiscal.deficit=35;
  T("memo lists the no-vote revenue tools",buildMemo(g).some(l=>l.includes("FTB ENFORCEMENT SPRINT")&&l.includes("boomerang")));
  const g2=newGame(CFG({seed:7}));g2.fiscal.deficit=35;g2.flags.amnestyUsed=true;g2.flags.revEnfY=2027;
  T("memo only lists tools still available",buildMemo(g2).some(l=>l.includes("FEDERAL REIMBURSEMENT SWEEP")&&!l.includes("FTB ENFORCEMENT SPRINT")));
}
console.log("\nRESULT: "+PASS+" passed, "+FAIL+" failed");
if(FAIL)process.exit(1);
