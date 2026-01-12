// --- CONFIGURATION ---
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const scanBtn = document.getElementById('scan-btn');
const instructionText = document.getElementById('instruction-text');

// Store the scanned colors. Order: U, D, F, B, L, R
let cubeState = {
    front: [], back: [], left: [], right: [], up: [], down: []
};

// --- 1. CAMERA SETUP ---
async function startCamera() {
    try {
        // Explicitly asking for the rear camera with fallback
        const constraints = { 
            video: { 
                facingMode: "environment",
                width: { ideal: 1280 },
                height: { ideal: 720 }
            } 
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;
        
        // Force play (sometimes needed for mobile)
        video.onloadedmetadata = () => {
            video.play();
        };

    } catch (err) {
        console.error("Camera Error:", err);
        // This will print the exact error on your phone screen
        instructionText.innerText = "Error: " + err.name + " - " + err.message;
        instructionText.style.color = "red";
    }
}

// --- 2. VOICE SETUP ---
function speak(text) {
    // Cancel any previous speech
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1; // Speed
    window.speechSynthesis.speak(utterance);
    
    // Also update text on screen
    instructionText.innerText = text;
}

// --- 3. COLOR SCANNING LOGIC ---
function scanFace() {
    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw current video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Define the 9 points to sample (Simplified logic for center of grid)
    // You will need to fine-tune these coordinates based on your grid size
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const offset = 100; // Distance between sticker centers

    // Example: Sampling the center sticker
    const pixelData = ctx.getImageData(centerX, centerY, 1, 1).data;
    const color = detectColor(pixelData[0], pixelData[1], pixelData[2]);
    
    console.log("Center Pixel RGB:", pixelData, "Detected:", color);
    speak(`I see the center is ${color}`);
}

// Helper: Convert RGB to Cube Color
function detectColor(r, g, b) {
    // Simple logic: determine color based on biggest RGB value
    // In reality, you need HSV conversion for accuracy
    if (r > 200 && g > 200 && b > 200) return 'White';
    if (r > 200 && g > 200 && b < 100) return 'Yellow';
    if (r > 200 && g < 100 && b < 100) return 'Red'; // Sometimes Orange looks Red
    if (g > 200 && r < 100 && b < 100) return 'Green';
    if (b > 200 && r < 100 && g < 100) return 'Blue';
    return 'Orange'; // Fallback
}

// --- EVENTS ---
scanBtn.addEventListener('click', () => {
    scanFace();
    // Logic to move to next face...
});

// Initialize
startCamera();
speak("Welcome. Please show me the yellow center.");