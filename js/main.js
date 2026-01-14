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
let currentSideIndex = 0;
let cubeMap = { front: [], right: [], back: [], left: [], up: [], down: [] };

// Flags
let hasFlippedForCross = false;
let isScanningForLayer2 = false;
let cornersIntroPlayed = false;

// --- 1. VOICE MANAGER ---
function speak(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel(); 
        const utterance = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(utterance);
    }
}

// --- 2. NAVIGATION (THE FIX) ---
function goHome() {
    // Force Home Screen to Show
    const home = document.getElementById('home-screen');
    home.classList.remove('hidden'); 
    home.style.display = 'flex'; // Fixes the "Button Jump" issue
    
    // Hide App
    document.getElementById('main-app').style.display = 'none';
    document.getElementById('steps-menu').style.display = 'none';
    
    stopCamera();
    
    // Clear Overlays
    removeTriggerOverlay();
    removeMiddleLayerOverlay();
    removeYellowCrossOverlay();
    removeYellowFaceOverlay();
    removeHeadlightsOverlay();
    removeControls();
}

function enterMainApp() {
    // Force Home Screen to Hide
    const home = document.getElementById('home-screen');
    home.classList.add('hidden');
    home.style.display = 'none';
    
    document.getElementById('steps-menu').style.display = 'none';
    document.getElementById('main-app').style.display = 'block';
    
    // RESET SCANNER
    currentSideIndex = 0;
    instructionText.innerText = "Show Green Center, then Scan.";
    speak("Show Green Center, then Scan.");
    
    // Force Button Reset
    if(scanBtn) {
        scanBtn.style.display = "block";
        scanBtn.innerText = "SCAN SIDE";
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
    
    // Clear Overlays
    removeTriggerOverlay();
    removeMiddleLayerOverlay();
    removeYellowCrossOverlay();
    removeYellowFaceOverlay();
    removeHeadlightsOverlay();
    removeControls();

    // ROUTING TO YOUR LOGIC
    if (stepNumber === 1) enterMainApp();
    else if (stepNumber === 2) startCornersSolver();
    else if (stepNumber === 3) startMiddleLayerSolver();
    else if (stepNumber === 4) startYellowCrossSolver();
    else if (stepNumber === 5) startYellowFaceSolver();
    else if (stepNumber === 6) startFinalSolve();
}

// --- 3. CAMERA & COLOR ---
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

// UPDATED: More forgiving Red/Orange detection
function detectColor(r, g, b) {
    const [h, s, v] = rgbToHsv(r, g, b);

    // 1. WHITE Check
    if (s < 25 && v > 40) return 'W'; 

    // 2. Color checks (Widened Ranges)
    if (h >= 0 && h < 15) return 'R';   // Widen Red start
    if (h >= 335 && h <= 360) return 'R'; // Widen Red end
    
    if (h >= 15 && h < 50) return 'O';  // Orange
    if (h >= 50 && h < 80) return 'Y';  // Yellow
    if (h >= 80 && h < 160) return 'G'; // Green
    if (h >= 160 && h < 260) return 'B'; // Blue
    
    return 'W'; // Fallback
}

// --- 4. SCANNER LOGIC (FIXED) ---

function scanFace() {
    if (!video.srcObject) return;
    hasFlippedForCross = false; 

    // 1. Capture Image
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    // 2. Scan the 9 squares
    const width = canvas.width;
    const height = canvas.height;
    const stepX = width / 10; 
    const stepY = height / 10;
    const startX = (width / 2) - stepX; 
    const startY = (height / 2) - stepY;

    let currentScan = [];
    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
            let x = startX + (col * stepX);
            let y = startY + (row * stepY);
            const pixel = ctx.getImageData(x, y, 1, 1).data;
            const colorCode = detectColor(pixel[0], pixel[1], pixel[2]);
            currentScan.push(colorCode);
        }
    }
    
    // --- REMOVED THE STRICT GUARD HERE ---
    // The code that blocked you ("Wrong side") is gone. 
    // It will now proceed to the preview.

    // 3. Hide the Scan Button
    if (scanBtn) scanBtn.style.display = 'none';
    
    // 4. Show the Preview Popup
    showPreview(currentScan);
}

