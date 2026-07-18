/* ================= AUDIT-1: month-end timing · old-save migration · bounds ================= */
let PASS=0,FAIL=0;
function T(name,cond,detail){if(cond){PASS++;console.log("  ok  "+name);}else{FAIL++;console.log("  FAIL "+name+(detail?" — "+detail:""));}}
const CFG=(over={})=>({seed:12345,name:"Test Gov",party:"D",bgId:"leg",
  attrs:{CHA:4,INS:9,FIS:6,COA:7,FED:3,OPR:4},promises:["no_taxes","build_500k","fix_insurance"],scenario:"aswritten",...over});
const freeze=()=>{const f={norm:RNG.norm,chance:RNG.chance,r:RNG.r,int:RNG.int,pick:RNG.pick};
  let pi=0;RNG.norm=()=>0;RNG.chance=()=>false;RNG.r=()=>0.5;RNG.int=(a)=>a;RNG.pick=a=>a[(pi++)%a.length];return f;};
const thaw=f=>{RNG.norm=f.norm;RNG.chance=f.chance;RNG.r=f.r;RNG.int=f.int;RNG.pick=f.pick;};

console.log("— the desk reminder opens September instead of eulogizing it —");
{
  const g=newGame(CFG({seed:1}));
  g.turn=8; // August of year 1
  const f=freeze();endMonth(g);thaw(f); // sessionEnd fills the desk as August closes
  const note=g.inbox.find(x=>x.txt.includes("on your desk"));
  T("session end puts bills on the desk",g.bills.desk.length>0,String(g.bills.desk.length));
  T("...and the Sept 30 reminder lands with them",!!note&&note.due==="Sep 30");
  T("...stamped at August's close, a month before the deadline",note&&note.t===8,note&&String(note.t));
  // and the deadline itself still has teeth
  const f2=freeze();endMonth(g);thaw(f2); // September ends
  T("unsigned bills become law without a signature at Sept end",g.bills.desk.length===0
    &&g.feed.some(x=>x.hl.includes("without the governor's signature")));
}
console.log("— TUNING keys all pull their weight —");
{
  T("SNAP shift uses TUNING.HR1_SNAP",(()=>{
    const g=newGame(CFG({seed:2}));g.turn=10;const d0=g.fiscal.deficit;
    const f=freeze();endMonth(g);thaw(f);
    return Math.abs(g.fiscal.deficit-(d0+TUNING.DEFICIT_DRIFT_YR*0+TUNING.HR1_SNAP))<3;})()); // Oct 2027, drift is Jan-only
}
console.log("— a pre-macro v2 save loads and plays on —");
{
  // simulate a save written before market.macro existed
  const g=newGame(CFG({seed:3}));
  delete g.market.macro;
  const env=JSON.parse(JSON.stringify({v:SAVE_VERSION,rngState:RNG.state,rngCalls:RNG.calls,game:g}));
  const g2=env.game;RNG.restore(env.rngState,env.rngCalls);
  T("thawed save has no macro block",!g2.market.macro);
  const f=freeze();endMonth(g2);thaw(f);
  T("first month-end rebuilds it in place",g2.market.macro&&g2.market.macro.stance==="neutral",JSON.stringify(g2.market.macro));
  const f2=freeze();for(let i=0;i<12;i++)endMonth(g2);thaw(f2);
  T("...and the game plays a year without complaint",g2.turn===14);
}
console.log("— nothing grows without bound over a max-length game —");
{
  const g=newGame(CFG({seed:4}));
  for(let t=0;t<48&&!g.over;t++)endMonth(g);
  T("feed capped at 200",g.feed.length<=200,String(g.feed.length));
  T("market history is one entry per month",g.market.hist.length<=49,String(g.market.hist.length));
  T("market eras stay small",g.market.eras.length<=6,String(g.market.eras.length));
  T("lag queue drains",g.lag.length<=15,String(g.lag.length));
  T("inbox stays readable",g.inbox.length<=60,String(g.inbox.length));
  T("resolved measures bounded by the slate",(g.measures.resolved||[]).length<=12);
}
console.log("\nRESULT: "+PASS+" passed, "+FAIL+" failed");
if(FAIL)process.exit(1);
