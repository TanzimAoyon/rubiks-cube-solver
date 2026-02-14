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

// --- CAMERA & SCANNER ---
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
        // Check Daisy from Memory
        let daisyFound = false;
        if (typeof isDaisySolved === 'function') {
            daisyFound = isDaisySolved(cubeMap);
        } else {
            let down = cubeMap.down; 
            if (down && down.length >= 9) daisyFound = (down[4] === 'Y' && down[1] === 'W' && down[3] === 'W' && down[5] === 'W' && down[7] === 'W');
        }

        if (daisyFound) {
            speak("Great! Daisy found. Let's make the White Cross.");
            instructionText.innerText = "Great! Daisy Found! ✅";
            setTimeout(() => { startWhiteCross(); }, 2000);
        } else {
            instructionText.innerText = "Daisy Not Found. Let's make one.";
            speak("Daisy not found. Please make a daisy. Keep the yellow block in the center, and four white petals around it.");
            scanBtn.innerText = "START DAISY";
            scanBtn.onclick = startDaisySolver;
        }
    }
}

// --- PHASE 1: DAISY CHECK ---
function startDaisySolver() {
    let daisyFound = false;
    if (typeof isDaisySolved === 'function') daisyFound = isDaisySolved(cubeMap);

    if (daisyFound) {
        speak("Daisy is perfect! Moving to White Cross.");
        startWhiteCross();
        return;
    }
    instructionText.innerText = "Step 1: Make the Daisy.";
    instructionText.style.color = "yellow";
    speak("Make a daisy by keeping the yellow block in the center, and 4 white petals.");
    scanBtn.innerText = "I DID IT -> RE-SCAN";
    scanBtn.className = "w-full bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg"; 
    scanBtn.onclick = () => { currentSideIndex = 0; scanOrder.forEach(side => cubeMap[side] = []); enterMainApp(); };
}

// --- PHASE 1.5: WHITE CROSS (MEMORY / LOGIC) ---
function startWhiteCross() {
    let c = document.querySelector('.controls'); if (c) c.style.display = 'none'; removeControls();
    
    // Use Memory to find the Specific Move
    let move="DONE"; try{if(typeof getCrossMove==="function") move=getCrossMove(cubeMap);}catch(e){}

    if (move==="DONE") { speak("Cross done. Proceeding to Corners."); startCornersSolver(); return; }

    let txt = `Perform: ${move}`;
    if(move==="U") txt="Rotate Top 🔄 Match Colors"; 
    if(move==="D") txt="Rotate Bottom 🔄";
    if(move.includes("2")) txt=`Turn ${move[0] === 'F' ? 'Green' : (move[0] === 'R' ? 'Red' : (move[0] === 'L' ? 'Orange' : 'Blue'))} Face 2x`;
    
    instructionText.innerText = txt; speak(txt);

    let div = createDiv();
    let btn = createBtn("NEXT ➡️", "#22c55e", () => {
        // Update Memory and Loop
        if(typeof virtualMove==="function") virtualMove(move, cubeMap);
        startWhiteCross();
    });
    div.appendChild(btn); document.body.appendChild(div);
}

