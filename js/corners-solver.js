// js/corners-solver.js - ALIGNMENT FIRST LOGIC

function getCornersMove(cube) {
    // MEMORY MAPPING (White on Bottom Strategy):
    // Physical Top Layer = Memory Down (Yellow)
    // Physical Front     = Memory Front (Green)
    // Physical Right     = Memory Right (Red)

    // 1. VICTORY CHECK (Is Memory Up/White Face solved?)
    let solved = 0;
    if (cube.up[8] === 'W' && cube.front[2] === cube.front[4] && cube.right[0] === cube.right[4]) solved++;
    if (cube.up[6] === 'W' && cube.front[0] === cube.front[4] && cube.left[2]  === cube.left[4]) solved++;
    if (cube.up[2] === 'W' && cube.back[0]  === cube.back[4]  && cube.right[2] === cube.right[4]) solved++;
    if (cube.up[0] === 'W' && cube.back[2]  === cube.back[4]  && cube.left[0]  === cube.left[4]) solved++;
    
    if (solved === 4) return "DONE";

    // 2. SEARCH TOP LAYER (Memory Down) for Outward Facing White Stickers
    // We check the 4 side positions of the Yellow layer.
    
    // --- POSITION 1: Front-Right Corner (Memory Front[8] / Right[6]) ---
    // A. White is on Front Face
    if (cube.front[8] === 'W') {
        // Check Neighbor (Right Face Sticker). Does it match Right Center?
        if (cube.right[6] === cube.right[4]) {
            // MATCHED! White is to the LEFT of the matched center.
            return "Left Trigger"; 
        } else {
            // NOT MATCHED. Rotate Top to find home.
            return "U"; 
        }
    }
    // B. White is on Right Face
    if (cube.right[6] === 'W') {
        // Check Neighbor (Front Face Sticker). Does it match Front Center?
        if (cube.front[8] === cube.front[4]) {
            // MATCHED! White is to the RIGHT of the matched center.
            return "Right Trigger";
        } else {
            // NOT MATCHED.
            return "U";
        }
    }

    // --- POSITION 2: Front-Left Corner (Memory Front[6] / Left[8]) ---
    if (cube.front[6] === 'W') {
        if (cube.left[8] === cube.left[4]) return "Right Trigger"; // Matched!
        else return "U"; // Keep spinning
    }
    if (cube.left[8] === 'W') {
        if (cube.front[6] === cube.front[4]) return "Left Trigger"; // Matched!
        else return "U";
    }

    // --- POSITION 3: Back-Right Corner (Memory Back[6] / Right[8]) ---
    if (cube.back[6] === 'W') {
        if (cube.right[8] === cube.right[4]) return "Right Trigger";
        else return "U";
    }
    if (cube.right[8] === 'W') {
        if (cube.back[6] === cube.back[4]) return "Left Trigger";
        else return "U";
    }

    // --- POSITION 4: Back-Left Corner (Memory Back[8] / Left[6]) ---
    if (cube.back[8] === 'W') {
        if (cube.left[6] === cube.left[4]) return "Left Trigger";
        else return "U";
    }
    if (cube.left[6] === 'W') {
        if (cube.back[8] === cube.back[4]) return "Right Trigger";
        else return "U";
    }

    // 3. SPECIAL CASE: White on Top (Facing Up/Yellow)
    if (cube.down[0] === 'W' || cube.down[2] === 'W' || cube.down[6] === 'W' || cube.down[8] === 'W') {
        // We need to rotate it over an empty slot and trigger.
        // For simplicity, just rotate top until we find a slot, or trigger to flip it.
        // Let's just say "Right Trigger" to force movement, user will rescan/re-follow.
        return "Right Trigger"; 
    }

    // 4. SPECIAL CASE: White Stuck in Bottom (Memory Up)
    // If a white sticker is in the solved layer but wrong spot/orientation.
    if (cube.front[2] === 'W' || cube.right[0] === 'W') return "Right Trigger"; // Pop out Front-Right
    if (cube.front[0] === 'W' || cube.left[2] === 'W')  return "Left Trigger";  // Pop out Front-Left

    return "U"; // Default: Spin top if nothing found yet
}