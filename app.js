
let puzzle;
let cells = [];
let currentEntry = null;
let playerNickname = '';
let timerInterval = null;
let elapsedSeconds = 0;
let timerStarted = false;
let puzzleCompleted = false;
let gamePaused = false;
let finishedManually = false;
let checkCount = 0;
let wrongChecks = 0;
let solutionUsed = false;
let helpCount = 0;
let helpedCells = new Set();
let penalizedWrongCells = new Set();
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
    saveTimerState();
}, 1000);
}

function stopTimer(){
    if(timerInterval){
        clearInterval(timerInterval);
        timerInterval = null;
    }

    timerStarted = false;
    saveTimerState();
}

function saveTimerState(){
    localStorage.setItem(
        'governanceDosTimer',
        JSON.stringify({
            elapsedSeconds: elapsedSeconds
        })
    );
}

function restoreTimerState(){
    const savedTimer = localStorage.getItem('governanceDosTimer');

    if(!savedTimer){
        elapsedSeconds = 0;
        timerStarted = false;
        updateTimerDisplay();
        return;
    }

    try{
        const timerData = JSON.parse(savedTimer);

        elapsedSeconds = Number(timerData.elapsedSeconds) || 0;
        timerStarted = false;

        updateTimerDisplay();
    }catch(error){
        elapsedSeconds = 0;
        timerStarted = false;
        updateTimerDisplay();
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
 const saved = localStorage.getItem('governanceDosCrossword');

if(saved){
    const vals = JSON.parse(saved);

    cells.forEach(x => {
        x.inp.value = vals[key(x.r,x.c)] || '';
    });
}
const savedGameState = localStorage.getItem('governanceDosGameState');

if(savedGameState){
    try{
        const gameState = JSON.parse(savedGameState);

        checkCount = Number(gameState.checkCount) || 0;
        wrongChecks = Number(gameState.wrongChecks) || 0;
        solutionUsed = Boolean(gameState.solutionUsed);
        puzzleCompleted = Boolean(gameState.puzzleCompleted);
        gamePaused = Boolean(gameState.gamePaused);
        finishedManually = Boolean(gameState.finishedManually);
        helpCount = Number(gameState.helpCount) || 0;
        helpedCells = new Set(gameState.helpedCells || []);
        penalizedWrongCells = new Set(
           gameState.penalizedWrongCells || []
        );
    }catch(error){
        checkCount = 0;
        wrongChecks = 0;
        solutionUsed = false;
        puzzleCompleted = false;
        gamePaused = false;
        finishedManually = false;
        helpCount = 0;
        helpedCells = new Set();
        penalizedWrongCells = new Set();
    }
}

restoreTimerState();
updateProgress();
setGameLocked(puzzleCompleted);
if(gamePaused && !puzzleCompleted){
    cells.forEach(cell => {
        cell.inp.disabled = true;
    });

    const checkButton = document.querySelector(
        'button[onclick="check()"]'
    );

    const helpButton = document.querySelector(
        'button[onclick="helpSelectedWord()"]'
    );

    const finishButton = document.querySelector(
        'button[onclick="finishGame()"]'
    );

    const pauseButton = document.getElementById('pauseButton');

    if(checkButton) checkButton.disabled = true;
    if(helpButton) helpButton.disabled = true;
    if(finishButton) finishButton.disabled = true;

    if(pauseButton){
        pauseButton.textContent = 'Riprendi';
    }

    document.body.classList.add('game-paused');
    }    
    const savedNickname = localStorage.getItem('governanceDosNickname');

if(savedNickname){
    playerNickname = savedNickname;

    const nicknameInput = document.getElementById('nicknameInput');

    if(nicknameInput){
        nicknameInput.value = savedNickname;
    }
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
function save(){
    const vals = {};

    cells.forEach(x => {
        vals[key(x.r,x.c)] = x.inp.value;
    });

    localStorage.setItem(
        'governanceDosCrossword',
        JSON.stringify(vals)
    );

    localStorage.setItem(
        'governanceDosGameState',
        JSON.stringify({
            checkCount: checkCount,
            wrongChecks: wrongChecks,
            solutionUsed: solutionUsed,
            puzzleCompleted: puzzleCompleted,
            gamePaused: gamePaused,
            finishedManually: finishedManually,
            helpCount: helpCount,
            helpedCells: Array.from(helpedCells),
            penalizedWrongCells: Array.from(penalizedWrongCells)
        })
    );
}
function updateProgress(){
    const done = cells.filter(x => x.inp.value).length;
    const total = cells.length;

    const percentage = total === 0
        ? 0
        : Math.round((done / total) * 100);

    const status = document.getElementById('status');
    const progressBar = document.getElementById('progressBar');
    const finishButton = document.querySelector(
    'button[onclick="finishGame()"]'
);

    if(status){
        status.textContent =
            `${done}/${total} caselle · ${percentage}%`;
    }

    if(progressBar){
        progressBar.style.width = `${percentage}%`;
    }
    if(finishButton && !puzzleCompleted){
    const gridCompleted = done === total && total > 0;

    finishButton.disabled = gridCompleted;
    finishButton.textContent = gridCompleted
        ? 'Completa: premi Controlla'
        : 'Termina';
}
}
function calculateScore(){
    const totalCells = cells.length;

    if(totalCells === 0){
        return 0;
    }

    const correctUserCells = cells.filter(cell => {
        const cellKey = key(cell.r, cell.c);

        // Le caselle compilate tramite Aiuto non assegnano punti
        if(helpedCells.has(cellKey)){
            return false;
        }

        if(!cell.inp.value){
            return false;
        }

        const entry = cell.entries[0];
        const index =
            entry.direction === 'across'
                ? cell.c - entry.col
                : cell.r - entry.row;

        return cell.inp.value === entry.answer[index];
    }).length;

    let score = Math.round(
        (correctUserCells / totalCells) * 100
    );

    // Penalità per errori rilevati con Controlla
    score -= wrongChecks * 2;

    // Penalità dal secondo controllo in poi
    score -= Math.max(0, checkCount - 1) * 3;

    // Penalità dopo i primi 5 minuti
    const extraMinutes = Math.max(
        0,
        Math.floor((elapsedSeconds - 300) / 60)
    );

    score -= extraMinutes * 2;

    return Math.max(0, Math.min(100, score));
}
function buildGameResult(){
    const score = calculateScore();
    const result = getResultMessage(score);

    return {
        nickname: playerNickname,
        score: score,
        level: result.title,
        elapsedSeconds: elapsedSeconds,
        formattedTime: formatTime(elapsedSeconds),
        checkCount: checkCount,
        wrongChecks: wrongChecks,
        helpCount: helpCount,
        completed: !finishedManually,
        finishedManually: finishedManually,
        playedAt: new Date().toISOString()
    };
}
function getResultMessage(score){
    if(solutionUsed){
        return {
            title: "Soluzione consultata",
            message: "È stata aperta automaticamente una Change Request per annullare il risultato."
        };
    }
    if(finishedManually){
    return {
        title: "Sfida terminata",
        message: "Hai chiuso la partita prima del completamento. Il punteggio considera solo le risposte valide inserite."
    };
}

    if(score >= 95){
        return {
            title: "Governance Legend",
            message: "Con te la Governance è salva, indicaci la via"
        };
    }

    if(score >= 85){
        return {
            title: "Governance Master",
            message: "Ottima performance. Sei vicino al TOP!"
        };
    }

    if(score >= 70){
        return {
            title: "PM Specialist",
            message: " Ci siamo! Qualche acronimo ti ha rallentato, non cambiare il focus."
        };
    }

    if(score >= 50){
        return {
            title: "PM Intermedio",
            message: "Sei arrivato alla fine. La situazione è gestibile, ma fissiamo un allineamento."
        };
    }

    if(score >= 30){
        return {
            title: "PM Base",
            message: "Le basi ci sono. Ora serve solo qualche action item."
        };
    }

    return {
        title: "PM in onboarding",
        message: "Prima settimana difficile. Ti mandiamo il materiale da studiare."
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
    const gameResult = buildGameResult();

    const modal = document.getElementById('resultModal');
    const icon = document.getElementById('resultIcon');
    const title = document.getElementById('resultTitle');
    const scoreValue = document.getElementById('resultScore');
    const nicknameValue = document.getElementById('resultNickname');
    const time = document.getElementById('resultTime');
    const checks = document.getElementById('resultChecks');
    const helps = document.getElementById('resultHelps');
    const outcome = document.getElementById('resultOutcome');
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
    nicknameValue.textContent = playerNickname || '-';
    time.textContent = formatTime(elapsedSeconds);
    checks.textContent = checkCount;
    helps.textContent = helpCount;
    outcome.textContent = finishedManually
    ? 'Terminata in anticipo'
    : 'Completata';
    message.textContent = result.message;
    
    localStorage.setItem(
        'governanceDosLastResult',
        JSON.stringify(gameResult)
    );

    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
}
function closeResultModal(){
    const modal = document.getElementById('resultModal');

    if(!modal) return;

    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
}
function createResultImage(){
    const gameResult = buildGameResult();

    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1080;

    const ctx = canvas.getContext('2d');

    const background = ctx.createLinearGradient(
        0,
        0,
        canvas.width,
        canvas.height
    );

    background.addColorStop(0, '#111827');
    background.addColorStop(1, '#020617');

    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';

    ctx.font = '700 34px Arial';
    ctx.fillText(
        'DOS GOVERNANCE CHALLENGE',
        canvas.width / 2,
        110
    );

    ctx.font = '700 64px Arial';
    ctx.fillText(
        gameResult.level,
        canvas.width / 2,
        220
    );

    ctx.font = '700 180px Arial';
    ctx.fillText(
        gameResult.score,
        canvas.width / 2,
        445
    );

    ctx.font = '500 46px Arial';
    ctx.fillText(
        '/100',
        canvas.width / 2,
        510
    );

    ctx.font = '700 42px Arial';
    ctx.fillText(
        gameResult.nickname || 'Giocatore',
        canvas.width / 2,
        610
    );

    ctx.font = '500 34px Arial';

    ctx.fillText(
        `Tempo: ${gameResult.formattedTime}`,
        canvas.width / 2,
        700
    );

    ctx.fillText(
        `Controlli: ${gameResult.checkCount}  ·  Aiuti: ${gameResult.helpCount}`,
        canvas.width / 2,
        760
    );

    ctx.fillText(
        gameResult.finishedManually
            ? 'Terminata in anticipo'
            : 'Completata',
        canvas.width / 2,
        820
    );

    ctx.font = '400 26px Arial';
    ctx.fillStyle = '#cbd5e1';

    ctx.fillText(
        'Condividi il risultato nella chat per entrare in classifica',
        canvas.width / 2,
        940
    );

    return canvas;
}
async function shareResult(){
    const gameResult = buildGameResult();
    const canvas = createResultImage();

    const shareText =
        "DOS Governance Challenge\n\n" +
        "Giocatore: " + gameResult.nickname + "\n" +
        "Punteggio: " + gameResult.score + "/100\n" +
        "Tempo: " + gameResult.formattedTime + "\n" +
        "Controlli: " + gameResult.checkCount + "\n" +
        "Aiuti: " + gameResult.helpCount + "\n" +
        "Livello: " + gameResult.level + "\n" +
        "Esito: " +
        (
            gameResult.finishedManually
                ? "Terminata in anticipo"
                : "Completata"
        );

    canvas.toBlob(async blob => {
        if(!blob){
            alert('Non è stato possibile creare l’immagine.');
            return;
        }

        const file = new File(
            [blob],
            'dos-governance-result.png',
            {
                type: 'image/png'
            }
        );

        try{
            if(
                navigator.share &&
                navigator.canShare &&
                navigator.canShare({
                    files: [file]
                })
            ){
                await navigator.share({
                    title: 'DOS Governance Challenge',
                    text: shareText,
                    files: [file]
                });

                return;
            }

            const downloadLink = document.createElement('a');

            downloadLink.href = URL.createObjectURL(blob);
            downloadLink.download =
                'dos-governance-result.png';

            document.body.appendChild(downloadLink);
            downloadLink.click();
            downloadLink.remove();

            URL.revokeObjectURL(downloadLink.href);

            try{
                await navigator.clipboard.writeText(shareText);

                alert(
                    'Immagine scaricata e risultato copiato negli appunti.'
                );
            }catch(error){
                alert(
                    'Immagine scaricata. Ora puoi condividerla nella chat.'
                );
            }
        }catch(error){
            console.error(
                'Condivisione non riuscita:',
                error
            );
        }
    }, 'image/png');
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

                const cellKey = key(x.r, x.c);

                if(!penalizedWrongCells.has(cellKey)){
                    penalizedWrongCells.add(cellKey);
                    currentWrong++;
            }
        }
    }        
    });

    wrongChecks += currentWrong;
    save();

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
        finishedManually = false;
        stopTimer();
        setGameLocked(true);
        save();
        showFinalResult();
    }
}
function helpSelectedWord(){
    if(!currentEntry){
        alert('Seleziona prima una parola da completare.');
        return;
    }

    const entryCells = getEntryCells(currentEntry);
    let helpApplied = false;

    entryCells.forEach((cell, index) => {
        const correctLetter = currentEntry.answer[index];

        if(cell.inp.value !== correctLetter){
            helpedCells.add(key(cell.r, cell.c));
            cell.inp.value = correctLetter;
            helpApplied = true;
        }
    });

if(helpApplied){
    helpCount++;
}

save();
updateProgress();
}
function togglePause(){
    if(puzzleCompleted){
        return;
    }

    const pauseButton = document.getElementById('pauseButton');

    if(!gamePaused){
        gamePaused = true;
        stopTimer();

        cells.forEach(cell => {
            cell.inp.disabled = true;
        });

        const checkButton = document.querySelector(
            'button[onclick="check()"]'
        );

        const helpButton = document.querySelector(
            'button[onclick="helpSelectedWord()"]'
        );

        const finishButton = document.querySelector(
            'button[onclick="finishGame()"]'
        );

        if(checkButton) checkButton.disabled = true;
        if(helpButton) helpButton.disabled = true;
        if(finishButton) finishButton.disabled = true;

        if(pauseButton){
            pauseButton.textContent = 'Riprendi';
        }

        document.body.classList.add('game-paused');
        save();
        return;
    }

    gamePaused = false;

    cells.forEach(cell => {
        cell.inp.disabled = false;
    });

    const checkButton = document.querySelector(
        'button[onclick="check()"]'
    );

    const helpButton = document.querySelector(
        'button[onclick="helpSelectedWord()"]'
    );

    const finishButton = document.querySelector(
        'button[onclick="finishGame()"]'
    );

    if(checkButton) checkButton.disabled = false;
    if(helpButton) helpButton.disabled = false;
    if(finishButton) finishButton.disabled = false;

    if(pauseButton){
        pauseButton.textContent = 'Pausa';
    }

    document.body.classList.remove('game-paused');

    if(cells.some(cell => cell.inp.value)){
        startTimer();
    }

    save();
}

