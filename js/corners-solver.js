// js/corners-solver.js - NO FLIP VERSION

function getCornersMove(cube) {
    // 1. VICTORY CHECK (Check WHITE face, which is Memory UP)
    // We check the 4 corners of the UP face to see if they are White
    // AND if they match their side centers.
    
    // Check Front-Left-Up (Physical Bottom-Front-Left)
    // Note: When Green is Front, Up is White.
    // Front-Left corner indices... this is tricky.
    // Let's count "Solved Corners" on the White Face.
    let solved = 0;
    
    // Front-Right-Up (White/Green/Red)
    if (cube.up[8] === 'W' && cube.front[2] === cube.front[4] && cube.right[0] === cube.right[4]) solved++;
    // Front-Left-Up (White/Green/Orange)
    if (cube.up[6] === 'W' && cube.front[0] === cube.front[4] && cube.left[2]  === cube.left[4]) solved++;
    // Back-Right-Up (White/Blue/Red)
    if (cube.up[2] === 'W' && cube.back[0]  === cube.back[4]  && cube.right[2] === cube.right[4]) solved++;
    // Back-Left-Up (White/Blue/Orange)
    if (cube.up[0] === 'W' && cube.back[2]  === cube.back[4]  && cube.left[0]  === cube.left[4]) solved++;

    if (solved === 4) return "DONE";

    // 2. SEARCH (Check YELLOW face, which is Memory DOWN)
    // We look at the "Loading Zone": Physical Front-Right Corner.
    // Physical Front = Green. Physical Right = Orange (Memory Left).
    // So we check the corner touching Front(Green), Down(Yellow), Left(Orange).
    
    // Indices for Green/Yellow/Orange corner:
    // Front[6] (Bottom-Left of Front)
    // Down[0] (Top-Left of Down)
    // Left[8] (Bottom-Right of Left)
    
    let frontSticker = cube.front[6];
    let topSticker   = cube.down[0];  // Yellow Face Sticker
    let sideSticker  = cube.left[8];  // The "Right Hand" side sticker (Orange)

    // --- CASE A: White on the SIDE (Facing Right Hand / Orange) ---
    if (sideSticker === 'W') {
        // Does Front sticker match Front Center (Green)?
        if (frontSticker === cube.front[4]) {
            return "Right Trigger"; // Match! Drop it.
        }
    }

    // --- CASE B: White on the FRONT (Facing You / Green) ---
    if (frontSticker === 'W') {
        // Does Side sticker match Side Center (Orange)?
        if (sideSticker === cube.left[4]) { // Memory Left = Orange
            // It's a "Right Trigger" setup, but we need to prep it?
            // Actually, if White is facing Front, we usually use the OTHER trigger.
            // Let's check the other side (Physical Left / Red).
        }
    }
    
    // Let's simplify: Check BOTH Loading Zones (Left and Right Hands)

    // ZONE 1: PHYSICAL RIGHT HAND (Green/Orange/Yellow) -> Memory Front/Left/Down
    if (cube.left[8] === 'W' && cube.front[6] === cube.front[4]) return "Right Trigger";

    // ZONE 2: PHYSICAL LEFT HAND (Green/Red/Yellow) -> Memory Front/Right/Down
    // Indices: Front[8] (Bottom-Right), Right[6] (Bottom-Left), Down[2] (Top-Right)
    if (cube.right[6] === 'W' && cube.front[8] === cube.front[4]) return "Left Trigger";

    // ZONE 3: INVERSE TRIGGERS (White facing Front)
    // If White is Front (on Right Side), and Side matches Side Center
    if (cube.front[6] === 'W' && cube.left[8] === cube.left[4]) return "Right Trigger";
    // If White is Front (on Left Side), and Side matches Side Center
    if (cube.front[8] === 'W' && cube.right[6] === cube.right[4]) return "Left Trigger";


    // 3. HUNTING (Rotate if we found nothing)
    
    // Check if White is on Top (Yellow Face) at the Loading Zone
    if (cube.down[0] === 'W') { // Physical Front-Right-Top
        // Check if slot below is empty
        // Slot below is White/Green/Orange (Memory Up/Front/Left)
        let slotSolved = (cube.up[6] === 'W' && cube.front[0] === cube.front[4]);
        if (!slotSolved) return "Top Twist";
    }

    // If we have ANY white on the Down face (Yellow), keep spinning
    if (cube.down.includes('W') || 
        cube.front[6]==='W' || cube.front[8]==='W' || 
        cube.left[8]==='W' || cube.right[6]==='W' ||
        cube.back[6]==='W' || cube.back[8]==='W') {
        return "D";
    }

    // Fallback
    return "D";
}