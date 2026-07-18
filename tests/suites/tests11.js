/* ================= SLOT-1: earned action capacity ================= */
let PASS=0,FAIL=0;
function T(name,cond,detail){if(cond){PASS++;console.log("  ok  "+name);}else{FAIL++;console.log("  FAIL "+name+(detail?" — "+detail:""));}}
const CFG=(over={})=>({seed:12345,name:"Test Gov",party:"D",bgId:"mayor",
  attrs:{CHA:6,INS:5,FIS:6,COA:6,FED:5,OPR:7},promises:["no_taxes","build_500k","fix_insurance"],scenario:"aswritten",...over});
const freeze=()=>{const f={norm:RNG.norm,chance:RNG.chance,r:RNG.r,int:RNG.int,pick:RNG.pick};
  let pi=0;RNG.norm=()=>0;RNG.chance=()=>false;RNG.r=()=>0.5;RNG.int=(a)=>a;RNG.pick=a=>a[(pi++)%a.length];return f;};
const thaw=f=>{RNG.norm=f.norm;RNG.chance=f.chance;RNG.r=f.r;RNG.int=f.int;RNG.pick=f.pick;};
const seatAll=(g,type)=>{["DOF","CalHHS","CNRA","CalSTA","CDCR","LWDA","GovOps","BCSH","CalEPA"].forEach(c=>{
  transitionPick(g,c,type);const m=g.cabinet.find(x=>x.agency===c);if(m)m.pending=false;});};

console.log("— the machine slot —");
{
  const g=newGame(CFG({seed:1}));
  T("base capacity is 3",maxSlots(g)===3);
  seatAll(g,"holdover"); // all 2★ → avg 2.0
  T("an ordinary full cabinet is NOT enough (2.0★ < 2.4★)",maxSlots(g)===3&&!machineActive(g));
  const g2=newGame(CFG({seed:2}));
  seatAll(g2,"reformer"); // all 3★
  T("a ★★★ cabinet runs the machine: 4 slots",maxSlots(g2)===4&&machineActive(g2),avgCabinetQ(g2).toFixed(2));
  // dynamic: losing a secretary loses the slot
  g2.cabinet=g2.cabinet.filter(c=>c.agency!=="CDCR");
  T("a scandal vacancy takes the slot back",maxSlots(g2)===3&&!machineActive(g2));
  // pending nominees don't count
  const g3=newGame(CFG({seed:3}));
  ["DOF","CalHHS","CNRA","CalSTA","CDCR","LWDA","GovOps","BCSH","CalEPA"].forEach(c=>transitionPick(g3,c,"reformer"));
  T("nominees before Rules don't run the machine",!machineActive(g3));
}
console.log("— the veteran slot —");
{
  const g=newGame(CFG({seed:4})); // mayor, INS 5 → year 3
  T("ordinary governor: experience slot at turn 25",veteranAt(g)===25&&maxSlots(g)===3);
  g.turn=25;
  T("...and it arrives",maxSlots(g)===4);
  const g2=newGame(CFG({seed:5,bgId:"leg",attrs:{CHA:4,INS:9,FIS:6,COA:7,FED:3,OPR:4}}));
  T("Legislative Leader: the insider dividend at turn 13",veteranAt(g2)===13);
  const g3=newGame(CFG({seed:6,bgId:"tech",attrs:{CHA:5,INS:8,FIS:8,COA:3,FED:4,OPR:8}}));
  T("INS 8 by attributes also qualifies",veteranAt(g3)===13);
  const g4=newGame(CFG({seed:7}));g4.turn=25;seatAll(g4,"reformer");
  T("both together: 5 slots, capped",maxSlots(g4)===5);
}
console.log("— the month actually grants them —");
{
  const g=newGame(CFG({seed:8}));
  seatAll(g,"reformer");
  const f=freeze();
  proposeBudget(g,{cuts:5,taxes:0,reserves:2,gimmicks:2,rosy:3},"B");
  endMonth(g);thaw(f);
  T("next month opens with 4 slots",g.slots===4,String(g.slots));
  T("the machine story ran once",g.feed.filter(x=>x.hl.includes("fourth thing")).length===1);
  const f2=freeze();endMonth(g);thaw(f2);
  T("...and only once",g.feed.filter(x=>x.hl.includes("fourth thing")).length===1);
  const g2=newGame(CFG({seed:9,bgId:"leg",attrs:{CHA:4,INS:9,FIS:6,COA:7,FED:3,OPR:4}}));
  g2.turn=12;
  const f3=freeze();endMonth(g2);thaw(f3); // Dec end → turn 13
  T("insider's year-two slot lands with its story",g2.slots===4&&g2.feed.some(x=>x.hl.includes("fifth gear")),String(g2.slots));
  // UI shows the live denominator
  T("topbar shows x/4",topbar(g,turnDate(g.turn),nextDeadline(g),0).includes("/4"));
  // memo explains a lost machine slot
  g.flags.machineTold=true;g.transitionOpen=false;g.cabinet=g.cabinet.filter(c=>c.agency!=="DOF");
  T("memo names the lost 4th slot",buildMemo(g).some(l=>l.includes("costing you the machine's 4th action slot")));
}
console.log("\nRESULT: "+PASS+" passed, "+FAIL+" failed");
if(FAIL)process.exit(1);