function showPreview(colors) {
    const overlay = document.getElementById('preview-overlay');
    const grid = document.getElementById('detected-colors-grid');
    
    // Safety check
    if (!overlay || !grid) return;

    grid.innerHTML = ''; 
    window.tempColors = colors; 
    
    const hexMap = {'W':'white', 'Y':'#facc15', 'R':'#ef4444', 'O':'#f97316', 'G':'#22c55e', 'B':'#3b82f6'};
    
    colors.forEach(code => {
        let div = document.createElement('div');
        div.className = 'detected-cell';
        div.style.backgroundColor = hexMap[code] || '#ccc';
        grid.appendChild(div);
    });
    
    overlay.style.display = 'block';
}

function retakeScan() {
    document.getElementById('preview-overlay').style.display = 'none';
    if (scanBtn) scanBtn.style.display = 'block';
}

function confirmScan() {
    // 1. Hide Popup
    document.getElementById('preview-overlay').style.display = 'none';
    
    // 2. Save Data
    const sideName = scanOrder[currentSideIndex];
    cubeMap[sideName] = window.tempColors;
    
    // 3. Advance Counter
    currentSideIndex++;
    
    // 4. CHECK LOOP
    if (currentSideIndex < scanOrder.length) {
        // NEXT SIDE
        let nextSide = scanOrder[currentSideIndex];
        let nextColor = sideColors[nextSide];
        
        instructionText.innerText = `Great! Show ${nextColor} center.`;
        speak(`Great! Now show the ${nextColor} center.`);
        
        // IMPORTANT: Bring button back
        if (scanBtn) {
            scanBtn.style.display = 'block';
            scanBtn.innerText = "SCAN SIDE";
        }
        
    } else {
        // --- DONE SCANNING ---
        
        // CHECK 1: Did we just finish the Daisy?
        if (typeof isDaisySolved === 'function' && isDaisySolved(cubeMap)) {
            speak("Daisy found! Moving to White Cross.");
            startWhiteCross(); 
        } 
        // CHECK 2: Is the whole cube solved?
        else if (typeof isCubeSolved === 'function' && isCubeSolved(cubeMap)) {
             alert("Cube is already solved!");
             location.reload();
        }
        // CHECK 3: Daisy NOT found -> Go to instructions
        else {
            instructionText.innerText = "Scanning Complete! Let's make the Daisy.";
            speak("Scanning complete. Let's make the Daisy.");
            
            if (scanBtn) {
                scanBtn.style.display = 'block';
                scanBtn.innerText = "START DAISY";
                scanBtn.onclick = startDaisySolver;
            }
        }
    }
}

// =========================================================
// --- 5. YOUR SOLVER LOGIC (Merged Part 1 & 2) ---
// =========================================================

// Helper to convert "F" to "Front" for the text
function getFaceName(letter) {
    if (letter === 'F') return "Front";
    if (letter === 'R') return "Right";
    if (letter === 'L') return "Left";
    if (letter === 'B') return "Back";
    return "Side";
}

// --- PHASE 1: DAISY ---
function startDaisySolver() {
    // Check if already solved (Smart Check)
    if (typeof isDaisySolved === 'function' && isDaisySolved(cubeMap)) {
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
        // Reset Logic for Re-scan
        currentSideIndex = 0;
        scanOrder.forEach(side => cubeMap[side] = []);
        enterMainApp(); // Go back to scanning
    };
}

