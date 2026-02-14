// --- CONFIGURATION ---
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const scanBtn = document.getElementById('scan-btn');
const instructionText = document.getElementById('instruction-text');

// Global State
const scanOrder = ['front', 'right', 'back', 'left', 'up', 'down'];
const sideColors = { 'front': 'Green', 'right': 'Red', 'back': 'Blue', 'left': 'Orange', 'up': 'White', 'down': 'Yellow' };
const colorCharMap = { 'Green': 'G', 'Red': 'R', 'Blue': 'B', 'Orange': 'O', 'White': 'W', 'Yellow': 'Y' };
const codeToNameMap = { 'G': 'Green', 'R': 'Red', 'B': 'Blue', 'O': 'Orange', 'W': 'White', 'Y': 'Yellow' };

let currentSideIndex = 0;
let cubeMap = { front: [], right: [], back: [], left: [], up: [], down: [] };
let isScanning = false; 

function getColorName(code) { return codeToNameMap[code] || 'Unknown'; }

// --- VOICE ---
function speak(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel(); 
        const utterance = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(utterance);
    }
}

// --- NAVIGATION ---
function goHome() {
    document.getElementById('home-screen').classList.remove('hidden'); 
    document.getElementById('home-screen').style.display = 'flex';
    document.getElementById('main-app').style.display = 'none';
    document.getElementById('steps-menu').style.display = 'none';
    stopCamera(); removeControls();
}
function enterMainApp() {
    document.getElementById('home-screen').classList.add('hidden');
    document.getElementById('home-screen').style.display = 'none';
    document.getElementById('steps-menu').style.display = 'none';
    document.getElementById('main-app').style.display = 'block';
    currentSideIndex = 0;
    instructionText.innerText = "Show Green Center, then Scan.";
    speak("Show Green Center, then Scan.");
    let c = document.querySelector('.controls'); if (c) c.style.display = 'flex';
    if(scanBtn) { scanBtn.style.display = "block"; scanBtn.innerText = "SCAN SIDE"; scanBtn.disabled = false; scanBtn.onclick = scanFace; }
    startCamera();
}
function showStepsMenu() { document.getElementById('home-screen').classList.add('hidden'); document.getElementById('home-screen').style.display = 'none'; document.getElementById('steps-menu').style.display = 'flex'; }
function jumpToStep(stepNumber) {
    document.getElementById('home-screen').classList.add('hidden');
    document.getElementById('home-screen').style.display = 'none';
    document.getElementById('steps-menu').style.display = 'none';
    document.getElementById('main-app').style.display = 'block';
    let c = document.querySelector('.controls'); if (c) c.style.display = 'none';
    removeControls();
    if (stepNumber === 1) enterMainApp();
    else if (stepNumber === 2) startCornersSolver();
}

// --- CAMERA & SCANNER (Standard) ---
async function startCamera() { try { if (video.srcObject) return; const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } } }); video.srcObject = s; video.onloadedmetadata = () => video.play(); } catch (err) { instructionText.innerText = "Camera Error: " + err.message; } }
function stopCamera() { if (video.srcObject) { let t = video.srcObject.getTracks(); t.forEach(track => track.stop()); video.srcObject = null; } }
function rgbToHsv(r, g, b) { r/=255,g/=255,b/=255; let max=Math.max(r,g,b),min=Math.min(r,g,b),h,s,v=max,d=max-min; s=max===0?0:d/max; if(max===min)h=0; else{ switch(max){ case r:h=(g-b)/d+(g<b?6:0);break; case g:h=(b-r)/d+2;break; case b:h=(r-g)/d+4;break; } h/=6; } return [h*360,s*100,v*100]; }
function detectColor(r, g, b) { const [h, s, v] = rgbToHsv(r, g, b); if (s < 25 && v > 45) return 'W'; if (h >= 0 && h < 15) return 'R'; if (h >= 345 && h <= 360) return 'R'; if (h >= 15 && h < 45) return 'O'; if (h >= 45 && h < 85) return 'Y'; if (h >= 85 && h < 160) return 'G'; if (h >= 160 && h < 265) return 'B'; return 'W'; }

