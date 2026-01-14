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

// --- 1. VOICE (FIXED) ---
// This was missing! That's why it wasn't speaking.
function speak(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel(); // Stop any previous talking
        const utterance = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(utterance);
    }
}

// --- 2. NAVIGATION ---
function goHome() {
    const home = document.getElementById('home-screen');
    home.classList.remove('hidden'); 
    home.style.display = 'flex';
    document.getElementById('main-app').style.display = 'none';
    document.getElementById('steps-menu').style.display = 'none';
    stopCamera();
    clearAllOverlays();
}

function enterMainApp() {
    const home = document.getElementById('home-screen');
    home.classList.add('hidden');
    home.style.display = 'none';
    document.getElementById('steps-menu').style.display = 'none';
    document.getElementById('main-app').style.display = 'block';
    
    // Reset Logic
    currentSideIndex = 0;
    
    // Start Camera & UI
    startCamera();
    
    // Update Text & Voice
    instructionText.innerText = "Show Green Center, then Scan.";
    speak("Show Green Center, then Scan.");
    
    if(scanBtn) {
        scanBtn.style.display = "block";
        scanBtn.innerText = "SCAN SIDE";
        scanBtn.onclick = scanFace; 
    }
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
    clearAllOverlays();
    if (scanBtn) scanBtn.style.display = "none";

    // Route to logic
    if (stepNumber === 1) enterMainApp();
    else if (stepNumber === 2) startCornersSolver();
    else if (stepNumber === 3) startMiddleLayerSolver();
    else if (stepNumber === 4) startYellowCrossSolver();
    else if (stepNumber === 5) startYellowFaceSolver();
    else if (stepNumber === 6) startFinalSolve();
}

// --- 3. CAMERA ---
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

// --- 4. SCANNING LOGIC (FIXED) ---
function scanFace() {
    if (!video.srcObject) return;
    
    // Snapshot
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // DUMMY COLORS (We will fix detection later, but this makes the button work)
    let colors = ['G','G','G','G','G','G','G','G','G']; 
    
    // Hide Button
    scanBtn.style.display = 'none';
    
    // Show Preview
    showPreview(colors);
}

function showPreview(colors) {
    const overlay = document.getElementById('preview-overlay');
    const grid = document.getElementById('detected-colors-grid');
    grid.innerHTML = ''; 
    window.tempColors = colors;
    
    colors.forEach(code => {
        let div = document.createElement('div');
        div.className = 'detected-cell';
        div.style.backgroundColor = 'green'; 
        grid.appendChild(div);
    });
    
    overlay.style.display = 'block';
}

// THIS IS THE FUNCTION THAT WAS BROKEN
function confirmScan() {
    // 1. Hide Popup
    document.getElementById('preview-overlay').style.display = 'none';
    
    // 2. Save Data
    const side = scanOrder[currentSideIndex];
    cubeMap[side] = window.tempColors;
    currentSideIndex++;
    
    // 3. CHECK IF DONE
    if (currentSideIndex < scanOrder.length) {
        // NEXT SIDE
        let nextSide = scanOrder[currentSideIndex];
        let nextColor = sideColors[nextSide];
        
        // UPDATE TEXT & SPEAK
        instructionText.innerText = `Great! Show ${nextColor} center.`;
        speak(`Great! Now show the ${nextColor} center.`);
        
        // !!! BRING BUTTON BACK !!!
        scanBtn.style.display = 'block';
        
    } else {
        // FINISHED
        instructionText.innerText = "Scanning Complete!";
        speak("Scanning complete. Let's make the Daisy.");
        startDaisySolver();
    }
}

function retakeScan() {
    document.getElementById('preview-overlay').style.display = 'none';
    scanBtn.style.display = 'block';
}

// --- 5. SOLVER STEPS ---

function startDaisySolver() {
    if(scanBtn) scanBtn.style.display = 'block';
    instructionText.innerText = "Step 1: Make the Daisy.";
    speak("Make a daisy. Yellow center, white petals.");
    
    scanBtn.innerText = "I DID IT -> RE-SCAN";
    scanBtn.onclick = () => {
        // Loop back to start
        enterMainApp();
    };
}

// (Placeholders to prevent errors until we fix Images next)
function startCornersSolver() { alert("Corners Logic Loading..."); }
function startMiddleLayerSolver() { alert("Middle Logic Loading..."); }
function startYellowCrossSolver() { alert("Cross Logic Loading..."); }
function startYellowFaceSolver() { alert("Face Logic Loading..."); }
function startFinalSolve() { alert("Final Logic Loading..."); }

function clearAllOverlays() {
    let el = document.getElementById("generic-overlay");
    if(el) el.remove();
}