// --- PHASE 1.5: WHITE CROSS ---
function startWhiteCross() {
    hasFlippedForCross = false; 
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
            speak("Rotate the Yellow Top. Look at the side color of the white petals. Stop when one matches its center.");
        } else if (move.includes("2")) {
            let faceLetter = move[0];
            let colorName = (faceLetter === 'F') ? "Green" : (faceLetter === 'R' ? "Red" : (faceLetter === 'L' ? "Orange" : "Blue"));
            speak(`Match found! Turn the ${colorName} face two times.`);
        } else {
             speak(`Perform move ${move}`);
        }

        // Update Memory
        if (typeof virtualMove !== "function") throw new Error("Missing virtualMove");
        virtualMove(move, cubeMap);

        scanBtn.innerText = "I DID IT (Next)";
        scanBtn.onclick = startWhiteCross;

    } catch (error) {
        console.error(error);
        instructionText.innerText = "ERROR: " + error.message;
        instructionText.style.color = "red";
    }
}

// --- PHASE 2: CORNERS ---
function startCornersSolver() {
    if (scanBtn) scanBtn.style.display = "none";
    removeControls(); 
    removeTriggerOverlay(); 

    instructionText.innerText = "Phase 2: Corners";
    speak("Time to solve corners.");

    let controlsDiv = document.createElement("div");
    controlsDiv.id = "solver-controls"; 
    controlsDiv.style.position = "fixed"; 
    controlsDiv.style.bottom = "20px";
    controlsDiv.style.width = "100%";
    controlsDiv.style.display = "flex";
    controlsDiv.style.justifyContent = "center";
    controlsDiv.style.zIndex = "9999"; 

    let btnProceed = document.createElement("button");
    btnProceed.innerText = "PROCEED ➡️";
    btnProceed.style.padding = "15px 40px";
    btnProceed.style.fontSize = "18px";
    btnProceed.style.fontWeight = "bold";
    btnProceed.style.backgroundColor = "#2563eb"; 
    btnProceed.style.color = "white";
    btnProceed.style.borderRadius = "50px";
    btnProceed.style.border = "none";
    btnProceed.onclick = startCornersInstruction;

    controlsDiv.appendChild(btnProceed);
    document.body.appendChild(controlsDiv);
}

function startCornersInstruction() {
    removeControls(); 
    showTriggerOverlay(); 

    let introText = "If needed, please watch the video. Make sure Yellow center is faced Up. Look for white stickers on the Top Layer. Match diagonally.";
    let case1Text = "Case 1: White stuck on bottom? Hold on right. Perform Right Trigger once.";
    let case2Text = "Case 2: White facing up? Rotate top so sticker is above non-white corner. Perform Right Trigger twice.";
    
    let fullSpeechSequence = introText + " ... Unusual Situations ... " + case1Text + " ... " + case2Text;

    instructionText.innerText = "Tutorial: Triggers & Unusual Cases";
    speak(fullSpeechSequence);

    createCornerControls(
        () => speak(case1Text),
        () => speak(case2Text),
        () => openVideo("YOUR_VIDEO_ID_HERE"),
        () => speak(fullSpeechSequence),
        () => startMiddleLayerSolver()
    );
}

// --- PHASE 3: MIDDLE LAYER ---
function startMiddleLayerSolver() {
    if (scanBtn) scanBtn.style.display = "none";
    removeControls(); 
    removeTriggerOverlay(); 

    instructionText.innerText = "Phase 3: Middle Layer";
    speak("Phase 3. Time to solve the Middle Layer edges.");

    let controlsDiv = document.createElement("div");
    controlsDiv.id = "solver-controls"; 
    controlsDiv.style.position = "fixed"; 
    controlsDiv.style.bottom = "20px";
    controlsDiv.style.width = "100%";
    controlsDiv.style.display = "flex";
    controlsDiv.style.justifyContent = "center";
    controlsDiv.style.zIndex = "9999"; 

    let btnProceed = document.createElement("button");
    btnProceed.innerText = "PROCEED ➡️";
    btnProceed.style.padding = "15px 40px";
    btnProceed.style.fontSize = "18px";
    btnProceed.style.fontWeight = "bold";
    btnProceed.style.backgroundColor = "#2563eb"; 
    btnProceed.style.color = "white";
    btnProceed.style.borderRadius = "50px";
    btnProceed.style.border = "none";
    btnProceed.onclick = startMiddleLayerInstruction;

    controlsDiv.appendChild(btnProceed);
    document.body.appendChild(controlsDiv);
}

