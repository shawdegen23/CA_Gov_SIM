/* ================= BALLOT-2: dashboard visibility + campaign follow-through ================= */
let PASS=0,FAIL=0;
function T(name,cond,detail){if(cond){PASS++;console.log("  ok  "+name);}else{FAIL++;console.log("  FAIL "+name+(detail?" — "+detail:""));}}
const CFG=(over={})=>({seed:12345,name:"Test Gov",party:"D",bgId:"leg",
  attrs:{CHA:4,INS:9,FIS:6,COA:7,FED:3,OPR:4},promises:["no_taxes","build_500k","fix_insurance"],scenario:"aswritten",...over});
const freeze=()=>{const f={norm:RNG.norm,chance:RNG.chance,r:RNG.r,int:RNG.int,pick:RNG.pick};
  let pi=0;RNG.norm=()=>0;RNG.chance=()=>false;RNG.r=()=>0.5;RNG.int=(a)=>a;RNG.pick=a=>a[(pi++)%a.length];return f;};
const thaw=f=>{RNG.norm=f.norm;RNG.chance=f.chance;RNG.r=f.r;RNG.int=f.int;RNG.pick=f.pick;};
const ballot=ACTIONS.find(a=>a.id==="ballot"),pm=ACTIONS.find(a=>a.id==="pushmeasure");

console.log("— the measure never vanishes from the dashboard —");
{
  const g=newGame(CFG({seed:1}));g.player.chest=30;
  const f=freeze();RNG.r=()=>0.05;RNG.int=(a,b)=>Math.round((a+b)/2);ballot.run(g,"m_oilsev");thaw(f);
  T("launched drive leaves the Qualify menu",!ballot.choices(g).some(c=>c.id==="m_oilsev"));
  T("...and appears under SIGNATURE DRIVES",legTrackerPanel(g).includes("SIGNATURE DRIVES")&&legTrackerPanel(g).includes("Oil Severance"));
  const m=g.measures.pending[0];
  m.gathering=false;m.electionTurn=23;m.sigsGot=m.sigs;
  const panel=legTrackerPanel(g);
  T("qualified measure moves to ON THE BALLOT",panel.includes("ON THE BALLOT")&&panel.includes("QUALIFIED"));
  T("...with a live YES projection and election date",/polls ~\d+% yes/.test(panel)&&panel.includes("Nov 2028"));
  T("...and its fiscal tag",panel.includes("raises $1.5B/yr"));
  g.measures.hostile.push({t:"'Taxpayer protection' supermajority measure",backer:"chamber",baseYes:52,electionTurn:23});
  T("hostile ballot measures also visible",legTrackerPanel(g).includes("HOSTILE MEASURES ON THE BALLOT"));
}
console.log("— campaign follow-through, like Push Legislation —");
{
  const g=newGame(CFG({seed:2}));g.player.chest=30;
  T("gated until something is in the field",pm.when(g)!==true);
  const f=freeze();RNG.r=()=>0.05;RNG.int=(a,b)=>Math.round((a+b)/2);ballot.run(g,"m_splitroll");thaw(f);
  T("available once a drive launches",pm.when(g)===true);
  let ch=pm.choices(g);
  T("gathering stage offers the surge",ch.length===1&&ch[0].id==="m_splitroll|surge");
  const m=g.measures.pending[0];const sig0=m.sigsGot,rate0=m.rate,chest0=g.player.chest;
  pm.run(g,"m_splitroll|surge");
  T("surge: $3M buys +180k signatures and a faster rate",m.sigsGot===sig0+180000&&m.rate===rate0+20&&g.player.chest===chest0-3);
  // qualified: the barnstorm verb
  m.gathering=false;m.electionTurn=23;
  ch=pm.choices(g);
  // BALLOT-3 widened the qualified stage to a verb set; the barnstorm anchors it, the surge is gone
  T("qualified stage offers the barnstorm",ch.some(c=>c.id==="m_splitroll|campaign")&&!ch.some(c=>c.id==="m_splitroll|surge"),JSON.stringify(ch.map(c=>c.id)));
  const f2=freeze();RNG.r=()=>0.05;pm.run(g,"m_splitroll|campaign");thaw(f2);
  T("a good tour banks +2 spend (≈ +0.8 projected YES)",m.playerSpend===4,String(m.playerSpend)); // 2 from qualify + 2
  const f3=freeze();RNG.r=()=>0.99;pm.run(g,"m_splitroll|campaign");thaw(f3);
  T("a soft tour still banks +1",m.playerSpend===5);
  // spend actually moves the election
  const f4=freeze();
  const gA=newGame(CFG({seed:3}));gA.fiscal.deficit=30;
  gA.measures.pending.push({...MEASURES.find(x=>x.id==="m_splitroll"),baseYes:47,electionTurn:1,playerSpend:2,oppose:[]});
  resolveMeasures(gA);
  const gB=newGame(CFG({seed:3}));gB.fiscal.deficit=30;
  gB.measures.pending.push({...MEASURES.find(x=>x.id==="m_splitroll"),baseYes:47,electionTurn:1,playerSpend:8,oppose:[]});
  resolveMeasures(gB);
  thaw(f4);
  T("campaign spend can be the margin (47% base: fails unspent, passes campaigned)",
    !gA.measures.resolved[0].passed&&gB.measures.resolved[0].passed===true,
    JSON.stringify([gA.measures.resolved[0].passed,gB.measures.resolved[0].passed]));
  // broke surge refuses politely
  const g4=newGame(CFG({seed:4}));g4.player.chest=20;
  const f5=freeze();RNG.r=()=>0.05;RNG.int=(a,b)=>Math.round((a+b)/2);ballot.run(g4,"m_sportsbet");thaw(f5);
  g4.player.chest=1;const s4=g4.measures.pending[0].sigsGot;
  pm.run(g4,"m_sportsbet|surge");
  T("no $3M, no surge — with a story, not a crash",g4.measures.pending[0].sigsGot===s4&&g4.feed.some(x=>x.hl.includes("bounced at the bank")));
}
console.log("\nRESULT: "+PASS+" passed, "+FAIL+" failed");
if(FAIL)process.exit(1);
