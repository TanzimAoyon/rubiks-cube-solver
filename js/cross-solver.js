// js/cross-solver.js - UPSIDE DOWN MODE

// 1. Helper: Find White Petals on the DOWN face (Physically your Top)
function findWhitePetal(cube) {
    // Indices 1, 3, 5, 7 on the Down face
    const edges = [1, 3, 5, 7];
    for (let i of edges) {
        if (cube.down[i] === 'W') return i;
    }
    return null; 
}

// 2. Helper: Get the Side Sticker of a DOWN-Edge
function getSideStickerColor(downIndex, cube) {
    // If we are looking at the Down face (Yellow), the attached side stickers
    // are on the BOTTOM row (Index 7) of the side faces.
    
    // Map Down-Index -> [Face Name, Face Index]
    // Down[1] (Front-side) touches Front[7]
    // Down[3] (Right-side) touches Right[7] ... Wait, mapping depends on orientation.
    // Let's use standard unfolding:
    // Down[7] connects to Back[7] ? No.
    // Let's rely on standard layout:
    // Down 1 (Top of Down Face) -> Front [7]
    // Down 5 (Right of Down Face) -> Right [7]
    // Down 7 (Bottom of Down Face) -> Back [7]
    // Down 3 (Left of Down Face) -> Left [7]

    const map = {
        1: ['front', 7],
        5: ['right', 7],
        7: ['back', 7],
        3: ['left', 7]
    };

    if (!map[downIndex]) return { color: '?', face: 'front' };

    const [sideName, sideIndex] = map[downIndex];
    return { 
        color: cube[sideName][sideIndex], 
        face: sideName 
    };
}

// 3. MAIN LOGIC
function getCrossMove(cube) {
    // A. Check if Cross is Done (All 4 UP edges are White)
    // Because we are upside down, the "Target" is the White Face (UP).
    let solvedCount = 0;
    [1, 3, 5, 7].forEach(i => { if (cube.up[i] === 'W') solvedCount++; });
    
    if (solvedCount === 4) return "DONE";

    // B. Find a White Petal on the "Working Layer" (DOWN/Yellow)
    const petalIndex = findWhitePetal(cube);
    
    // C. If no petal found on the yellow face...
    if (petalIndex === null) {
        return "Check Middle Layer"; 
    }

    // D. MATCH PHASE
    const stickerObj = getSideStickerColor(petalIndex, cube);
    const sideColor = stickerObj.color; 
    const currentFace = stickerObj.face; 

    // Get the Center color of that face (Index 4 is always center)
    const currentFaceCenter = cube[currentFace][4]; 

    // IF MISMATCH: Return "D" (which we will translate to "Rotate Top")
    // We use D because for the computer, Yellow is Down.
    if (sideColor !== currentFaceCenter) {
        return "D"; 
    }

    // E. FLIP PHASE: They match!
    // Since we are upside down, turning a side 180 (F2) brings the piece 
    // from Down (Yellow) to Up (White).
    if (currentFace === 'front') return "F2";
    if (currentFace === 'right') return "R2";
    if (currentFace === 'back') return "B2";
    if (currentFace === 'left') return "L2";

    return "D"; // Fallback
}