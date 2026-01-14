// --- CONFIGURATION ---
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const scanBtn = document.getElementById('scan-btn');
const instructionText = document.getElementById('instruction-text');

// Global State
const scanOrder = ['front', 'right', 'back', 'left', 'up', 'down'];
const sideColors = { 'front': 'Green', 'right': 'Red', 'back': 'Blue', 'left': 'Orange', 'up': 'White', 'down': 'Yellow' };
let currentSideIndex = 0;
let cubeMap = { front: [], right: [], back: [], left: [], up: [], down: [] };
let hasFlippedForCross = false;
let isScanningForLayer2 = false;

// --- CRITICAL: NAVIGATION LOGIC ---

function goHome() {
    // 1. Force Home Screen to Show
    const home = document.getElementById('home-screen');
    home.classList.remove('hidden'); 
    home.style.display = 'flex'; // Force flex layout
    
    // 2. Hide everything else
    document.getElementById('main-app').style.display = 'none';
    document.getElementById('steps-menu').style.display = 'none';
    
    // 3. Kill Camera
    stopCamera();

    // 4. Clean up any lingering overlays/buttons
    clearAllOverlays();
}

function enterMainApp() {
    // 1. Force Home Screen to Hide
    const home = document.getElementById('home-screen');
    home.classList.add('hidden');
    home.style.display = 'none'; // Double assurance
    
    // 2. Show App
    document.getElementById('steps-menu').style.display = 'none';
    document.getElementById('main-app').style.display = 'block';
    
    // 3. Start Camera
    startCamera();
    
    // 4. Reset UI to "Scan Mode"
    instructionText.innerText = "Show Green Center, then Scan.";
    if(scanBtn) {
        scanBtn.style.display = "block";
        scanBtn.innerText = "SCAN SIDE";
        scanBtn.onclick = scanFace; 
    }
}

function showStepsMenu() {
    // 1. Hide Home
    const home = document.getElementById('home-screen');
    home.classList.add('hidden');
    home.style.display = 'none';

    // 2. Show Menu
    document.getElementById('steps-menu').style.display = 'flex';
}

function jumpToStep(stepNumber) {
    // 1. Hide Menu & Home
    document.getElementById('home-screen').classList.add('hidden');
    document.getElementById('home-screen').style.display = 'none';
    document.getElementById('steps-menu').style.display = 'none';
    
    // 2. Show Main App
    document.getElementById('main-app').style.display = 'block';
    
    // 3. Clear everything
    clearAllOverlays();
    if (scanBtn) scanBtn.style.display = "none";

    // 4. Route to the right function
    if (stepNumber === 1) enterMainApp(); // Daisy (Scan)
    else if (stepNumber === 2) startCornersSolver();
    else if (stepNumber === 3) startMiddleLayerSolver();
    else if (stepNumber === 4) startYellowCrossSolver();
    else if (stepNumber === 5) startYellowFaceSolver();
    else if (stepNumber === 6) startFinalSolve();
}

