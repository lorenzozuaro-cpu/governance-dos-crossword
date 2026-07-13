
let puzzle;
let cells = [];
let currentEntry = null;

let timerInterval = null;
let elapsedSeconds = 0;
let timerStarted = false;
let puzzleCompleted = false;
let checkCount = 0;
let wrongChecks = 0;
let solutionUsed = false;
const key=(r,c)=>`${r}-${c}`;
function updateTimerDisplay(){
    const timer = document.getElementById('timer');
    if(!timer) return;

    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;

    timer.textContent =
        `⏱️ ${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;
}

function startTimer(){
    if(timerStarted || puzzleCompleted) return;

    timerStarted = true;

    timerInterval = setInterval(() => {
        elapsedSeconds++;
        updateTimerDisplay();
    }, 1000);
}

function stopTimer(){
    if(timerInterval){
        clearInterval(timerInterval);
        timerInterval = null;
    }
}
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
    ev.target.value = ev.target.value
        .replace(/[^a-zA-ZÀ-ÿ]/g,'')
        .slice(-1)
        .toUpperCase();

    if(ev.target.value){
        startTimer();
    }

    save();
    updateProgress();

    if(ev.target.value && currentEntry){
        const arr = getEntryCells(currentEntry);
        const idx = arr.findIndex(x => x.r === r && x.c === c);

        if(idx < arr.length - 1){
            arr[idx + 1].inp.focus();
        }
    }
}
function handleKey(ev,r,c){
 if(ev.key==='Backspace'&&!ev.target.value&&currentEntry){const arr=getEntryCells(currentEntry),idx=arr.findIndex(x=>x.r===r&&x.c===c);if(idx>0){arr[idx-1].inp.value='';arr[idx-1].inp.focus();save();updateProgress();}}
 if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(ev.key)){ev.preventDefault();const dr=ev.key==='ArrowUp'?-1:ev.key==='ArrowDown'?1:0,dc=ev.key==='ArrowLeft'?-1:ev.key==='ArrowRight'?1:0;const next=cells.find(x=>x.r===r+dr&&x.c===c+dc);if(next)next.inp.focus();}
}
function save(){const vals={};cells.forEach(x=>vals[key(x.r,x.c)]=x.inp.value);localStorage.setItem('governanceDosCrossword',JSON.stringify(vals));}
function updateProgress(){
    const done = cells.filter(x => x.inp.value).length;
    const total = cells.length;

    const percentage = total === 0
        ? 0
        : Math.round((done / total) * 100);

    const status = document.getElementById('status');
    const progressBar = document.getElementById('progressBar');

    if(status){
        status.textContent =
            `${done}/${total} caselle · ${percentage}%`;
    }

    if(progressBar){
        progressBar.style.width = `${percentage}%`;
    }
}
function calculateScore(){
    if(solutionUsed){
        return 0;
    }

    let score = 100;

    score -= wrongChecks * 2;
    score -= Math.max(0, checkCount - 1) * 3;

    const extraMinutes = Math.max(
        0,
        Math.floor((elapsedSeconds - 300) / 60)
    );

    score -= extraMinutes * 2;

    return Math.max(0, Math.min(100, score));
}

function getResultMessage(score){
    if(solutionUsed){
        return {
            title: "Soluzione consultata",
            message: "È stata aperta automaticamente una Change Request per annullare il risultato."
        };
    }

    if(score >= 95){
        return {
            title: "Governance Legend",
            message: "Hai completato la sfida senza convocare una call di allineamento. Evento rarissimo."
        };
    }

    if(score >= 85){
        return {
            title: "Governance Master",
            message: "Ottima performance. Le retrospettive ti temono."
        };
    }

    if(score >= 70){
        return {
            title: "PMO Specialist",
            message: "Qualche acronimo ti ha rallentato, ma il reporting può partire."
        };
    }

    if(score >= 50){
        return {
            title: "Meeting Survivor",
            message: "Sei arrivato alla fine. Ora serve solo una riunione per analizzare le lesson learned."
        };
    }

    if(score >= 30){
        return {
            title: "Action Item Creator",
            message: "Hai creato parecchie action. Resta solo da capire chi sarà l’Accountable."
        };
    }

    return {
        title: "Change Request urgente",
        message: "Il risultato richiede un tavolo di approfondimento e almeno tre follow-up."
    };
}

function formatTime(seconds){
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return (
        String(minutes).padStart(2, "0") +
        ":" +
        String(remainingSeconds).padStart(2, "0")
    );
}

function showFinalResult(){
    const score = calculateScore();
    const result = getResultMessage(score);

    const modal = document.getElementById('resultModal');
    const icon = document.getElementById('resultIcon');
    const title = document.getElementById('resultTitle');
    const scoreValue = document.getElementById('resultScore');
    const time = document.getElementById('resultTime');
    const checks = document.getElementById('resultChecks');
    const message = document.getElementById('resultMessage');

    if(solutionUsed){
        icon.textContent = '📋';
    }else if(score >= 95){
        icon.textContent = '👑';
    }else if(score >= 85){
        icon.textContent = '🏆';
    }else if(score >= 70){
        icon.textContent = '📊';
    }else if(score >= 50){
        icon.textContent = '☕';
    }else{
        icon.textContent = '🚨';
    }

    title.textContent = result.title;
    scoreValue.textContent = score;
    time.textContent = formatTime(elapsedSeconds);
    checks.textContent = checkCount;
    message.textContent = result.message;

    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
}
function closeResultModal(){
    const modal = document.getElementById('resultModal');

    if(!modal) return;

    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
}

async function shareResult(){
    const score = calculateScore();
    const result = getResultMessage(score);

    const shareText =
        "DOS Governance Challenge\n\n" +
        "Punteggio: " + score + "/100\n" +
        "Tempo: " + formatTime(elapsedSeconds) + "\n" +
        "Livello: " + result.title + "\n\n" +
        window.location.href;

    try{
        if(navigator.share){
            await navigator.share({
                title: "DOS Governance Challenge",
                text: shareText
            });
            return;
        }

        await navigator.clipboard.writeText(shareText);
        alert("Risultato copiato negli appunti!");
    }catch(error){
        console.error("Condivisione non riuscita:", error);
    }
}
function check(){
    checkCount++;

    cells.forEach(x => {
        x.div.classList.remove('wrong', 'correct');
    });

    let currentWrong = 0;

    cells.forEach(x => {
        const entry = x.entries[0];
        const index =
            entry.direction === 'across'
                ? x.c - entry.col
                : x.r - entry.row;

        const expected = entry.answer[index];

        if(x.inp.value){
            if(x.inp.value === expected){
                x.div.classList.add('correct');
            }else{
                x.div.classList.add('wrong');
                currentWrong++;
            }
        }
    });

    wrongChecks += currentWrong;

    const all = cells.every(x => {
        const entry = x.entries[0];
        const index =
            entry.direction === 'across'
                ? x.c - entry.col
                : x.r - entry.row;

        return x.inp.value === entry.answer[index];
    });

    if(all && !puzzleCompleted){
        puzzleCompleted = true;
        stopTimer();
        showFinalResult();
    }
}
function reveal(){
    if(!confirm('Mostrare tutta la soluzione?')) return;

    solutionUsed = true;

    cells.forEach(x => {
        const entry = x.entries[0];
        const index =
            entry.direction === 'across'
                ? x.c - entry.col
                : x.r - entry.row;

        x.inp.value = entry.answer[index];
    });

    save();
    updateProgress();
    puzzleCompleted = true;
    stopTimer();
    showFinalResult();
}
function resetPuzzle(){
    if(!confirm('Cancellare tutte le risposte?')) return;

    stopTimer();

    elapsedSeconds = 0;
    timerStarted = false;
    puzzleCompleted = false;
    checkCount = 0;
    wrongChecks = 0;
    solutionUsed = false;

    cells.forEach(x => {
        x.inp.value = '';
        x.div.classList.remove('wrong', 'correct');
    });

    localStorage.removeItem('governanceDosCrossword');

    updateTimerDisplay();
    updateProgress();
}
