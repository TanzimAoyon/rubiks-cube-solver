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
    // 1. Setup Canvas & Context
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    // 2. Define Grid Points (Same math as before)
    const width = canvas.width;
    const height = canvas.height;
    const stepX = width / 10; 
    const stepY = height / 10;
    const startX = (width / 2) - stepX; 
    const startY = (height / 2) - stepY;

    // 3. Temporary Array to hold this scan
    let currentScan = [];
    
    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
            let x = startX + (col * stepX);
            let y = startY + (row * stepY);
            const pixel = ctx.getImageData(x, y, 1, 1).data;
            // Use your detectColor function here
            const colorCode = detectColor(pixel[0], pixel[1], pixel[2]);
            currentScan.push(colorCode);
        }
    }

    // --- NEW GUARD 1: Check Center Color ---
    const expectedSideName = scanOrder[currentSideIndex];
    const expectedColor = sideColors[expectedSideName]; // e.g., 'Green', 'Red'
    
    // Convert full name 'Green' to code 'G' for comparison if your detectColor returns single letters
    // NOTE: Ensure detectColor returns full names ('Green') or map them!
    // Let's assume detectColor returns 'G', 'R', etc.
    const colorMap = {'Green':'G', 'Red':'R', 'Blue':'B', 'Orange':'O', 'White':'W', 'Yellow':'Y'};
    const expectedCode = colorMap[expectedColor];

    if (!isCenterCorrect(currentScan, expectedCode)) {
        // ERROR: Wrong side detected!
        // Identify what color they actually showed
        const actualCode = currentScan[4]; // The center sticker they showed
        const codeToName = {'G':'Green', 'R':'Red', 'B':'Blue', 'O':'Orange', 'W':'White', 'Y':'Yellow'};
        const actualName = codeToName[actualCode] || "Unknown";

        speak(`That looks like the ${actualName} side. I need the ${expectedColor} side.`);
        instructionText.innerText = `❌ Wrong Side! Found ${actualName}. Show ${expectedColor}.`;
        instructionText.style.color = "red";
        
        // STOP HERE. Do not save. Do not advance index.
        return; 
    }

    // 4. Success! Save the data.
    instructionText.style.color = "white"; // Reset text color
    cubeMap[expectedSideName] = currentScan;
    speak(`Saved ${expectedColor} side.`);
    console.log(`Saved ${expectedSideName}:`, currentScan);

    // 5. Advance to Next Step
    currentSideIndex++;
    
    if (currentSideIndex < scanOrder.length) {
        let nextSide = scanOrder[currentSideIndex];
        let nextColor = sideColors[nextSide];
        instructionText.innerText = `Show ${nextColor} center, then Scan.`;
        speak(`Show the ${nextColor} center.`);
    
    
    
    

    
    
    } else {
        // --- SCANNING FINISHED (All 6 sides done) ---

        // 1. Guard: Is the cube already fully solved?
        if (isCubeSolved(cubeMap)) {
            instructionText.innerText = "Cube is already solved! 🎉";
            instructionText.style.color = "#4ade80"; 
            scanBtn.innerText = "RESET";
            scanBtn.onclick = () => location.reload();
            speak("This cube is already solved. You are done.");
            return;
        }

        // 2. THE TRAFFIC COP: Decide Next Step
        // We check if the Daisy exists. 
        // If YES, it means the user just finished the Manual Step & Re-Scan.
        
        if (isDaisySolved(cubeMap)) {
            // --- PATH A: DAISY IS DONE -> GO TO CROSS ---
            instructionText.innerText = "Re-Scan Complete! Daisy found. Let's solve the Cross.";
            instructionText.style.color = "white";
            scanBtn.innerText = "SOLVE CROSS";
            scanBtn.className = "w-full bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg";
            
            // This is the line you asked about:
            scanBtn.onclick = startWhiteCross; 
            
            speak("Great. I see the Daisy. Let's solve the white cross.");

        } else {
            // --- PATH B: NO DAISY -> START DAISY INSTRUCTIONS ---
            instructionText.innerText = "Scanning Complete! Let's make the Daisy.";
            scanBtn.innerText = "START DAISY";
            scanBtn.className = "w-full bg-yellow-500 text-black font-bold py-4 rounded-xl shadow-lg";
            
            scanBtn.onclick = startDaisySolver;
            
            speak("Scanning complete. Let's start by making the Daisy.");
        }
    }








    // } else {
    //     // --- NEW GUARD 2: Check if Solved ---
    //     if (isCubeSolved(cubeMap)) {
    //         instructionText.innerText = "Cube is already solved! 🎉";
    //         instructionText.style.color = "#4ade80"; // Bright Green
    //         scanBtn.innerText = "RESET";
    //         scanBtn.className = "w-full bg-blue-600 text-white font-bold py-4 rounded-xl";
    //         speak("Wait a second. This cube is already solved! You don't need my help.");
            
    //         scanBtn.onclick = () => location.reload(); // Reload app to start over
    //     } else {
    //         // Normal behavior: Start the Daisy Logic
    //         instructionText.innerText = "Scanning Complete! Calculating Daisy...";
    //         scanBtn.innerText = "START DAISY";
    //         scanBtn.onclick = startDaisySolver;
    //         speak("Scanning complete. Let's make the Daisy.");
    //     }
    // }
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
scanBtn.addEventListener('click', () => {
    // 1. TRICK: "Unlock" the voice engine immediately on click
    // This fires BEFORE the heavy camera math runs
    if ('speechSynthesis' in window) {
        const unlock = new SpeechSynthesisUtterance(''); 
        unlock.volume = 0; // Silent but activates the audio engine
        window.speechSynthesis.speak(unlock);
    }

    // 2. Now run the actual scanning logic
    scanFace();
});
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

    // 2. If not solved, switch to "Manual Mode"
    // We do NOT calculate moves here because the user will mess up the orientation.
    instructionText.innerText = "Step 1: Make the Daisy. Put 4 White Edges around the Yellow Center.";
    instructionText.style.color = "yellow";
    
    speak("Please create the Daisy manually. Surround the yellow center with four white edge pieces.");

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

