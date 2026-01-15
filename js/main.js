// --- CONFIGURATION ---
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const scanBtn = document.getElementById('scan-btn');
const instructionText = document.getElementById('instruction-text');

// Global State
const scanOrder = ['front', 'right', 'back', 'left', 'up', 'down'];
const sideColors = { 
    'front': 'Green', 'right': 'Red', 'back': 'Blue', 
    'left': 'Orange', 'up': 'White', 'down': 'Yellow' 
};

// Strict Validation Map
const colorCharMap = {
    'Green': 'G', 'Red': 'R', 'Blue': 'B', 
    'Orange': 'O', 'White': 'W', 'Yellow': 'Y'
};

let currentSideIndex = 0;
let cubeMap = { front: [], right: [], back: [], left: [], up: [], down: [] };
let isScanning = false; // Prevents double-clicking

// --- 1. VOICE MANAGER ---
function speak(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel(); 
        const utterance = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(utterance);
    }
}

// --- 2. NAVIGATION ---
function goHome() {
    document.getElementById('home-screen').classList.remove('hidden'); 
    document.getElementById('home-screen').style.display = 'flex';
    document.getElementById('main-app').style.display = 'none';
    document.getElementById('steps-menu').style.display = 'none';
    stopCamera();
    removeControls();
}

function enterMainApp() {
    document.getElementById('home-screen').classList.add('hidden');
    document.getElementById('home-screen').style.display = 'none';
    document.getElementById('steps-menu').style.display = 'none';
    document.getElementById('main-app').style.display = 'block';
    
    // RESET SCANNER
    currentSideIndex = 0;
    instructionText.innerText = "Show Green Center, then Scan.";
    instructionText.style.color = "white";
    speak("Show Green Center, then Scan.");
    
    if(scanBtn) {
        scanBtn.style.display = "block";
        scanBtn.innerText = "SCAN SIDE";
        scanBtn.disabled = false;
        scanBtn.onclick = scanFace; 
    }
    
    startCamera();
}

function showStepsMenu() {
    document.getElementById('home-screen').classList.add('hidden');
    document.getElementById('home-screen').style.display = 'none';
    document.getElementById('steps-menu').style.display = 'flex';
}

function jumpToStep(stepNumber) {
    document.getElementById('home-screen').classList.add('hidden');
    document.getElementById('home-screen').style.display = 'none';
    document.getElementById('steps-menu').style.display = 'none';
    document.getElementById('main-app').style.display = 'block';
    
    if (scanBtn) scanBtn.style.display = "none";
    removeControls();

    if (stepNumber === 1) enterMainApp();
    else if (stepNumber === 2) startCornersSolver();
    else if (stepNumber === 3) startMiddleLayerSolver();
    else if (stepNumber === 4) startYellowCrossSolver();
    else if (stepNumber === 5) startYellowFaceSolver();
    else if (stepNumber === 6) startFinalSolve();
}

// --- 3. CAMERA & ORIGINAL HSV LOGIC ---
async function startCamera() {
    try {
        if (video.srcObject) return;
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } } 
        });
        video.srcObject = stream;
        video.onloadedmetadata = () => video.play();
    } catch (err) {
        instructionText.innerText = "Camera Error: " + err.message;
    }
}

function stopCamera() {
    if (video.srcObject) {
        let tracks = video.srcObject.getTracks();
        tracks.forEach(track => track.stop());
        video.srcObject = null;
    }
}

