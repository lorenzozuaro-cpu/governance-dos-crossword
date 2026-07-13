
let puzzle;
let cells = [];
let currentEntry = null;

let timerInterval = null;
let elapsedSeconds = 0;
let timerStarted = false;
let puzzleCompleted = false;
const key=(r,c)=>`${r}-${c}`;
fetch('puzzle.json').then(r=>r.json()).then(data=>{puzzle=data;init();});

function init(){
 document.title=puzzle.title;
 document.getElementById('title').textContent=puzzle.title;
 const grid=document.getElementById('grid');
 const occupied=new Map(), starts=new Map();
 puzzle.entries.forEach(e=>{
   starts.set(key(e.row,e.col), e.number);
   for(let i=0;i<e.answer.length;i++){
     const r=e.row+(e.direction==='down'?i:0), c=e.col+(e.direction==='across'?i:0);
     const k=key(r,c); if(!occupied.has(k)) occupied.set(k,[]);
     occupied.get(k).push(e);
   }
 });
 for(let r=0;r<puzzle.size;r++) for(let c=0;c<puzzle.size;c++){
   const div=document.createElement('div'); div.className='cell'; div.dataset.r=r; div.dataset.c=c;
   const k=key(r,c);
   if(occupied.has(k)){
     div.classList.add('open');
     if(starts.has(k)){const n=document.createElement('span');n.className='num';n.textContent=starts.get(k);div.appendChild(n);}
     const inp=document.createElement('input'); inp.maxLength=1; inp.autocomplete='off'; inp.setAttribute('aria-label',`Riga ${r+1}, colonna ${c+1}`);
     inp.addEventListener('focus',()=>selectCell(r,c));
     inp.addEventListener('input',ev=>handleInput(ev,r,c));
     inp.addEventListener('keydown',ev=>handleKey(ev,r,c));
     div.appendChild(inp); cells.push({r,c,div,inp,entries:occupied.get(k)});
   }
   grid.appendChild(div);
 }
 buildClues('across','Orizzontali'); buildClues('down','Verticali');
 const saved=localStorage.getItem('governanceDosCrossword');
 if(saved){const vals=JSON.parse(saved);cells.forEach(x=>x.inp.value=vals[key(x.r,x.c)]||'');}
 updateProgress();
}
function buildClues(direction,title){
 const box=document.getElementById(direction); box.innerHTML=`<h2>${title}</h2>`;
 puzzle.entries.filter(e=>e.direction===direction).sort((a,b)=>a.number-b.number).forEach(e=>{
   const d=document.createElement('div');d.className='clue';d.dataset.answer=e.answer;
   d.innerHTML=`<b>${e.number}.</b> ${e.clue} <span>(${e.answer.length})</span>`;
   d.onclick=()=>selectEntry(e);box.appendChild(d);
 });
}
function selectCell(r,c){
 const cell=cells.find(x=>x.r===r&&x.c===c); if(!cell)return;
 let entry=cell.entries[0];
 if(currentEntry && cell.entries.includes(currentEntry) && cell.entries.length>1) entry=cell.entries.find(e=>e!==currentEntry);
 selectEntry(entry,false);
 cell.inp.focus();
}
function selectEntry(e,focus=true){
 currentEntry=e; document.querySelectorAll('.cell').forEach(x=>x.classList.remove('active','related'));
 document.querySelectorAll('.clue').forEach(x=>x.classList.remove('active'));
 for(let i=0;i<e.answer.length;i++){
   const r=e.row+(e.direction==='down'?i:0), c=e.col+(e.direction==='across'?i:0);
   const cell=cells.find(x=>x.r===r&&x.c===c); if(cell)cell.div.classList.add('related');
 }
 const first=cells.find(x=>x.r===e.row&&x.c===e.col); if(first)first.div.classList.add('active');
 const clue=[...document.querySelectorAll('.clue')].find(x=>x.dataset.answer===e.answer);if(clue)clue.classList.add('active');
 if(focus){const empty=getEntryCells(e).find(x=>!x.inp.value)||getEntryCells(e)[0];empty.inp.focus();}
}
function getEntryCells(e){return Array.from({length:e.answer.length},(_,i)=>cells.find(x=>x.r===e.row+(e.direction==='down'?i:0)&&x.c===e.col+(e.direction==='across'?i:0)));}
function handleInput(ev,r,c){
 ev.target.value=ev.target.value.replace(/[^a-zA-ZÀ-ÿ]/g,'').slice(-1).toUpperCase();save();updateProgress();
 if(ev.target.value&&currentEntry){const arr=getEntryCells(currentEntry),idx=arr.findIndex(x=>x.r===r&&x.c===c);if(idx<arr.length-1)arr[idx+1].inp.focus();}
}
function handleKey(ev,r,c){
 if(ev.key==='Backspace'&&!ev.target.value&&currentEntry){const arr=getEntryCells(currentEntry),idx=arr.findIndex(x=>x.r===r&&x.c===c);if(idx>0){arr[idx-1].inp.value='';arr[idx-1].inp.focus();save();updateProgress();}}
 if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(ev.key)){ev.preventDefault();const dr=ev.key==='ArrowUp'?-1:ev.key==='ArrowDown'?1:0,dc=ev.key==='ArrowLeft'?-1:ev.key==='ArrowRight'?1:0;const next=cells.find(x=>x.r===r+dr&&x.c===c+dc);if(next)next.inp.focus();}
}
function save(){const vals={};cells.forEach(x=>vals[key(x.r,x.c)]=x.inp.value);localStorage.setItem('governanceDosCrossword',JSON.stringify(vals));}
function updateProgress(){const done=cells.filter(x=>x.inp.value).length;document.getElementById('status').textContent=`${done}/${cells.length} caselle`;}
function check(){
 cells.forEach(x=>x.div.classList.remove('wrong','correct'));
 cells.forEach(x=>{
   const expected=x.entries[0].answer[(x.entries[0].direction==='across'?x.c-x.entries[0].col:x.r-x.entries[0].row)];
   if(x.inp.value) x.div.classList.add(x.inp.value===expected?'correct':'wrong');
 });
 const all=cells.every(x=>{const e=x.entries[0],i=e.direction==='across'?x.c-e.col:x.r-e.row;return x.inp.value===e.answer[i];});
 if(all)alert('Complimenti! Hai completato le Parole Crociate Governance DOS.');
}
function reveal(){
 if(!confirm('Mostrare tutta la soluzione?'))return;
 cells.forEach(x=>{const e=x.entries[0],i=e.direction==='across'?x.c-e.col:x.r-e.row;x.inp.value=e.answer[i];});save();check();updateProgress();
}
function resetPuzzle(){if(confirm('Cancellare tutte le risposte?')){cells.forEach(x=>{x.inp.value='';x.div.classList.remove('wrong','correct')});localStorage.removeItem('governanceDosCrossword');updateProgress();}}
