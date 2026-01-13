// js/cube-logic.js - FIXED ROTATION DIRECTION (SYNCED)

// 1. FACE ROTATION HELPER (Clockwise)
function rotateFaceClockwise(face) {
    let old = [...face];
    // Corners
    face[0] = old[6]; 
    face[2] = old[0]; 
    face[8] = old[2]; 
    face[6] = old[8];
    // Edges
    face[1] = old[3]; 
    face[5] = old[1]; 
    face[7] = old[5]; 
    face[3] = old[7];
    // Center (4) stays the same
}

// 2. MAIN VIRTUAL MOVE HANDLER
function virtualMove(move, cube) {
    // --- HANDLING COMPLEX MOVES (Recursion) ---
    // If move is a sequence like "L D L'", split it
    if (move.includes(" ")) { 
        let moves = move.split(" ");
        moves.forEach(m => virtualMove(m, cube));
        return;
    }
    // Double Moves (e.g. "F2")
    if (move.includes("2")) {
        let base = move.replace("2", "");
        virtualMove(base, cube); 
        virtualMove(base, cube);
        return;
    }
    // Prime/Counter-Clockwise Moves (e.g. "R'")
    // 3 Rights = 1 Left
    if (move.includes("'")) {
        let base = move.replace("'", "");
        virtualMove(base, cube); 
        virtualMove(base, cube); 
        virtualMove(base, cube);
        return;
    }

    // --- THE BASIC MOVES ---

    if (move === "U") { 
        // Standard Up (White Face)
        rotateFaceClockwise(cube.up);
        let temp = [cube.front[0], cube.front[1], cube.front[2]];
        cube.front[0]=cube.right[0]; cube.front[1]=cube.right[1]; cube.front[2]=cube.right[2];
        cube.right[0]=cube.back[0];  cube.right[1]=cube.back[1];  cube.right[2]=cube.back[2];
        cube.back[0]=cube.left[0];   cube.back[1]=cube.left[1];   cube.back[2]=cube.left[2];
        cube.left[0]=temp[0];        cube.left[1]=temp[1];        cube.left[2]=temp[2];
    }
    else if (move === "D") { 
        // *** CRITICAL SYNC FIX *** // Simulates "Rotate Yellow Top Clockwise"
        // Physical result: Front stickers move to Left face.
        
        rotateFaceClockwise(cube.down); // Rotate the Yellow face stickers

        let temp = [cube.front[6], cube.front[7], cube.front[8]];
        
        // We move pieces into their NEW homes:
        // Front gets Right
        cube.front[6]=cube.right[6]; cube.front[7]=cube.right[7]; cube.front[8]=cube.right[8];
        // Right gets Back
        cube.right[6]=cube.back[6];  cube.right[7]=cube.back[7];  cube.right[8]=cube.back[8];
        // Back gets Left
        cube.back[6]=cube.left[6];   cube.back[7]=cube.left[7];   cube.back[8]=cube.left[8];
        // Left gets Temp (Old Front)
        cube.left[6]=temp[0];        cube.left[7]=temp[1];        cube.left[8]=temp[2];
    }
    
    // --- SIDE MOVES (Standard) ---
    else if (move === "F") { // Front (Green)
        rotateFaceClockwise(cube.front);
        let temp = [cube.up[6], cube.up[7], cube.up[8]];
        cube.up[6]=cube.left[8];   cube.up[7]=cube.left[5];   cube.up[8]=cube.left[2];
        cube.left[2]=cube.down[0]; cube.left[5]=cube.down[1]; cube.left[8]=cube.down[2];
        cube.down[0]=cube.right[6];cube.down[1]=cube.right[3];cube.down[2]=cube.right[0];
        cube.right[0]=temp[0];     cube.right[3]=temp[1];     cube.right[6]=temp[2];
    }
    else if (move === "R") { // Right (Red)
        rotateFaceClockwise(cube.right);
        let temp = [cube.up[2], cube.up[5], cube.up[8]];
        cube.up[2]=cube.front[2];  cube.up[5]=cube.front[5];  cube.up[8]=cube.front[8];
        cube.front[2]=cube.down[2];cube.front[5]=cube.down[5];cube.front[8]=cube.down[8];
        cube.down[2]=cube.back[6]; cube.down[5]=cube.back[3]; cube.down[8]=cube.back[0];
        cube.back[0]=temp[2];      cube.back[3]=temp[1];      cube.back[6]=temp[0];
    }
    else if (move === "L") { // Left (Orange)
        rotateFaceClockwise(cube.left);
        let temp = [cube.up[0], cube.up[3], cube.up[6]];
        cube.up[0]=cube.back[8];   cube.up[3]=cube.back[5];   cube.up[6]=cube.back[2];
        cube.back[2]=cube.down[6]; cube.back[5]=cube.down[3]; cube.back[8]=cube.down[0];
        cube.down[0]=cube.front[0];cube.down[3]=cube.front[3];cube.down[6]=cube.front[6];
        cube.front[0]=temp[0];     cube.front[3]=temp[1];     cube.front[6]=temp[2];
    }
    else if (move === "B") { // Back (Blue)
        rotateFaceClockwise(cube.back);
        let temp = [cube.up[0], cube.up[1], cube.up[2]];
        cube.up[0]=cube.right[2];  cube.up[1]=cube.right[5];  cube.up[2]=cube.right[8];
        cube.right[2]=cube.down[8];cube.right[5]=cube.down[7];cube.right[8]=cube.down[6];
        cube.down[6]=cube.left[0]; cube.down[7]=cube.left[3]; cube.down[8]=cube.left[6];
        cube.left[0]=temp[2];      cube.left[3]=temp[1];      cube.left[6]=temp[0];
    }
}