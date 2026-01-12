// js/solver.js

// --- 1. CHECK VICTORY CONDITIONS ---

// Check if the Daisy is done (4 White edges on Yellow/Down face)
function isDaisySolved(cube) {
    const downFace = cube.down;
    
    // Safety check: if data is missing, return false
    if (!downFace || downFace.length === 0) return false;

    let whiteCount = 0;
    
    // Check edges 1, 3, 5, 7 on the Down (Yellow) face
    // We look for 'W' (White) stickers
    if (downFace[1] === 'W') whiteCount++;
    if (downFace[3] === 'W') whiteCount++;
    if (downFace[5] === 'W') whiteCount++;
    if (downFace[7] === 'W') whiteCount++;

    // If all 4 edges are white, Daisy is solved!
    return whiteCount === 4;
}

// Check if the whole cube is fully solved (All faces have 1 solid color)
function isCubeSolved(cube) {
    for (let side in cube) {
        let face = cube[side];
        
        // Safety check
        if (!face || face.length === 0) return false; 
        
        // The center sticker is at index 4
        let center = face[4];
        
        // Loop through all 9 stickers on this face
        for (let sticker of face) {
            // If any sticker doesn't match the center, it's not solved
            if (sticker !== center) return false;
        }
    }
    // If we checked all sides and found no errors, it is solved.
    return true;
}

// --- 2. DAISY LOGIC (Helper) ---

function getDaisyMove(cube) {
    // This logic finds simple moves to bring White edges to the Yellow face.
    
    // 1. Check UP Face (White Center) for White edges
    if (cube.up[1] === 'W') return "B2"; // Turn Back 180
    if (cube.up[3] === 'W') return "L2"; // Turn Left 180
    if (cube.up[5] === 'W') return "R2"; // Turn Right 180
    if (cube.up[7] === 'W') return "F2"; // Turn Front 180

    // 2. Check Middle Layer (Side Edges)
    if (cube.front[3] === 'W') return "F'"; 
    if (cube.front[5] === 'W') return "F";
    
    if (cube.right[3] === 'W') return "R'";
    if (cube.right[5] === 'W') return "R";

    // If no easy moves found, we usually rotate top (U) to find more
    return "U";
}