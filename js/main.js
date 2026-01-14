// --- CONFIGURATION ---
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const scanBtn = document.getElementById('scan-btn');
const instructionText = document.getElementById('instruction-text');

// The 6 sides we need to scan in order
const scanOrder = ['front', 'right', 'back', 'left', 'up', 'down'];
const sideColors = {
    'front': 'Green', 'right': 'Red', 'back': 'Blue', 
    'left': 'Orange', 'up': 'White', 'down': 'Yellow'
};
let currentSideIndex = 0;

// Store the final cube map (54 stickers)
let cubeMap = {
    front: [], right: [], back: [], left: [], up: [], down: []
};

// Flags
let hasFlippedForCross = false;
let isScanningForLayer2 = false;
let cornersIntroPlayed = false;

// --- 1. NAVIGATION LOGIC (THE FIX) ---

function goHome() {
    // 1. Show Home (Remove hidden class) - THIS FIXES THE JUMPING
    const home = document.getElementById('home-screen');
    home.classList.remove('hidden'); 
    
    // 2. Hide others
    document.getElementById('main-app').style.display = 'none';
    document.getElementById('steps-menu').style.display = 'none';
    
    // 3. Stop Camera
    if (video.srcObject) {
        let tracks = video.srcObject.getTracks();
        tracks.forEach(track => track.stop());
        video.srcObject = null;
    }

    // 4. Cleanup Overlays
    removeTriggerOverlay();
    removeMiddleLayerOverlay();
    removeYellowCrossOverlay();
    removeYellowFaceOverlay();
    removeHeadlightsOverlay();
    removeControls();
}

function enterMainApp() {
    // 1. HIDE HOME SCREEN (Crucial!)
    document.getElementById('home-screen').classList.add('hidden');
    
    // 2. Show App
    document.getElementById('steps-menu').style.display = 'none';
    document.getElementById('main-app').style.display = 'block';
    
    // 3. Start Camera
    startCamera();
    
    // 4. Reset Button & Text
    instructionText.innerText = "Show Green Center, then Scan.";
    if(scanBtn) {
        scanBtn.style.display = "block";
        scanBtn.innerText = "SCAN SIDE";
        scanBtn.className = ""; 
        scanBtn.onclick = scanFace; 
    }
}

function showStepsMenu() {
    document.getElementById('home-screen').classList.add('hidden');
    document.getElementById('steps-menu').style.display = 'flex';
}

function jumpToStep(stepNumber) {
    // Hide Home & Menu
    document.getElementById('home-screen').classList.add('hidden');
    document.getElementById('steps-menu').style.display = 'none';
    document.getElementById('main-app').style.display = 'block';
    
    // Hide Scanner UI
    if (scanBtn) scanBtn.style.display = "none";
    
    // Clear Overlays
    removeTriggerOverlay();
    removeMiddleLayerOverlay();
    removeYellowCrossOverlay();
    removeYellowFaceOverlay();
    removeHeadlightsOverlay();
    removeControls();

    // Jump to Function
    if (stepNumber === 1) enterMainApp();
    else if (stepNumber === 2) startCornersSolver();
    else if (stepNumber === 3) startMiddleLayerInstruction();
    else if (stepNumber === 4) startYellowCrossSolver();
    else if (stepNumber === 5) startYellowFaceSolver();
    else if (stepNumber === 6) startFinalSolve();
}

