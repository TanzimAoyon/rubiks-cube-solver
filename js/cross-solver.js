// js/cross-solver.js - SMART PRIORITY VERSION
let lastMove = ""; // Remember what we just said
function getCrossMove(cube) {
    // 1. Check if Cross is Completely Done
    let solvedCount = 0;
    // Check Down indices 1,3,5,7 (which are UP in our inverted logic)
    [1, 3, 5, 7].forEach(i => { if (cube.up[i] === 'W') solvedCount++; });
    if (solvedCount === 4) return "DONE";

    // 2. DEFINE THE 4 POSITIONS
    // We are holding Yellow Up, so we check the 'down' face of the virtual cube.
    // Map: DownIndex -> [SideFace, SideIndex]
    const positions = [
        { id: 1, sideFace: 'front', sideIdx: 7, move: 'F2' },
        { id: 5, sideFace: 'right', sideIdx: 7, move: 'R2' },
        { id: 7, sideFace: 'back',  sideIdx: 7, move: 'B2' },
        { id: 3, sideFace: 'left',  sideIdx: 7, move: 'L2' }
    ];

    // 3. PRIORITY 1: Look for a PERFECT MATCH
    // (White is on Top, and the Side Sticker matches the Center)
    
    for (let pos of positions) {
        // Is there a white petal here?
        if (cube.down[pos.id] === 'W') {
            // Check the side sticker color
            let sideColor = cube[pos.sideFace][pos.sideIdx];
            let centerColor = cube[pos.sideFace][4]; // Center is always index 4
            
            // If it matches, DO IT NOW!
            if (sideColor === centerColor) {
                return pos.move; // e.g., "F2"
            }
        }
    }

    // 4. PRIORITY 2: If no matches, is there ANY white petal at all?
    let petalFound = false;
    for (let pos of positions) {
        if (cube.down[pos.id] === 'W') petalFound = true;
    }

    // 5. DECISION
    if (petalFound) {
        // We have white petals, but none line up with their centers yet.
        // So we MUST rotate to find a match.
        // We return "D" (which main.js translates to "Rotate Top")
        lastMove = "D"
        return "D";
    } else {
        // No white petals on the yellow face?
        // They must be stuck in the middle layer.
        return "Check Middle Layer";
    }
}