function startMiddleLayerInstruction() {
    removeControls(); 
    showMiddleLayerOverlay(); 

    let introText = "Strategy: Find an edge on Top Layer with NO Yellow. Match its front color to center. Make a T shape. Push AWAY from top color. Trigger.";
    let case1Text = "Case 1: Edge is Stuck. Hold on Right side. Perform Right Move once.";
    let case2Text = "Case 2: No Edges on Top. They are stuck. Use Case 1 to pop them out.";

    let fullSpeech = introText + " .... " + case1Text + " .... " + case2Text;

    instructionText.innerText = "Tutorial: Middle Layer Edges";
    speak(fullSpeech);

    createCornerControls(
        () => speak(case1Text),
        () => speak(case2Text),
        () => openVideo("YOUR_VIDEO_ID_HERE"),
        () => speak(introText),
        () => startYellowCrossSolver()
    );
}

// --- PHASE 4: YELLOW CROSS ---
function startYellowCrossSolver() {
    removeControls(); 
    removeMiddleLayerOverlay(); 
    instructionText.innerText = "Phase 4: Yellow Cross";
    speak("Phase 4. Let's make a Yellow Cross on top.");
    
    let controlsDiv = document.createElement("div");
    controlsDiv.id = "solver-controls"; 
    controlsDiv.style.position = "fixed"; 
    controlsDiv.style.bottom = "20px";
    controlsDiv.style.width = "100%";
    controlsDiv.style.display = "flex";
    controlsDiv.style.justifyContent = "center";
    controlsDiv.style.zIndex = "9999"; 

    let btnProceed = document.createElement("button");
    btnProceed.innerText = "PROCEED ➡️";
    btnProceed.style.padding = "15px 40px";
    btnProceed.style.fontSize = "18px";
    btnProceed.style.fontWeight = "bold";
    btnProceed.style.backgroundColor = "#2563eb"; 
    btnProceed.style.color = "white";
    btnProceed.style.borderRadius = "50px";
    btnProceed.style.border = "none";
    btnProceed.onclick = startYellowCrossInstruction;

    controlsDiv.appendChild(btnProceed);
    document.body.appendChild(controlsDiv);
}

function startYellowCrossInstruction() {
    removeControls(); 
    showYellowCrossOverlay(); 
    let strategy = "Look at Yellow stickers. Dot, L-Shape, or Line. Move: Front Clockwise, Right Trigger, Front Counter-Clockwise.";
    instructionText.innerText = "Tutorial: Yellow Cross";
    speak(strategy);

    createManualControls(
        () => openVideo("YOUR_VIDEO_ID_HERE"),
        () => speak(strategy),
        () => startYellowFaceSolver() 
    );
}

// --- PHASE 5: YELLOW FACE ---
function startYellowFaceSolver() {
    removeControls(); 
    removeYellowCrossOverlay(); 
    instructionText.innerText = "Phase 5: Yellow Face";
    speak("Phase 5. Now we will make the entire top face Yellow.");
    
    let controlsDiv = document.createElement("div");
    controlsDiv.id = "solver-controls"; 
    controlsDiv.style.position = "fixed"; 
    controlsDiv.style.bottom = "20px";
    controlsDiv.style.width = "100%";
    controlsDiv.style.display = "flex";
    controlsDiv.style.justifyContent = "center";
    controlsDiv.style.zIndex = "9999"; 

    let btnProceed = document.createElement("button");
    btnProceed.innerText = "PROCEED ➡️";
    btnProceed.style.padding = "15px 40px";
    btnProceed.style.fontSize = "18px";
    btnProceed.style.fontWeight = "bold";
    btnProceed.style.backgroundColor = "#2563eb"; 
    btnProceed.style.color = "white";
    btnProceed.style.borderRadius = "50px";
    btnProceed.style.border = "none";
    btnProceed.onclick = startYellowFaceInstruction;

    controlsDiv.appendChild(btnProceed);
    document.body.appendChild(controlsDiv);
}

