// js/cube-logic.js - THE BRAIN

// ==========================================
// 1. FACE ROTATION HELPER (Your Code)
// ==========================================
function rotateFaceClockwise(face) {
    let old = [...face];
    // Corners
    face[0] = old[6]; face[2] = old[0]; 
    face[8] = old[2]; face[6] = old[8];
    // Edges
    face[1] = old[3]; face[5] = old[1]; 
    face[7] = old[5]; face[3] = old[7];
}

// ==========================================
// 2. VIRTUAL MOVE HANDLER (Your Code)
// ==========================================
function virtualMove(move, cube) {
    // Recursion for double/prime moves
    if (move.includes(" ")) { 
        let moves = move.split(" ");
        moves.forEach(m => virtualMove(m, cube));
        return;
    }
    if (move.includes("2")) {
        let base = move.replace("2", "");
        virtualMove(base, cube); virtualMove(base, cube);
        return;
    }
    if (move.includes("'")) {
        let base = move.replace("'", "");
        virtualMove(base, cube); virtualMove(base, cube); virtualMove(base, cube);
        return;
    }

    // --- BASIC MOVES ---
    if (move === "U") { 
        rotateFaceClockwise(cube.up);
        let temp = [cube.front[0], cube.front[1], cube.front[2]];
        cube.front[0]=cube.right[0]; cube.front[1]=cube.right[1]; cube.front[2]=cube.right[2];
        cube.right[0]=cube.back[0];  cube.right[1]=cube.back[1];  cube.right[2]=cube.back[2];
        cube.back[0]=cube.left[0];   cube.back[1]=cube.left[1];   cube.back[2]=cube.left[2];
        cube.left[0]=temp[0];        cube.left[1]=temp[1];        cube.left[2]=temp[2];
    }
    else if (move === "D") { 
        // Rotates Yellow Face
        rotateFaceClockwise(cube.down); 
        let temp = [cube.front[6], cube.front[7], cube.front[8]];
        cube.front[6]=cube.right[6]; cube.front[7]=cube.right[7]; cube.front[8]=cube.right[8];
        cube.right[6]=cube.back[6];  cube.right[7]=cube.back[7];  cube.right[8]=cube.back[8];
        cube.back[6]=cube.left[6];   cube.back[7]=cube.left[7];   cube.back[8]=cube.left[8];
        cube.left[6]=temp[0];        cube.left[7]=temp[1];        cube.left[8]=temp[2];
    }
    else if (move === "F") { 
        rotateFaceClockwise(cube.front);
        let temp = [cube.up[6], cube.up[7], cube.up[8]];
        cube.up[6]=cube.left[8];   cube.up[7]=cube.left[5];   cube.up[8]=cube.left[2];
        cube.left[2]=cube.down[0]; cube.left[5]=cube.down[1]; cube.left[8]=cube.down[2];
        cube.down[0]=cube.right[6];cube.down[1]=cube.right[3];cube.down[2]=cube.right[0];
        cube.right[0]=temp[0];     cube.right[3]=temp[1];     cube.right[6]=temp[2];
    }
    else if (move === "R") { 
        rotateFaceClockwise(cube.right);
        let temp = [cube.up[2], cube.up[5], cube.up[8]];
        cube.up[2]=cube.front[2];  cube.up[5]=cube.front[5];  cube.up[8]=cube.front[8];
        cube.front[2]=cube.down[2];cube.front[5]=cube.down[5];cube.front[8]=cube.down[8];
        cube.down[2]=cube.back[6]; cube.down[5]=cube.back[3]; cube.down[8]=cube.back[0];
        cube.back[0]=temp[2];      cube.back[3]=temp[1];      cube.back[6]=temp[0];
    }
    else if (move === "L") { 
        rotateFaceClockwise(cube.left);
        let temp = [cube.up[0], cube.up[3], cube.up[6]];
        cube.up[0]=cube.back[8];   cube.up[3]=cube.back[5];   cube.up[6]=cube.back[2];
        cube.back[2]=cube.down[6]; cube.back[5]=cube.down[3]; cube.back[8]=cube.down[0];
        cube.down[0]=cube.front[0];cube.down[3]=cube.front[3];cube.down[6]=cube.front[6];
        cube.front[0]=temp[0];     cube.front[3]=temp[1];     cube.front[6]=temp[2];
    }
    else if (move === "B") { 
        rotateFaceClockwise(cube.back);
        let temp = [cube.up[0], cube.up[1], cube.up[2]];
        cube.up[0]=cube.right[2];  cube.up[1]=cube.right[5];  cube.up[2]=cube.right[8];
        cube.right[2]=cube.down[8];cube.right[5]=cube.down[7];cube.right[8]=cube.down[6];
        cube.down[6]=cube.left[0]; cube.down[7]=cube.left[3]; cube.down[8]=cube.left[6];
        cube.left[0]=temp[2];      cube.left[3]=temp[1];      cube.left[6]=temp[0];
    }
}

// ==========================================
// 3. DAISY CHECKER (New Logic)
// ==========================================
function isDaisySolved(map) {
    // Daisy is on DOWN (Yellow) face
    let down = map.down; 
    if (!down || down.length < 9) return false;

    // Center must be Yellow (Index 4)
    // Petals must be White (1, 3, 5, 7)
    const isYellowCenter = (down[4] === 'Y');
    const hasWhitePetals = (down[1] === 'W' && down[3] === 'W' && down[5] === 'W' && down[7] === 'W');
    
    return isYellowCenter && hasWhitePetals;
}

// ==========================================
// 4. CROSS SOLVER (New Logic)
// ==========================================
function getCrossMove(map) {
    let down = map.down; // Yellow Face (Where Daisy is)
    let front = map.front;
    let right = map.right;
    let back = map.back;
    let left = map.left;
    
    // We look at the Yellow Face (Down).
    // The "Front" edge of the Yellow face is usually index 1 or 7 depending on orientation.
    // Based on standard array mapping:
    // Down[1] touches Front[7]
    // Down[5] touches Right[7]
    // Down[7] touches Back[7]
    // Down[3] touches Left[7]

    // 1. CHECK FRONT EDGE (Green Side)
    if (down[1] === 'W') {
        // Check if the side sticker matches the center
        // Note: We check Front[7] (bottom of front face) against Front[4] (center)
        if (front[7] === front[4]) return "F2"; 
        return "D"; // Rotate Yellow face to find match
    }

    // 2. CHECK RIGHT EDGE (Red Side)
    if (down[5] === 'W') {
        if (right[7] === right[4]) return "R2";
        return "D";
    }

    // 3. CHECK BACK EDGE (Blue Side)
    if (down[7] === 'W') {
        if (back[7] === back[4]) return "B2";
        return "D";
    }

    // 4. CHECK LEFT EDGE (Orange Side)
    if (down[3] === 'W') {
        if (left[7] === left[4]) return "L2";
        return "D";
    }
    
    return "DONE";
}

function isCubeSolved(map) { return false; }