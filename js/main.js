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
        // THIS IS WHERE IT WAS CRASHING
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
            // --- PATH B: NO DAISY -> START DAISY INSTRUCTIONS ---
            } else {
                instructionText.innerText = "Scanning Complete! Let's make the Daisy.";
                scanBtn.innerText = "START DAISY";
                scanBtn.className = "w-full bg-yellow-500 text-black font-bold py-4 rounded-xl shadow-lg";
                
                scanBtn.onclick = startDaisySolver;
                
                // UPDATED SPEECH: Detailed instructions
                speak(
                    "Make a daisy by keeping the yellow block in the center, and 4 white petals on the top, bottom, right, and left of that yellow middle piece.", 
                    "Scanning Complete! Make the Daisy." // Short text for screen
                );
            }

        } catch (error) {
            // PRINT ERROR TO SCREEN
            console.error(error);
            instructionText.innerText = "CRITICAL ERROR: " + error.message;
            instructionText.style.color = "red";
            instructionText.style.fontSize = "16px";
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

function startWhiteCross() {
    // 1. Ask the brain for the move
    // (It uses cross-solver.js logic to find matching or flipping moves)
    let move = getCrossMove(cubeMap);

    // 2. Victory Check
    if (move === "DONE") {
        speak("Cross completed. Repeat the process for the corners.");
        instructionText.innerText = "Cross Done! ✅";
        scanBtn.innerText = "NEXT STEP";
        // scanBtn.onclick = startCornersSolver; 
        return;
    }

    // 3. Middle Layer Check (Safety)
    if (move.includes("Check")) {
        speak("I cannot find a white petal on the top face. Please check the middle layer.");
        instructionText.innerText = "⚠️ Check Middle Layer";
        return;
    }

    // 4. CUSTOM EXPLANATION LOGIC
    // We break your long paragraph into context-aware instructions.

    if (move === "U") {
        // MATCHING PHASE
        // User's words: "match the non white stickers... to the centerpiece"
        speak(
            "Rotate the top face of the cube. Match the non-white sticker to the centerpiece of the same color.", 
            "Rotate Top -> Match Center" // Short Text
        );
    } 
    else if (move.includes("2")) {
        // FLIPPING PHASE (e.g., F2, R2)
        // User's words: "rotate the face with the matching center two times..."
        let faceName = getFaceName(move[0]); // Helper to get "Front/Right"
        
        speak(
            `Match found! Now rotate the ${faceName} face two times. This moves the white petal from the top to the bottom.`,
            `Turn ${faceName} 2x (Flip Down)` // Short Text
        );
    }
    else {
        // Fallback for weird moves
        speak("Please perform move " + move, move);
    }

    // 5. Update Backend (Keep track of colors)
    // We still use virtualMove so the app knows where pieces are without scanning
    virtualMove(move, cubeMap);

    // 6. Loop
    scanBtn.innerText = "I DID IT (Next)";
    scanBtn.onclick = startWhiteCross;
}

// Helper to convert "F" to "Front" for the text
function getFaceName(letter) {
    if (letter === 'F') return "Front";
    if (letter === 'R') return "Right";
    if (letter === 'L') return "Left";
    if (letter === 'B') return "Back";
    return "Side";
}





// --- FIRST LAYER SOLVER (Natural Language Version) ---

function startCornersSolver() {
    // 1. Ask the brain for the move (from corners-solver.js)
    let move = getCornerMove(cubeMap);

    // 2. Victory Check
    if (move === "DONE") {
        speak("First layer is complete! Great work.");
        instructionText.innerText = "Layer 1 Done! ✅";
        instructionText.style.color = "#4ade80";
        scanBtn.innerText = "NEXT: 2ND LAYER";
        // scanBtn.onclick = startSecondLayer; // We will build this next
        return;
    }

    // 3. Natural Language Translation
    if (move === "R U R' U'") {
        // The "Righty Alg" translated to plain English
        speak(
            "We need to twist this corner. Move the Right side UP. Push the Top to the LEFT. Bring the Right side DOWN. Push the Top back to the RIGHT.",
            "Right UP -> Top LEFT -> Right DOWN -> Top RIGHT" // Short Text
        );
        
        // Update Backend (Must do all 4 moves)
        virtualMove("R", cubeMap);
        virtualMove("U", cubeMap);
        virtualMove("R'", cubeMap);
        virtualMove("U'", cubeMap);
    } 
    else if (move === "U") {
        speak(
            "Rotate the top face to find the correct corner piece.",
            "Rotate Top Face (Search)"
        );
        virtualMove("U", cubeMap);
    }
    else {
        // Fallback for safety
        speak("Please perform " + move, move);
        virtualMove(move, cubeMap);
    }

    // 4. Loop
    scanBtn.innerText = "I DID IT (Next)";
    scanBtn.onclick = startCornersSolver;
}

