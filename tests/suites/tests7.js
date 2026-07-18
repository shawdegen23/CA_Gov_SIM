/* ================= SHELF DROP: six systems (holdouts, judges, regions, pensions, drives, waivers) ================= */
let PASS=0,FAIL=0;
function T(name,cond,detail){if(cond){PASS++;console.log("  ok  "+name);}else{FAIL++;console.log("  FAIL "+name+(detail?" — "+detail:""));}}
const CFG=(over={})=>({seed:12345,name:"Test Gov",party:"D",bgId:"leg",
  attrs:{CHA:4,INS:9,FIS:6,COA:7,FED:3,OPR:4},promises:["no_taxes","build_500k","fix_insurance"],scenario:"aswritten",...over});
const freeze=()=>{const f={norm:RNG.norm,chance:RNG.chance,r:RNG.r,int:RNG.int,pick:RNG.pick};
  let pi=0;RNG.norm=()=>0;RNG.chance=()=>false;RNG.r=()=>0.5;RNG.int=(a)=>a;RNG.pick=a=>a[(pi++)%a.length];return f;};
const thaw=f=>{RNG.norm=f.norm;RNG.chance=f.chance;RNG.r=f.r;RNG.int=f.int;RNG.pick=f.pick;};
const push=ACTIONS.find(a=>a.id==="pushbill"),jud=ACTIONS.find(a=>a.id==="judicial"),
  surge=ACTIONS.find(a=>a.id==="surge"),ballot=ACTIONS.find(a=>a.id==="ballot"),waiver=ACTIONS.find(a=>a.id==="waiver");

