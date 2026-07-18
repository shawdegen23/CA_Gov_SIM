/* Headless DOM stubs — just enough browser for the engine to boot outside one.
   The game is a single file; these let node run the <script> block verbatim. */
const noop=()=>{};
const fakeEl={innerHTML:"",style:{},dataset:{},remove:noop,select:noop,click:noop,appendChild:noop,querySelector:()=>null,querySelectorAll:()=>[],getBoundingClientRect:()=>({left:0,top:0,width:0,height:0}),value:""};
var document={addEventListener:noop,getElementById:()=>({...fakeEl}),querySelector:()=>null,querySelectorAll:()=>[],createElement:()=>({...fakeEl}),body:{appendChild:noop},execCommand:noop};
var window={addEventListener:noop,print:noop};
var navigator={clipboard:null};
var location={reload:noop};
var localStorage={getItem:()=>null,setItem:noop,removeItem:noop};
var setTimeout=noop;
