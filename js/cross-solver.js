// js/cross-solver.js

// --- MEMORY VARIABLE (MUST BE OUTSIDE THE FUNCTION) ---
let lastMove = ""; 
// -----------------------------------------------------

function getCrossMove(cube) {
    // 1. Check if Cross is Done
    let solvedCount = 0;
    [1, 3, 5, 7].forEach(i => { if (cube.up[i] === 'W') solvedCount++; });
    if (solvedCount === 4) return "DONE";

    // 2. DEFINE POSITIONS (Down Face / Yellow Side)
    const positions = [
        { id: 1, sideFace: 'front', sideIdx: 7, move: 'F2' },
        { id: 5, sideFace: 'right', sideIdx: 7, move: 'R2' },
        { id: 7, sideFace: 'back',  sideIdx: 7, move: 'B2' },
        { id: 3, sideFace: 'left',  sideIdx: 7, move: 'L2' }
    ];

    // 3. PRIORITY 1: Match & Solve
    for (let pos of positions) {
        if (cube.down[pos.id] === 'W') {
            let sideColor = cube[pos.sideFace][pos.sideIdx];
            let centerColor = cube[pos.sideFace][4];
            
            if (sideColor === centerColor) {
                // --- THE SAFETY CHECK ---
                if (lastMove === pos.move) {
                     // If we just said "L2" and it's still there, 
                     // force a rotation to break the loop!
                     console.log("Loop detected! Forcing rotation.");
                     lastMove = "D";
                     return "D"; 
                }
                
                lastMove = pos.move; // Save memory
                return pos.move;     // Return "L2"
            }
        }
    }

    // 4. PRIORITY 2: Rotate to find match
    let petalFound = false;
    for (let pos of positions) {
        if (cube.down[pos.id] === 'W') petalFound = true;
    }

    if (petalFound) {
        // If we keep rotating, eventually we might loop. 
        // But usually "D" is safe.
        lastMove = "D";
        return "D";
    }

    return "Check Middle Layer";
}