function rgbToHsv(r, g, b) {
    r /= 255, g /= 255, b /= 255;
    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, v = max;
    let d = max - min;
    s = max === 0 ? 0 : d / max;
    if (max === min) h = 0;
    else {
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return [h * 360, s * 100, v * 100];
}

// THE ORIGINAL, WORKING COLOR BRAIN
function detectColor(r, g, b) {
    const [h, s, v] = rgbToHsv(r, g, b);

    // 1. WHITE: Low Saturation, High Brightness
    if (s < 25 && v > 45) return 'W'; 

    // 2. COLORS: Standard Hue Ranges
    if (h >= 0 && h < 15) return 'R'; 
    if (h >= 345 && h <= 360) return 'R'; 
    
    if (h >= 15 && h < 45) return 'O'; 
    if (h >= 45 && h < 85) return 'Y'; 
    if (h >= 85 && h < 160) return 'G'; 
    if (h >= 160 && h < 265) return 'B'; 
    
    return 'W'; // Fallback
}

// --- 4. ROBUST SCANNER LOGIC ---

function scanFace() {
    if (!video.srcObject || isScanning) return;
    
    isScanning = true; // Block button spam
    scanBtn.innerText = "Scanning..."; // Visual Feedback

    // 1. Capture
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    const width = canvas.width;
    const height = canvas.height;
    
    // SAFE TIGHT SCAN (Width / 12)
    // Closer to center to avoid borders, but not too small
    const gap = width / 12; 
    const centerX = width / 2;
    const centerY = height / 2;

    let currentScan = [];
    
    for (let row = -1; row <= 1; row++) {
        for (let col = -1; col <= 1; col++) {
            let x = centerX + (col * gap);
            let y = centerY + (row * gap);
            const pixel = ctx.getImageData(x, y, 1, 1).data;
            const colorCode = detectColor(pixel[0], pixel[1], pixel[2]);
            currentScan.push(colorCode);
        }
    }

    // --- STRICT VALIDATION ---
    const centerColorCode = currentScan[4]; // Center sticker
    const expectedSideName = scanOrder[currentSideIndex]; 
    const expectedColorName = sideColors[expectedSideName]; 
    const expectedCode = colorCharMap[expectedColorName]; 

    // Check Correctness
    let isWrong = (centerColorCode !== expectedCode);

    // Allow Red/Orange Swap (Common Camera Issue)
    if ((centerColorCode === 'R' && expectedCode === 'O') || (centerColorCode === 'O' && expectedCode === 'R')) {
        isWrong = false;
    }

    if (isWrong) {
        // FAIL STATE
        instructionText.innerText = `❌ Wrong! Saw ${centerColorCode}, need ${expectedColorName}.`;
        instructionText.style.color = "red";
        speak(`Wrong side. I see ${centerColorCode}. Please show ${expectedColorName}.`);
        
        // Reset Button
        setTimeout(() => {
            isScanning = false;
            scanBtn.innerText = "TRY AGAIN";
        }, 1000);
        return; 
    }

    // --- SUCCESS STATE ---
    instructionText.style.color = "white"; 
    cubeMap[expectedSideName] = currentScan;
    
    currentSideIndex++;
    
    if (currentSideIndex < scanOrder.length) {
        // Prepare Next Side
        let nextSide = scanOrder[currentSideIndex];
        let nextColor = sideColors[nextSide];
        
        instructionText.innerText = `Saved ${expectedColorName}. Show ${nextColor} center.`;
        speak(`Saved. Now show ${nextColor}.`);
        
        // Reset Button Immediately
        isScanning = false;
        scanBtn.innerText = "SCAN SIDE";
        
    } else {
        // DONE SCANNING
        isScanning = false;
        
        // Check Daisy (Bottom Face Logic)
        if (isDaisySolved(cubeMap)) {
            speak("Scanning done. Daisy found! Moving to White Cross.");
            startWhiteCross(); 
        } else {
            instructionText.innerText = "Scanning Complete! Let's make the Daisy.";
            speak("Scanning complete. Let's make the Daisy.");
            
            scanBtn.innerText = "START DAISY";
            scanBtn.onclick = startDaisySolver;
        }
    }
}

// =========================================================
// --- 5. SOLVER LOGIC ---
// =========================================================

function isDaisySolved(map) {
    // Daisy is on DOWN (Yellow) face in scan order
    let down = map.down; 
    if (!down || down.length < 9) return false;

    // Center must be Yellow (Index 4)
    // Petals must be White (1, 3, 5, 7)
    const isYellowCenter = (down[4] === 'Y');
    const hasWhitePetals = (down[1] === 'W' && down[3] === 'W' && down[5] === 'W' && down[7] === 'W');
    
    return isYellowCenter && hasWhitePetals;
}

// --- PHASE 1: DAISY ---
function startDaisySolver() {
    if (isDaisySolved(cubeMap)) {
        speak("Daisy is perfect! Moving to White Cross.");
        startWhiteCross();
        return;
    }

    instructionText.innerText = "Step 1: Make the Daisy.";
    instructionText.style.color = "yellow";
    
    speak("Make a daisy by keeping the yellow block in the center, and 4 white petals.");

    scanBtn.innerText = "I DID IT -> RE-SCAN";
    scanBtn.className = "w-full bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg"; 
    
    // UNBIND previous click, BIND new re-scan logic
    scanBtn.onclick = () => {
        currentSideIndex = 0;
        scanOrder.forEach(side => cubeMap[side] = []);
        enterMainApp(); 
    };
}

// --- PHASE 1.5: WHITE CROSS ---
function startWhiteCross() {
    try {
        if (typeof getCrossMove !== "function") throw new Error("Missing getCrossMove");
        let move = getCrossMove(cubeMap);
        
        if (move === "DONE") {
            speak("Cross completed! Proceeding to corners.");
            instructionText.innerText = "Cross Done! ✅";
            scanBtn.innerText = "NEXT: CORNERS";
            scanBtn.onclick = startCornersSolver; 
            return;
        }

        if (move === "Check Middle Layer") {
             speak("I cannot find a white petal on top. Please check your Daisy.");
             instructionText.innerText = "⚠️ Check Daisy";
             return;
        }

        if (move === "D") {
            speak("Rotate the Yellow Top. Match petal side color to center.");
        } else if (move.includes("2")) {
            let faceLetter = move[0];
            let colorName = (faceLetter === 'F') ? "Green" : (faceLetter === 'R' ? "Red" : (faceLetter === 'L' ? "Orange" : "Blue"));
            speak(`Match found! Turn the ${colorName} face two times.`);
        } else {
             speak(`Perform move ${move}`);
        }

        if (typeof virtualMove !== "function") throw new Error("Missing virtualMove");
        virtualMove(move, cubeMap);

        scanBtn.innerText = "I DID IT (Next)";
        scanBtn.onclick = startWhiteCross;

    } catch (error) {
        console.error(error);
        instructionText.innerText = "ERROR: " + error.message;
    }
}

// --- PHASE 2: CORNERS ---
function startCornersSolver() {
    if (scanBtn) scanBtn.style.display = "none";
    removeControls(); 
    instructionText.innerText = "Phase 2: Corners";
    speak("Time to solve corners.");

    let controlsDiv = createProceedButton(startCornersInstruction);
    document.body.appendChild(controlsDiv);
}

function startCornersInstruction() {
    removeControls(); 
    showTriggerOverlay(); 

    let introText = "Make sure Yellow center is Up. Look for white stickers on Top Layer.";
    let case1Text = "Case 1: White stuck on bottom? Hold on right. Right Trigger once.";
    let case2Text = "Case 2: White facing up? Rotate top. Right Trigger twice.";
    
    let fullSpeech = introText + " ... " + case1Text + " ... " + case2Text;
    instructionText.innerText = "Tutorial: Triggers";
    speak(fullSpeech);

    createCornerControls(
        () => speak(case1Text),
        () => speak(case2Text),
        () => openVideo("YOUR_VIDEO_ID"),
        () => speak(fullSpeech),
        () => startMiddleLayerSolver()
    );
}

// --- PHASE 3: MIDDLE LAYER ---
function startMiddleLayerSolver() {
    if (scanBtn) scanBtn.style.display = "none";
    removeControls(); 
    instructionText.innerText = "Phase 3: Middle Layer";
    speak("Phase 3. Middle Layer edges.");
    let controlsDiv = createProceedButton(startMiddleLayerInstruction);
    document.body.appendChild(controlsDiv);
}

function startMiddleLayerInstruction() {
    removeControls(); 
    showMiddleLayerOverlay(); 
    let introText = "Make a T shape. Push AWAY from top color. Trigger.";
    let case1Text = "Case 1: Edge Stuck? Hold Right. Right Move once.";
    let case2Text = "Case 2: No Edges? They are stuck. Do Case 1.";
    
    let fullSpeech = introText + " ... " + case1Text + " ... " + case2Text;
    instructionText.innerText = "Tutorial: Middle Layer";
    speak(fullSpeech);

    createCornerControls(
        () => speak(case1Text),
        () => speak(case2Text),
        () => openVideo("YOUR_VIDEO_ID"),
        () => speak(introText),
        () => startYellowCrossSolver()
    );
}

// --- PHASE 4: YELLOW CROSS ---
function startYellowCrossSolver() {
    removeControls(); 
    instructionText.innerText = "Phase 4: Yellow Cross";
    speak("Phase 4. Yellow Cross.");
    let controlsDiv = createProceedButton(startYellowCrossInstruction);
    document.body.appendChild(controlsDiv);
}

function startYellowCrossInstruction() {
    removeControls(); 
    showYellowCrossOverlay(); 
    let strategy = "Dot, L-Shape, or Line. Move: Front Clockwise, Right Trigger, Front Inverse.";
    instructionText.innerText = "Tutorial: Yellow Cross";
    speak(strategy);

    createManualControls(
        () => openVideo("YOUR_VIDEO_ID"),
        () => speak(strategy),
        () => startYellowFaceSolver() 
    );
}

// --- PHASE 5: YELLOW FACE ---
function startYellowFaceSolver() {
    removeControls(); 
    instructionText.innerText = "Phase 5: Yellow Face";
    speak("Phase 5. Make top face Yellow.");
    let controlsDiv = createProceedButton(startYellowFaceInstruction);
    document.body.appendChild(controlsDiv);
}

function startYellowFaceInstruction() {
    removeControls(); 
    showYellowFaceOverlay(); 
    let strategy = "Fish pattern? Mouth bottom-left. Algorithm: R, U, R prime, U, R, U 2, R prime.";
    instructionText.innerText = "Tutorial: Yellow Face";
    speak(strategy);

    createManualControls(
        () => openVideo("YOUR_VIDEO_ID"),
        () => speak(strategy),
        () => startFinalSolve() 
    );
}

// --- PHASE 6: FINALE ---
function startFinalSolve() {
    removeControls(); 
    instructionText.innerText = "Phase 6: The Finale";
    speak("Phase 6. Solve corners first.");
    let controlsDiv = createProceedButton(startFinalCornersInstruction);
    document.body.appendChild(controlsDiv);
}

function startFinalCornersInstruction() {
    removeControls(); 
    showHeadlightsOverlay(); 
    let strategy = "Headlights at back. R Prime, F, R Prime, B 2. R, F Prime, R Prime, B 2, R 2.";
    instructionText.innerText = "Step A: Headlights";
    speak(strategy);
    createManualControls(
        () => openVideo("YOUR_VIDEO_ID"),
        () => speak(strategy),
        () => startFinalEdgesInstruction()
    );
}

function startFinalEdgesInstruction() {
    removeControls();
    removeHeadlightsOverlay(); 
    let strategy = "Solved side at back. F 2, U, L, R Prime, F 2, L Prime, R, U, F 2.";
    instructionText.innerText = "Step B: Final Edges";
    speak(strategy);

    let overlay = document.createElement("div");
    overlay.id = "generic-overlay";
    overlay.style.position = "fixed"; overlay.style.top = "100px"; overlay.style.width = "100%";
    overlay.style.textAlign = "center"; overlay.style.color = "white";
    overlay.innerHTML = `<h1 style="color:#22c55e;">FINISH IT!</h1><p>Solved side at BACK.</p>`;
    document.body.appendChild(overlay);

    createManualControls(
        () => openVideo("YOUR_VIDEO_ID"),
        () => speak(strategy),
        () => { alert("CONGRATULATIONS!"); location.reload(); }
    );
}

// --- OVERLAY HELPERS ---
function createProceedButton(action) {
    let div = document.createElement("div");
    div.id = "solver-controls"; div.style.position = "fixed"; div.style.bottom = "20px";
    div.style.width = "100%"; div.style.display = "flex"; div.style.justifyContent = "center"; div.style.zIndex = "9999";
    let btn = document.createElement("button");
    btn.innerText = "PROCEED ➡️"; btn.style.padding = "15px 40px";
    btn.style.fontSize = "18px"; btn.style.fontWeight = "bold";
    btn.style.backgroundColor = "#2563eb"; btn.style.color = "white";
    btn.style.borderRadius = "50px"; btn.style.border = "none";
    btn.onclick = action;
    div.appendChild(btn);
    return div;
}

function createOverlay(id) {
    let div = document.createElement("div");
    div.id = id; 
    div.style.position = "fixed"; div.style.top = "0"; div.style.left = "0";
    div.style.width = "100%"; div.style.height = "100%"; div.style.backgroundColor = "black";
    div.style.zIndex = "100"; div.style.overflowY = "auto"; div.style.textAlign = "center";
    return div;
}

function showTriggerOverlay() {
    if (document.getElementById("trigger-overlay")) return;
    let overlay = createOverlay("trigger-overlay");
    overlay.innerHTML = `<h2 style="color:white; margin-top:60px;">Triggers</h2>
    <img src="assets/right-trigger.png" style="width:80%; border:3px solid red; margin:10px;" onclick="speak('Right Trigger instructions...')">
    <img src="assets/left-trigger.png" style="width:80%; border:3px solid orange; margin:10px;" onclick="speak('Left Trigger instructions...')">`;
    document.body.appendChild(overlay);
}

function showMiddleLayerOverlay() {
    if (document.getElementById("middle-overlay")) return;
    let overlay = createOverlay("middle-overlay");
    overlay.innerHTML = `<h2 style="color:white; margin-top:60px;">Middle Layer</h2>
    <img src="assets/middle-right.jpg" style="width:80%; border:3px solid red; margin:10px;" onclick="speak('Push Left. Right Trigger. Fix Corner.')">
    <img src="assets/middle-left.jpg" style="width:80%; border:3px solid orange; margin:10px;" onclick="speak('Push Right. Left Trigger. Fix Corner.')">`;
    document.body.appendChild(overlay);
}

function showYellowCrossOverlay() {
    if (document.getElementById("cross-overlay")) return;
    let overlay = createOverlay("cross-overlay");
    overlay.innerHTML = `<h2 style="color:white; margin-top:60px;">Yellow Cross</h2>
    <img src="assets/yellow-cross.png" style="width:80%; border:3px solid yellow; margin:10px;" onclick="speak('Front, Right Trigger, Front Inverse')">`;
    document.body.appendChild(overlay);
}

function showYellowFaceOverlay() {
    if (document.getElementById("fish-overlay")) return;
    let overlay = createOverlay("fish-overlay");
    overlay.innerHTML = `<h2 style="color:white; margin-top:60px;">Yellow Face</h2>
    <img src="assets/yellow-fish.png" style="width:80%; border:3px solid yellow; margin:10px;" onclick="speak('Fish Algo: R, U, R prime, U, R, U2, R prime')">`;
    document.body.appendChild(overlay);
}

function showHeadlightsOverlay() {
    if (document.getElementById("headlights-overlay")) return;
    let overlay = createOverlay("headlights-overlay");
    overlay.innerHTML = `<h2 style="color:white; margin-top:60px;">Headlights</h2>
    <img src="assets/yellow-headlights.png" style="width:80%; border:3px solid red; margin:10px;" onclick="speak('Headlights at back. Long Move.')">`;
    document.body.appendChild(overlay);
}

// CLEAR FUNCTIONS
function removeTriggerOverlay() { removeEl("trigger-overlay"); }
function removeMiddleLayerOverlay() { removeEl("middle-overlay"); }
function removeYellowCrossOverlay() { removeEl("cross-overlay"); }
function removeYellowFaceOverlay() { removeEl("fish-overlay"); }
function removeHeadlightsOverlay() { removeEl("headlights-overlay"); }
function removeControls() { removeEl("solver-controls"); }
function removeEl(id) { let el = document.getElementById(id); if(el) el.remove(); }

// --- UI HELPERS ---
function createManualControls(onHelp, onRepeat, onNext) {
    removeControls();
    let div = document.createElement("div");
    div.id = "solver-controls"; div.style.position = "fixed"; div.style.bottom = "20px";
    div.style.width = "100%"; div.style.display = "flex"; div.style.justifyContent = "center"; div.style.gap = "10px"; div.style.zIndex = "200";
    div.appendChild(makeBtn("🎥 Help", "#3b82f6", onHelp));
    div.appendChild(makeBtn("↺ Repeat", "#f59e0b", onRepeat));
    div.appendChild(makeBtn("Next ➡️", "#22c55e", onNext));
    document.body.appendChild(div);
}

function createCornerControls(onCase1, onCase2, onHelp, onRepeat, onNext) {
    removeControls();
    let div = document.createElement("div");
    div.id = "solver-controls"; div.style.position = "fixed"; div.style.bottom = "10px";
    div.style.width = "95%"; div.style.left = "2.5%"; div.style.zIndex = "200";
    div.style.display = "flex"; div.style.flexDirection = "column"; div.style.gap = "5px";
    
    let row1 = document.createElement("div"); row1.style.display = "flex"; row1.style.gap = "5px"; 
    row1.appendChild(makeBtn("Case 1", "#9333ea", onCase1));
    row1.appendChild(makeBtn("Case 2", "#9333ea", onCase2));
    
    let row2 = document.createElement("div"); row2.style.display = "flex"; row2.style.gap = "5px";
    row2.appendChild(makeBtn("Help", "#3b82f6", onHelp));
    row2.appendChild(makeBtn("Repeat", "#f59e0b", onRepeat));
    row2.appendChild(makeBtn("Next", "#22c55e", onNext));
    
    div.appendChild(row1); div.appendChild(row2);
    document.body.appendChild(div);
}

function makeBtn(text, color, action) {
    let btn = document.createElement("button");
    btn.innerText = text; btn.onclick = action;
    btn.style.flex = "1"; btn.style.padding = "12px"; btn.style.backgroundColor = color;
    btn.style.color = "white"; btn.style.border = "none"; btn.style.borderRadius = "8px";
    return btn;
}

function openVideo(videoId) { alert("Video placeholder"); }

// --- FALLBACK MATH LOGIC (If solver.js is missing) ---
function getCrossMove(map) { return "D"; }
function virtualMove(move, map) { console.log("Virtual Move:", move); }
function isCubeSolved(map) { return false; }