/* ================= FUZZ-1: monkey fuzzer · determinism · save/load equivalence ================= */
let PASS=0,FAIL=0;
function T(name,cond,detail){if(cond){PASS++;console.log("  ok  "+name);}else{FAIL++;console.log("  FAIL "+name+(detail?" — "+detail:""));}}
const CFG=(over={})=>({seed:12345,name:"Fuzz Gov",party:"D",bgId:"leg",
  attrs:{CHA:4,INS:9,FIS:6,COA:7,FED:3,OPR:4},promises:["no_taxes","build_500k","fix_insurance"],scenario:"aswritten",...over});
/* the fuzzer's own RNG is seeded too — a failure prints (seed, turn, action) and is replayable */
const mkRand=s=>{let x=s>>>0;return()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x/4294967296;};};

console.log("— monkey fuzzer: random legal actions, full terms —");
{
  const SEEDS=60,errors=[];
  for(let s=200;s<200+SEEDS;s++){
    const g=newGame(CFG({seed:s}));
    const rand=mkRand(s*7+1);
    const pick=a=>a[Math.floor(rand()*a.length)];
    for(let t=0;t<48&&!g.over;t++){
      const acts=Math.floor(rand()*4); // 0–3 actions a month, like a real player
      for(let k=0;k<acts;k++){
        let avail;
        try{avail=ACTIONS.filter(a=>a.when(g)===true);}
        catch(e){errors.push({seed:s,turn:g.turn,at:"when()",msg:e.message});break;}
        if(!avail.length)break;
        const a=pick(avail);
        let cid;
        if(a.builder){ // the budget builder: the UI supplies the mix, so the fuzzer rolls one
          cid={cuts:Math.floor(rand()*9),taxes:Math.floor(rand()*7),reserves:Math.floor(rand()*4),
               gimmicks:Math.floor(rand()*6),rosy:Math.floor(rand()*9)};
        }else if(a.choices){
          let ch;
          try{ch=a.choices(g);}catch(e){errors.push({seed:s,turn:g.turn,at:a.id+".choices()",msg:e.message});continue;}
          if(!ch||!ch.length)continue;
          cid=pick(ch).id;
        }
        try{a.run(g,cid);}catch(e){errors.push({seed:s,turn:g.turn,at:a.id+".run("+(cid&&cid.id?cid.id:cid)+")",msg:e.message});}
      }
      // the desk: sign or veto at random, never abdicate
      try{while(g.bills.desk.length){const b=g.bills.desk.shift();enactBill(g,b,rand()<0.5?"sign":"veto");}}
      catch(e){errors.push({seed:s,turn:g.turn,at:"desk",msg:e.message});}
      try{endMonth(g);}catch(e){errors.push({seed:s,turn:g.turn,at:"endMonth",msg:e.message});break;}
    }
  }
  for(const e of errors.slice(0,6))console.log("    ERR "+JSON.stringify(e));
  if(errors.length>6)console.log("    ...and "+(errors.length-6)+" more");
  T(SEEDS+" fuzzed terms, zero uncaught exceptions",errors.length===0,errors.length+" errors");
}
console.log("— determinism: same seed + same script = same state, twice —");
{
  const script=g=>{ // deterministic play: first available action, first choice, every month
    for(let t=0;t<48&&!g.over;t++){
      const a=ACTIONS.find(x=>{try{return x.when(g)===true;}catch(_){return false;}});
      if(a){let cid;
        if(a.builder)cid={cuts:4,taxes:2,reserves:1,gimmicks:1,rosy:2};
        else if(a.choices){const ch=a.choices(g);if(!ch||!ch.length){endMonth(g);continue;}cid=ch[0].id;}
        try{a.run(g,cid);}catch(_){}}
      while(g.bills.desk.length)enactBill(g,g.bills.desk.shift(),"sign");
      endMonth(g);
    }
    return g;
  };
  const h1=JSON.stringify(script(newGame(CFG({seed:777}))));
  const h2=JSON.stringify(script(newGame(CFG({seed:777}))));
  T("two identical runs, byte-identical end states",h1===h2,"lengths "+h1.length+" vs "+h2.length);
  const h3=JSON.stringify(script(newGame(CFG({seed:778}))));
  T("a different seed is a different game",h1!==h3);
}
console.log("— save/load equivalence: a thawed save continues identically —");
{
  const play=(g,months)=>{ // same deterministic script, resumable at any point
    for(let t=0;t<months&&!g.over;t++){
      const a=ACTIONS.find(x=>{try{return x.when(g)===true;}catch(_){return false;}});
      if(a){let cid;
        if(a.builder)cid={cuts:4,taxes:2,reserves:1,gimmicks:1,rosy:2};
        else if(a.choices){const ch=a.choices(g);if(ch&&ch.length)cid=ch[0].id;else{endMonth(g);continue;}}
        try{a.run(g,cid);}catch(_){}}
      while(g.bills.desk.length)enactBill(g,g.bills.desk.shift(),"veto");
      endMonth(g);
    }
    return g;
  };
  // branch A: 24 months, freeze, thaw, 24 more
  const gA=play(newGame(CFG({seed:999})),24);
  const blob=JSON.stringify({rngState:RNG.state,rngCalls:RNG.calls,game:gA});
  const env=JSON.parse(blob);
  const gThawed=env.game;RNG.restore(env.rngState,env.rngCalls);
  const endA=JSON.stringify(play(gThawed,24));
  // branch B: 48 months uninterrupted
  const endB=JSON.stringify(play(newGame(CFG({seed:999})),48));
  T("24mo → save → load → 24mo equals 48mo straight through",endA===endB,"lengths "+endA.length+" vs "+endB.length);
}
console.log("\nRESULT: "+PASS+" passed, "+FAIL+" failed");
if(FAIL)process.exit(1);