// --- CAMERA HELPERS ---
async function startCamera() {
    try {
        if (video.srcObject) return; // Already running
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

// --- SCANNING LOGIC ---
function scanFace() {
    if (!video.srcObject) return;
    
    // Capture Image
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    // Mock Scan - Logic to get colors would go here
    // For now, we simulate finding colors so you can proceed
    let dummyColors = ['G','G','G','G','G','G','G','G','G']; 
    
    showPreview(dummyColors);
}

function showPreview(colors) {
    const overlay = document.getElementById('preview-overlay');
    const grid = document.getElementById('detected-colors-grid');
    grid.innerHTML = ''; 
    
    window.tempColors = colors;
    
    colors.forEach(code => {
        let div = document.createElement('div');
        div.className = 'detected-cell';
        div.style.backgroundColor = 'green'; // Just for visual test
        grid.appendChild(div);
    });
    
    overlay.style.display = 'block';
    if(scanBtn) scanBtn.style.display = 'none';
}

function confirmScan() {
    document.getElementById('preview-overlay').style.display = 'none';
    
    const side = scanOrder[currentSideIndex];
    cubeMap[side] = window.tempColors;
    currentSideIndex++;
    
    if (currentSideIndex < scanOrder.length) {
        let next = sideColors[scanOrder[currentSideIndex]];
        instructionText.innerText = `Great! Show ${next} center.`;
        if(scanBtn) scanBtn.style.display = 'block';
    } else {
        // Start Game
        startDaisySolver();
    }
}

function retakeScan() {
    document.getElementById('preview-overlay').style.display = 'none';
    if(scanBtn) scanBtn.style.display = 'block';
}

// --- SOLVER PHASES ---

// Phase 1: Daisy
function startDaisySolver() {
    if(scanBtn) scanBtn.style.display = 'block';
    instructionText.innerText = "Step 1: Make the Daisy.";
    scanBtn.innerText = "I DID IT -> RE-SCAN";
    scanBtn.onclick = () => {
        // Reset Logic
        currentSideIndex = 0;
        enterMainApp();
    };
}

// Phase 2: Corners
function startCornersSolver() {
    clearAllOverlays();
    instructionText.innerText = "Phase 2: Corners";
    createProceedButton(startCornersInstruction);
}
function startCornersInstruction() {
    clearAllOverlays();
    showOverlayContent("Corners Strategy", "assets/right-trigger.png", "Match diagonal. Trigger.");
    createManualControls(() => startMiddleLayerSolver());
}

// Phase 3: Middle Layer
function startMiddleLayerSolver() {
    clearAllOverlays();
    instructionText.innerText = "Phase 3: Middle Layer";
    createProceedButton(startMiddleLayerInstruction);
}
function startMiddleLayerInstruction() {
    clearAllOverlays();
    showOverlayContent("Middle Layer", "assets/middle-right.jpg", "Make a T. Push Away.");
    createManualControls(() => startYellowCrossSolver());
}

// Phase 4: Yellow Cross
function startYellowCrossSolver() {
    clearAllOverlays();
    instructionText.innerText = "Phase 4: Yellow Cross";
    createProceedButton(startYellowCrossInstruction);
}
function startYellowCrossInstruction() {
    clearAllOverlays();
    showOverlayContent("Yellow Cross", "assets/yellow-cross.png", "F, R, U, R', U', F'");
    createManualControls(() => startYellowFaceSolver());
}

// Phase 5: Yellow Face
function startYellowFaceSolver() {
    clearAllOverlays();
    instructionText.innerText = "Phase 5: Yellow Face";
    createProceedButton(startYellowFaceInstruction);
}
function startYellowFaceInstruction() {
    clearAllOverlays();
    showOverlayContent("Yellow Face", "assets/yellow-fish.png", "R, U, R', U, R, U2, R'");
    createManualControls(() => startFinalSolve());
}

// Phase 6: Finale
function startFinalSolve() {
    clearAllOverlays();
    instructionText.innerText = "Phase 6: The Finale";
    createProceedButton(startFinalInstruction);
}
function startFinalInstruction() {
    clearAllOverlays();
    showOverlayContent("Final Moves", "assets/yellow-headlights.png", "Solve Corners then Edges.");
    createManualControls(() => { alert("YOU DID IT!"); location.reload(); });
}

// --- UI HELPERS ---

function clearAllOverlays() {
    const ids = ["solver-controls", "generic-overlay"];
    ids.forEach(id => {
        let el = document.getElementById(id);
        if(el) el.remove();
    });
}

// Generic Overlay Creator (Replaces all individual showXOverlay functions)
function showOverlayContent(title, imgSrc, text) {
    let overlay = document.createElement("div");
    overlay.id = "generic-overlay";
    overlay.style.position = "fixed"; overlay.style.top = "0"; overlay.style.left = "0";
    overlay.style.width = "100%"; overlay.style.height = "100%";
    overlay.style.backgroundColor = "black"; overlay.style.zIndex = "100";
    overlay.style.display = "flex"; overlay.style.flexDirection = "column"; 
    overlay.style.alignItems = "center"; overlay.style.paddingTop = "60px";

    overlay.innerHTML = `
        <h2 style="color:white;">${title}</h2>
        <img src="${imgSrc}" style="width:80%; max-width:300px; border:2px solid white; border-radius:10px; margin:20px 0;">
        <p style="color:white; padding:0 20px; text-align:center;">${text}</p>
    `;
    document.body.appendChild(overlay);
}

function createProceedButton(action) {
    let div = document.createElement("div");
    div.id = "solver-controls";
    div.style.position = "fixed"; div.style.bottom = "30px"; div.style.width = "100%";
    div.style.display = "flex"; div.style.justifyContent = "center"; div.style.zIndex = "200";
    
    let btn = document.createElement("button");
    btn.innerText = "PROCEED ➡️";
    btn.style.padding = "15px 40px"; btn.style.fontSize = "18px"; btn.style.fontWeight = "bold";
    btn.style.backgroundColor = "#2563eb"; btn.style.color = "white"; 
    btn.style.borderRadius = "30px"; btn.style.border = "none";
    
    btn.onclick = action;
    div.appendChild(btn);
    document.body.appendChild(div);
}

function createManualControls(onNext) {
    let div = document.createElement("div");
    div.id = "solver-controls";
    div.style.position = "fixed"; div.style.bottom = "20px"; div.style.width = "100%";
    div.style.display = "flex"; div.style.justifyContent = "center"; div.style.gap="10px"; div.style.zIndex = "200";
    
    let btnNext = document.createElement("button");
    btnNext.innerText = "Next Step ➡️";
    btnNext.style.padding = "15px 30px"; btnNext.style.backgroundColor = "#22c55e"; btnNext.style.color = "white";
    btnNext.style.border = "none"; btnNext.style.borderRadius = "10px";
    btnNext.onclick = onNext;

    div.appendChild(btnNext);
    document.body.appendChild(div);
}