// --- 2. CAMERA SETUP ---
async function startCamera() {
    try {
        const constraints = { 
            video: { 
                facingMode: "environment",
                width: { ideal: 1280 }, 
                height: { ideal: 720 } 
            } 
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;
        video.onloadedmetadata = () => video.play();
    } catch (err) {
        instructionText.innerText = "Error: " + err.message;
        instructionText.style.color = "red";
    }
}

// --- 3. COLOR LOGIC ---
function rgbToHsv(r, g, b) {
    r /= 255, g /= 255, b /= 255;
    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, v = max;
    let d = max - min;
    s = max === 0 ? 0 : d / max;
    if (max === min) { h = 0; } 
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
    if (s < 20 && v > 50) return 'W'; 
    if (h >= 0 && h < 10) return 'R'; 
    if (h >= 340 && h <= 360) return 'R'; 
    if (h >= 10 && h < 45) return 'O'; 
    if (h >= 45 && h < 75) return 'Y'; 
    if (h >= 75 && h < 155) return 'G'; 
    if (h >= 155 && h < 260) return 'B'; 
    return 'W'; 
}

// --- 4. SCANNING LOGIC (WITH PREVIEW POPUP) ---
function scanFace() {
    if (!video.srcObject) return;
    hasFlippedForCross = false;

    // 1. Draw to Canvas
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    const width = canvas.width;
    const height = canvas.height;
    const stepX = width / 10; 
    const stepY = height / 10;
    const startX = (width / 2) - stepX; 
    const startY = (height / 2) - stepY;

    let currentScan = [];
    
    // 2. Scan Pixels
    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
            let x = startX + (col * stepX);
            let y = startY + (row * stepY);
            const pixel = ctx.getImageData(x, y, 1, 1).data;
            const colorCode = detectColor(pixel[0], pixel[1], pixel[2]);
            currentScan.push(colorCode);
        }
    }

    // 3. Show Preview Popup (Instead of saving immediately)
    showPreview(currentScan);
}

function showPreview(colors) {
    const overlay = document.getElementById('preview-overlay');
    const grid = document.getElementById('detected-colors-grid');
    grid.innerHTML = ''; // Clear old
    
    // Store temporarily
    window.tempColors = colors;
    
    // Helper to get hex code
    const hexMap = {'W':'#ffffff', 'Y':'#facc15', 'R':'#ef4444', 'O':'#f97316', 'G':'#22c55e', 'B':'#3b82f6'};
    
    colors.forEach(code => {
        let div = document.createElement('div');
        div.className = 'detected-cell';
        div.style.backgroundColor = hexMap[code] || '#999';
        grid.appendChild(div);
    });
    
    overlay.style.display = 'block';
    if(scanBtn) scanBtn.style.display = 'none';
}

function retakeScan() {
    document.getElementById('preview-overlay').style.display = 'none';
    if(scanBtn) scanBtn.style.display = 'block';
}

function confirmScan() {
    document.getElementById('preview-overlay').style.display = 'none';
    
    const expectedSideName = scanOrder[currentSideIndex];
    const expectedColor = sideColors[expectedSideName];
    
    // SAVE DATA
    cubeMap[expectedSideName] = window.tempColors;
    speak(`Saved ${expectedColor} side.`);
    
    currentSideIndex++;
    
    if (currentSideIndex < scanOrder.length) {
        let nextSide = scanOrder[currentSideIndex];
        let nextColor = sideColors[nextSide];
        instructionText.innerText = `Great! Now show ${nextColor} center.`;
        if(scanBtn) scanBtn.style.display = 'block';
    } else {
        // --- SCAN COMPLETE ---
        console.log("Scan Complete!");
        if (isScanningForLayer2) {
            speak("Scan complete. Let's solve the Middle Layer.");
            startMiddleLayerSolver(); 
            return; 
        }
        
        // Start Daisy
        instructionText.innerText = "Scanning Complete! Let's make the Daisy.";
        scanBtn.innerText = "START DAISY";
        scanBtn.onclick = startDaisySolver;
        speak("Scanning Complete! Make the Daisy.");
    }
}

// --- 5. SOLVER PHASES (YOUR LOGIC RESTORED) ---

