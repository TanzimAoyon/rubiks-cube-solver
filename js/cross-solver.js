// js/cross-solver.js - IMPROVED VERSION

// 1. Helper: Find where the White Petals are on the UP face
function findWhitePetal(cube) {
    // We only care about the 4 edges on the UP face: indices 1, 3, 5, 7
    const edges = [1, 3, 5, 7];
    for (let i of edges) {
        if (cube.up[i] === 'W') return i;
    }
    return null; // No white petals found on top
}

// 2. Helper: Get the color of the "Side Sticker" of a specific Up-Edge
function getSideStickerColor(upIndex, cube) {
    // Mapping Up-Edge Index -> [Face Name, Face Index]
    const map = {
        7: ['front', 1],
        5: ['right', 1],
        1: ['back', 1],
        3: ['left', 1]
    };
    
    // Safety check in case map is undefined
    if (!map[upIndex]) return { color: '?', face: 'front' };

    const [sideName, sideIndex] = map[upIndex];
    return { 
        color: cube[sideName][sideIndex], 
        face: sideName 
    };
}

// 3. THE MAIN LOGIC
function getCrossMove(cube) {
    // A. Check if Cross is done (All 4 bottom edges are White)
    const downEdges = [1, 3, 5, 7];
    let solvedCount = 0;
    downEdges.forEach(i => { if (cube.down[i] === 'W') solvedCount++; });
    
    if (solvedCount === 4) return "DONE";

    // B. Find a White Petal on Top
    const petalIndex = findWhitePetal(cube);
    
    // C. If no petal on top, but cross isn't done...
    if (petalIndex === null) {
        // Return a specific string that main.js now knows how to handle
        return "Check Middle Layer";
    }

    // D. "Match" Phase: Check if aligned with center
    const stickerObj = getSideStickerColor(petalIndex, cube);
    const sideColor = stickerObj.color; // e.g., 'R' (Red)
    const currentFace = stickerObj.face; // e.g., 'right'
    
    // Get the center color of the face it is currently sitting on (Index 4)
    const currentFaceCenter = cube[currentFace][4]; 

    // IF they don't match -> Rotate Top (U) to find the home
    if (sideColor !== currentFaceCenter) {
        return "U"; 
    }

    // E. "Flip" Phase: They match! Flip it down.
    if (currentFace === 'front') return "F2"; // Turn Front 180
    if (currentFace === 'right') return "R2"; // Turn Right 180
    if (currentFace === 'back') return "B2";  // Turn Back 180
    if (currentFace === 'left') return "L2";  // Turn Left 180

    return "U"; // Fallback: just turn top if confused
}