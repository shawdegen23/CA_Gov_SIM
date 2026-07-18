/* ================= WALL-1 (limits with teeth) + BALLOT-1 (revenue via the voters) ================= */
let PASS=0,FAIL=0;
function T(name,cond,detail){if(cond){PASS++;console.log("  ok  "+name);}else{FAIL++;console.log("  FAIL "+name+(detail?" — "+detail:""));}}
const CFG=(over={})=>({seed:12345,name:"Test Gov",party:"D",bgId:"leg",
  attrs:{CHA:4,INS:9,FIS:6,COA:7,FED:3,OPR:4},promises:["no_taxes","build_500k","fix_insurance"],scenario:"aswritten",...over});
const freeze=()=>{const f={norm:RNG.norm,chance:RNG.chance,r:RNG.r,int:RNG.int,pick:RNG.pick};
  let pi=0;RNG.norm=()=>0;RNG.chance=()=>false;RNG.r=()=>0.5;RNG.int=(a)=>a;RNG.pick=a=>a[(pi++)%a.length];return f;};
const thaw=f=>{RNG.norm=f.norm;RNG.chance=f.chance;RNG.r=f.r;RNG.int=f.int;RNG.pick=f.pick;};

console.log("— WALL-1: every wall has a consequence table —");
{
  T("all 12 walls covered",WALLS.every(w=>WALL_FX[w.id]),WALLS.filter(w=>!WALL_FX[w.id]).map(w=>w.id).join(","));
  T("leak probabilities sane (0.1–0.6)",Object.values(WALL_FX).every(w=>w.leakP>=0.1&&w.leakP<=0.6));
  T("every leak has a headline and body",Object.values(WALL_FX).every(w=>w.hl&&w.bd&&typeof w.fx==="function"));
  // leaks actually move standings
  const g=newGame(CFG({seed:1}));const cta0=g.actors.cta;
  WALL_FX.w_prop98.fx(g);
  T("Prop 98 leak burns the teachers",g.actors.cta<cta0,g.actors.cta+" vs "+cta0);
  const g2=newGame(CFG({seed:2}));const seiu0=g2.actors.seiu;
  WALL_FX.w_cba.fx(g2);
  T("union-contract leak burns SEIU, pleases the Chamber",g2.actors.seiu<seiu0&&g2.actors.chamber>-11);
}
console.log("— WALL-1: the two upsides —");
{
  const g=newGame(CFG({seed:3}));const pc0=g.pc;
  const note=WALL_FX.w_market.upside(g);
  T("LAO tutorial pays +2 PC once",g.pc===Math.min(110,pc0+2)&&note&&note.includes("+2 PC"));
  T("...and only once",WALL_FX.w_market.upside(g)===null);
  const g3=newGame(CFG({seed:4}));
  WALL_FX.w_bsa.upside(g3);
  T("Finance briefing flag set",g3.flags.bsaBriefed===true);
  // briefing makes the fiscal-emergency declaration clean
  const emg=ACTIONS.find(a=>a.id==="emergency");
  const g4=newGame(CFG({seed:5}));g4.fiscal.deficit=30;const a4=g4.approval;
  const f=freeze();emg.run(g4,"fiscal");thaw(f);
  T("unbriefed declaration costs approval",g4.approval<a4);
  const g5=newGame(CFG({seed:5}));g5.fiscal.deficit=30;g5.flags.bsaBriefed=true;const a5=g5.approval;
  const f2=freeze();emg.run(g5,"fiscal");thaw(f2);
  T("briefed declaration is clean (no approval cost)",g5.approval===a5,g5.approval+" vs "+a5);
  // the AG grudge reaches the judicial commission
  const g6=newGame(CFG({seed:6}));g6.flags.agGrudge=true;
  const f3=freeze();RNG.r=()=>0.87; // passes 0.90 (crossover, no grudge) but fails 0.86 (with grudge)
  applyFx(g6,{k:"fn",fn:"_judconfirm",prof:"crossover"},"hearing","you");thaw(f3);
  T("AG grudge (from testing the wall) costs a nominee",!(g6.flags.judges>0));
}
console.log("— BALLOT-1: the measure slate & fiscal signs —");
{
  T("measure slate expanded 5 → "+MEASURES.length,MEASURES.length===12);
  const ids=new Set();let dup=null;for(const m of MEASURES){if(ids.has(m.id))dup=m.id;ids.add(m.id);}
  T("unique ids",!dup,dup);
  const actorIds=new Set(ACTORS.map(a=>a.id));
  T("oppose lists reference real actors",MEASURES.every(m=>m.oppose.every(o=>actorIds.has(o))));
  const rev=MEASURES.filter(m=>m.yesFx.fiscal&&m.yesFx.fiscal.deficitCut).length;
  const bond=MEASURES.filter(m=>m.yesFx.fiscal&&m.yesFx.fiscal.deficitAdd).length;
  console.log("    "+rev+" revenue measures · "+bond+" bonds");
  T("revenue measures exist (the around-the-Legislature path)",rev>=5);
  T("bonds exist and cost debt service",bond>=2);
  T("fiscal tags render",measureFiscalTag(MEASURES.find(m=>m.id==="m_splitroll")).includes("raises $4.0B/yr")
    &&measureFiscalTag(MEASURES.find(m=>m.id==="m_housingbond")).includes("debt service"));
  const ballot=ACTIONS.find(a=>a.id==="ballot");
  const g=newGame(CFG({seed:7}));
  T("ballot menu shows fiscal tags",ballot.choices(g).every(c=>/raises \$|bond —|fiscal: indirect/.test(c.cost)));
  g.measures.pending=[{},{},{}];
  T("three concurrent operations max",ballot.when(g)!==true);
}
console.log("— BALLOT-1: passage moves real money —");
{
  const f=freeze();
  const g=newGame(CFG({seed:8}));g.fiscal.deficit=30;
  g.measures.pending.push({...MEASURES.find(m=>m.id==="m_splitroll"),baseYes:99,electionTurn:1,playerSpend:2});
  resolveMeasures(g);
  T("split roll passing cuts the deficit $4B/yr",Math.abs(g.fiscal.deficit-26)<0.001,String(g.fiscal.deficit));
  T("the LAO explains the voter-approved revenue",g.feed.some(x=>x.hl.includes("Voter-approved revenue lands")));
  const g2=newGame(CFG({seed:9}));g2.fiscal.deficit=30;
  g2.measures.pending.push({...MEASURES.find(m=>m.id==="m_climatebond"),baseYes:99,electionTurn:1,playerSpend:2});
  resolveMeasures(g2);
  T("bond passing adds its debt service",Math.abs(g2.fiscal.deficit-30.2)<0.001,String(g2.fiscal.deficit));
  T("insurance effect routed to the LAW column",g2.lag.some(l=>l.fx.k==="law"&&l.fx.key==="lawInsur"&&l.fx.d===8));
  thaw(f);
  // memo points at the ballot when broke
  const g3=newGame(CFG({seed:10}));g3.fiscal.deficit=35;
  T("memo names the ballot route",buildMemo(g3).some(l=>l.includes("AROUND the building")&&l.includes("Split roll")));
}
console.log("\nRESULT: "+PASS+" passed, "+FAIL+" failed");
if(FAIL)process.exit(1);
