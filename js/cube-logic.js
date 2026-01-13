// js/cube-logic.js - FIXED ROTATION DIRECTION

function rotateFaceClockwise(face) {
    let old = [...face];
    face[0]=old[6]; face[1]=old[3]; face[2]=old[0];
    face[3]=old[7]; face[4]=old[4]; face[5]=old[1];
    face[6]=old[8]; face[7]=old[5]; face[8]=old[2];
}

function virtualMove(move, cube) {
    // RECURSION FOR COMPLEX MOVES
    if (move.includes(" ")) { 
        // Handles "R D R'" strings by splitting them
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

    // --- THE MOVES ---

    if (move === "U") { 
        // White Face Rotation (Not used much now)
        rotateFaceClockwise(cube.up);
        let temp = [cube.front[0], cube.front[1], cube.front[2]];
        cube.front[0]=cube.right[0]; cube.front[1]=cube.right[1]; cube.front[2]=cube.right[2];
        cube.right[0]=cube.back[0];  cube.right[1]=cube.back[1];  cube.right[2]=cube.back[2];
        cube.back[0]=cube.left[0];   cube.back[1]=cube.left[1];   cube.back[2]=cube.left[2];
        cube.left[0]=temp[0];        cube.left[1]=temp[1];        cube.left[2]=temp[2];
    }
    else if (move === "D") { 
        // *** THE FIX *** // SIMULATING "ROTATE TOP (Yellow) CLOCKWISE"
        // Physical Action: Pushing Front Stickers to the Left Face.
        
        rotateFaceClockwise(cube.down); // Rotate the Yellow Face itself

        let temp = [cube.front[6], cube.front[7], cube.front[8]];
        
        // Front -> Left (Your Push Action)
        // So New Left = Old Front
        // New Back = Old Left
        // New Right = Old Back
        // New Front = Old Right
        
        // We have to work backwards to not overwrite data:
        
        // 1. Save Front (Temp)
        // 2. Front gets Right
        cube.front[6]=cube.right[6]; cube.front[7]=cube.right[7]; cube.front[8]=cube.right[8];
        // 3. Right gets Back
        cube.right[6]=cube.back[6];  cube.right[7]=cube.back[7];  cube.right[8]=cube.back[8];
        // 4. Back gets Left
        cube.back[6]=cube.left[6];   cube.back[7]=cube.left[7];   cube.back[8]=cube.left[8];
        // 5. Left gets Temp (Old Front)
        cube.left[6]=temp[0];        cube.left[7]=temp[1];        cube.left[8]=temp[2];
    }
    
    // --- STANDARD SIDE MOVES ---
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