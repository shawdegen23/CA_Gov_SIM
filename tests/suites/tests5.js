/* ================= PC ACTIONS + SWEEP FIXES SUITE ================= */
let PASS=0,FAIL=0;
function T(name,cond,detail){if(cond){PASS++;console.log("  ok  "+name);}else{FAIL++;console.log("  FAIL "+name+(detail?" — "+detail:""));}}
const CFG=(over={})=>({seed:12345,name:"Test Gov",party:"D",bgId:"leg",
  attrs:{CHA:4,INS:9,FIS:6,COA:7,FED:3,OPR:4},promises:["no_taxes","build_500k","fix_insurance"],scenario:"aswritten",...over});
const freeze=()=>{const f={norm:RNG.norm,chance:RNG.chance,r:RNG.r,int:RNG.int,pick:RNG.pick};
  RNG.norm=()=>0;RNG.chance=()=>false;RNG.r=()=>0.5;RNG.int=(a)=>a;RNG.pick=a=>a[0];return f;};
const thaw=f=>{RNG.norm=f.norm;RNG.chance=f.chance;RNG.r=f.r;RNG.int=f.int;RNG.pick=f.pick;};
const barn=ACTIONS.find(a=>a.id==="barnstorm");

console.log("— PC-1: capital you can go earn —");
{
  const g=newGame(CFG({seed:1}));const pc0=g.pc;
  const f=freeze();RNG.r=()=>0.05; // CHA roll succeeds
  barn.run(g,"crowds");thaw(f);
  T("town halls bank +8 PC on a good run",g.pc-pc0===8,String(g.pc-pc0));
  T("quarterly cooldown enforced",barn.when(g)!==true);
  g.turn+=3;
  T("circuit reopens after a quarter",barn.when(g)===true);
  const g2=newGame(CFG({seed:2}));const pc2=g2.pc,ch2=g2.player.chest;
  const f2=freeze();barn.run(g2,"donors");thaw(f2);
  T("donor circuit: +4 PC guaranteed",g2.pc-pc2===4);
  T("...and real money for the chest",g2.player.chest>ch2,String(g2.player.chest-ch2));
  const g3=newGame(CFG({seed:3}));const pc3=g3.pc;
  const f3=freeze();RNG.r=()=>0.05;barn.run(g3,"counties");thaw(f3);
  T("county tour: +7 PC and leadership +3",g3.pc-pc3===7&&g3.legStanding===33,g3.pc-pc3+","+g3.legStanding);
  // quiet-month rebate
  const A=newGame(CFG({seed:4})),B=newGame(CFG({seed:4}));
  const f4=freeze();
  spendSlots(B,3); // B burned the month
  endMonth(A);endMonth(B);thaw(f4);
  T("a quiet month banks +2 more PC than a frantic one",A.pc-B.pc===2,String(A.pc-B.pc));
  const gm=newGame(CFG({seed:5}));gm.pc=5;
  T("memo coaches the broke governor",buildMemo(gm).some(l=>l.includes("BARNSTORM")));
}
console.log("— SWEEP-1: the blue pencil is reachable —");
{
  const g=newGame(CFG({seed:6}));
  const li=ACTIONS.find(a=>a.id==="lineitem");
  g.turn=6; // June 2027
  T("closed with nothing passed",li.when(g)!==true);
  g.fiscal.budget.awaiting={finalSolve:5,changes:[],votes:{asm:60,sen:30},taxNote:"",late:false};
  T("OPEN while the budget sits on the desk in June",li.when(g)===true);
  g.fiscal.budget.awaiting=null;g.fiscal.budget.enacted=true;
  g.turn=8; // August
  T("open in August for late budgets",li.when(g)===true);
  g.turn=9;
  T("closed by September",li.when(g)!==true);
}
console.log("— SWEEP-2: the May number exists during May —");
{
  const g=newGame(CFG({seed:7}));
  const f=freeze();
  proposeBudget(g,{cuts:5,taxes:0,reserves:2,gimmicks:2,rosy:3},"The Blend");
  for(let i=0;i<4;i++)endMonth(g); // Jan..Apr end → now May turn
  thaw(f);
  T("it is May",turnDate(g.turn).m===5);
  T("mayGap computed at April's end",g.fiscal.budget.mayGap!==undefined,String(g.fiscal.budget.mayGap));
  T("May setpiece can cite the number",seasonPanel(g).includes("MAY REVISION"));
  T("the reveal story landed before the window",g.feed.some(x=>x.hl.includes("April receipts are in")));
}
console.log("— SWEEP-3: one BSA draw per year —");
{
  const g=newGame(CFG({seed:8}));const y=turnDate(g.turn).y;
  g.flags.fiscalEmergencyY=y;g.fiscal.deficit=30;
  const bsa=ACTIONS.find(a=>a.id==="bsa");
  T("first draw allowed",bsa.when(g)===true&&bsa.gate(g)===null);
  const f=freeze();RNG.int=(a,b)=>b;bsa.run(g,"take");thaw(f); // votes pass (voteModel noise int)
  T("draw recorded",g.flags.bsaDrawY===y,String(g.flags.bsaDrawY));
  T("second draw the same year refused",bsa.when(g)!==true);
  g.turn=13;g.flags.fiscalEmergencyY=2028;
  T("fresh year, fresh (declared) draw",bsa.when(g)===true);
}
console.log("— SWEEP-4/5/6: fire year, May amnesia, notebook cadence —");
{
  const g=newGame(CFG({seed:9,scenario:"fireyear"}));
  T("scenario flag set",g.flags.fireYearForced===true);
  g.turn=10; // October 2027
  const f=freeze();RNG.chance=p=>p>=1;RNG.int=(a)=>a; // only the guaranteed roll fires
  randomEvents(g,turnDate(g.turn));thaw(f);
  T("fire year GUARANTEES the catastrophic season by October",g.flags.disasterActive&&g.flags.disasterActive.sev===3);
  T("the loaded die is spent",g.flags.fireYearForced===false);
  // maySkipNoted resets yearly
  const g2=newGame(CFG({seed:10}));
  g2.flags.maySkipNoted=true;g2.turn=12;
  const f2=freeze();endMonth(g2);thaw(f2); // December end
  T("May-hiding penalty re-armed each December",g2.flags.maySkipNoted===false);
  // notebook quarterly — REAL RNG here: frozen pick() deadlocks sessionEnd's re-pick loop (stub artifact)
  const g3=newGame(CFG({seed:11}));
  for(let i=0;i<12;i++){if(turnDate(g3.turn).m===1&&!g3.fiscal.budget.proposed)proposeBudget(g3,{cuts:5,taxes:0,reserves:2,gimmicks:2,rosy:3});if(g3.fiscal.budget.awaiting)finishEnactment(g3,false);endMonth(g3);}
  const nb=g3.feed.filter(x=>x.hl.startsWith("Capitol Notebook")).length;
  T("Capitol Notebook is quarterly now (4/yr)",nb===4,String(nb));
}
console.log("\nRESULT: "+PASS+" passed, "+FAIL+" failed");
if(FAIL)process.exit(1);
