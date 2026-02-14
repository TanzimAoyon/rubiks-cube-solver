// js/corners-solver.js - STRICT STATE DETECTION

function getCornersMove(cube) {
    // MAPPING: Physical Top = Memory Down (Yellow) | Physical Bottom = Memory Up (White)
    
    // 1. VICTORY CHECK
    let solved = 0;
    if (cube.up[8] === 'W' && cube.front[2] === cube.front[4] && cube.right[0] === cube.right[4]) solved++;
    if (cube.up[6] === 'W' && cube.front[0] === cube.front[4] && cube.left[2]  === cube.left[4]) solved++;
    if (cube.up[2] === 'W' && cube.back[0]  === cube.back[4]  && cube.right[2] === cube.right[4]) solved++;
    if (cube.up[0] === 'W' && cube.back[2]  === cube.back[4]  && cube.left[0]  === cube.left[4]) solved++;
    if (solved === 4) return "DONE";

    // 2. CHECK FOR MATCHED CORNERS (Ready to Trigger)
    // We prioritize these so the user sees "Do Trigger" immediately if matched.
    
    // Front-Right Corner (White on Front)
    if (cube.front[8] === 'W' && cube.right[6] === cube.right[4]) return "Left Trigger"; 
    // Front-Right Corner (White on Right)
    if (cube.right[6] === 'W' && cube.front[8] === cube.front[4]) return "Right Trigger";
    
    // Front-Left Corner (White on Front)
    if (cube.front[6] === 'W' && cube.left[8] === cube.left[4]) return "Right Trigger";
    // Front-Left Corner (White on Left)
    if (cube.left[8] === 'W' && cube.front[6] === cube.front[4]) return "Left Trigger";

    // Back Corners (Simplified)
    if (cube.back[6] === 'W' && cube.right[8] === cube.right[4]) return "Right Trigger";
    if (cube.right[8] === 'W' && cube.back[6] === cube.back[4]) return "Left Trigger";
    if (cube.back[8] === 'W' && cube.left[6] === cube.left[4]) return "Left Trigger";
    if (cube.left[6] === 'W' && cube.back[8] === cube.back[4]) return "Right Trigger";

    // 3. CHECK FOR UNMATCHED SIDE STICKERS (Need Rotation)
    // If we see a white sticker on the side (Front/Right/Left/Back) but it wasn't caught above,
    // it means it exists but needs matching.
    if (cube.front[8] === 'W' || cube.right[6] === 'W' || 
        cube.front[6] === 'W' || cube.left[8] === 'W' ||
        cube.back[6] === 'W' || cube.right[8] === 'W' ||
        cube.back[8] === 'W' || cube.left[6] === 'W') {
        return "NeedMatch"; // Specific code for "Rotate Top until matches"
    }

    // 4. SPECIAL CASE: White on Top (Facing Yellow Up)
    if (cube.down[0] === 'W' || cube.down[2] === 'W' || cube.down[6] === 'W' || cube.down[8] === 'W') {
        return "WhiteOnTop";
    }

    // 5. SPECIAL CASE: Stuck in Bottom (Wrong Spot)
    if (cube.front[2] === 'W' || cube.right[0] === 'W' || cube.front[0] === 'W' || cube.left[2] === 'W') {
        return "StuckBottom"; 
    }

    return "NeedMatch"; // Default fallback
}