// Check 2: Is the whole cube solved?
function isCubeSolved(cube) {
    // Check every face in our map
    for (let side in cube) {
        let face = cube[side];
        if (face.length === 0) return false; // Not scanned yet
        
        // Get the center color of this face
        let center = face[4];
        
        // Check if all 9 stickers match the center
        // If even ONE sticker is different, the cube is not solved.
        for (let sticker of face) {
            if (sticker !== center) return false;
        }
    }
    return true; // If we survived the loop, it's solved!
}






// --- WHITE CROSS INTEGRATION ---

function startWhiteCross() {
    // 1. Ask the solver for the next move
    // (Ensure you imported cross-solver.js in HTML!)
    let move = getCrossMove(cubeMap);

    // 2. Handle Finish
    if (move === "DONE") {
        speak("White Cross is complete! Now for the corners.");
        instructionText.innerText = "Cross Solved! ✅";
        instructionText.style.color = "#4ade80";
        scanBtn.innerText = "NEXT: FIRST LAYER";
        // scanBtn.onclick = startCornersSolver; // Future step
        return;
    }

    // 3. Handle "Stuck" pieces (Simple Alert)
    if (move.includes("Check")) {
        speak("I can't find white pieces on top. Check the middle layer.");
        instructionText.innerText = "⚠️ Piece stuck in middle layer. Eject it manually.";
        return;
    }

    // 4. Handle Normal Moves (U, F2, R2...)
    let readableMove = move;
    if (move === "U") readableMove = "Rotate Top Face (Match Colors)";
    if (move.includes("2")) readableMove = `Turn ${move[0]} Face 180° (Flip Down)`;

    
    instructionText.style.fontSize = "24px";
    // NEW Single Line command
    speak(
        `Please ${readableMove}`,  // What the Voice says (Polite)
        readableMove               // What the Screen shows (Short & Clear)
    );

    // 5. Update Virtual Memory (Crucial!)
    // We use the same virtual rotation logic as before so user doesn't re-scan.
    virtualMove(move, cubeMap);

    // 6. Ready for next click
    scanBtn.innerText = "I DID IT (Next)";
    scanBtn.onclick = startWhiteCross; // Loop back
}





