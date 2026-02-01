// Import the noise library from a local file
importScripts('./fast-noise-lite.js');

// Initialize the noise generator
const noise = new FastNoiseLite(1337); // Use any number as a seed
noise.SetNoiseType(FastNoiseLite.NoiseType.OpenSimplex2);

// Create the exact function your code is trying to call
const createNoise2D = (x, z) => {
  return noise.GetNoise(x, z);
};

// --- CONSTANTS ---
const CHUNK_SIZE = 16;
const WORLD_HEIGHT = 64;

// --- GENERATION LOGIC ---
// Directly assign the function. Do not call it here.
const noise2D = createNoise2D;

function generateChunkData(cx, cz) {
    // The noise2D function is now guaranteed to exist and ready to use.
    const chunk = [];
    for (let x = 0; x < CHUNK_SIZE; x++) {
        chunk[x] = [];
        for (let y = 0; y < WORLD_HEIGHT; y++) {
            chunk[x][y] = [];
            for (let z = 0; z < CHUNK_SIZE; z++) {
                const worldX = cx * CHUNK_SIZE + x;
                const worldZ = cz * CHUNK_SIZE + z;
                // Use the noise2D function here
                const base = noise2D(worldX * 0.05, worldZ * 0.05) * 5;
                const detail = noise2D(worldX * 0.15, worldZ * 0.15) * 2;
                let height = Math.floor(32 + base + detail);
                height = Math.max(1, Math.min(WORLD_HEIGHT - 1, height));
                if (y < height - 3) chunk[x][y][z] = 2; // Stone
                else if (y < height) chunk[x][y][z] = 1; // Dirt
                else if (y === height) chunk[x][y][z] = 0; // Grass
                else chunk[x][y][z] = 5; // Air
            }
        }
    }
    // Simple decorations
    for (let x = 0; x < CHUNK_SIZE; x++) {
        for (let z = 0; z < CHUNK_SIZE; z++) {
            for (let y = WORLD_HEIGHT - 1; y > 0; y--) {
                if (chunk[x][y][z] === 0) { // On grass
                    if (Math.random() < 0.02) { // Tree
                        const treeHeight = 5 + Math.floor(Math.random() * 3);
                        for (let h = 1; h <= treeHeight; h++) {
                            if (y + h < WORLD_HEIGHT) chunk[x][y + h][z] = 4; // Wood
                        }
                    }
                    break;
                }
            }
        }
    }
    return chunk;
}

// --- AMBIENT OCCLUSION & MESHING LOGIC ---
function greedyMeshWithAO(chunk) {
    const getBlock = (x, y, z) => {
        if (y < 0 || y >= WORLD_HEIGHT) return 5; // air
        if (x < 0 || x >= CHUNK_SIZE || z < 0 || z >= CHUNK_SIZE) {
            // For AO, we'll assume borders are solid to avoid light leakage.
            return 2; // stone
        }
        return chunk[x][y][z];
    };

    const positions = [];
    const normals = [];
    const colors = [];
    const blockColors = [ [0.29, 0.69, 0.31], [0.55, 0.33, 0.14], [0.53, 0.53, 0.53], [0.5, 0.5, 0.5], [0.62, 0.32, 0.17], [0,0,0] ]; // RGB for grass, dirt, stone, etc.

    // Standard cube face definitions
    const faceData = [
        // Each face: [normal, [vertex offsets...]]
        // +X
        { normal: [1, 0, 0], verts: [[1,0,0],[1,1,0],[1,1,1],[1,0,1]] },
        // -X
        { normal: [-1, 0, 0], verts: [[0,0,1],[0,1,1],[0,1,0],[0,0,0]] },
        // +Y
        { normal: [0, 1, 0], verts: [[0,1,1],[1,1,1],[1,1,0],[0,1,0]] },
        // -Y
        { normal: [0, -1, 0], verts: [[0,0,0],[1,0,0],[1,0,1],[0,0,1]] },
        // +Z
        { normal: [0, 0, 1], verts: [[1,0,1],[1,1,1],[0,1,1],[0,0,1]] },
        // -Z
        { normal: [0, 0, -1], verts: [[0,0,0],[0,1,0],[1,1,0],[1,0,0]] },
    ];

    for (let y = 0; y < WORLD_HEIGHT; y++) {
        for (let x = 0; x < CHUNK_SIZE; x++) {
            for (let z = 0; z < CHUNK_SIZE; z++) {
                const blockType = getBlock(x, y, z);
                if (blockType === 5) continue; // Air
                for (let dir = 0; dir < 6; dir++) {
                    const { normal, verts } = faceData[dir];
                    const nx = normal[0], ny = normal[1], nz = normal[2];
                    const neighborType = getBlock(x + nx, y + ny, z + nz);
                    if (neighborType !== 5) continue; // Face is not visible
                    // Vertices for the face (local chunk coordinates)
                    const faceVerts = verts.map(([ox, oy, oz]) => [x + ox, y + oy, z + oz]);
                    // Two triangles per face
                    const indices = [[0, 1, 2], [0, 2, 3]];
                    for (const tri of indices) {
                        for (const idx of tri) {
                            const vert = faceVerts[idx];
                            positions.push(vert[0], vert[1], vert[2]);
                            normals.push(nx, ny, nz);
                            colors.push(blockColors[blockType][0], blockColors[blockType][1], blockColors[blockType][2]);
                        }
                    }
                }
            }
        }
    }

    // Naive AO (can be improved, but demonstrates the principle)
    for(let i = 0; i < positions.length / 3; i++) {
        const x = positions[i*3], y = positions[i*3+1], z = positions[i*3+2];
        const nx = normals[i*3], ny = normals[i*3+1], nz = normals[i*3+2];

        let occlusion = 0;
        // Check 3 neighbors for each vertex
        for (let j = -1; j <= 1; j++) {
            for (let k = -1; k <= 1; k++) {
                if (j === 0 && k === 0) continue;
                const s1 = getBlock(x + j*Math.abs(ny) + k*Math.abs(nz), y + j*Math.abs(nx) + k*Math.abs(nz), z + j*Math.abs(nx) + k*Math.abs(ny));
                if(s1 !== 5) occlusion += 1;
            }
        }
        const brightness = Math.pow(0.85, occlusion);
        colors[i*3] *= brightness;
        colors[i*3+1] *= brightness;
        colors[i*3+2] *= brightness;
    }

    return {
        positions: new Float32Array(positions),
        normals: new Float32Array(normals),
        colors: new Float32Array(colors),
    };
}

// --- WORKER MESSAGE HANDLER ---
self.onmessage = (e) => {
    const { type, payload } = e.data;

    if (type === 'generate') {
        const { cx, cz } = payload;
        const chunkData = generateChunkData(cx, cz);
        const meshData = greedyMeshWithAO(chunkData);

        // Post back the results, marking buffers as transferable
        self.postMessage({
            type: 'generated',
            payload: {
                cx,
                cz,
                chunkData,
                meshData,
            }
        }, [meshData.positions.buffer, meshData.normals.buffer, meshData.colors.buffer]);
    }
}; 