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

// Strict Validation Map (Name -> Code)
const colorCharMap = {
    'Green': 'G', 'Red': 'R', 'Blue': 'B', 
    'Orange': 'O', 'White': 'W', 'Yellow': 'Y'
};

// Map Code -> Name for Speech
const codeToNameMap = {
    'G': 'Green', 'R': 'Red', 'B': 'Blue', 
    'O': 'Orange', 'W': 'White', 'Y': 'Yellow'
};

let currentSideIndex = 0;
let cubeMap = { front: [], right: [], back: [], left: [], up: [], down: [] };
let isScanning = false; 

// --- 1. HELPER: CONVERT CODE TO NAME ---
function getColorName(code) {
    return codeToNameMap[code] || 'Unknown';
}

// --- 2. VOICE MANAGER ---
function speak(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel(); 
        const utterance = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(utterance);
    }
}

// --- 3. NAVIGATION ---
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

// --- 4. CAMERA & HSV LOGIC ---
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

function detectColor(r, g, b) {
    const [h, s, v] = rgbToHsv(r, g, b);

    // 1. WHITE Check
    if (s < 25 && v > 45) return 'W'; 

    // 2. COLORS
    if (h >= 0 && h < 15) return 'R'; 
    if (h >= 345 && h <= 360) return 'R'; 
    
    if (h >= 15 && h < 45) return 'O'; 
    if (h >= 45 && h < 85) return 'Y'; 
    if (h >= 85 && h < 160) return 'G'; 
    if (h >= 160 && h < 265) return 'B'; 
    
    return 'W'; // Fallback
}

// --- 5. SCANNER LOGIC ---

function scanFace() {
    if (!video.srcObject || isScanning) return;
    
    isScanning = true; 
    scanBtn.innerText = "Scanning..."; 

    // 1. Capture
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    const width = canvas.width;
    const height = canvas.height;
    
    // SAFE TIGHT SCAN (Width / 6.5)
    const gap = Math.min(width, height) / 6.5; 
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
    const centerColorCode = currentScan[4]; 
    const expectedSideName = scanOrder[currentSideIndex]; 
    const expectedColorName = sideColors[expectedSideName]; 
    const expectedCode = colorCharMap[expectedColorName]; 
    
    const seenColorName = getColorName(centerColorCode); 

    let isWrong = (centerColorCode !== expectedCode);

    // Allow Red/Orange Swap
    if ((centerColorCode === 'R' && expectedCode === 'O') || (centerColorCode === 'O' && expectedCode === 'R')) {
        isWrong = false;
    }

    if (isWrong) {
        // FAIL STATE
        instructionText.innerText = `❌ Wrong! Saw ${seenColorName}, need ${expectedColorName}.`;
        instructionText.style.color = "red";
        
        speak(`Wrong side. I see ${seenColorName}. Please show ${expectedColorName}.`);
        
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
        // NEXT SIDE
        let nextSide = scanOrder[currentSideIndex];
        let nextColor = sideColors[nextSide];
        
        instructionText.innerText = `Saved ${expectedColorName}. Show ${nextColor} center.`;
        speak(`Saved. Now show ${nextColor}.`);
        
        isScanning = false;
        scanBtn.innerText = "SCAN SIDE";
        
    } else {
        // DONE SCANNING
        isScanning = false;
        
        // DAISY CHECK (Uses cube-logic.js if available, or internal helper)
        let daisyFound = false;
        if (typeof isDaisySolved === 'function') {
            daisyFound = isDaisySolved(cubeMap);
        } else {
            // Internal fallback just in case
            let down = cubeMap.down; 
            if (down && down.length >= 9) {
                 daisyFound = (down[4] === 'Y' && down[1] === 'W' && down[3] === 'W' && down[5] === 'W' && down[7] === 'W');
            }
        }

        if (daisyFound) {
            // SUCCESS
            speak("Great! Daisy found. Let's make the White Cross.");
            instructionText.innerText = "Great! Daisy Found! ✅";
            
            setTimeout(() => {
                startWhiteCross();
            }, 2000);
            
        } else {
            // FAILURE
            instructionText.innerText = "Daisy Not Found. Let's make one.";
            speak("Daisy not found. Please make a daisy. Keep the yellow block in the center, and four white petals around it.");
            
            scanBtn.innerText = "START DAISY";
            scanBtn.onclick = startDaisySolver;
        }
    }
}

// =========================================================
// --- 6. SOLVER LOGIC ---
// =========================================================

// --- PHASE 1: DAISY ---
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
    
    scanBtn.onclick = () => {
        currentSideIndex = 0;
        scanOrder.forEach(side => cubeMap[side] = []);
        enterMainApp(); 
    };
}

