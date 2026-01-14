


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

// --- NAVIGATION LOGIC ---

function goHome() {
    // Hide App & Menu
    document.getElementById('main-app').style.display = 'none';
    document.getElementById('steps-menu').style.display = 'none';
    
    // Show Home
    document.getElementById('home-screen').style.display = 'flex';
    
    // Stop Camera if running to save battery
    if (video.srcObject) {
        let tracks = video.srcObject.getTracks();
        tracks.forEach(track => track.stop());
        video.srcObject = null;
    }

    // Clear any overlays
    removeTriggerOverlay();
    removeMiddleLayerOverlay();
    removeYellowCrossOverlay();
    removeYellowFaceOverlay();
    removeHeadlightsOverlay();
    removeControls();
}



function enterMainApp() {
    document.getElementById('home-screen').style.display = 'none';
    document.getElementById('steps-menu').style.display = 'none';
    document.getElementById('main-app').style.display = 'block';
    
    // Start Camera
    startCamera();
    
    // FORCE BUTTON RESET
    instructionText.innerText = "Show Green Center, then Scan.";
    
    // Find button manually to be safe
    let btn = document.getElementById('scan-btn');
    if (btn) {
        btn.style.display = "block"; // Make sure it's visible
        btn.innerText = "SCAN SIDE";
        btn.className = ""; // Clear any old green/blue classes
        // Re-apply the basic styling class if needed, or rely on ID CSS
        btn.onclick = scanFace; 
    }
}









function showStepsMenu() {
    document.getElementById('home-screen').style.display = 'none';
    document.getElementById('steps-menu').style.display = 'flex';
}

function jumpToStep(stepNumber) {
    // 1. Enter App Mode (UI setup)
    document.getElementById('steps-menu').style.display = 'none';
    document.getElementById('main-app').style.display = 'block';
    
    // 2. Hide Scanner UI
    if (scanBtn) scanBtn.style.display = "none";
    
    // 3. Clear Overlays
    removeTriggerOverlay();
    removeMiddleLayerOverlay();
    removeYellowCrossOverlay();
    removeYellowFaceOverlay();
    removeHeadlightsOverlay();
    removeControls();

    // 4. Jump to Function
    if (stepNumber === 1) {
        // Daisy/Cross (Requires scan usually, but we can set up the scan UI)
        enterMainApp(); 
    }
    else if (stepNumber === 2) {
        startCornersSolver(); // Go to Corners
    }
    else if (stepNumber === 3) {
        startMiddleLayerInstruction(); // Go to Middle Layer
    }
    else if (stepNumber === 4) {
        startYellowCrossSolver(); // Go to Yellow Cross
    }
    else if (stepNumber === 5) {
        startYellowFaceSolver(); // Go to Fish
    }
    else if (stepNumber === 6) {
        startFinalSolve(); // Go to Finale
    }
}

// --- INIT ---
// Don't auto-start camera anymore.
// startCamera(); <--- REMOVE OR COMMENT OUT THIS LINE AT THE BOTTOM OF YOUR FILE
// Instead, we wait for the user to click "Start Solving"


let hasFlippedForCross = false;
// this is a flag (a memory switch)
let isScanningForLayer2 = false;