function startDaisySolver() {
    if (isDaisySolved(cubeMap)) {
        speak("Daisy is perfect! Moving to White Cross.");
        instructionText.innerText = "Daisy Solved! ✅";
        scanBtn.innerText = "START WHITE CROSS";
        scanBtn.className = "w-full bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg";
        scanBtn.onclick = startWhiteCross; 
        return;
    }

    instructionText.innerText = "Step 1: Make the Daisy.";
    speak("Make a daisy by keeping the yellow block in the center, and 4 white petals on the top, bottom, right, and left.");

    scanBtn.innerText = "I DID IT -> RE-SCAN";
    scanBtn.className = "w-full bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg"; 
    
    scanBtn.onclick = () => {
        // RESET FOR RESCAN
        currentSideIndex = 0;
        scanOrder.forEach(side => cubeMap[side] = []);
        instructionText.innerText = "Great! Let's Re-Scan. Show Green Front.";
        scanBtn.innerText = "SCAN SIDE";
        scanBtn.className = ""; // Reset class
        scanBtn.onclick = scanFace; 
    };
}

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
             return;
        }

        if (move === "D") {
            speak("Rotate the Yellow Top. Look at the side color of the white petals. Stop when one matches its center.");
        } else if (move.includes("2")) {
            speak(`Match found! Turn that face two times.`);
        } else {
             speak(`Perform move ${move}`);
        }

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

    let introText = "Match the color beside the white sticker diagonally. Then perform a Trigger.";
    let case1Text = "Case 1: White on bottom? Hold it on right, do Right Trigger once.";
    let case2Text = "Case 2: White facing up? Put it above non-white corner, do Right Trigger twice.";
    
    instructionText.innerText = "Tutorial: Triggers & Unusual Cases";
    speak(introText);

    createCornerControls(
        () => speak(case1Text),
        () => speak(case2Text),
        () => openVideo("YOUR_VIDEO_ID_HERE"),
        () => speak(introText),
        () => startMiddleLayerSolver()
    );
}

// --- PHASE 3: MIDDLE LAYER ---
function startMiddleLayerSolver() {
    if (scanBtn) scanBtn.style.display = "none";
    removeControls(); 
    removeTriggerOverlay(); 

    instructionText.innerText = "Phase 3: Middle Layer";
    speak("Time to solve the Middle Layer edges.");

    let controlsDiv = createProceedButton(startMiddleLayerInstruction);
    document.body.appendChild(controlsDiv);
}

function startMiddleLayerInstruction() {
    removeControls(); 
    showMiddleLayerOverlay(); 

    let introText = "Make a T shape. Push away from the top color. Trigger with that hand. Fix the white corner.";
    let case1Text = "Case 1: Edge stuck? Hold on right, do Right Move once.";
    let case2Text = "Case 2: No edges? They are stuck. Do Case 1.";

    instructionText.innerText = "Tutorial: Middle Layer Edges";
    speak(introText);

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
    speak("Let's make a Yellow Cross.");
    let controlsDiv = createProceedButton(startYellowCrossInstruction);
    document.body.appendChild(controlsDiv);
}

function startYellowCrossInstruction() {
    removeControls(); 
    showYellowCrossOverlay(); 
    let strategy = "Dot, L-Shape, or Line. Move: Front, Right Trigger, Front Counter-Clockwise.";
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
    speak("Make the top face Yellow.");
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
    speak("Almost done. Solve corners first.");
    let controlsDiv = createProceedButton(startFinalCornersInstruction);
    document.body.appendChild(controlsDiv);
}

function startFinalCornersInstruction() {
    removeControls(); 
    showHeadlightsOverlay(); 
    let strategy = "Headlights at back. R Prime, F, R Prime, B 2. R, F Prime, R Prime, B 2, R 2.";
    instructionText.innerText = "Step A: Match Corners";
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
    overlay.style.position = "fixed"; overlay.style.top = "100px"; overlay.style.width = "100%";
    overlay.style.textAlign = "center"; overlay.style.color = "white";
    overlay.innerHTML = `<h1 style="color:#22c55e;">FINISH IT!</h1><p>Solved side at BACK.</p>`;
    document.body.appendChild(overlay);

    createManualControls(
        () => openVideo("YOUR_VIDEO_ID_HERE"),
        () => speak(strategy),
        () => { alert("CONGRATULATIONS! 🎉"); location.reload(); }
    );
}

