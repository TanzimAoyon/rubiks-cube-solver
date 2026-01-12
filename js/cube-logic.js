// js/cube-logic.js - SYNCED ROTATION VERSION

function rotateFaceClockwise(face) {
    let old = [...face];
    face[0]=old[6]; face[1]=old[3]; face[2]=old[0];
    face[3]=old[7]; face[4]=old[4]; face[5]=old[1];
    face[6]=old[8]; face[7]=old[5]; face[8]=old[2];
}

function rotateFaceCounterClockwise(face) {
    let old = [...face];
    face[0]=old[2]; face[1]=old[5]; face[2]=old[8];
    face[3]=old[1]; face[4]=old[4]; face[5]=old[7];
    face[6]=old[0]; face[7]=old[3]; face[8]=old[6];
}

function virtualMove(move, cube) {
    console.log("EXECUTING MOVE: " + move); 

    // --- RECURSION FOR DOUBLE/PRIME MOVES ---
    if (move.includes("2")) {
        let base = move.replace("2", "");
        virtualMove(base, cube); virtualMove(base, cube);
        return;
    }
    if (move.includes("'")) {
        // Prime usually means 3 rights, but let's handle it properly later if needed.
        // For now, 3 normal moves = 1 prime move
        let base = move.replace("'", "");
        virtualMove(base, cube); virtualMove(base, cube); virtualMove(base, cube);
        return;
    }

    // --- THE MOVES ---

    if (move === "U") { 
        // Standard Up (White Face) - Not used often in Cross step
        rotateFaceClockwise(cube.up);
        let temp = [cube.front[0], cube.front[1], cube.front[2]];
        cube.front[0]=cube.right[0]; cube.front[1]=cube.right[1]; cube.front[2]=cube.right[2];
        cube.right[0]=cube.back[0];  cube.right[1]=cube.back[1];  cube.right[2]=cube.back[2];
        cube.back[0]=cube.left[0];   cube.back[1]=cube.left[1];   cube.back[2]=cube.left[2];
        cube.left[0]=temp[0];        cube.left[1]=temp[1];        cube.left[2]=temp[2];
    }
    else if (move === "D") { 
        // *** CRITICAL FIX FOR YOU ***
        // Standard D moves Front -> Right.
        // BUT you are holding Yellow on Top. You rotate Clockwise (Front -> Left).
        // So we are coding a "Visual Clockwise Top" move here.
        
        rotateFaceClockwise(cube.down); // Rotate the face stickers
        
        // Move Side Stickers: FRONT -> LEFT -> BACK -> RIGHT -> FRONT
        let temp = [cube.front[6], cube.front[7], cube.front[8]];
        
        // Front gets Right
        cube.front[6]=cube.right[6]; cube.front[7]=cube.right[7]; cube.front[8]=cube.right[8];
        // Right gets Back
        cube.right[6]=cube.back[6];  cube.right[7]=cube.back[7];  cube.right[8]=cube.back[8];
        // Back gets Left
        cube.back[6]=cube.left[6];   cube.back[7]=cube.left[7];   cube.back[8]=cube.left[8];
        // Left gets Temp (Front)
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
    else if (move === "B") {
        rotateFaceClockwise(cube.back);
        let temp = [cube.up[0], cube.up[1], cube.up[2]];
        cube.up[0]=cube.right[2];  cube.up[1]=cube.right[5];  cube.up[2]=cube.right[8];
        cube.right[2]=cube.down[8];cube.right[5]=cube.down[7];cube.right[8]=cube.down[6];
        cube.down[6]=cube.left[0]; cube.down[7]=cube.left[3]; cube.down[8]=cube.left[6];
        cube.left[0]=temp[2];      cube.left[3]=temp[1];      cube.left[6]=temp[0];
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
}