function scanFace() {
    if (!video.srcObject || isScanning) return;
    isScanning = true; scanBtn.innerText = "Scanning..."; 
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    const width=canvas.width, height=canvas.height, gap=Math.min(width,height)/6.5, cx=width/2, cy=height/2;
    let scan=[];
    for (let r=-1; r<=1; r++) { for (let c=-1; c<=1; c++) {
        let x=cx+(c*gap), y=cy+(r*gap); const p=ctx.getImageData(x,y,1,1).data;
        scan.push(detectColor(p[0],p[1],p[2]));
    }}
    const center=scan[4], expSide=scanOrder[currentSideIndex], expColor=sideColors[expSide], expCode=colorCharMap[expColor];
    let wrong = (center!==expCode);
    if((center==='R'&&expCode==='O')||(center==='O'&&expCode==='R')) wrong=false;

    if (wrong) {
        instructionText.innerText = `❌ Wrong! Saw ${getColorName(center)}, need ${expColor}.`;
        speak(`Wrong side. I see ${getColorName(center)}. Show ${expColor}.`);
        setTimeout(()=>{isScanning=false; scanBtn.innerText="TRY AGAIN";},1000); return;
    }
    instructionText.style.color="white"; cubeMap[expSide]=scan; currentSideIndex++;
    if (currentSideIndex < scanOrder.length) {
        let next=sideColors[scanOrder[currentSideIndex]];
        instructionText.innerText=`Saved ${expColor}. Show ${next}.`; speak(`Saved. Show ${next}.`);
        isScanning=false; scanBtn.innerText="SCAN SIDE";
    } else {
        isScanning=false;
        speak("Daisy found. Let's solve."); startWhiteCross();
    }
}

// --- PHASE 1 & 1.5 ---
function startWhiteCross() {
    let c = document.querySelector('.controls'); if (c) c.style.display = 'none'; removeControls();
    let move="DONE"; try{if(typeof getCrossMove==="function") move=getCrossMove(cubeMap);}catch(e){}

    if (move==="DONE") { speak("Cross done. Corners time."); startCornersSolver(); return; }

    let txt = `Perform: ${move}`;
    if(move==="U") txt="Rotate Top 🔄"; if(move==="D") txt="Rotate Bottom 🔄";
    if(move.includes("2")) txt=`Turn ${move[0] === 'F' ? 'Green' : (move[0] === 'R' ? 'Red' : (move[0] === 'L' ? 'Orange' : 'Blue'))} Face 2x`;
    
    instructionText.innerText = txt; speak(txt);

    let div = createDiv();
    let btn = createBtn("NEXT ➡️", "#22c55e", () => {
        if(typeof virtualMove==="function") virtualMove(move, cubeMap);
        startWhiteCross();
    });
    div.appendChild(btn); document.body.appendChild(div);
}

// --- PHASE 2: CORNERS (SPECIAL CASES & IMAGE FIX) ---
function startCornersSolver() {
    let c = document.querySelector('.controls'); if (c) c.style.display = 'none'; removeControls();
    
    if (!window.hasFlipped) { speak("Flip cube: White on Bottom, Yellow on Top."); alert("FLIP: White Bottom, Yellow Top"); window.hasFlipped=true; }

    let moveCode="U"; try{if(typeof getCornersMove==="function") moveCode=getCornersMove(cubeMap);}catch(e){}

    if (moveCode==="DONE") {
        instructionText.innerText = "Corners Solved! ✅"; speak("First Layer Complete!");
        let div = createDiv(); div.appendChild(createBtn("Next Layer ➡️", "#2563eb", () => alert("Step 3 coming soon"))); document.body.appendChild(div);
        return;
    }

    let instruction = "";
    let virtualCode = "D";

    // --- CASE LOGIC ---
    if (moveCode === "U") {
        instruction = "Rotate the Top Face until the sticker's side color matches the center.";
        instructionText.innerText = "Rotate Top 🔄 Match Colors";
        virtualCode = "D";
    }
    else if (moveCode === "Right Trigger") {
        instruction = "Match found! White is on the RIGHT. Perform Right Trigger: Right Up, Top Left, Right Down.";
        instructionText.innerText = "Right Trigger ⚡";
        virtualCode = "R D R'"; 
    }
    else if (moveCode === "Left Trigger") {
        instruction = "Match found! White is on the LEFT. Perform Left Trigger: Left Up, Top Right, Left Down.";
        instructionText.innerText = "Left Trigger ⚡";
        virtualCode = "L' D' L"; 
    }
    // SPECIAL CASE 1: WHITE ON TOP
    else if (moveCode === "WhiteOnTop") {
        instruction = "White sticker is on the TOP face. Rotate the top face until the white sticker is directly above a non-white sticker on the bottom face. Then, perform the Right Trigger TWICE.";
        instructionText.innerText = "White on Top ⚠️";
        virtualCode = "R D R' R D R'"; // Approx logic for memory
    }
    // SPECIAL CASE 2: STUCK BOTTOM
    else if (moveCode === "StuckBottom") {
        instruction = "White sticker is stuck in the bottom layer. Perform a Right Trigger ONCE to move it to the top layer.";
        instructionText.innerText = "Stuck on Bottom ⚠️";
        virtualCode = "R D R'"; // Pops it out
    }

    speak(instruction);

    // --- UI BUILDER ---
    let div = createDiv();
    div.style.flexDirection = "column"; div.style.gap = "10px";

    // 1. TRIGGER IMAGES (Click to Enlarge)
    let imgRow = document.createElement("div");
    imgRow.style.display = "flex"; imgRow.style.gap = "15px"; imgRow.style.justifyContent = "center";

    let btnLeft = document.createElement("img");
    btnLeft.src = "assets/left-trigger.png"; 
    btnLeft.style.height = "60px"; btnLeft.style.border = "2px solid orange"; btnLeft.style.borderRadius = "10px";
    btnLeft.onclick = () => showImageOverlay("assets/left-trigger.png", "Left Trigger");
    
    let btnRight = document.createElement("img");
    btnRight.src = "assets/right-trigger.png"; 
    btnRight.style.height = "60px"; btnRight.style.border = "2px solid red"; btnRight.style.borderRadius = "10px";
    btnRight.onclick = () => showImageOverlay("assets/right-trigger.png", "Right Trigger");

    imgRow.appendChild(btnLeft);
    imgRow.appendChild(btnRight);

    // 2. CONTROLS
    let ctrlRow = document.createElement("div");
    ctrlRow.style.display = "flex"; ctrlRow.style.gap = "10px";

    let btnRepeat = createBtn("🎧 Instruction", "#f59e0b", () => speak(instruction));
    let btnNext = createBtn("NEXT ➡️", "#22c55e", () => {
        if(typeof virtualMove==="function") virtualMove(virtualCode, cubeMap);
        startCornersSolver();
    });

    ctrlRow.appendChild(btnRepeat);
    ctrlRow.appendChild(btnNext);

    div.appendChild(imgRow);
    div.appendChild(ctrlRow);
    document.body.appendChild(div);
}

