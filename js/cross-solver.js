// js/cross-solver.js
let lastMove = ""; 

function getCrossMove(cube) {
    // 1. Is the Cross Done? (Check White Face)
    let solvedCount = 0;
    [1, 3, 5, 7].forEach(i => { if (cube.up[i] === 'W') solvedCount++; });
    if (solvedCount === 4) return "DONE";

    // 2. Define the 4 positions on the Yellow Face (Down)
    const positions = [
        { id: 1, sideFace: 'front', sideIdx: 7, move: 'F2' },
        { id: 5, sideFace: 'right', sideIdx: 7, move: 'R2' },
        { id: 7, sideFace: 'back',  sideIdx: 7, move: 'B2' },
        { id: 3, sideFace: 'left',  sideIdx: 7, move: 'L2' }
    ];

    // 3. Look for a PERFECT MATCH first
    for (let pos of positions) {
        if (cube.down[pos.id] === 'W') {
            let sideColor = cube[pos.sideFace][pos.sideIdx];
            let centerColor = cube[pos.sideFace][4];
            
            if (sideColor === centerColor) {
                // If we found a match, DO IT.
                // Reset lastMove so we don't get stuck thinking we are looping
                lastMove = pos.move; 
                return pos.move; 
            }
        }
    }

    // 4. If no match, do we have ANY white petals?
    let petalFound = false;
    for (let pos of positions) {
        if (cube.down[pos.id] === 'W') petalFound = true;
    }

    if (petalFound) {
        // We have a white petal, but it's on the wrong color.
        // Rotate Top (D) to move it to the next color.
        // Because of our Fix in cube-logic.js, "D" now follows your hand logic.
        lastMove = "D";
        return "D";
    }

    return "Check Middle Layer";
}