// js/corners-solver.js - THE CORNERS BRAIN

// 1. HELPER: Read the Front-Right-Top Corner
// This checks the 3 stickers at the Front-Right-Top intersection.
function getTargetCorner(cube) {
    // Because of our specific scan/memory layout:
    // Yellow (Down in memory) Index 8 touches Front/Right.
    // Front Index 2 touches Yellow/Right.
    // Right Index 0 touches Yellow/Front.
    
    return {
        topColor:   cube.down[8],   // The sticker on the Yellow Face
        frontColor: cube.front[2],  // The sticker on the Front Face
        rightColor: cube.right[0]   // The sticker on the Right Face
    };
}

function getCornersMove(cube) {
    // A. VICTORY CHECK: Are the 4 Bottom Corners (White Face) solved?
    // We check the White Face (Up in memory) and the side colors.
    
    // Check Front-Right-Bottom
    let c1 = (cube.up[2] === 'W' && cube.front[8] === cube.front[4] && cube.right[6] === cube.right[4]);
    // Check Front-Left-Bottom
    let c2 = (cube.up[0] === 'W' && cube.front[6] === cube.front[4] && cube.left[8]  === cube.left[4]);
    // Check Back-Right-Bottom
    let c3 = (cube.up[8] === 'W' && cube.back[6]  === cube.back[4]  && cube.right[8] === cube.right[4]);
    // Check Back-Left-Bottom
    let c4 = (cube.up[6] === 'W' && cube.back[8]  === cube.back[4]  && cube.left[6]  === cube.left[4]);

    if (c1 && c2 && c3 && c4) return "DONE";

    // B. ANALYZE THE "LOADING ZONE" (Front-Right-Top)
    const corner = getTargetCorner(cube);

    // --- CASE 1: White is facing the RIGHT side ---
    // If the Right sticker is White, it belongs to the Front.
    if (corner.rightColor === 'W') {
        // Does the Front sticker match the Front Center?
        if (corner.frontColor === cube.front[4]) {
            // MATCH! Drop it down.
            // Move: R U R' (Translated to R D R' for our orientation)
            return "R D R'";
        } else {
            // No match. Rotate Top to find its home.
            return "D";
        }
    }

    // --- CASE 2: White is facing the FRONT side ---
    // If the Front sticker is White, it belongs to the Right.
    if (corner.frontColor === 'W') {
        // Does the Right sticker match the Right Center?
        if (corner.rightColor === cube.right[4]) {
            // MATCH! Drop it down.
            // Move: F' U' F (Translated to F' D' F)
            return "F' D' F";
        } else {
            return "D";
        }
    }

    // --- CASE 3: White is facing TOP (Yellow side) ---
    if (corner.topColor === 'W') {
        // It's facing up. We need to twist it.
        // Check if the slot below it is empty or wrong.
        if (!c1) { // If Front-Right-Bottom is NOT solved
            // Twist Algorithm: R U2 R' U' R U R'
            // Translated: R D2 R' D' R D R'
            return "R D2 R' D' R D R'";
        } else {
            // The slot below is already solved! Move this white piece away.
            return "D";
        }
    }

    // --- CASE 4: No White in the Loading Zone? ---
    // We need to find a white piece.
    
    // Check if there are ANY white pieces on the Yellow face?
    let whiteOnTop = false;
    // Simple check of the corners on the yellow face (0,2,6,8)
    if (cube.down[0] === 'W' || cube.down[2] === 'W' || cube.down[6] === 'W' || cube.down[8] === 'W') {
        whiteOnTop = true;
    }
    // Also check side stickers of the top layer... (Simplified: Just rotate if unsure)
    
    // If we have white pieces on top but not in the corner, Rotate to bring them here.
    // (A simple "D" will cycle through them).
    return "D";
}