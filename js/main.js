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

    // 2. Define Grid Points (Centers of the 9 boxes)
    // These percentages position the dots roughly in the center of the grid cells
    const width = canvas.width;
    const height = canvas.height;
    
    // Adjust these based on your grid overlay size!
    // Assuming grid is roughly centered taking up 50% of screen
    const stepX = width / 10; 
    const stepY = height / 10;
    const startX = (width / 2) - stepX; 
    const startY = (height / 2) - stepY;

    // 3. Scan all 9 stickers
    let faceColors = [];
    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
            // Get pixel data from calculated points
            let x = startX + (col * stepX);
            let y = startY + (row * stepY);
            
            const pixel = ctx.getImageData(x, y, 1, 1).data;
            const colorCode = detectColor(pixel[0], pixel[1], pixel[2]);
            faceColors.push(colorCode);
        }
    }

    // 4. Save and Advance
    const sideName = scanOrder[currentSideIndex];
    cubeMap[sideName] = faceColors;
    
    console.log(`Scanned ${sideName}:`, faceColors);
    speak(`Saved, keep the yellow face ${sideName} side.`);

    // 5. Move to Next Step
    currentSideIndex++;
    if (currentSideIndex < scanOrder.length) {
        let nextSide = scanOrder[currentSideIndex];
        let nextColor = sideColors[nextSide];
        instructionText.innerText = `Show ${nextColor} center, then Scan.`;
        speak(`Show the ${nextColor} center.`);
    } else {
        instructionText.innerText = "Scanning Complete! Calculating Daisy...";
        scanBtn.innerText = "SOLVE DAISY";
        scanBtn.onclick = startDaisySolver; // We will write this next
        speak("Scanning complete. Ready to solve.");
    }
}

// --- VOICE ---
function speak(text) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
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