// --- 1. CAMERA SETUP (Fixed for Mobile) ---
async function startCamera() {
    try {
        const constraints = { 
            video: { 
                facingMode: "environment",
                width: { ideal: 1280 }, // Higher res for better color detection
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

// --- 2. THE COLOR BRAIN (HSV Logic) ---
function rgbToHsv(r, g, b) {
    r /= 255, g /= 255, b /= 255;
    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, v = max;
    let d = max - min;
    s = max === 0 ? 0 : d / max;
    if (max === min) {
        h = 0; 
    } else {
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

    // 1. WHITE Check (Low Saturation, High Brightness)
    if (s < 20 && v > 50) return 'W'; // White

    // 2. Color checks based on Hue (0-360)
    // Red is tricky because it wraps around 0 and 360
    if (h >= 0 && h < 10) return 'R';   // Red
    if (h >= 340 && h <= 360) return 'R'; // Red (Wrap)
    
    if (h >= 10 && h < 45) return 'O';  // Orange
    if (h >= 45 && h < 75) return 'Y';  // Yellow
    if (h >= 75 && h < 155) return 'G'; // Green
    if (h >= 155 && h < 260) return 'B'; // Blue
    
    return 'W'; // Default fallback
}



// --- 4. THE SCANNER LOGIC ---

function scanFace() {
    if (!video.srcObject) return;
    
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
    
    // 3. Hide the Scan Button so they focus on the popup
    if (scanBtn) scanBtn.style.display = 'none';
    
    // 4. Show the Preview Popup
    showPreview(currentScan);
}

// !!! THIS WAS MISSING !!!
function showPreview(colors) {
    const overlay = document.getElementById('preview-overlay');
    const grid = document.getElementById('detected-colors-grid');
    
    // Safety check
    if (!overlay || !grid) {
        console.error("Missing HTML elements for preview!");
        return;
    }

    grid.innerHTML = ''; 
    window.tempColors = colors; // Store for confirmation
    
    // Color Map for the UI
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
    const overlay = document.getElementById('preview-overlay');
    if (overlay) overlay.style.display = 'none';
    
    // 2. Save Data
    const sideName = scanOrder[currentSideIndex];
    cubeMap[sideName] = window.tempColors;
    
    // 3. Advance Counter
    currentSideIndex++;
    
    // 4. CHECK LOOP
    if (currentSideIndex < scanOrder.length) {
        // --- NOT DONE YET: Setup Next Side ---
        let nextSide = scanOrder[currentSideIndex];
        let nextColor = sideColors[nextSide];
        
        instructionText.innerText = `Great! Show ${nextColor} center.`;
        speak(`Great! Now show the ${nextColor} center.`);
        
        // Bring button back for next scan
        if (scanBtn) {
            scanBtn.style.display = 'block';
            scanBtn.innerText = "SCAN SIDE";
        }
        
    } else {
        // --- SCAN COMPLETE (All 6 sides done) ---
        
        // CHECK 1: Did we just finish the Daisy?
        if (typeof isDaisySolved === 'function' && isDaisySolved(cubeMap)) {
            speak("Daisy found! Moving to White Cross.");
            startWhiteCross(); // Jump to next step
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
        
        // Bring button back
        if (scanBtn) {
            scanBtn.style.display = 'block';
            scanBtn.innerText = "SCAN SIDE";
        }
        
    } else {
        // --- DONE SCANNING ---
        
        // CHECK: Is Daisy Already Solved?
        if (typeof isDaisySolved === 'function' && isDaisySolved(cubeMap)) {
            speak("Daisy found! Moving to White Cross.");
            startWhiteCross(); 
        } else {
            // Not solved, go to instructions
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



















// --- 3. SCANNING LOGIC ---
function scanFace() {
    hasFlippedForCross = false; // <--- RESET THE FLAG HERE
    // 1. Setup Canvas
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

    // 3. Validation Guard
    const expectedSideName = scanOrder[currentSideIndex];
    const expectedColor = sideColors[expectedSideName];
    const colorMap = {'Green':'G', 'Red':'R', 'Blue':'B', 'Orange':'O', 'White':'W', 'Yellow':'Y'};
    
    // Helper check (Safe mode)
    if (typeof isCenterCorrect === "function") {
         if (!isCenterCorrect(currentScan, colorMap[expectedColor])) {
            speak(`Wrong side. Show ${expectedColor}.`, `❌ Found Wrong Side. Show ${expectedColor}.`);
            instructionText.style.color = "red";
            return; 
        }
    }

    // 4. Save Data
    instructionText.style.color = "white";
    cubeMap[expectedSideName] = currentScan;
    speak(`Saved ${expectedColor} side.`);
    
    // 5. Advance Index
    currentSideIndex++;

// 6. DEBUGGING BLOCK STARTS HERE
    if (currentSideIndex < scanOrder.length) {
        let nextSide = scanOrder[currentSideIndex];
        let nextColor = sideColors[nextSide];
        speak(`Show the ${nextColor} center.`, `Show ${nextColor} center, then Scan.`);
    } else {
        // --- SCAN COMPLETE ---
        console.log("Scan Complete!");

        // 👇👇 NEW LOGIC STARTS HERE 👇👇
        if (isScanningForLayer2) {
            // We are in the middle of a game (Layer 2)
            speak("Scan complete. Let's solve the Middle Layer.");
            startMiddleLayerSolver(); 
            return; // Stop here! Do not check for Daisy.
        }
        // 👆👆 NEW LOGIC ENDS HERE 👆👆

        // --- OLD LOGIC (Only runs for New Game) ---
        try {
            // Check if external functions exist
            if (typeof isCubeSolved !== "function") {
                throw new Error("Missing 'isCubeSolved'. Check solver.js!");
            }
            if (typeof isDaisySolved !== "function") {
                throw new Error("Missing 'isDaisySolved'. Check solver.js!");
            }

            // Run the Logic
            if (isCubeSolved(cubeMap)) {
                instructionText.innerText = "Cube is already solved! 🎉";
                instructionText.style.color = "#4ade80"; 
                scanBtn.innerText = "RESET";
                scanBtn.onclick = () => location.reload();
                speak("Solved. You are done.");
                return;
            }

            if (isDaisySolved(cubeMap)) {
                instructionText.innerText = "Re-Scan Complete! Let's solve the Cross.";
                scanBtn.innerText = "SOLVE CROSS";
                scanBtn.className = "w-full bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg";
                scanBtn.onclick = startWhiteCross; 
                speak("Daisy found. Let's solve the cross.");
            } else {
                instructionText.innerText = "Scanning Complete! Let's make the Daisy.";
                scanBtn.innerText = "START DAISY";
                scanBtn.className = "w-full bg-yellow-500 text-black font-bold py-4 rounded-xl shadow-lg";
                
                scanBtn.onclick = startDaisySolver;
                
                speak(
                    "Make a daisy by keeping the yellow block in the center, and 4 white petals on the top, bottom, right, and left of that yellow middle piece.", 
                    "Scanning Complete! Make the Daisy." 
                );
            }

        } catch (error) {
            console.error(error);
            instructionText.innerText = "CRITICAL ERROR: " + error.message;
            instructionText.style.color = "red";
            speak("System Error. Please check the screen.");
        }
    }
}

// // --- VOICE ---
// function speak(text) {
//     window.speechSynthesis.cancel();
//     const utterance = new SpeechSynthesisUtterance(text);
//     window.speechSynthesis.speak(utterance);
// }




// --- VOICE (Fail-Safe Version) ---
// --- UPDATED VOICE & TEXT MANAGER ---

// Usage: speak("Audio Message", "Visual Text (Optional)");
// If you don't provide Visual Text, it just shows the Audio Message.

// --- UPDATED VOICE MANAGER ---
function speak(audioMsg, visualMsg) {
    // 1. Update the Text on Screen (if visualMsg is missing, use audioMsg)
    if (instructionText) {
        instructionText.innerText = visualMsg || audioMsg;
    }

    // 2. Play Audio
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel(); // Stop any previous talking
        const utterance = new SpeechSynthesisUtterance(audioMsg);
        utterance.rate = 1; 
        try {
            window.speechSynthesis.speak(utterance);
        } catch (e) {
            console.warn("Voice error:", e);
        }
    }
}







// --- INIT ---



//startCamera();





// --- EVENT LISTENERS ---
// INITIAL BUTTON SETUP
// We use .onclick instead of addEventListener so we can overwrite it later
scanBtn.onclick = () => {
    // 1. Voice Unlock (Keep this, it's good for mobile!)
    if ('speechSynthesis' in window) {
        const unlock = new SpeechSynthesisUtterance(''); 
        unlock.volume = 0; 
        window.speechSynthesis.speak(unlock);
    }

    // 2. Run the scan
    scanFace();
};
instructionText.innerText = "Show Green center, then Scan.";

// --- INSTAGRAM/FACEBOOK DETECTOR ---
function checkBrowser() {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    
    // Detect Instagram or Facebook in-app browsers
    if (userAgent.indexOf("Instagram") > -1 || userAgent.indexOf("FBAN") > -1 || userAgent.indexOf("FBAV") > -1) {
        
        // Show a warning banner
        const warningDiv = document.createElement("div");
        warningDiv.style.position = "fixed";
        warningDiv.style.top = "0";
        warningDiv.style.left = "0";
        warningDiv.style.width = "100%";
        warningDiv.style.backgroundColor = "#ffcc00"; // Yellow warning
        warningDiv.style.color = "black";
        warningDiv.style.padding = "15px";
        warningDiv.style.zIndex = "9999";
        warningDiv.style.textAlign = "center";
        warningDiv.style.fontWeight = "bold";
        warningDiv.innerHTML = "⚠️ For Camera & Voice to work, please click the 3 dots (top right) and choose 'Open in Chrome/Safari'.";
        
        document.body.appendChild(warningDiv);
    }
}

// Run this check when the page loads
checkBrowser();


// --- THE DAISY CHECKPOINT LOGIC ---

function startDaisySolver() {
    // 1. Check if (miraculously) it is already solved
    if (isDaisySolved(cubeMap)) {
        speak("Daisy is perfect! Moving to White Cross.");
        instructionText.innerText = "Daisy Solved! ✅";
        scanBtn.innerText = "START WHITE CROSS";
        // scanBtn.onclick = startWhiteCross; // We will code this next
        return;
    }

    // ... inside startDaisySolver ...

    // 2. If not solved, switch to "Manual Mode"
    instructionText.innerText = "Step 1: Make the Daisy.";
    instructionText.style.color = "yellow";
    
    // UPDATED SPEECH HERE TOO:
    speak(
        "Make a daisy by keeping the yellow block in the center, and 4 white petals on the top, bottom, right, and left of that yellow middle piece.",
        "Make a Daisy (Yellow Center + 4 White Petals)"
    );



    // 3. Optional: Show a helper image or video overlay
    // document.getElementById('grid-overlay').style.backgroundImage = "url('assets/daisy-guide.png')";

    // 4. The Button now triggers a Re-Scan
    scanBtn.innerText = "I DID IT -> RE-SCAN";
    scanBtn.className = "w-full bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg"; // Make it green
    
    scanBtn.onclick = () => {
        // CLEAR MEMORY
        currentSideIndex = 0;
        scanOrder.forEach(side => cubeMap[side] = []);

        // RESET UI for Scanning
        instructionText.innerText = "Great! Let's Re-Scan to find the next moves. Show Green Front.";
        instructionText.style.color = "white";
        scanBtn.innerText = "SCAN SIDE";
        scanBtn.className = "w-full bg-yellow-500 text-black font-bold py-4 rounded-xl shadow-lg"; // Back to yellow

        speak("Great job. Now I need to see the new arrangement. Show me the Green Front.");

        // Re-attach the scanning logic
        scanBtn.onclick = scanFace; 
    };
}



// --- SAFETY CHECKS ---

// Check 1: Validate Center Color
function isCenterCorrect(faceColors, expectedColor) {
    // The center sticker is always at index 4 in our array
    // 0 1 2
    // 3 4 5
    // 6 7 8
    const centerColor = faceColors[4]; 
    
    // We allow "Red" to pass if it sees "Orange" sometimes due to lighting, 
    // but we strictly block clearly wrong colors (like White vs Yellow).
    if (centerColor === expectedColor) {
        return true;
    }
    
    // Strict block: If we expect Red but see Blue, return false.
    return false;
}








// --- WHITE CROSS INTEGRATION ---

// --- WHITE CROSS SOLVER (Custom User Explanation) ---

// Global flag to ensure we only flip the cube once
// Global flag to ensure we only flip the cube once


function startWhiteCross() {
    // 1. Reset Flag
    hasFlippedForCross = false; 

    try {
        if (typeof getCrossMove !== "function") throw new Error("Missing getCrossMove");
        let move = getCrossMove(cubeMap);
        
        // 2. Victory
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

        // 3. TRANSLATE MOVES TO COLORS (The Fix)
        // We map the letters (R, L, F, B) to the actual colors you see.
        
        // ... inside startWhiteCross ...

        if (move === "D") {
            speak(
                // AUDIO: Very specific
                "Rotate the Yellow Top. Look at the side color of the white petals. Stop when one matches its center.", 
                // TEXT:
                "Rotate Top ➡️ (Match Petal Side)"
            );
        } 

        else if (move.includes("2")) {
            // It wants to turn a side 2 times (e.g., "R2")
            let faceLetter = move[0]; 
            let colorName = "";
            
            // Map Letter to Color
            if (faceLetter === 'F') colorName = "Green";
            if (faceLetter === 'R') colorName = "Red";    // The confusing one!
            if (faceLetter === 'L') colorName = "Orange"; // The other confusing one!
            if (faceLetter === 'B') colorName = "Blue";
            
            speak(
                `Match found! Turn the ${colorName} face two times.`, 
                `Turn ${colorName} Face 2x`
            );
        }
        else {
             // Fallback for other moves
             speak(`Perform move ${move}`, move);
        }

        // 4. Update Memory
        if (typeof virtualMove !== "function") throw new Error("Missing virtualMove");
        virtualMove(move, cubeMap);

        // 5. Loop
        scanBtn.innerText = "I DID IT (Next)";
        scanBtn.onclick = startWhiteCross;

    } catch (error) {
        console.error(error);
        instructionText.innerText = "ERROR: " + error.message;
        instructionText.style.color = "red";
    }
}


// Global flag to track if we already gave the intro speech
// Global flag for the strategy intro
// Global flag for the strategy intro
let cornersIntroPlayed = false;

// --- CORNERS TUTORIAL MODE (No Math) ---

// --- CORNERS TUTORIAL MODE (Strict Flow) ---

function startCornersSolver() {
    // 1. STEP 1: THE INTRO "CHAPTER BREAK"
    
    // Cleanup UI
    if (scanBtn) scanBtn.style.display = "none";
    removeControls(); 

    // Speak & Show "Time to solve corners"
    instructionText.innerText = "Phase 2: Corners";
    speak("Time to solve corners.");

    // Show "PROCEED" Button
    // We use a temporary simple button just for this step
    let controlsDiv = document.createElement("div");
    controlsDiv.id = "solver-controls"; // Re-use ID so removeControls() works later
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
    btnProceed.style.backgroundColor = "#2563eb"; // Blue
    btnProceed.style.color = "white";
    btnProceed.style.borderRadius = "50px";
    btnProceed.style.border = "none";
    btnProceed.style.boxShadow = "0 4px 10px rgba(0,0,0,0.3)";
    
    // CLICK PROCEED -> GO TO STEP 2
    btnProceed.onclick = startCornersInstruction;

    controlsDiv.appendChild(btnProceed);
    document.body.appendChild(controlsDiv);
}

// 2. STEP 2: THE INSTRUCTIONS & CONTROLS




// --- VIDEO PLAYER LOGIC ---
function openVideo(videoId) {
    let modal = document.getElementById("video-modal");
    let iframe = document.getElementById("yt-player");
    
    // Construct Embed URL
    iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
    modal.style.display = "flex";
}

function closeVideo() {
    let modal = document.getElementById("video-modal");
    let iframe = document.getElementById("yt-player");
    
    // Stop video by clearing source
    iframe.src = "";
    modal.style.display = "none";
}



//--------------------------------------------------------------



// Helper to convert "F" to "Front" for the text
function getFaceName(letter) {
    if (letter === 'F') return "Front";
    if (letter === 'R') return "Right";
    if (letter === 'L') return "Left";
    if (letter === 'B') return "Back";
    return "Side";
}

// --- 3-BUTTON MANUAL UI ---
// --- 3-BUTTON MANUAL UI ---
function createManualControls(onHelp, onRepeat, onNext) {
    removeControls();
    if (scanBtn) scanBtn.style.display = "none";

    let container = document.createElement("div");
    container.id = "solver-controls";
    container.style.position = "fixed"; 
    container.style.bottom = "20px";
    container.style.left = "5%";
    container.style.width = "90%";
    container.style.display = "flex";
    container.style.gap = "10px";
    
    // 3. LAYERING FIX: Set Z-Index higher than overlay (100)
    container.style.zIndex = "200"; // <--- HIGHER THAN OVERLAY
    
    // LEFT BUTTON: HELP (Video)
    let btnHelp = makeBtn("🎥 Help", "#3b82f6", onHelp);

    // MIDDLE BUTTON: REPEAT
    let btnRepeat = makeBtn("↺ Repeat", "#f59e0b", onRepeat);
    
    // RIGHT BUTTON: NEXT
    let btnNext = makeBtn("I Did It ➡️", "#22c55e", onNext);

    container.appendChild(btnHelp);
    container.appendChild(btnRepeat);
    container.appendChild(btnNext);
    
    document.body.appendChild(container);
}

// Helper to style buttons
function makeBtn(text, color, action) {
    let btn = document.createElement("button");
    btn.innerText = text;
    btn.onclick = action;
    btn.style.flex = "1"; // All buttons equal width
    btn.style.padding = "15px";
    btn.style.border = "none";
    btn.style.borderRadius = "10px";
    btn.style.backgroundColor = color;
    btn.style.color = "white";
    btn.style.fontWeight = "bold";
    btn.style.fontSize = "14px"; // Slightly smaller text to fit
    btn.style.boxShadow = "0 4px 6px rgba(0,0,0,0.3)";
    return btn;
}

function removeControls() {
    let old = document.getElementById("solver-controls");
    if (old) old.remove();
}




// --- CORNERS TUTORIAL MODE (With Image Overlay) ---

function startCornersSolver() {
    // 1. STEP 1: THE INTRO "CHAPTER BREAK"
    
    // Cleanup UI
    if (scanBtn) scanBtn.style.display = "none";
    removeControls(); 
    removeTriggerOverlay(); // Safety clear

    // Speak & Show "Time to solve corners"
    instructionText.innerText = "Phase 2: Corners";
    speak("Time to solve corners.");

    // Show "PROCEED" Button
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
    btnProceed.style.backgroundColor = "#2563eb"; // Blue
    btnProceed.style.color = "white";
    btnProceed.style.borderRadius = "50px";
    btnProceed.style.border = "none";
    btnProceed.style.boxShadow = "0 4px 10px rgba(0,0,0,0.3)";
    
    // CLICK PROCEED -> GO TO STEP 2
    btnProceed.onclick = startCornersInstruction;

    controlsDiv.appendChild(btnProceed);
    document.body.appendChild(controlsDiv);
}

// 2. STEP 2: SHOW IMAGES & INSTRUCTIONS
// 2. STEP 2: SHOW IMAGES & INSTRUCTIONS




function startCornersInstruction() {
    removeControls(); 

    // --- A. SHOW THE IMAGES ---
    showTriggerOverlay(); 

    // --- B. DEFINE SPEECHES ---
    let introText = "If needed, please watch the video. Here is the strategy: Make sure Yellow center is faced Up. Look for white stickers on the Top Layer, that are facing outward. Match the color beside the white sticker diagonally, to its matching center. Then, perform a Left or Right Trigger depending on which side the outward white sticker is. Tap an image to hear the move.";

    let case1Text = "Case 1: white stuck on bottom. If a white sticker is trapped in the bottom layer, hold the cube so that sticker is on your right. Perform one right trigger move. This moves the sticker to the top layer so you can solve it normally.";
    
    let case2Text = "Case 2: White facing up. If a white sticker is facing up, Rotate the top so the sticker is directly Above a non white corner of the white bottom. Perform the right trigger twice. Now the sticker is facing outward, and you can solve it normally.";

    let fullSpeechSequence = introText + " ... Unusual Situations ... " + case1Text + " ... " + case2Text;

    // --- C. SPEAK INSTRUCTIONS ---
    instructionText.innerText = "Tutorial: Triggers & Unusual Cases";
    speak(fullSpeechSequence);

    // --- D. SHOW CONTROLS ---
    createCornerControls(
        // 1. CASE 1
        () => speak(case1Text),
        
        // 2. CASE 2
        () => speak(case2Text),

        // 3. HELP
        () => openVideo("YOUR_VIDEO_ID_HERE"),

        // 4. REPEAT
        () => speak(fullSpeechSequence),

        // 5. NEXT (SKIP SCAN -> GO TO LAYER 2)
        () => {
             // 👇 CHANGED THIS LINE: Go straight to Middle Layer
            startMiddleLayerSolver();
        }
    );
}
















// --- PHASE 4: YELLOW CROSS ---

function startYellowCrossSolver() {
    // 1. Cleanup
    removeControls(); 
    removeMiddleLayerOverlay(); // Just in case

    // 2. Intro Speech
    instructionText.innerText = "Phase 4: Yellow Cross";
    speak("Phase 4. Let's make a Yellow Cross on top.");

    // 3. PROCEED Button
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
    btnProceed.style.boxShadow = "0 4px 10px rgba(0,0,0,0.3)";
    
    btnProceed.onclick = startYellowCrossInstruction;

    controlsDiv.appendChild(btnProceed);
    document.body.appendChild(controlsDiv);
}







function startYellowCrossInstruction() {
    removeControls(); 

    // --- A. SHOW OVERLAY ---
    showYellowCrossOverlay(); 

    // --- B. STRATEGY SPEECH ---
    let strategy = "Look at the Yellow stickers on top. You have one of three patterns: A Dot, an L-shape, or a Line. " +
                   "The Move is always the same: Front Face Clockwise, then the Right Trigger, then Front Face Counter-Clockwise. " +
                   "Tap the image to hear how to hold the cube for your specific pattern.";

    // --- C. SPEAK ---
    instructionText.innerText = "Tutorial: Yellow Cross";
    speak(strategy);

    // --- D. CONTROLS ---
    // We use the simpler 3-button layout here since the move is always the same
    createManualControls(
        // 1. HELP
        () => openVideo("YOUR_VIDEO_ID_HERE"),

        // 2. REPEAT
        () => speak(strategy),

        // 3. NEXT -> Phase 5 (Yellow Edges/Whole Face)
        () => {
        // Go to Yellow Face (Phase 5)
        startYellowFaceSolver(); 
    }
);
}

















// --- NEW HELPER: TRIGGER OVERLAY ---


// --- NEW HELPER: TRIGGER OVERLAY (Fixed Layering) ---
// Paste this at the VERY BOTTOM of js/main.js

// --- NEW HELPER: TRIGGER OVERLAY (Vertical, Large, Interactive) ---

function showTriggerOverlay() {
    if (document.getElementById("trigger-overlay")) return;

    let overlay = document.createElement("div");
    overlay.id = "trigger-overlay";
    
    // 1. LAYERING FIX: Set Z-Index to 100 (High, but not highest)
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100vw";
    overlay.style.height = "100vh";
    overlay.style.backgroundColor = "#000000"; // Black background
    overlay.style.zIndex = "100"; // <--- LOWERED THIS (Was 2 billion)
    
    overlay.style.display = "flex";
    overlay.style.flexDirection = "column";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "start"; 
    overlay.style.paddingTop = "80px"; // Space for text at top
    overlay.style.overflowY = "auto"; 
    overlay.style.paddingBottom = "150px"; // Extra space at bottom for buttons

    // 2. Add Visible Text Instruction inside the overlay
    let instruction = document.createElement("p");
    instruction.innerText = "Tap an image to hear the instructions.";
    instruction.style.color = "#ffffff";
    instruction.style.fontSize = "18px";
    instruction.style.textAlign = "center";
    instruction.style.marginBottom = "20px";
    instruction.style.padding = "0 20px";
    overlay.appendChild(instruction);

    let imgContainer = document.createElement("div");
    imgContainer.style.display = "flex";
    imgContainer.style.flexDirection = "column"; 
    imgContainer.style.gap = "40px"; 
    imgContainer.style.width = "100%";
    imgContainer.style.alignItems = "center";

    // --- RIGHT TRIGGER (TOP) ---
    let imgRight = document.createElement("img");
    imgRight.src = "assets/right-trigger.png"; 
    imgRight.style.width = "90%";
    imgRight.style.maxWidth = "500px";
    imgRight.style.border = "4px solid #ef4444"; // Red
    imgRight.style.borderRadius = "20px";
    imgRight.style.cursor = "pointer";
    
    // CLICK INTERACTION
    imgRight.onclick = (e) => {
        // Stop the click from bubbling up
        e.stopPropagation();
        speak("For right trigger. You are going to use your right hand to perform the three move sequence, by rotating right face away from you, pulling the top face towards you with your right index finger. Then rotating the right face back towards you.");
    };
    
    // --- LEFT TRIGGER (BOTTOM) ---
    let imgLeft = document.createElement("img");
    imgLeft.src = "assets/left-trigger.png"; 
    imgLeft.style.width = "90%";
    imgLeft.style.maxWidth = "500px";
    imgLeft.style.border = "4px solid #f97316"; // Orange
    imgLeft.style.borderRadius = "20px";
    imgLeft.style.cursor = "pointer";

    // CLICK INTERACTION
    imgLeft.onclick = (e) => {
        e.stopPropagation();
        speak("To perform the left trigger, rotate the left face away from you. Pull the top face towards you with your left index finger, then rotating back the left face towards you.");
    };

    imgContainer.appendChild(imgRight);
    imgContainer.appendChild(imgLeft);
    overlay.appendChild(imgContainer);
    document.body.appendChild(overlay);
}

function removeTriggerOverlay() {
    let overlay = document.getElementById("trigger-overlay");
    if (overlay) overlay.remove();
}


// --- SPECIAL 2-ROW CONTROLS FOR CORNERS ---
function createCornerControls(onCase1, onCase2, onHelp, onRepeat, onNext) {
    removeControls();
    if (scanBtn) scanBtn.style.display = "none";

    // 1. Main Container (Fixed at bottom)
    let container = document.createElement("div");
    container.id = "solver-controls";
    container.style.position = "fixed"; 
    container.style.bottom = "10px";
    container.style.left = "2.5%";
    container.style.width = "95%";
    container.style.display = "flex";
    container.style.flexDirection = "column"; // Stack rows vertically
    container.style.gap = "8px";
    container.style.zIndex = "200"; // Sit on top of overlay
    
    // 2. TOP ROW (Case Buttons)
    let row1 = document.createElement("div");
    row1.style.display = "flex";
    row1.style.gap = "8px";
    
    let btnCase1 = makeBtn("⚠️ Case 1: Bottom", "#9333ea", onCase1); // Purple
    let btnCase2 = makeBtn("⚠️ Case 2: Up", "#9333ea", onCase2);     // Purple
    
    row1.appendChild(btnCase1);
    row1.appendChild(btnCase2);

    // 3. BOTTOM ROW (Navigation Buttons)
    let row2 = document.createElement("div");
    row2.style.display = "flex";
    row2.style.gap = "8px";

    let btnHelp = makeBtn("🎥 Help", "#3b82f6", onHelp);
    let btnRepeat = makeBtn("↺ Repeat", "#f59e0b", onRepeat);
    let btnNext = makeBtn("I Did It ➡️", "#22c55e", onNext);

    row2.appendChild(btnHelp);
    row2.appendChild(btnRepeat);
    row2.appendChild(btnNext);

    // 4. Add rows to container
    container.appendChild(row1);
    container.appendChild(row2);
    
    document.body.appendChild(container);
}

// Re-using your helper to ensure buttons look consistent




// --- PHASE 3: MIDDLE LAYER (EDGES) ---

function startMiddleLayerSolver() {
    // 1. Cleanup Previous Step
    if (scanBtn) scanBtn.style.display = "none";
    removeControls(); 
    removeTriggerOverlay(); 

    // 2. Intro Speech
    instructionText.innerText = "Phase 3: Middle Layer";
    speak("Phase 3. Time to solve the Middle Layer edges.");

    // 3. Show "PROCEED" Button
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
    btnProceed.style.backgroundColor = "#2563eb"; // Blue
    btnProceed.style.color = "white";
    btnProceed.style.borderRadius = "50px";
    btnProceed.style.border = "none";
    btnProceed.style.boxShadow = "0 4px 10px rgba(0,0,0,0.3)";
    
    // ACTION: Go to Instructions
    btnProceed.onclick = startMiddleLayerInstruction;

    controlsDiv.appendChild(btnProceed);
    document.body.appendChild(controlsDiv);
}


function startMiddleLayerInstruction() {
    removeControls(); 

    // --- A. SHOW MIDDLE LAYER OVERLAY ---
    showMiddleLayerOverlay(); 

    // --- B. DEFINE SPEECHES ---
    let introText = "Strategy: Find an edge on the Top Layer that has NO Yellow colors. Match its front color to its center to make a upside down 'T' shape. Look at the top color of that piece.see wheather it matches the left center or right center. use your matched color side hand , and pull the top face towards you 90 degree, which will push it AWAY from that color's side. then do a  trigger move with the same hand. Now you will see a white sticker from already solved bottom layer has been displaced. Follow the previous corner solve method to send the white sticker back . Tap the images to hear the Right vs Left moves.";

    let case1Text = "Case 1: Edge is Stuck. If an edge piece is stuck in the middle layer but in the wrong spot, hold it on the Right side and perform the Right Move once. This pops it out to the top layer so you can solve it.";
    
    let case2Text = "Case 2: No Edges on Top. If all pieces on the top layer have yellow on them, it means your middle edges are stuck in the second layer. Use Case 1 to pop them out.";

    let fullSpeech = introText + " .... " + case1Text + " .... " + case2Text;

    // --- C. SPEAK ---
    instructionText.innerText = "Tutorial: Middle Layer Edges";
    speak(fullSpeech);

    // --- D. SHOW 5-BUTTON CONTROLS (Re-using your existing helper) ---
    createCornerControls(
        // 1. CASE 1: Stuck
        () => speak(case1Text),
        
        // 2. CASE 2: No Edges
        () => speak(case2Text),

        // 3. HELP (Video)
        () => openVideo("YOUR_VIDEO_ID_HERE"),

        
    // 4. REPEAT
    () => speak(introText),

    // 5. NEXT
    () => startYellowCrossSolver()
);



}


function showMiddleLayerOverlay() {
    // Unique ID for this overlay so it doesn't conflict
    if (document.getElementById("middle-overlay")) return;

    let overlay = document.createElement("div");
    overlay.id = "middle-overlay";
    
    // High Z-Index to cover camera, but lower than buttons (100)
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100vw";
    overlay.style.height = "100vh";
    overlay.style.backgroundColor = "#000000"; 
    overlay.style.zIndex = "100"; 
    
    overlay.style.display = "flex";
    overlay.style.flexDirection = "column";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "start"; 
    overlay.style.paddingTop = "80px";
    overlay.style.overflowY = "auto"; 
    overlay.style.paddingBottom = "150px"; 

    // Text Instruction
    let instruction = document.createElement("p");
    instruction.innerText = "Match the 'T' shape. Push AWAY from the top color.";
    instruction.style.color = "#ffffff";
    instruction.style.fontSize = "18px";
    instruction.style.textAlign = "center";
    instruction.style.marginBottom = "20px";
    instruction.style.padding = "0 20px";
    overlay.appendChild(instruction);

    let imgContainer = document.createElement("div");
    imgContainer.style.display = "flex";
    imgContainer.style.flexDirection = "column"; 
    imgContainer.style.gap = "40px"; 
    imgContainer.style.width = "100%";
    imgContainer.style.alignItems = "center";

    // --- IMAGE 1: MOVE RIGHT ---
    let imgRight = document.createElement("img");
    imgRight.src = "assets/middle-right.jpg"; 
    imgRight.style.width = "90%";
    imgRight.style.maxWidth = "500px";
    imgRight.style.border = "4px solid #ef4444"; // Red Border
    imgRight.style.borderRadius = "20px";
    imgRight.style.cursor = "pointer";
    
    imgRight.onclick = (e) => {
        e.stopPropagation();
        speak("To Move Right. First, push the Top layer away to the Left. " +
            "Perform the Right Trigger. " +
            "Now, perform the previous corner steps, to slot back in the displaced white sticker from bottom.");
    };

    // --- IMAGE 2: MOVE LEFT ---
    let imgLeft = document.createElement("img");
    imgLeft.src = "assets/middle-left.jpg"; 
    imgLeft.style.width = "90%";
    imgLeft.style.maxWidth = "500px";
    imgLeft.style.border = "4px solid #f97316"; // Orange Border
    imgLeft.style.borderRadius = "20px";
    imgLeft.style.cursor = "pointer";

    imgLeft.onclick = (e) => {
        e.stopPropagation();
        speak("To Move Left. First, push the Top layer away to the Right. " +
            "Perform the Left Trigger. " +
            "Now, perform the previous corner steps, to slot back in the displaced white sticker from bottom.");
    };

    imgContainer.appendChild(imgRight);
    imgContainer.appendChild(imgLeft);
    overlay.appendChild(imgContainer);
    document.body.appendChild(overlay);
}

// Helper to remove this specific overlay
function removeMiddleLayerOverlay() {
    let overlay = document.getElementById("middle-overlay");
    if (overlay) overlay.remove();
}













function showYellowCrossOverlay() {
    if (document.getElementById("cross-overlay")) return;

    let overlay = document.createElement("div");
    overlay.id = "cross-overlay";
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100vw";
    overlay.style.height = "100vh";
    overlay.style.backgroundColor = "#000000"; 
    overlay.style.zIndex = "100"; 
    
    overlay.style.display = "flex";
    overlay.style.flexDirection = "column";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "start"; 
    overlay.style.paddingTop = "40px"; // Reduced top padding slightly
    overlay.style.overflowY = "auto";  // Enable scrolling for small screens
    overlay.style.paddingBottom = "100px";

    // 1. Title
    let title = document.createElement("h2");
    title.innerText = "Tap your Pattern";
    title.style.color = "white";
    title.style.marginBottom = "10px";
    overlay.appendChild(title);

    // 2. IMAGE
    let img = document.createElement("img");
    img.src = "assets/yellow-cross.png"; // Check if yours is .png or .jpg!
    img.style.width = "90%";
    img.style.maxWidth = "500px";
    img.style.border = "4px solid #facc15"; // Yellow Border
    img.style.borderRadius = "20px";
    img.style.cursor = "pointer";

    // CLICK INTERACTION
    img.onclick = (e) => {
        e.stopPropagation();
        speak("If you have a Dot, do the move once to get the L-shape. " + 
              "If you have an L-shape, hold it at the top-left corner, like 9 o'clock. " +
              "If you have a Line, hold it horizontal, flat like the horizon. " + 
              "Then perform: Front Clockwise, Right Trigger, Front Counter-Clockwise.");
    };
    overlay.appendChild(img);

    // 3. TEXT INSTRUCTION BLOCK (NEW!)
    let textBox = document.createElement("div");
    textBox.style.color = "white";
    textBox.style.marginTop = "20px";
    textBox.style.textAlign = "center";
    textBox.style.padding = "0 20px";
    textBox.style.fontSize = "16px";
    textBox.style.lineHeight = "1.6";

    textBox.innerHTML = `
        <h3 style="color: #facc15; font-size: 22px; margin-bottom: 5px;">F R U R' U' F'</h3>
        <p style="font-size: 14px; color: #ccc;">(Front Clockwise, Right Trigger, Front Counter-Clockwise)</p>
        <div style="text-align: left; margin-top: 15px; display: inline-block;">
            <p>• <b>Dot:</b> Do it once ➝ Get "L"</p>
            <p>• <b>"L" Shape:</b> Hold at 9:00 ➝ Get Line</p>
            <p>• <b>Line:</b> Hold Horizontal ➝ Get Cross</p>
        </div>
    `;

    overlay.appendChild(textBox);
    document.body.appendChild(overlay);
}

function removeYellowCrossOverlay() {
    let overlay = document.getElementById("cross-overlay");
    if (overlay) overlay.remove();
}









// --- PHASE 5: YELLOW FACE (OLL) ---

function startYellowFaceSolver() {
    // 1. Cleanup
    removeControls(); 
    removeYellowCrossOverlay(); // Remove previous overlay

    // 2. Intro Speech
    instructionText.innerText = "Phase 5: Yellow Face";
    speak("Phase 5. Now we will make the entire top face Yellow.");

    // 3. PROCEED Button
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
    btnProceed.style.boxShadow = "0 4px 10px rgba(0,0,0,0.3)";
    
    btnProceed.onclick = startYellowFaceInstruction;

    controlsDiv.appendChild(btnProceed);
    document.body.appendChild(controlsDiv);
}





function startYellowFaceInstruction() {
    removeControls(); 

    // --- A. SHOW OVERLAY ---
    showYellowFaceOverlay(); 

    // --- B. STRATEGY SPEECH ---
    // Matches your transcript exactly
    let strategy = "Count the yellow corners on top. " +
                   "If you have 0 or 2 yellow corners: Rotate the top until a yellow sticker is on the Left Face, at the top-right corner closest to you. " +
                   "If you have 1 yellow corner, it looks like a Fish. Point the mouth to the bottom-left. " +
                   "Then perform the algorithm: R, U, R prime, U, R, U 2, R prime.";

    // --- C. SPEAK ---
    instructionText.innerText = "Tutorial: Yellow Face (The Fish)";
    speak(strategy);

    // --- D. CONTROLS ---
    createManualControls(
        // 1. HELP
        () => openVideo("YOUR_VIDEO_ID_HERE"),

        // 2. REPEAT
        () => speak(strategy),

        // In startYellowFaceInstruction...

    // 3. NEXT
    () => {
        startFinalSolve(); // <--- Link to the Finale!
    }
);
}





function showYellowFaceOverlay() {
    if (document.getElementById("fish-overlay")) return;

    let overlay = document.createElement("div");
    overlay.id = "fish-overlay";
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100vw";
    overlay.style.height = "100vh";
    overlay.style.backgroundColor = "#000000"; 
    overlay.style.zIndex = "100"; 
    
    overlay.style.display = "flex";
    overlay.style.flexDirection = "column";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "start"; 
    overlay.style.paddingTop = "40px";
    overlay.style.overflowY = "auto"; 
    overlay.style.paddingBottom = "100px";

    // 1. Title
    let title = document.createElement("h2");
    title.innerText = "Make the Fish";
    title.style.color = "white";
    title.style.marginBottom = "10px";
    overlay.appendChild(title);

    // 2. IMAGE
    let img = document.createElement("img");
    img.src = "assets/yellow-fish.png"; // Save the image I generate as this name!
    img.style.width = "90%";
    img.style.maxWidth = "500px";
    img.style.border = "4px solid #facc15"; 
    img.style.borderRadius = "20px";
    img.style.cursor = "pointer";

    img.onclick = (e) => {
        e.stopPropagation();
        speak("The Algorithm is: Right Up, Top Push, Right Down, Top Push, Right Up, Top Double Turn, Right Down. " + 
              "If you have the Fish, aim the mouth Bottom-Left. If not, look for a yellow sticker on the Left side.");
    };
    overlay.appendChild(img);

    // 3. TEXT INSTRUCTION BLOCK
    let textBox = document.createElement("div");
    textBox.style.color = "white";
    textBox.style.marginTop = "20px";
    textBox.style.textAlign = "center";
    textBox.style.padding = "0 20px";
    textBox.style.fontSize = "16px";
    textBox.style.lineHeight = "1.6";

    textBox.innerHTML = `
        <h3 style="color: #facc15; font-size: 22px; margin-bottom: 5px;">R U R' U R U2 R'</h3>
        <div style="text-align: left; margin-top: 15px; display: inline-block;">
            <p><b>1 Corner (Fish):</b><br>MOUTH points Bottom-Left ↙️</p>
            <p style="margin-top:10px;"><b>0 or 2 Corners:</b><br>Left Face ⬅️ must have yellow sticker at top-right.</p>
        </div>
    `;

    overlay.appendChild(textBox);
    document.body.appendChild(overlay);
}

function removeYellowFaceOverlay() {
    let overlay = document.getElementById("fish-overlay");
    if (overlay) overlay.remove();
}



// --- PHASE 6: THE GRAND FINALE ---

function startFinalSolve() {
    // 1. Cleanup
    removeControls(); 
    removeYellowFaceOverlay(); 

    // 2. Intro Speech
    instructionText.innerText = "Phase 6: The Finale";
    speak("Phase 6. We are almost done. Let's solve the corners first.");

    // 3. PROCEED Button
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
    btnProceed.style.boxShadow = "0 4px 10px rgba(0,0,0,0.3)";
    
    // Go to Step A (Corners)
    btnProceed.onclick = startFinalCornersInstruction;

    controlsDiv.appendChild(btnProceed);
    document.body.appendChild(controlsDiv);
}




function startFinalCornersInstruction() {
    removeControls(); 
    showHeadlightsOverlay(); 

    let strategy = "Look at the top layer sides. Do you see two corner stickers that are the same color? We call these Headlights. " +
                   "If you see them, rotate the top so they match their side, then put them at the BACK. " +
                   "If you don't see them, do the move anywhere, and they will appear. " +
                   "The Move is: Right Down, Front Clockwise, Right Down, Back Turn Twice. Right Up, Front Counter-Clockwise, Right Down, Back Turn Twice, Right Turn Twice.";

    instructionText.innerText = "Step A: Match Corners (Headlights)";
    speak(strategy);

    createManualControls(
        // 1. HELP
        () => openVideo("YOUR_VIDEO_ID_HERE"),

        // 2. REPEAT
        () => speak(strategy),

        // 3. NEXT -> Go to Edges
        () => {
             startFinalEdgesInstruction(); // <--- Next Step
        }
    );
}

function showHeadlightsOverlay() {
    if (document.getElementById("headlights-overlay")) return;

    let overlay = document.createElement("div");
    overlay.id = "headlights-overlay";
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100vw";
    overlay.style.height = "100vh";
    overlay.style.backgroundColor = "#000000"; 
    overlay.style.zIndex = "100"; 
    
    overlay.style.display = "flex";
    overlay.style.flexDirection = "column";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "start"; 
    overlay.style.paddingTop = "40px";
    overlay.style.overflowY = "auto"; 
    overlay.style.paddingBottom = "100px";

    let title = document.createElement("h2");
    title.innerText = "Find Headlights";
    title.style.color = "white";
    overlay.appendChild(title);

    let img = document.createElement("img");
    img.src = "assets/yellow-headlights.png"; // Make sure to save the image!
    img.style.width = "90%";
    img.style.maxWidth = "500px";
    img.style.border = "4px solid #ef4444"; 
    img.style.borderRadius = "20px";
    img.onclick = (e) => { e.stopPropagation(); speak("Put Headlights at the Back. Then: R Prime, F, R Prime, B 2. R, F Prime, R Prime, B 2, R 2."); };
    overlay.appendChild(img);

    let textBox = document.createElement("div");
    textBox.style.color = "white";
    textBox.style.marginTop = "20px";
    textBox.style.textAlign = "center";
    textBox.innerHTML = `
        <h3 style="color: #facc15; font-size: 18px;">R' F R' B2 R F' R' B2 R2</h3>
        <p>1. Find matching corners (Headlights).</p>
        <p>2. Put them at the <b>BACK</b>.</p>
        <p>3. Do the move.</p>
    `;
    overlay.appendChild(textBox);
    document.body.appendChild(overlay);
}

function removeHeadlightsOverlay() {
    let overlay = document.getElementById("headlights-overlay");
    if (overlay) overlay.remove();
}








function startFinalEdgesInstruction() {
    removeControls();
    removeHeadlightsOverlay(); // Clear previous

    let strategy = "Final Step. Look for a side that is fully solved. Put that solid side at the BACK. " +
                   "If you have no solid side, do the move anywhere once. " +
                   "The Final Move is: Front Spin Twice, Top Push, Left Down, Right Down. Front Spin Twice. Left Up, Right Up, Top Push, Front Spin Twice. " +
                   "Congratulations! You have solved the cube!";

    instructionText.innerText = "Step B: Final Edges";
    speak(strategy);

    // SIMPLE OVERLAY FOR TEXT ONLY (No image needed, logic is simple)
    let overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.top = "100px";
    overlay.style.width = "100%";
    overlay.style.textAlign = "center";
    overlay.style.color = "white";
    overlay.innerHTML = `
        <h1 style="color:#22c55e; font-size:40px;">FINISH IT!</h1>
        <h3 style="color:#facc15; font-size:24px; margin-top:20px;">F2 U L R' F2 L' R U F2</h3>
        <p style="margin-top:20px;">1. Put Solved Side at <b>BACK</b>.</p>
        <p>2. Perform the move.</p>
        <p>3. If not solved, do it one more time.</p>
    `;
    document.body.appendChild(overlay);

    createManualControls(
        () => openVideo("YOUR_VIDEO_ID_HERE"),
        () => speak(strategy),
        () => {
             alert("CONGRATULATIONS! 🎉 You are a Cube Master!");
             location.reload(); // Reset the app
        }
    );
}