// --- PHASE 1.5: WHITE CROSS (MANUAL INSTRUCTION MODE) ---
// --- PHASE 1.5: WHITE CROSS (Using cross-solver.js) ---
function startWhiteCross() {
    // 1. Get the Move from your file
    let move = "DONE";
    try {
        if (typeof getCrossMove === "function") {
            move = getCrossMove(cubeMap);
        } else {
            console.error("Missing cross-solver.js!");
            return;
        }
    } catch (e) { console.error(e); }

    // 2. Victory Check
    if (move === "DONE") {
        speak("Cross completed! Great job. Proceeding to corners.");
        instructionText.innerText = "Cross Done! ✅";
        
        let div = createProceedButton(startCornersSolver);
        document.body.appendChild(div);
        return;
    }

    // 3. Instruction Logic
    // Case A: Setup Move (Rotate Top)
    if (move === "U") {
        instructionText.innerText = "Rotate Top 🔄 (Finding Match)";
        speak("Rotate the Yellow Top Clockwise once to find a match.");
    } 
    // Case B: Setup Move (Rotate Bottom - if your logic uses it)
    else if (move === "D") {
        instructionText.innerText = "Rotate Bottom 🔄";
        speak("Rotate the Yellow Face Clockwise.");
    }
    // Case C: The Drop (Turn 2 Times)
    else if (move.includes("2")) {
        let faceLetter = move[0];
        let colorName = "";
        
        if (faceLetter === 'F') colorName = "Green";
        if (faceLetter === 'R') colorName = "Red";
        if (faceLetter === 'L') colorName = "Orange";
        if (faceLetter === 'B') colorName = "Blue";
        
        instructionText.innerText = `Match! Turn ${colorName} 2x`;
        speak(`Match found on ${colorName}! Turn the ${colorName} face two times to bring the white petal down.`);
    } 
    // Case D: Any other move (Fallback)
    else {
        instructionText.innerText = `Perform Move: ${move}`;
        speak(`Perform the move: ${move}`);
    }
    
    // 4. Update Memory
    if (typeof virtualMove === "function") {
        virtualMove(move, cubeMap);
    }

    // 5. Setup Next Button
    // We remove old controls first to avoid duplicates
    removeControls();
    
    let div = document.createElement("div");
    div.id = "solver-controls"; div.style.position = "fixed"; div.style.bottom = "20px";
    div.style.width = "100%"; div.style.display = "flex"; div.style.justifyContent = "center"; div.style.zIndex = "200";
    
    let btn = document.createElement("button");
    btn.innerText = "I DID IT (NEXT) ➡️"; 
    btn.style.padding = "15px 40px"; btn.style.fontSize = "18px"; btn.style.fontWeight = "bold";
    btn.style.backgroundColor = "#2563eb"; btn.style.color = "white";
    btn.style.borderRadius = "50px"; btn.style.border = "none";
    
    btn.onclick = startWhiteCross; // Loop back to check next move
    
    div.appendChild(btn);
    document.body.appendChild(div);
}

// --- PHASE 2: CORNERS (Uses corners-solver.js) ---
function startCornersSolver() {
    if (scanBtn) scanBtn.style.display = "none";
    removeControls();
    
    let moveCode = "D";
    try {
        // Call logic from corners-solver.js
        if (typeof getCornersMove === "function") {
            moveCode = getCornersMove(cubeMap);
        } else {
            console.error("Missing corners-solver.js!");
            return;
        }
    } catch(e) { console.error(e); }

    // Victory Check
    if (moveCode === "DONE") {
        instructionText.innerText = "Corners Solved! ✅";
        speak("First Layer Complete! Great job. Moving to Middle Layer.");
        
        let div = createProceedButton(() => {
             startMiddleLayerSolver();
        });
        document.body.appendChild(div);
        return;
    }

    // Instruction Logic based on Move Name
    let virtualCode = "D"; // Code to update memory

    if (moveCode === "D" || moveCode === "Top Twist") {
        instructionText.innerText = "Rotate Bottom (Yellow) 🔄";
        speak("Rotate the bottom Yellow layer to find a matching corner.");
        showBottomRotateOverlay(); 
        virtualCode = "D"; 
    }
    else if (moveCode === "Right Trigger") {
        instructionText.innerText = "Right Trigger ⚡";
        speak("Perform the Right Trigger: Right Up, Top Push, Right Down.");
        showTriggerOverlay("right"); 
        virtualCode = "R U R' U'";
    }
    else if (moveCode === "Left Trigger") {
        instructionText.innerText = "Left Trigger ⚡";
        speak("Perform the Left Trigger: Left Up, Top Push, Left Down.");
        showTriggerOverlay("left");
        virtualCode = "L' U' L U";
    }

    // Update Memory (We are updating memory here because Corners Solver relies on it!)
    if (typeof virtualMove === "function") {
        virtualMove(virtualCode, cubeMap);
    }

    // Next Button
    let div = document.createElement("div");
    div.id = "solver-controls"; div.style.position = "fixed"; div.style.bottom = "20px";
    div.style.width = "100%"; div.style.display = "flex"; div.style.justifyContent = "center"; div.style.zIndex = "200";
    
    let btn = document.createElement("button");
    btn.innerText = "I DID IT ➡️"; 
    btn.style.padding = "15px 40px"; btn.style.fontSize = "18px"; btn.style.fontWeight = "bold";
    btn.style.backgroundColor = "#2563eb"; btn.style.color = "white";
    btn.style.borderRadius = "50px"; btn.style.border = "none";
    
    btn.onclick = startCornersSolver; 
    
    div.appendChild(btn);
    document.body.appendChild(div);
}

