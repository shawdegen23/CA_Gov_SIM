/* ================= BALLOT-3: four ways to move a measure ================= */
let PASS=0,FAIL=0;
function T(name,cond,detail){if(cond){PASS++;console.log("  ok  "+name);}else{FAIL++;console.log("  FAIL "+name+(detail?" — "+detail:""));}}
const CFG=(over={})=>({seed:12345,name:"Test Gov",party:"D",bgId:"leg",
  attrs:{CHA:4,INS:9,FIS:6,COA:7,FED:3,OPR:4},promises:["no_taxes","build_500k","fix_insurance"],scenario:"aswritten",...over});
const freeze=()=>{const f={norm:RNG.norm,chance:RNG.chance,r:RNG.r,int:RNG.int,pick:RNG.pick};
  let pi=0;RNG.norm=()=>0;RNG.chance=()=>false;RNG.r=()=>0.5;RNG.int=(a)=>a;RNG.pick=a=>a[(pi++)%a.length];return f;};
const thaw=f=>{RNG.norm=f.norm;RNG.chance=f.chance;RNG.r=f.r;RNG.int=f.int;RNG.pick=f.pick;};
const pm=ACTIONS.find(a=>a.id==="pushmeasure");
const mkQualified=(g,id)=>{g.measures.pending.push({...MEASURES.find(x=>x.id===id),gathering:false,electionTurn:23,playerSpend:2,startTurn:1});return g.measures.pending[g.measures.pending.length-1];};

console.log("— the four verbs —");
{
  const g=newGame(CFG({seed:1}));g.player.chest=30;
  const m=mkQualified(g,"m_oilsev"); // oppose: energy, chamber
  g.actors.energy=-30;g.actors.chamber=-25;g.actors.cta=45; // funded foes + one strong ally
  const ids=pm.choices(g).map(c=>c.id);
  T("qualified measure offers all four verbs",["|campaign","|ads","|dealout","|endorse"].every(v=>ids.some(i=>i.endsWith(v))),JSON.stringify(ids));
  T("dealout names the angriest funder",pm.choices(g).find(c=>c.id.endsWith("|dealout")).nm.includes("Energy / IOUs"));
}
console.log("— money: the ad blitz —");
{
  const g=newGame(CFG({seed:2}));g.player.chest=30;
  const m=mkQualified(g,"m_splitroll");
  pm.run(g,"m_splitroll|ads");
  T("$5M buys +3 spend (≈ +1.2 YES)",g.player.chest===25&&m.playerSpend===5);
  pm.run(g,"m_splitroll|ads");
  T("repeatable while funded",g.player.chest===20&&m.playerSpend===8);
  g.player.chest=2;const s=m.playerSpend;
  pm.run(g,"m_splitroll|ads");
  T("broke buy refuses with a story",m.playerSpend===s&&g.feed.some(x=>x.hl.includes("dies in accounting")));
}
console.log("— deals: buying off the opposition —");
{
  const g=newGame(CFG({seed:3}));g.pc=60;
  const m=mkQualified(g,"m_oilsev");
  g.actors.energy=-40;g.actors.chamber=-25;
  const f=freeze();RNG.r=()=>0.05;pm.run(g,"m_oilsev|dealout");thaw(f);
  T("success removes the funder from the NO side",!m.oppose.includes("energy")&&m.oppose.includes("chamber"));
  T("...and warms the relationship",g.actors.energy===-34,String(g.actors.energy));
  // the -6 actually comes off the election math
  const f2=freeze();
  const gA=newGame(CFG({seed:4}));gA.measures.pending.push({...MEASURES.find(x=>x.id==="m_oilsev"),baseYes:58,electionTurn:1,playerSpend:2,oppose:["energy","chamber"]});
  gA.actors.energy=-40;gA.actors.chamber=-25;resolveMeasures(gA);
  const gB=newGame(CFG({seed:4}));gB.measures.pending.push({...MEASURES.find(x=>x.id==="m_oilsev"),baseYes:58,electionTurn:1,playerSpend:2,oppose:["chamber"]});
  gB.actors.energy=-40;gB.actors.chamber=-25;resolveMeasures(gB);
  thaw(f2);
  T("neutralized funder is the margin (fails with both foes, passes with one bought off)",
    !gA.measures.resolved[0].passed&&gB.measures.resolved[0].passed===true,
    JSON.stringify([gA.measures.resolved[0].passed,gB.measures.resolved[0].passed]));
  // failure leaks
  const g2=newGame(CFG({seed:5}));g2.pc=60;
  const m2=mkQualified(g2,"m_oilsev");g2.actors.energy=-40;
  const f3=freeze();RNG.r=()=>0.99;pm.run(g2,"m_oilsev|dealout");thaw(f3);
  T("a leaked offer stays in the fight and costs approval",m2.oppose.includes("energy")&&g2.feed.some(x=>x.hl.startsWith("Leaked:")));
}
console.log("— allies: coalition endorsements —");
{
  const g=newGame(CFG({seed:6}));
  const m=mkQualified(g,"m_millionaire");
  for(const k in g.actors)if(g.actors[k]>=40)g.actors[k]=30; // leg background starts mods at +40
  T("no strong allies, no endorsement verb",!pm.choices(g).some(c=>c.id.endsWith("|endorse")));
  g.actors.cta=45;g.actors.seiu=50;
  pm.run(g,"m_millionaire|endorse");
  T("endorsements bank +2 spend, free",m.playerSpend===4&&m.endorsed===true);
  T("once per measure",!pm.choices(g).some(c=>c.id.endsWith("|endorse")));
}
console.log("\nRESULT: "+PASS+" passed, "+FAIL+" failed");
if(FAIL)process.exit(1);
