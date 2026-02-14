// js/corners-solver.js - DETAILED SPECIAL CASES

function getCornersMove(cube) {
    // MAPPING: Physical Top = Memory Down (Yellow) | Physical Bottom = Memory Up (White)
    
    // 1. VICTORY CHECK
    let solved = 0;
    if (cube.up[8] === 'W' && cube.front[2] === cube.front[4] && cube.right[0] === cube.right[4]) solved++;
    if (cube.up[6] === 'W' && cube.front[0] === cube.front[4] && cube.left[2]  === cube.left[4]) solved++;
    if (cube.up[2] === 'W' && cube.back[0]  === cube.back[4]  && cube.right[2] === cube.right[4]) solved++;
    if (cube.up[0] === 'W' && cube.back[2]  === cube.back[4]  && cube.left[0]  === cube.left[4]) solved++;
    if (solved === 4) return "DONE";

    // 2. SEARCH TOP LAYER (Memory Down) - NORMAL CASES
    // Front-Right Corner
    if (cube.front[8] === 'W') {
        if (cube.right[6] === cube.right[4]) return "Left Trigger"; 
        else return "U"; 
    }
    if (cube.right[6] === 'W') {
        if (cube.front[8] === cube.front[4]) return "Right Trigger";
        else return "U";
    }
    // Front-Left Corner
    if (cube.front[6] === 'W') {
        if (cube.left[8] === cube.left[4]) return "Right Trigger"; 
        else return "U"; 
    }
    if (cube.left[8] === 'W') {
        if (cube.front[6] === cube.front[4]) return "Left Trigger";
        else return "U";
    }
    // Back Corners (Simplified for memory)
    if (cube.back[6] === 'W') {
        if (cube.right[8] === cube.right[4]) return "Right Trigger"; else return "U";
    }
    if (cube.right[8] === 'W') {
        if (cube.back[6] === cube.back[4]) return "Left Trigger"; else return "U";
    }
    if (cube.back[8] === 'W') {
        if (cube.left[6] === cube.left[4]) return "Left Trigger"; else return "U";
    }
    if (cube.left[6] === 'W') {
        if (cube.back[8] === cube.back[4]) return "Right Trigger"; else return "U";
    }

    // 3. SPECIAL CASE: White on Top (Facing Yellow Up)
    if (cube.down[0] === 'W' || cube.down[2] === 'W' || cube.down[6] === 'W' || cube.down[8] === 'W') {
        return "WhiteOnTop"; // <--- New Specific Code
    }

    // 4. SPECIAL CASE: Stuck in Bottom (Wrong Spot)
    if (cube.front[2] === 'W' || cube.right[0] === 'W' || cube.front[0] === 'W' || cube.left[2] === 'W') {
        return "StuckBottom"; // <--- New Specific Code
    }

    return "U"; 
}