function startYellowFaceInstruction() {
    removeControls(); 
    showYellowFaceOverlay(); 
    let strategy = "Count yellow corners. 0 or 2? Yellow on left. 1 (Fish)? Mouth bottom-left. Algorithm: R, U, R prime, U, R, U 2, R prime.";
    instructionText.innerText = "Tutorial: Yellow Face (The Fish)";
    speak(strategy);

    createManualControls(
        () => openVideo("YOUR_VIDEO_ID_HERE"),
        () => speak(strategy),
        () => startFinalSolve() 
    );
}

// --- PHASE 6: FINALE ---
function startFinalSolve() {
    removeControls(); 
    removeYellowFaceOverlay(); 
    instructionText.innerText = "Phase 6: The Finale";
    speak("Phase 6. We are almost done. Let's solve the corners first.");
    
    let controlsDiv = document.createElement("div");
    controlsDiv.id = "solver-controls"; 
    controlsDiv.style.position = "fixed"; 
    controlsDiv.style.bottom = "20px";
    controlsDiv.style.width = "100%";
    controlsDiv.style.display = "flex";
    controlsDiv.style.justifyContent = "center";
    controlsDiv.style.zIndex = "9999"; 

    let btnProceed = document.createElement("button");
    btnProceed.innerText = "PROCEED ➡️";
    btnProceed.style.padding = "15px 40px";
    btnProceed.style.fontSize = "18px";
    btnProceed.style.fontWeight = "bold";
    btnProceed.style.backgroundColor = "#2563eb"; 
    btnProceed.style.color = "white";
    btnProceed.style.borderRadius = "50px";
    btnProceed.style.border = "none";
    btnProceed.onclick = startFinalCornersInstruction;

    controlsDiv.appendChild(btnProceed);
    document.body.appendChild(controlsDiv);
}

