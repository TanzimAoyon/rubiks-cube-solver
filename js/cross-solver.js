// js/cross-solver.js - STRICT VICTORY CHECK

let lastMove = ""; 

function getCrossMove(cube) {
    // 1. STRICT VICTORY CHECK
    // We don't just count white stickers. We verify they match the side centers.
    // Remember: Internal 'up' is the Physical 'Down' (White Face).
    
    let isFrontSolved = (cube.up[7] === 'W' && cube.front[1] === cube.front[4]);
    let isRightSolved = (cube.up[5] === 'W' && cube.right[1] === cube.right[4]);
    let isBackSolved  = (cube.up[1] === 'W' && cube.back[1]  === cube.back[4]);
    let isLeftSolved  = (cube.up[3] === 'W' && cube.left[1]  === cube.left[4]);

    if (isFrontSolved && isRightSolved && isBackSolved && isLeftSolved) {
        return "DONE";
    }

    // 2. Define the 4 positions on the Yellow Face (Down)
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
                // If it's already solved (e.g. Front is done), don't do F2 again!
                // We check if that slot is already filled correctly.
                let isSlotSolved = false;
                if (pos.sideFace === 'front' && isFrontSolved) isSlotSolved = true;
                if (pos.sideFace === 'right' && isRightSolved) isSlotSolved = true;
                if (pos.sideFace === 'back'  && isBackSolved)  isSlotSolved = true;
                if (pos.sideFace === 'left'  && isLeftSolved)  isSlotSolved = true;

                if (isSlotSolved) continue; // Skip this move, it's already down there!

                // Safety Check for loops
                if (lastMove === pos.move) {
                     console.log("Loop detected! Forcing rotation.");
                     lastMove = "D";
                     return "D"; 
                }
                
                lastMove = pos.move; 
                return pos.move; 
            }
        }
    }

    // 4. PRIORITY 2: Rotate to find match
    let petalFound = false;
    for (let pos of positions) {
        if (cube.down[pos.id] === 'W') petalFound = true;
    }

    if (petalFound) {
        lastMove = "D";
        return "D";
    }

    return "Check Middle Layer";
}