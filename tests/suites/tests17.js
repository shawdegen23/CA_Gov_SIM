/* ================= FIX-1: confirmation odds · off-year specials · the vanishing second measure ================= */
let PASS=0,FAIL=0;
function T(name,cond,detail){if(cond){PASS++;console.log("  ok  "+name);}else{FAIL++;console.log("  FAIL "+name+(detail?" — "+detail:""));}}
const CFG=(over={})=>({seed:12345,name:"Test Gov",party:"D",bgId:"mayor",
  attrs:{CHA:6,INS:5,FIS:6,COA:6,FED:5,OPR:7},promises:["no_taxes","build_500k","fix_insurance"],scenario:"aswritten",...over});
const freeze=()=>{const f={norm:RNG.norm,chance:RNG.chance,r:RNG.r,int:RNG.int,pick:RNG.pick};
  let pi=0;RNG.norm=()=>0;RNG.chance=()=>false;RNG.r=()=>0.5;RNG.int=(a)=>a;RNG.pick=a=>a[(pi++)%a.length];return f;};
const thaw=f=>{RNG.norm=f.norm;RNG.chance=f.chance;RNG.r=f.r;RNG.int=f.int;RNG.pick=f.pick;};

console.log("— Senate Rules confirms most people now —");
{
  const rate=(bgId,attrs,party)=>{
    let ok=0;const N=300;
    for(let i=0;i<N;i++){
      const g=newGame(CFG({seed:5000+i,bgId,attrs,party}));
      transitionPick(g,"DOF","reformer");
      LAG_FNS._confirm(g,{code:"DOF"});
      const c=g.cabinet.find(x=>x.agency==="DOF");
      if(c&&!c.pending)ok++;
    }
    return ok/N;
  };
  const typical=rate("mayor",{CHA:6,INS:5,FIS:6,COA:6,FED:5,OPR:7},"D");
  console.log("    typical D governor (INS 5): "+(typical*100).toFixed(0)+"%");
  T("a typical governor confirms ~80% of reformer picks",typical>=0.72&&typical<=0.92,String(typical));
  const insider=rate("leg",{CHA:4,INS:9,FIS:6,COA:7,FED:3,OPR:4},"D");
  console.log("    insider (INS 9): "+(insider*100).toFixed(0)+"%");
  T("an insider does even better",insider>typical);
  const media=rate("media",{CHA:9,INS:2,FIS:4,COA:3,FED:4,OPR:3},"D");
  console.log("    media bg (NO BENCH, INS 2): "+(media*100).toFixed(0)+"%");
  T("the thin-bench penalty still bites",media<typical-0.10,media+" vs "+typical);
  const gop=rate("mayor",{CHA:6,INS:5,FIS:6,COA:6,FED:5,OPR:7},"R");
  console.log("    R governor vs D Senate: "+(gop*100).toFixed(0)+"%");
  T("cross-party friction still bites",gop<typical-0.08,gop+" vs "+typical);
}
console.log("— off-year specials: the next November, not the next cycle —");
{
  const g=newGame(CFG({seed:1}));
  const M=MEASURES.find(x=>x.id==="m_oilsev");
  g.measures.pending.push({...M,gathering:true,sigsGot:M.sigs-1000,rate:200,startTurn:1,playerSpend:2});
  g.turn=5; // May 2027
  const f=freeze();endMonth(g);thaw(f);
  const m=g.measures.pending.find(x=>x.id==="m_oilsev");
  T("qualifying in spring 2027 targets November 2027 (turn 11)",m&&!m.gathering&&m.electionTurn===11,m&&String(m.electionTurn));
  T("...and the wire calls it an odd-year special",g.feed.some(x=>x.hl.includes("odd-year special")));
  // and that November actually holds the election
  g.turn=11;g.approval=55;m.baseYes=99;
  const d0=g.fiscal.deficit;
  const f2=freeze();endMonth(g);thaw(f2);
  T("November 2027 resolves it",!g.measures.pending.find(x=>x.id==="m_oilsev")&&(g.measures.resolved||[]).some(x=>x.id==="m_oilsev"));
  T("...with real fiscal effect ($1.5B/yr)",g.fiscal.deficit<d0,g.fiscal.deficit+" vs "+d0);
  T("...and the special-election story ran",g.feed.some(x=>x.hl.includes("odd-year election day")));
  // too late for this year's ballot → next November
  const g2=newGame(CFG({seed:2}));
  g2.measures.pending.push({...M,gathering:true,sigsGot:M.sigs-1000,rate:200,startTurn:5,playerSpend:2});
  g2.turn=9; // Sept 2027 — inside the 131-day-ish buffer
  const f3=freeze();endMonth(g2);thaw(f3);
  T("qualifying in September waits for November 2028",g2.measures.pending[0].electionTurn===23,String(g2.measures.pending[0].electionTurn));
}
console.log("— the vanishing second measure: broke launches refund —");
{
  const g=newGame(CFG({seed:3}));g.player.chest=10;g.pc=40;g.slots=3;
  const ballot=ACTIONS.find(a=>a.id==="ballot");
  const f=freeze();RNG.r=()=>0.05;RNG.int=(a,b)=>Math.round((a+b)/2);
  spendSlots(g,2);spendPC(g,10);ballot.run(g,"m_oilsev");thaw(f); // $8M — affordable
  T("first launch lands",g.measures.pending.length===1&&g.player.chest===2);
  const pc0=g.pc,sl0=g.slots;
  const f2=freeze();spendSlots(g,2);spendPC(g,10);ballot.run(g,"m_splitroll");thaw(f2); // $8M vs $2M chest
  T("second launch refuses — and refunds the 2 slots + 10 PC",g.measures.pending.length===1&&g.pc===pc0&&g.slots===sl0,
    "pc "+g.pc+"/"+pc0+" slots "+g.slots+"/"+sl0);
  T("...with the no-billing story",g.feed.some(x=>x.hl.includes("stalls at the bank")));
  T("the menu warns before you click",ballot.choices(g).every(c=>c.cost.includes("NEEDS $")));
  // surge and ads refund too
  const pm=ACTIONS.find(a=>a.id==="pushmeasure");
  g.player.chest=1;
  const pc1=g.pc,sl1=g.slots;
  spendSlots(g,1);spendPC(g,3);pm.run(g,"m_oilsev|surge");
  T("a bounced surge refunds its slot and 3 PC",g.pc===pc1&&g.slots===sl1);
  const g3=newGame(CFG({seed:4}));g3.player.chest=1;g3.pc=40;
  g3.measures.pending.push({...MEASURES.find(x=>x.id==="m_splitroll"),gathering:false,electionTurn:23,playerSpend:2,startTurn:1});
  const pc2=g3.pc,sl2=g3.slots;
  spendSlots(g3,1);spendPC(g3,3);pm.run(g3,"m_splitroll|ads");
  T("a dead ad buy refunds its slot and 3 PC",g3.pc===pc2&&g3.slots===sl2);
}
console.log("— unaffordable choices lock instead of lying —");
{
  const g=newGame(CFG({seed:5}));g.player.chest=6; // real case: $6M chest vs $8M/$12M drives
  const ballot=ACTIONS.find(a=>a.id==="ballot");
  T("every drive the chest can't cover is flagged disabled",ballot.choices(g).every(c=>c.disabled===true));
  T("...and says what's missing",ballot.choices(g).every(c=>c.cost.includes("NEEDS $")&&c.cost.includes("you have $6M")));
  const html=choicesModal(g,ballot);
  T("the modal renders them locked and unclickable",html.includes('class="choice locked" disabled')&&!html.includes("keyhint"));
  g.player.chest=20;
  const html2=choicesModal(g,ballot);
  T("with money, the menu unlocks and hotkeys return",!html2.includes("locked")&&html2.includes("keyhint"));
  // the memo warns when it recommends a route you can't afford
  const g2=newGame(CFG({seed:6}));g2.fiscal.deficit=35;g2.player.chest=6;
  const memo=buildMemo(g2).find(l=>l.includes("AROUND the building"));
  T("memo names the war-chest gap on the ballot route",!!memo&&memo.includes("FUNDRAISE first"),memo);
  const g3=newGame(CFG({seed:7}));g3.fiscal.deficit=35;g3.player.chest=20;
  const memo3=buildMemo(g3).find(l=>l.includes("AROUND the building"));
  T("...and drops the warning once funded",!!memo3&&!memo3.includes("FUNDRAISE first"));
}
console.log("— the trackers read at a glance (V3-P3 gauges) —");
{
  const g=newGame(CFG({seed:8}));
  const b={...BILL_POOL.find(x=>x.id==="b_upzone"),stage:"floor",sponsored:true,whip:2};
  makeHoldouts(g,b);g.bills.pipeline=[b];
  g.measures.pending=[
    {...MEASURES.find(m=>m.id==="m_sportsbet"),gathering:true,sigsGot:100000,rate:60,startTurn:g.turn-4,playerSpend:2},
    {...MEASURES.find(m=>m.id==="m_splitroll"),gathering:false,electionTurn:23,playerSpend:7,startTurn:1}];
  g.actors.chamber=-30;g.turn=6;
  const p=legTrackerPanel(g);
  T("floor bills carry Asm+Sen vote gauges",(p.match(/class="vg"/g)||[]).length>=2&&p.includes("needed"));
  T("a slow drive is called BEHIND PACE with the required rate",p.includes("BEHIND PACE")&&/needs ~\d+k\/mo/.test(p));
  T("qualified measures get the YES gauge with the 50% tick",p.includes("50% to pass")&&p.includes("polls ~"));
  T("banked campaign spend shows as a chip",p.includes("pts banked"));
  T("holdouts render as chips",p.includes("mchip")&&p.includes(b.holdouts[0].nm));
  const fast={...MEASURES.find(m=>m.id==="m_oilsev"),gathering:true,sigsGot:400000,rate:200,startTurn:g.turn-1,playerSpend:2};
  g.measures.pending=[fast];
  T("a healthy drive projects its qualification month",/on pace — qualifies ~\w+ \d{4}/.test(legTrackerPanel(g)));
  // the desk list no longer duplicates the September set-piece
  g.bills.desk=[{...BILL_POOL.find(x=>x.id==="b_ai"),stage:"passed"}];
  T("desk bills live in the set-piece, not twice",!legTrackerPanel(g).includes("ON THE DESK")&&setpiece(g,turnDate(g.turn)).includes("SEPTEMBER DESK"));
}
console.log("\nRESULT: "+PASS+" passed, "+FAIL+" failed");
if(FAIL)process.exit(1);