// --- HELPERS: OVERLAYS ---
function createProceedButton(action) {
    let div = document.createElement("div");
    div.id = "solver-controls"; div.style.position = "fixed"; div.style.bottom = "20px";
    div.style.width = "100%"; div.style.display = "flex"; div.style.justifyContent = "center";
    div.style.zIndex = "9999";
    let btn = document.createElement("button");
    btn.innerText = "PROCEED ➡️"; btn.style.padding = "15px 40px";
    btn.style.fontSize = "18px"; btn.style.fontWeight = "bold";
    btn.style.backgroundColor = "#2563eb"; btn.style.color = "white";
    btn.style.borderRadius = "50px"; btn.style.border = "none";
    btn.onclick = action;
    div.appendChild(btn);
    return div;
}

function showTriggerOverlay() {
    if (document.getElementById("trigger-overlay")) return;
    let overlay = createOverlay("trigger-overlay");
    overlay.innerHTML = `<h2 style="color:white; margin-top:60px;">Triggers</h2>
    <img src="assets/right-trigger.png" style="width:80%; border:3px solid red; border-radius:15px; margin:10px;" onclick="speak('Right Trigger')">
    <img src="assets/left-trigger.png" style="width:80%; border:3px solid orange; border-radius:15px; margin:10px;" onclick="speak('Left Trigger')">`;
    document.body.appendChild(overlay);
}

function showMiddleLayerOverlay() {
    if (document.getElementById("middle-overlay")) return;
    let overlay = createOverlay("middle-overlay");
    overlay.innerHTML = `<h2 style="color:white; margin-top:60px;">Middle Layer</h2>
    <p style="color:white;">Match T shape. Push AWAY.</p>
    <img src="assets/middle-right.jpg" style="width:80%; border:3px solid red; margin:10px;" onclick="speak('Move Right')">
    <img src="assets/middle-left.jpg" style="width:80%; border:3px solid orange; margin:10px;" onclick="speak('Move Left')">`;
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
    <img src="assets/yellow-fish.png" style="width:80%; border:3px solid yellow; margin:10px;" onclick="speak('Right Up, Top Push, Right Down, Top Push...')">`;
    document.body.appendChild(overlay);
}

function showHeadlightsOverlay() {
    if (document.getElementById("headlights-overlay")) return;
    let overlay = createOverlay("headlights-overlay");
    overlay.innerHTML = `<h2 style="color:white; margin-top:60px;">Headlights</h2>
    <img src="assets/yellow-headlights.png" style="width:80%; border:3px solid red; margin:10px;" onclick="speak('Headlights at back. Long Move.')">`;
    document.body.appendChild(overlay);
}

function createOverlay(id) {
    let div = document.createElement("div");
    div.id = id; div.style.position = "fixed"; div.style.top = "0"; div.style.left = "0";
    div.style.width = "100%"; div.style.height = "100%"; div.style.backgroundColor = "black";
    div.style.zIndex = "100"; div.style.overflowY = "auto"; div.style.textAlign = "center";
    return div;
}

function removeTriggerOverlay() { removeEl("trigger-overlay"); }
function removeMiddleLayerOverlay() { removeEl("middle-overlay"); }
function removeYellowCrossOverlay() { removeEl("cross-overlay"); }
function removeYellowFaceOverlay() { removeEl("fish-overlay"); }
function removeHeadlightsOverlay() { removeEl("headlights-overlay"); }
function removeControls() { removeEl("solver-controls"); }
function removeEl(id) { let el = document.getElementById(id); if(el) el.remove(); }

// --- MANUAL CONTROLS UI ---
function createManualControls(onHelp, onRepeat, onNext) {
    removeControls();
    let div = document.createElement("div");
    div.id = "solver-controls"; div.style.position = "fixed"; div.style.bottom = "10px";
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
    
    let row1 = document.createElement("div"); row1.style.display = "flex"; row1.style.gap = "5px"; row1.style.marginBottom="5px";
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

// --- VOICE ---
function speak(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(u);
    }
}

function checkBrowser() {
    const ua = navigator.userAgent;
    if (ua.indexOf("Instagram") > -1 || ua.indexOf("FBAN") > -1) {
        alert("⚠️ Please open in Chrome or Safari for the camera to work!");
    }
}
checkBrowser();