// --- HELPER: FIXED IMAGE OVERLAY ---
function showImageOverlay(src, title) {
    // 1. Remove ANY existing overlay first (Fixes the "First click only" bug)
    let old = document.getElementById('img-overlay');
    if (old) old.remove();

    // 2. Create New
    let overlay = document.createElement("div");
    overlay.id = "img-overlay";
    overlay.style.position = "fixed"; overlay.style.top = "0"; overlay.style.left = "0";
    overlay.style.width = "100%"; overlay.style.height = "100%";
    overlay.style.backgroundColor = "rgba(0,0,0,0.9)";
    overlay.style.zIndex = "10000"; // Very high
    overlay.style.display = "flex"; overlay.style.flexDirection = "column";
    overlay.style.justifyContent = "center"; overlay.style.alignItems = "center";
    
    // Close on click
    overlay.onclick = () => overlay.remove();

    let h2 = document.createElement("h2");
    h2.innerText = title; h2.style.color = "white"; h2.style.marginBottom = "20px";

    let img = document.createElement("img");
    img.src = src; 
    img.style.width = "80%"; img.style.maxWidth = "400px"; 
    img.style.border = "4px solid white"; img.style.borderRadius = "10px";

    let hint = document.createElement("p");
    hint.innerText = "(Tap anywhere to close)";
    hint.style.color = "#aaa"; hint.style.marginTop = "20px";

    overlay.appendChild(h2);
    overlay.appendChild(img);
    overlay.appendChild(hint);
    document.body.appendChild(overlay);
}

// --- UTILS ---
function removeControls() { let el=document.getElementById("solver-controls"); if(el) el.remove(); }
function createDiv() {
    let div = document.createElement("div");
    div.id = "solver-controls"; div.style.position = "fixed"; div.style.bottom = "10px";
    div.style.width = "100%"; div.style.display = "flex"; div.style.justifyContent = "center"; div.style.zIndex = "999";
    div.style.padding = "0 10px"; div.style.boxSizing = "border-box";
    return div;
}
function createBtn(text, bg, action) {
    let btn = document.createElement("button");
    btn.innerText = text; btn.onclick = action;
    btn.style.flex = "1"; btn.style.padding = "15px"; 
    btn.style.background = bg; btn.style.color = "white"; 
    btn.style.border = "none"; btn.style.borderRadius = "10px"; btn.style.fontWeight = "bold";
    return btn;
}