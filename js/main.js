
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
    if (h >= 0 && h < 10) return 'R';   // Red
    if (h >= 340 && h <= 360) return 'R'; // Red (Wrap)
    
    if (h >= 10 && h < 45) return 'O';  // Orange
    if (h >= 45 && h < 75) return 'Y';  // Yellow
    if (h >= 75 && h < 155) return 'G'; // Green
    if (h >= 155 && h < 260) return 'B'; // Blue
    
    return 'W'; // Default fallback
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
//     window.speechSynthesis.cancel();
//     const utterance = new SpeechSynthesisUtterance(text);
//     window.speechSynthesis.speak(utterance);
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
startCamera();
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
            if (faceLetter === 'R') colorName = "Red";    // The confusing one!
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


// --- RE-SCAN LOGIC ---
function startReScanForLayer2() {
    // 1. Cleanup UI
    removeControls();
    if (scanBtn) {
        scanBtn.style.display = "block";
        scanBtn.innerText = "SCAN FRONT (GREEN)";
        scanBtn.className = "w-full bg-yellow-500 text-black font-bold py-4 rounded-xl shadow-lg";
    }

    // 2. Reset Scanning Memory
    currentSideIndex = 0;
    scanOrder.forEach(side => cubeMap[side] = []);

    // 3. Prompt User
    instructionText.innerText = "Great! Let's check your work. Show Green Front.";
    speak("Great job. Now I need to scan the cube again to help you with the next layer. Show me the Green Front.");

    // 4. Link Button to Scanner
    scanBtn.onclick = scanFace; 
}

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

// --- CONTROLS MANAGER (The 3 Buttons) ---

function updateControls(onRepeat, onVideo, onNext) {
    // 1. HIDE the old big button (Critical!)
    if (scanBtn) scanBtn.style.display = "none";

    // 2. Find or Create the Container
    let controlsDiv = document.getElementById("solver-controls");
    
    // Safety check: if container missing, append it after instruction text
    if (!controlsDiv) {
        controlsDiv = document.createElement("div");
        controlsDiv.id = "solver-controls";
        controlsDiv.style.display = "flex";
        controlsDiv.style.gap = "10px";
        controlsDiv.style.marginTop = "15px";
        controlsDiv.style.justifyContent = "center";
        controlsDiv.style.width = "100%";
        
        // Append to the parent of instructionText (usually the main container)
        instructionText.parentNode.insertBefore(controlsDiv, instructionText.nextSibling);
    }

    // 3. Clear old buttons
    controlsDiv.innerHTML = "";

    // 4. Create the 3 Buttons
    let btnRepeat = createButton("↺ Repeat", "#f59e0b", onRepeat); // Yellow/Orange
    let btnVideo  = createButton("🎥 Help", "#3b82f6", onVideo);   // Blue
    let btnNext   = createButton("✅ Next", "#22c55e", onNext);    // Green

    // 5. Add them
    controlsDiv.appendChild(btnRepeat);
    controlsDiv.appendChild(btnVideo);
    controlsDiv.appendChild(btnNext);
}

function createButton(text, color, onClick) {
    let btn = document.createElement("button");
    btn.innerText = text;
    
    // STYLE
    btn.style.flex = "1"; // Equal width
    btn.style.padding = "15px";
    btn.style.border = "none";
    btn.style.borderRadius = "12px";
    btn.style.backgroundColor = color;
    btn.style.color = "white";
    btn.style.fontWeight = "bold";
    btn.style.fontSize = "16px";
    btn.style.cursor = "pointer";
    btn.style.boxShadow = "0 4px 6px rgba(0,0,0,0.1)";

    // CLICK HANDLER
    btn.onclick = (e) => {
        // Optional: specific animation or sound
        onClick();
    };
    
    return btn;
}

function removeControls() {
    let controlsDiv = document.getElementById("solver-controls");
    if (controlsDiv) controlsDiv.remove();
}

function showVideoHelp(moveType) {
    alert("Video Help: " + moveType + "\n(You can add a video popup here later!)");
}

// --- HELPER FUNCTIONS FOR THE BUTTONS ---

function updateControls(onRepeat, onVideo, onNext) {
    // 1. Hide the main big button
    scanBtn.style.display = "none";

    // 2. Check if our custom controls exist, if not create them
    let controlsDiv = document.getElementById("solver-controls");
    if (!controlsDiv) {
        controlsDiv = document.createElement("div");
        controlsDiv.id = "solver-controls";
        controlsDiv.style.display = "flex";
        controlsDiv.style.gap = "10px";
        controlsDiv.style.marginTop = "10px";
        controlsDiv.style.justifyContent = "center";
        
        // Insert below the instruction text
        instructionText.parentElement.appendChild(controlsDiv);
    }

    // 3. Clear old buttons
    controlsDiv.innerHTML = "";

    // 4. Create Button 1: REPEAT (Yellow)
    let btnRepeat = createButton("↺ Repeat", "orange", onRepeat);
    
    // 5. Create Button 2: VIDEO (Blue)
    let btnVideo = createButton("🎥 Help", "blue", onVideo);

    // 6. Create Button 3: NEXT (Green)
    let btnNext = createButton("✅ Next", "green", onNext);

    // Append them
    controlsDiv.appendChild(btnRepeat);
    controlsDiv.appendChild(btnVideo);
    controlsDiv.appendChild(btnNext);
}

function createButton(text, color, onClick) {
    let btn = document.createElement("button");
    btn.innerText = text;
    btn.onclick = onClick;
    // Styling
    btn.className = "py-3 px-4 rounded-xl shadow-lg font-bold text-white flex-1";
    if (color === "green") btn.style.backgroundColor = "#16a34a"; // Green-600
    if (color === "blue") btn.style.backgroundColor = "#2563eb";  // Blue-600
    if (color === "orange") btn.style.backgroundColor = "#ea580c"; // Orange-600
    return btn;
}