// --- PHASE 2: CORNERS (TEACHER MODE - NO SCAN/LOGIC) ---
function startCornersSolver() {
    let c = document.querySelector('.controls'); if (c) c.style.display = 'none'; removeControls();
    
    // 0. Initial Flip Instruction
    if (!window.hasFlipped) { 
        speak("Now, flip the cube over. White Cross should be on the BOTTOM. Yellow on TOP."); 
        alert("FLIP CUBE: White on Bottom, Yellow on Top."); 
        window.hasFlipped=true; 
    }

    // 1. Display General Instruction (Teacher Mode)
    const mainInstruction = "Identify color next to white. Rotate Top until it matches center. If Right -> Right Trigger. If Left -> Left Trigger.";
    instructionText.innerText = "Match Colors & Trigger";
    speak("Identify the color next to the white sticker. Rotate the top face until this color diagonally matches the center piece of the same color. If the corner is to the right, do Right Trigger. If to the left, do Left Trigger.");

    // 2. UI Builder
    let div = createDiv();
    div.style.flexDirection = "column"; div.style.gap = "10px";

    // TRIGGER IMAGES (Click to Speak & Show Large)
    let imgRow = document.createElement("div");
    imgRow.style.display = "flex"; imgRow.style.gap = "15px"; imgRow.style.justifyContent = "center";

    let btnLeft = document.createElement("img");
    btnLeft.src = "assets/left-trigger.png"; 
    btnLeft.style.height = "60px"; btnLeft.style.border = "2px solid orange"; btnLeft.style.borderRadius = "10px";
    btnLeft.onclick = () => { 
        speak("Left Trigger: Left Up. Top Right. Left Down."); 
        showImageOverlay("assets/left-trigger.png", "Left Trigger (L' U L)"); 
    };
    
    let btnRight = document.createElement("img");
    btnRight.src = "assets/right-trigger.png"; 
    btnRight.style.height = "60px"; btnRight.style.border = "2px solid red"; btnRight.style.borderRadius = "10px";
    btnRight.onclick = () => { 
        speak("Right Trigger: Right Up. Top Left. Right Down."); 
        showImageOverlay("assets/right-trigger.png", "Right Trigger (R U' R')"); 
    };

    imgRow.appendChild(btnLeft);
    imgRow.appendChild(btnRight);

    // CONTROLS
    let ctrlRow = document.createElement("div");
    ctrlRow.style.display = "flex"; ctrlRow.style.gap = "10px";

    let btnRepeat = createBtn("🎧 Instruction", "#f59e0b", () => speak(mainInstruction));
    
    // "Next Layer" Button - Since we aren't tracking memory anymore, 
    // the user decides when they are done with corners.
    let btnNext = createBtn("Next Layer ➡️", "#2563eb", () => {
        let confirmNext = confirm("Are all white corners solved?");
        if(confirmNext) startMiddleLayerSolver();
    });

    ctrlRow.appendChild(btnRepeat);
    ctrlRow.appendChild(btnNext);

    div.appendChild(imgRow);
    div.appendChild(ctrlRow);
    document.body.appendChild(div);
}

// --- PHASE 3: MIDDLE LAYER ---
function startMiddleLayerSolver() {
    let c = document.querySelector('.controls'); if (c) c.style.display = 'none'; removeControls();
    instructionText.innerText = "Phase 3: Middle Layer";
    speak("Phase 3. Solve the Middle Layer edges.");
    let div = createDiv();
    div.appendChild(createBtn("Proceed ➡️", "#2563eb", () => alert("Step 3 Logic Coming Soon")));
    document.body.appendChild(div);
}

// --- HELPER: FIXED IMAGE OVERLAY ---
function showImageOverlay(src, title) {
    let old = document.getElementById('img-overlay'); if (old) old.remove();
    let overlay = document.createElement("div");
    overlay.id = "img-overlay";
    overlay.style.position = "fixed"; overlay.style.top = "0"; overlay.style.left = "0";
    overlay.style.width = "100%"; overlay.style.height = "100%";
    overlay.style.backgroundColor = "rgba(0,0,0,0.9)";
    overlay.style.zIndex = "10000"; 
    overlay.style.display = "flex"; overlay.style.flexDirection = "column";
    overlay.style.justifyContent = "center"; overlay.style.alignItems = "center";
    overlay.onclick = () => overlay.remove();

    let h2 = document.createElement("h2"); h2.innerText = title; h2.style.color = "white"; h2.style.marginBottom = "20px";
    let img = document.createElement("img"); img.src = src; 
    img.style.width = "80%"; img.style.maxWidth = "400px"; img.style.border = "4px solid white"; img.style.borderRadius = "10px";
    let hint = document.createElement("p"); hint.innerText = "(Tap anywhere to close)"; hint.style.color = "#aaa"; hint.style.marginTop = "20px";

    overlay.appendChild(h2); overlay.appendChild(img); overlay.appendChild(hint);
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