console.log("— SHELF-1: named holdouts —");
{
  const g=newGame(CFG({seed:1}));
  const b={...BILL_POOL.find(x=>x.id==="b_upzone"),stage:"suspense",sponsored:true,rescued:true};
  g.bills.pipeline=[b];
  const f=freeze();suspenseFile(g,"May");thaw(f);
  T("floor arrival generates 3 named holdouts",b.stage==="floor"&&(b.holdouts||[]).length===3,JSON.stringify((b.holdouts||[]).map(h=>h.nm)));
  T("holdouts are deterministic (hash, no RNG)",(()=>{const g2=newGame(CFG({seed:1}));const b2={...BILL_POOL.find(x=>x.id==="b_upzone"),stage:"floor",sponsored:true};g2.turn=g.turn;makeHoldouts(g2,b2);return JSON.stringify(b2.holdouts)===JSON.stringify(b.holdouts.map(h=>({...h,called:false,won:false})));})());
  const ch=push.choices(g);
  T("push menu offers the calls",ch.filter(c=>c.id.includes("|call")).length===3);
  const w0=b.whip||0;
  const f2=freeze();RNG.r=()=>0.05;push.run(g,"b_upzone|call0");thaw(f2);
  T("a landed call is +1 real vote",b.whip===w0+1&&b.holdouts[0].won===true);
  T("each member callable once",!push.choices(g).some(c=>c.id==="b_upzone|call0"));
  T("tracker names the holdouts",legTrackerPanel(g).includes("HOLDOUTS:")&&legTrackerPanel(g).includes(b.holdouts[1].nm));
  const g3=newGame(CFG({seed:2}));const b3={...BILL_POOL.find(x=>x.id==="b_fairshare"),stage:"floor",sponsored:true};
  makeHoldouts(g3,b3);
  T("2/3 bills get no holdout theater (arithmetic, not phone calls)",!b3.holdouts);
}
console.log("— SHELF-2: the judicial calendar —");
{
  const g=newGame(CFG({seed:3}));
  const f=freeze();jud.run(g,"crossover");thaw(f);
  T("nomination goes to a calendared hearing",g.flags.judPending===g.turn+2&&g.lag.some(l=>l.fx.fn==="_judconfirm"));
  T("no second nomination while one pends",jud.when(g)!==true);
  const f2=freeze();RNG.r=()=>0.1; // hearing passes
  applyFx(g,{k:"fn",fn:"_judconfirm",prof:"crossover"},"hearing","you");thaw(f2);
  T("confirmed: a justice seated, mods pleased",g.flags.judges===1&&g.flags.judPending===0);
  const g2=newGame(CFG({seed:4}));const ap0=g2.approval;
  const f3=freeze();RNG.r=()=>0.99;applyFx(g2,{k:"fn",fn:"_judconfirm",prof:"scholar"},"hearing","you");thaw(f3);
  T("the AG can kill your nominee in public",!(g2.flags.judges>0)&&g2.approval<ap0);
}
console.log("— SHELF-3: county-level homelessness —");
{
  const g=newGame(CFG({seed:5}));
  T("regional shares initialized (LA 45 / Bay 25 / Valley 30)",g.issues.hmlShares.la===45&&g.issues.hmlShares.val===30);
  const f=freeze();
  for(let i=0;i<24;i++)driftIssues(g,turnDate(i+1));
  T("LA's share concentrates without intervention",g.issues.hmlShares.la>45.2,g.issues.hmlShares.la.toFixed(2));
  T("shares stay normalized to 100",Math.abs(g.issues.hmlShares.la+g.issues.hmlShares.bay+g.issues.hmlShares.val-100)<0.001);
  const g2=newGame(CFG({seed:6}));
  surge.run(g2,"la");
  T("focused surge sets the regional aim",g2.flags.surgeFocus&&g2.flags.surgeFocus.reg==="la");
  const la0=g2.issues.hmlShares.la;
  for(let i=0;i<12;i++)driftIssues(g2,turnDate(g2.turn+i));
  T("LA share bends under a concentrated surge",g2.issues.hmlShares.la<la0-1,String((g2.issues.hmlShares.la-la0).toFixed(2)));
  thaw(f);
  T("issues panel shows the regions",issuesPanel(g2).includes("by region")&&issuesPanel(g2).includes("LA "));
  T("surge offers four targeting choices",surge.choices(newGame(CFG({seed:7}))).length===4);
}
console.log("— SHELF-4: the pension boards invoice you in July —");
{
  const g=newGame(CFG({seed:8}));g.turn=7; // July 2027
  g.fiscal.pension=271; // +15 vs the 256 baseline → rates up ~$0.3B
  const d0=g.fiscal.deficit;
  const f=freeze();endMonth(g);thaw(f);
  T("worsened liability raises employer rates onto the GF",g.fiscal.deficit-d0>=0.29,String((g.fiscal.deficit-d0).toFixed(2)));
  T("the board story ran",g.feed.some(x=>x.hl.includes("raise employer rates")));
  T("baseline re-marked at the July meeting",g.flags.penRateBase===271);
  const g2=newGame(CFG({seed:9}));g2.turn=7;g2.flags.penRateBase=280;g2.fiscal.pension=262;g2.fiscal.deficit=30;
  const f2=freeze();endMonth(g2);thaw(f2);
  T("good returns ease rates (capped small)",g2.fiscal.deficit<30&&30-g2.fiscal.deficit<=0.31,String((30-g2.fiscal.deficit).toFixed(2)));
}
console.log("— SHELF-5: signature drives on the clock —");
{
  const g=newGame(CFG({seed:10}));g.player.chest=30;
  const f=freeze();RNG.r=()=>0.05;RNG.int=(a,b)=>Math.round((a+b)/2);ballot.run(g,"m_insurance");thaw(f);
  const m=g.measures.pending[0];
  T("drive starts gathering, not instantly qualified",m&&m.gathering===true&&m.sigsGot===0&&!m.electionTurn);
  T("tracker shows the drive",legTrackerPanel(g).includes("SIGNATURE DRIVES"));
  const f2=freeze();
  endMonth(g);
  T("monthly grind gathers ~rate signatures",m.sigsGot>100000,m.sigsGot.toLocaleString());
  m.sigsGot=m.sigs-1000;endMonth(g);
  T("completion qualifies for the next November",m.gathering===false&&m.electionTurn===23);
  thaw(f2);
  // the 180-day clock
  const g2=newGame(CFG({seed:11}));g2.player.chest=30;
  const f3=freeze();RNG.r=()=>0.9;RNG.int=(a)=>a;ballot.run(g2,"m_pension");thaw(f3); // weak drive, low rate
  const m2=g2.measures.pending[0];m2.startTurn=g2.turn-7;m2.sigsGot=200000;
  const f4=freeze();endMonth(g2);thaw(f4);
  T("the 180-day clock kills a short drive",!g2.measures.pending.includes(m2));
  // resolveMeasures ignores gathering drives
  const g3=newGame(CFG({seed:12}));g3.measures.pending.push({...MEASURES[0],gathering:true,sigsGot:5,rate:100,startTurn:g3.turn});
  const f5=freeze();resolveMeasures(g3);thaw(f5);
  T("elections skip measures still gathering",g3.measures.pending.length===1&&g3.measures.pending[0].gathering);
}
console.log("— SHELF-6: the waiver negotiation —");
{
  const g=newGame(CFG({seed:13}));
  const f=freeze();waiver.run(g,"medicaid");thaw(f);
  T("application filed; answer pending",g.flags.waiverPending===g.turn+3&&g.lag.some(l=>l.fx.fn==="_waiverResp"));
  T("no second application while one pends",waiver.when(g)!==true);
  const d0=g.fiscal.deficit;
  const f2=freeze();RNG.r=()=>0.02;applyFx(g,{k:"fn",fn:"_waiverResp",kind:"medicaid"},"resp","you");thaw(f2);
  T("clean approval: relief lands, a deal is banked",g.fiscal.deficit===d0-1.2&&g.flags.dealsDC===1);
  const g2=newGame(CFG({seed:14}));const pc0=g2.pc,pr0=g2.actors.progs;
  const f3=freeze();RNG.r=()=>0.22;applyFx(g2,{k:"fn",fn:"_waiverResp",kind:"medicaid"},"resp","you");thaw(f3);
  T("narrow approval comes WITH STRINGS (PC + progressives pay)",g2.flags.dealsDC===1&&g2.pc<pc0&&g2.actors.progs<pr0,g2.pc+" "+g2.actors.progs);
  const g3=newGame(CFG({seed:15}));
  const f4=freeze();RNG.r=()=>0.95;applyFx(g3,{k:"fn",fn:"_waiverResp",kind:"snap"},"resp","you");thaw(f4);
  T("denial: two lines, no reasons",!g3.flags.dealsDC&&g3.feed.some(x=>x.hl.startsWith("Denied")));
  // FEMA memo pays off on the next catastrophe
  const g4=newGame(CFG({seed:16}));g4.flags.fedCostShare=true;g4.turn=8;const d4=g4.fiscal.deficit;
  const f5=freeze();RNG.chance=p=>p>=0.03;RNG.int=(a)=>a; // force the catastrophic branch
  randomEvents(g4,turnDate(g4.turn));thaw(f5);
  T("cost-share memo shaves the catastrophic fire hit",Math.abs((g4.fiscal.deficit-d4)-0.9)<0.001,String((g4.fiscal.deficit-d4).toFixed(2)));
}
console.log("\nRESULT: "+PASS+" passed, "+FAIL+" failed");
if(FAIL)process.exit(1);