function removeControls() {
    let controlsDiv = document.getElementById("solver-controls");
    if (controlsDiv) controlsDiv.remove();
}

// Placeholder for Video
function showVideoHelp(moveType) {
    // You can replace this later with actual video logic!
    alert("Play Video for: " + moveType + "\n(Video feature coming soon!)");
}




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

    // Combine for the main "Repeat" button
    let fullSpeechSequence = introText + " ... Unusual Situations ... " + case1Text + " ... " + case2Text;

    // --- C. SPEAK INSTRUCTIONS ---
    instructionText.innerText = "Tutorial: Triggers & Unusual Cases";
    speak(fullSpeechSequence);

    // --- D. SHOW CONTROLS (NEW LAYOUT) ---
    createCornerControls(
        // 1. CASE 1 ACTION
        () => speak(case1Text),
        
        // 2. CASE 2 ACTION
        () => speak(case2Text),

        // 3. HELP (Video)
        () => openVideo("YOUR_VIDEO_ID_HERE"),

        // 4. REPEAT (Full Sequence)
        () => speak(fullSpeechSequence),

        // 5. NEXT (Re-Scan)
        () => startReScanForLayer2()
    );
}
// --- RE-SCAN LOGIC ---
function startReScanForLayer2() {
    // 1. SET THE FLAG TO TRUE (Important!)
    isScanningForLayer2 = true;

    // 2. HIDE IMAGES / RESTORE GRID
    removeTriggerOverlay();
    
    // 3. Cleanup UI
    removeControls();
    
    if (scanBtn) {
        scanBtn.style.display = "block";
        scanBtn.innerText = "SCAN FRONT (GREEN)";
        scanBtn.className = "w-full bg-yellow-500 text-black font-bold py-4 rounded-xl shadow-lg";
    }

    // 4. Reset Memory
    currentSideIndex = 0;
    scanOrder.forEach(side => cubeMap[side] = []);

    // 5. Prompt User
    instructionText.innerText = "Great! Let's check your work. Show Green Front.";
    speak("Great job. Now I need to scan the cube again to help you with the next layer. Show me the Green Front.");

    // 6. Link Button
    scanBtn.onclick = scanFace; 
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
    let btnCase2 = makeBtn("⚠️ Case 2: Up", "#9333ea", onCase2);     // Purple
    
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
function makeBtn(text, color, action) {
    let btn = document.createElement("button");
    btn.innerText = text;
    btn.onclick = (e) => {
        e.stopPropagation(); // Prevent clicking through
        action();
    };
    btn.style.flex = "1"; 
    btn.style.padding = "12px"; // Slightly smaller padding to fit 2 rows
    btn.style.border = "none";
    btn.style.borderRadius = "10px";
    btn.style.backgroundColor = color;
    btn.style.color = "white";
    btn.style.fontWeight = "bold";
    btn.style.fontSize = "14px";
    btn.style.boxShadow = "0 4px 6px rgba(0,0,0,0.3)";
    return btn;
}



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
    let introText = "Strategy: Find an edge on the Top Layer that has NO Yellow colors. Match its front color to its center to make a upside down 'T' shape. Look at the top color of that piece.see wheather it matches the left center or right center. use your matched color side hand , and pull the top face towards you 90 degree, which will push it AWAY from that color's side. then do a  trigger move with the same hand. Tap the images to hear the Right vs Left moves.";

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

        // 5. NEXT -> Start Layer 4 (Top Cross)
        () => startReScanForLayer3()
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
    imgRight.src = "assets/middle-right.png"; 
    imgRight.style.width = "90%";
    imgRight.style.maxWidth = "500px";
    imgRight.style.border = "4px solid #ef4444"; // Red Border
    imgRight.style.borderRadius = "20px";
    imgRight.style.cursor = "pointer";
    
    imgRight.onclick = (e) => {
        e.stopPropagation();
        speak("To Move Right: Push the Top to the Left (Away). Then perform the Right Trigger. Rotate the cube to face the white sticker. Then perform the Left Trigger to fix it.");
    };

    // --- IMAGE 2: MOVE LEFT ---
    let imgLeft = document.createElement("img");
    imgLeft.src = "assets/middle-left.png"; 
    imgLeft.style.width = "90%";
    imgLeft.style.maxWidth = "500px";
    imgLeft.style.border = "4px solid #f97316"; // Orange Border
    imgLeft.style.borderRadius = "20px";
    imgLeft.style.cursor = "pointer";

    imgLeft.onclick = (e) => {
        e.stopPropagation();
        speak("To Move Left: Push the Top to the Right (Away). Then perform the Left Trigger. Rotate the cube to face the white sticker. Then perform the Right Trigger to fix it.");
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




function startReScanForLayer3() {
    // 1. Clean UI
    removeMiddleLayerOverlay();
    removeControls();
    
    // 2. Set Flags (We will use a new flag for Phase 3)
    // Note: We need to define this flag at the top of main.js later
    // isScanningForLayer3 = true; 

    // 3. Setup Scanner Button
    if (scanBtn) {
        scanBtn.style.display = "block";
        scanBtn.innerText = "SCAN FOR LAST LAYER";
        scanBtn.className = "w-full bg-yellow-500 text-black font-bold py-4 rounded-xl shadow-lg";
        
        // Use a placeholder alert until we build the next step
        scanBtn.onclick = () => {
             alert("Scanning logic for Last Layer coming next!");
             // Later we will link this to scanFace()
        };
    }

    instructionText.innerText = "Layer 2 Done! Prepare to scan again.";
    speak("Great job! You have solved the first two layers. Now we need to scan again to solve the final Yellow layer.");
}