function startFinalCornersInstruction() {
    removeControls(); 
    showHeadlightsOverlay(); 
    let strategy = "Headlights at back. R Prime, F, R Prime, B 2. R, F Prime, R Prime, B 2, R 2.";
    instructionText.innerText = "Step A: Match Corners (Headlights)";
    speak(strategy);

    createManualControls(
        () => openVideo("YOUR_VIDEO_ID_HERE"),
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

    // Simple Text Overlay
    let overlay = document.createElement("div");
    overlay.id = "generic-overlay";
    overlay.style.position = "fixed"; overlay.style.top = "100px"; overlay.style.width = "100%";
    overlay.style.textAlign = "center"; overlay.style.color = "white";
    overlay.innerHTML = `<h1 style="color:#22c55e; font-size:40px;">FINISH IT!</h1><p>Solved side at BACK.</p>`;
    document.body.appendChild(overlay);

    createManualControls(
        () => openVideo("YOUR_VIDEO_ID_HERE"),
        () => speak(strategy),
        () => { alert("CONGRATULATIONS! 🎉 You are a Cube Master!"); location.reload(); }
    );
}

// =========================================================
// --- 6. OVERLAY HELPERS & CONTROLS ---
// =========================================================

function showTriggerOverlay() {
    if (document.getElementById("trigger-overlay")) return;
    let overlay = createOverlay("trigger-overlay");
    overlay.innerHTML = `<h2 style="color:white; margin-top:60px;">Triggers</h2>
    <img src="assets/right-trigger.png" style="width:80%; border:3px solid red; border-radius:15px; margin:10px;" onclick="speak('For right trigger. Rotate right face away, pull top face towards you...')">
    <img src="assets/left-trigger.png" style="width:80%; border:3px solid orange; border-radius:15px; margin:10px;" onclick="speak('For left trigger. Rotate left face away, pull top face towards you...')">`;
    document.body.appendChild(overlay);
}

function showMiddleLayerOverlay() {
    if (document.getElementById("middle-overlay")) return;
    let overlay = createOverlay("middle-overlay");
    overlay.innerHTML = `<h2 style="color:white; margin-top:60px;">Middle Layer</h2>
    <p style="color:white;">Match T shape. Push AWAY.</p>
    <img src="assets/middle-right.jpg" style="width:80%; border:3px solid red; margin:10px;" onclick="speak('Move Right: Push Top Left. Right Trigger. Fix Corner.')">
    <img src="assets/middle-left.jpg" style="width:80%; border:3px solid orange; margin:10px;" onclick="speak('Move Left: Push Top Right. Left Trigger. Fix Corner.')">`;
    document.body.appendChild(overlay);
}

function showYellowCrossOverlay() {
    if (document.getElementById("cross-overlay")) return;
    let overlay = createOverlay("cross-overlay");
    overlay.innerHTML = `<h2 style="color:white; margin-top:60px;">Yellow Cross</h2>
    <img src="assets/yellow-cross.png" style="width:80%; border:3px solid yellow; margin:10px;" onclick="speak('Dot? Do once. L-shape? 9 oclock. Line? Horizontal. Move: Front, Right Trigger, Front Inverse')">`;
    document.body.appendChild(overlay);
}

function showYellowFaceOverlay() {
    if (document.getElementById("fish-overlay")) return;
    let overlay = createOverlay("fish-overlay");
    overlay.innerHTML = `<h2 style="color:white; margin-top:60px;">Yellow Face</h2>
    <img src="assets/yellow-fish.png" style="width:80%; border:3px solid yellow; margin:10px;" onclick="speak('Right Up, Top Push, Right Down, Top Push, Right Up, Top Double, Right Down.')">`;
    document.body.appendChild(overlay);
}

function showHeadlightsOverlay() {
    if (document.getElementById("headlights-overlay")) return;
    let overlay = createOverlay("headlights-overlay");
    overlay.innerHTML = `<h2 style="color:white; margin-top:60px;">Headlights</h2>
    <img src="assets/yellow-headlights.png" style="width:80%; border:3px solid red; margin:10px;" onclick="speak('Put Headlights at Back. R Prime, F, R Prime, B 2. R, F Prime, R Prime, B 2, R 2.')">`;
    document.body.appendChild(overlay);
}

function createOverlay(id) {
    let div = document.createElement("div");
    div.id = id; 
    div.style.position = "fixed"; div.style.top = "0"; div.style.left = "0";
    div.style.width = "100%"; div.style.height = "100%"; div.style.backgroundColor = "black";
    div.style.zIndex = "100"; div.style.overflowY = "auto"; div.style.textAlign = "center";
    return div;
}

// CLEAR FUNCTIONS
function removeTriggerOverlay() { removeEl("trigger-overlay"); }
function removeMiddleLayerOverlay() { removeEl("middle-overlay"); }
function removeYellowCrossOverlay() { removeEl("cross-overlay"); }
function removeYellowFaceOverlay() { removeEl("fish-overlay"); }
function removeHeadlightsOverlay() { removeEl("headlights-overlay"); }
function removeControls() { removeEl("solver-controls"); }
function clearAllOverlays() {
    removeTriggerOverlay(); removeMiddleLayerOverlay(); removeYellowCrossOverlay();
    removeYellowFaceOverlay(); removeHeadlightsOverlay(); removeControls(); removeEl("generic-overlay");
}
function removeEl(id) { let el = document.getElementById(id); if(el) el.remove(); }

// --- MANUAL CONTROLS UI ---
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

function openVideo(videoId) {
    let modal = document.getElementById("video-modal");
    let iframe = document.getElementById("yt-player");
    iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
    modal.style.display = "flex";
}
function closeVideo() {
    let modal = document.getElementById("video-modal");
    let iframe = document.getElementById("yt-player");
    iframe.src = "";
    modal.style.display = "none";
}

// BROWSER CHECK
function checkBrowser() {
    const ua = navigator.userAgent;
    if (ua.indexOf("Instagram") > -1 || ua.indexOf("FBAN") > -1) {
        let w = document.createElement("div"); w.style.position="fixed"; w.style.top="0"; w.style.width="100%"; w.style.background="yellow"; w.style.color="black"; w.innerText="⚠️ Open in Chrome for Camera!"; document.body.appendChild(w);
    }
}
checkBrowser();