function setGameLocked(locked){
    cells.forEach(cell => {
        cell.inp.disabled = locked;
    });

    const checkButton = document.querySelector(
        'button[onclick="check()"]'
    );

    const helpButton = document.querySelector(
        'button[onclick="helpSelectedWord()"]'
    );

    const finishButton = document.querySelector(
        'button[onclick="finishGame()"]'
    );

    if(checkButton){
        checkButton.disabled = locked;
    }

    if(helpButton){
        helpButton.disabled = locked;
    }

    if(finishButton){
    finishButton.disabled = false;
    finishButton.textContent = locked
        ? 'Rivedi risultato'
        : 'Termina';
    }
}
function finishGame(){
    if(puzzleCompleted){
        showFinalResult();
        return;
    }

    const filledCells = cells.filter(cell => cell.inp.value).length;
    if(filledCells === cells.length){
    alert(
        'Hai compilato tutte le caselle. Premi Controlla per verificare e completare la sfida.'
    );
    return;
    }

    if(filledCells === 0){
        alert('Inserisci almeno una risposta prima di terminare la sfida.');
        return;
    }

    if(!confirm('Vuoi terminare la sfida e calcolare il punteggio?')){
        return;
    }

    puzzleCompleted = true;
    finishedManually = true;
    stopTimer();
    setGameLocked(true);
    save();
    showFinalResult();
}
function resetPuzzle(){
    if(!confirm('Cancellare tutte le risposte?')) return;

    stopTimer();

    elapsedSeconds = 0;
    timerStarted = false;
    puzzleCompleted = false;
    finishedManually = false;
    checkCount = 0;
    wrongChecks = 0;
    solutionUsed = false;
    helpCount = 0;
    helpedCells = new Set();
    penalizedWrongCells = new Set();
    setGameLocked(false);

    cells.forEach(x => {
        x.inp.value = '';
        x.div.classList.remove('wrong', 'correct');
    });

    localStorage.removeItem('governanceDosCrossword');
    localStorage.removeItem('governanceDosTimer');
    localStorage.removeItem('governanceDosGameState');
    updateTimerDisplay();
    updateProgress();
}
window.startGame = function(){
    const nicknameInput = document.getElementById('nicknameInput');
    const nicknameError = document.getElementById('nicknameError');

    const nickname = nicknameInput.value.trim();

    if(nickname.length < 3){
        nicknameError.textContent =
            'Inserisci un nickname di almeno 3 caratteri.';
        return;
    }

    if(!/^[a-zA-Z0-9À-ÿ _-]+$/.test(nickname)){
        nicknameError.textContent =
            'Usa solo lettere, numeri, spazi, trattini o underscore.';
        return;
    }

    playerNickname = nickname;
    nicknameError.textContent = '';

    localStorage.setItem(
        'governanceDosNickname',
        playerNickname
    );

    document.body.classList.add('game-started');
};