// --- PHASE 3: MIDDLE LAYER ---
function startMiddleLayerSolver() {
    if (scanBtn) scanBtn.style.display = "none";
    removeControls(); 
    instructionText.innerText = "Phase 3: Middle Layer";
    speak("Phase 3. Middle Layer edges.");
    
    // Placeholder for now
    let controlsDiv = createProceedButton(startYellowCrossSolver);
    document.body.appendChild(controlsDiv);
}

// --- PHASE 4: YELLOW CROSS ---
function startYellowCrossSolver() {
    removeControls(); 
    instructionText.innerText = "Phase 4: Yellow Cross";
    speak("Phase 4. Yellow Cross.");
    let controlsDiv = createProceedButton(startYellowFaceSolver);
    document.body.appendChild(controlsDiv);
}

// --- PHASE 5: YELLOW FACE ---
function startYellowFaceSolver() {
    removeControls(); 
    instructionText.innerText = "Phase 5: Yellow Face";
    speak("Phase 5. Make top face Yellow.");
    let controlsDiv = createProceedButton(startFinalSolve);
    document.body.appendChild(controlsDiv);
}

// --- PHASE 6: FINALE ---
function startFinalSolve() {
    removeControls(); 
    instructionText.innerText = "Phase 6: The Finale";
    speak("Phase 6. Solve corners first.");
    let controlsDiv = createProceedButton(startFinalEdgesInstruction);
    document.body.appendChild(controlsDiv);
}

function startFinalEdgesInstruction() {
    removeControls();
    instructionText.innerText = "Final Step: Edges";
    speak("Solve the final edges.");

    let overlay = document.createElement("div");
    overlay.id = "generic-overlay";
    overlay.style.position = "fixed"; overlay.style.top = "100px"; overlay.style.width = "100%";
    overlay.style.textAlign = "center"; overlay.style.color = "white";
    overlay.innerHTML = `<h1 style="color:#22c55e;">FINISH IT!</h1>`;
    document.body.appendChild(overlay);

    createManualControls(
        () => alert("Video"),
        () => speak("Final Step"),
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

function showTriggerOverlay(side) {
    if (document.getElementById("trigger-overlay")) return;
    let overlay = createOverlay("trigger-overlay");
    if (side === 'left') {
         overlay.innerHTML = `<h2 style="color:white; margin-top:60px;">Left Trigger</h2>
         <img src="assets/left-trigger.png" style="width:80%; border:3px solid orange;">`;
    } else {
         overlay.innerHTML = `<h2 style="color:white; margin-top:60px;">Right Trigger</h2>
         <img src="assets/right-trigger.png" style="width:80%; border:3px solid red;">`;
    }
    document.body.appendChild(overlay);
}

function showBottomRotateOverlay() {
    if (document.getElementById("rotate-overlay")) return;
    let o = createOverlay("rotate-overlay");
    o.innerHTML = `<h2 style="color:white; margin-top:60px;">Rotate Bottom</h2><p>Spin the Yellow face until a corner matches.</p>`;
    document.body.appendChild(o);
    setTimeout(() => { if(o) o.remove(); }, 3000);
}

function showMiddleLayerOverlay() {
    if (document.getElementById("middle-overlay")) return;
    let overlay = createOverlay("middle-overlay");
    overlay.innerHTML = `<h2 style="color:white; margin-top:60px;">Middle Layer</h2>
    <img src="assets/middle-right.jpg" style="width:80%; border:3px solid red; margin:10px;">`;
    document.body.appendChild(overlay);
}

function showYellowCrossOverlay() {
    if (document.getElementById("cross-overlay")) return;
    let overlay = createOverlay("cross-overlay");
    overlay.innerHTML = `<h2 style="color:white; margin-top:60px;">Yellow Cross</h2>
    <img src="assets/yellow-cross.png" style="width:80%; border:3px solid yellow; margin:10px;">`;
    document.body.appendChild(overlay);
}

function showYellowFaceOverlay() {
    if (document.getElementById("fish-overlay")) return;
    let overlay = createOverlay("fish-overlay");
    overlay.innerHTML = `<h2 style="color:white; margin-top:60px;">Yellow Face</h2>
    <img src="assets/yellow-fish.png" style="width:80%; border:3px solid yellow; margin:10px;">`;
    document.body.appendChild(overlay);
}

function showHeadlightsOverlay() {
    if (document.getElementById("headlights-overlay")) return;
    let overlay = createOverlay("headlights-overlay");
    overlay.innerHTML = `<h2 style="color:white; margin-top:60px;">Headlights</h2>
    <img src="assets/yellow-headlights.png" style="width:80%; border:3px solid red; margin:10px;">`;
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