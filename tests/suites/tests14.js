/* ================= MACRO-1: the market is more than the AI trade ================= */
let PASS=0,FAIL=0;
function T(name,cond,detail){if(cond){PASS++;console.log("  ok  "+name);}else{FAIL++;console.log("  FAIL "+name+(detail?" — "+detail:""));}}
const CFG=(over={})=>({seed:12345,name:"Test Gov",party:"D",bgId:"leg",
  attrs:{CHA:4,INS:9,FIS:6,COA:7,FED:3,OPR:4},promises:["no_taxes","build_500k","fix_insurance"],scenario:"aswritten",...over});
const freeze=()=>{const f={norm:RNG.norm,chance:RNG.chance,r:RNG.r,int:RNG.int,pick:RNG.pick};
  let pi=0;RNG.norm=()=>0;RNG.chance=()=>false;RNG.r=()=>0.5;RNG.int=(a)=>a;RNG.pick=a=>a[(pi++)%a.length];return f;};
const thaw=f=>{RNG.norm=f.norm;RNG.chance=f.chance;RNG.r=f.r;RNG.int=f.int;RNG.pick=f.pick;};

console.log("— the rates cycle moves the hazard —");
{
  const g=newGame(CFG({seed:1}));const M=g.market;
  T("new games carry a macro block",M.macro&&M.macro.stance==="neutral"&&M.macro.left===7);
  const f=freeze();
  M.macro.stance="tightening";M.macro.left=99;M.hazard=0.05;g.turn=5;
  stepMarket(g);const hazTight=M.hazard;
  M.macro.stance="easing";M.hazard=0.05;
  stepMarket(g);const hazEase=M.hazard;
  thaw(f);
  T("tightening ramps the hazard (+0.0045/mo)",Math.abs(hazTight-0.0545)<1e-9,String(hazTight));
  T("easing COOLS it — a crash is no longer an appointment",Math.abs(hazEase-0.0478)<1e-9,String(hazEase));
  T("easing floor: hazard never cools below 0.010",(()=>{const f2=freeze();M.macro.stance="easing";M.hazard=0.0105;stepMarket(g);thaw(f2);return M.hazard===0.010;})(),String(M.hazard));
  // drift: easing pays, tightening drags
  const f3=freeze();RNG.norm=(mu)=>mu; // return the drift itself
  const g2=newGame(CFG({seed:2}));g2.market.macro.left=99;g2.market.macro.stance="easing";g2.turn=5;
  const i0=g2.market.idx;stepMarket(g2);const gEase=g2.market.idx/i0;
  g2.market.macro.stance="tightening";const i1=g2.market.idx;stepMarket(g2);const gTight=g2.market.idx/i1;
  thaw(f3);
  T("easy money inflates faster than tight money",gEase>1.01&&gTight<1.005,gEase.toFixed(4)+" vs "+gTight.toFixed(4));
}
console.log("— stance shifts announce themselves —");
{
  const g=newGame(CFG({seed:3}));const M=g.market;
  const f=freeze();M.macro.left=1;g.turn=5;
  stepMarket(g);thaw(f);
  T("the shift lands with a wire story",M.macro.left===5&&M.macro.stance!=="neutral"&&g.feed.some(x=>x.hl.includes("The Fed")));
}
console.log("— January digestion: the soft landing —");
{
  const g=newGame(CFG({seed:4}));const M=g.market;
  const f=freeze();RNG.chance=p=>p===0.30; // only the digestion roll succeeds
  M.hazard=0.11;M.macro.left=99;g.turn=13; // a January
  stepMarket(g);thaw(f);
  T("hazard resets to baseline",M.hazard===TUNING.HAZARD0,String(M.hazard));
  T("...with the LAO's grudging note",g.feed.some(x=>x.hl.includes("Soft landing")));
  const g2=newGame(CFG({seed:5}));const M2=g2.market;
  const f2=freeze();RNG.chance=p=>p===0.30;M2.hazard=0.11;M2.macro.left=99;g2.turn=14; // February
  stepMarket(g2);thaw(f2);
  T("only in January",M2.hazard>0.10,String(M2.hazard));
}
console.log("— exogenous shocks: oil, banks, tariffs —");
{
  T("three shocks on the table",MACRO_SHOCKS.length===3&&MACRO_SHOCKS.every(s=>s.hl&&s.bd&&s.dropHi>s.dropLo));
  const g=newGame(CFG({seed:6}));const M=g.market;
  const f=freeze();RNG.chance=p=>p===0.015;M.macro.left=99;g.turn=5; // only the shock roll fires; pick rotates → oil first
  const u0=g.issues.unemp,h0=M.hazard;
  stepMarket(g);thaw(f);
  T("oil shock knocks ~4.5% off the index",M.idx<96&&M.idx>94,String(M.idx));
  T("...bumps unemployment and the hazard",g.issues.unemp===u0+0.2&&M.hazard>h0);
  T("...is remembered as the last shock",M.macro.lastShock&&M.macro.lastShock.t==="oil");
  T("...and makes the news",g.feed.some(x=>x.hl.includes("Brent clears $120")));
  const gt=newGame(CFG({seed:7}));gt.market.macro.left=99;gt.turn=5;
  const agri0=gt.actors.agri;
  const f2=freeze();let pi=0;RNG.pick=a=>a.length===3?a[2]:a[(pi++)%a.length];RNG.chance=p=>p===0.015;
  stepMarket(gt);thaw(f2);
  T("tariff shock burns the growers",gt.actors.agri<agri0,gt.actors.agri+" vs "+agri0);
}
console.log("— the crash names its cause —");
{
  const mk=seed=>{const g=newGame(CFG({seed}));g.market.macro.left=99;g.market.hazard=0.5;g.turn=5;return g;};
  const fire=g=>{const f=freeze();RNG.chance=p=>p>=0.15;stepMarket(g);thaw(f);}; // hazard is clamped at 0.16 — only the crash roll clears 0.15
  const g1=mk(8);g1.market.macro.lastShock={t:"banks",turn:4};fire(g1);
  T("crash after a bank scare blames the banks",g1.market.mode==="correction"&&g1.feed.some(x=>x.hl.includes("bank scare")));
  const g2=mk(9);g2.market.macro.stance="tightening";fire(g2);
  T("crash under tightening blames the Fed",g2.feed.some(x=>x.hl.includes("higher for longer")));
  const g3=mk(10);fire(g3);
  T("crash with no other suspect is still the AI trade",g3.feed.some(x=>x.hl.includes("air comes out of the AI trade")));
  const g4=mk(11);g4.market.macro.lastShock={t:"oil",turn:-9};fire(g4); // stale shock, >4 turns ago
  T("a stale shock doesn't take the blame",g4.feed.some(x=>x.hl.includes("air comes out of the AI trade")));
}
console.log("— the crash is no longer an appointment —");
{
  let crashed=0,survived=0;
  for(let s=100;s<140;s++){
    const g=newGame(CFG({seed:s}));
    for(let t=0;t<48&&!g.over;t++)endMonth(g);
    if(g.flags.marketCorrected)crashed++;else survived++;
  }
  console.log("    40 full terms, hands off the wheel: "+crashed+" crashed, "+survived+" never did");
  T("crashes still happen (this is California)",crashed>=20,String(crashed));
  T("but some full terms never crash at all",survived>=5,String(survived));
}
console.log("\nRESULT: "+PASS+" passed, "+FAIL+" failed");
if(FAIL)process.exit(1);
