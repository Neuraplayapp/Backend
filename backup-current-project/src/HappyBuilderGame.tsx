import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
// @ts-ignore
import { createNoise2D } from 'simplex-noise';

// --- CONSTANTS ---
const CHUNK_SIZE = 16;
const WORLD_HEIGHT = 64;
const RENDER_DISTANCE = 4;
const PLAYER_HEIGHT = 1.8;
const GRAVITY = 30.0;
const MOVE_SPEED = 5.0;

type BlockType = 'grass' | 'dirt' | 'stone' | 'air';
const blockColors: Record<BlockType, string> = {
    grass: '#4caf50',
    dirt: '#8d5524',
    stone: '#888888',
    air: 'transparent',
};

// --- WORLD CLASS ---
class World {
    private chunks = new Map<string, BlockType[][][]>();
    private noise2D: (x: number, y: number) => number = createNoise2D();
    private getChunkKey = (cx: number, cz: number) => `${cx},${cz}`;

    getChunk(cx: number, cz: number) {
        const key = this.getChunkKey(cx, cz);
        if (!this.chunks.has(key)) {
            this.generateChunk(cx, cz);
        }
        return this.chunks.get(key);
    }

    getBlock(x: number, y: number, z: number): BlockType {
        const cx = Math.floor(x / CHUNK_SIZE);
        const cz = Math.floor(z / CHUNK_SIZE);
        const chunk = this.getChunk(cx, cz);
        const lx = x - cx * CHUNK_SIZE;
        const lz = z - cz * CHUNK_SIZE;
        return chunk?.[lx]?.[y]?.[lz] || 'air';
    }

    private generateChunk(cx: number, cz: number) {
        const chunk: BlockType[][][] = Array.from({ length: CHUNK_SIZE }, () =>
            Array.from({ length: WORLD_HEIGHT }, () => Array(CHUNK_SIZE).fill('air'))
        );
        for (let x = 0; x < CHUNK_SIZE; x++) {
            for (let z = 0; z < CHUNK_SIZE; z++) {
                const worldX = cx * CHUNK_SIZE + x;
                const worldZ = cz * CHUNK_SIZE + z;
                const height = Math.floor(32 + this.noise2D(worldX * 0.05, worldZ * 0.05) * 10);
                for (let y = 0; y <= height; y++) {
                    if (y < height - 3) chunk[x][y][z] = 'stone';
                    else if (y < height) chunk[x][y][z] = 'dirt';
                    else chunk[x][y][z] = 'grass';
                }
            }
        }
        this.chunks.set(this.getChunkKey(cx, cz), chunk);
    }
}

// --- MESHING FUNCTION ---
function generateChunkMesh(chunk: BlockType[][][], cx: number, cz: number): THREE.Mesh | null {
    const positions: number[] = [];
    const normals: number[] = [];
    const colors: number[] = [];

    for (let y = 0; y < WORLD_HEIGHT; y++) {
        for (let x = 0; x < CHUNK_SIZE; x++) {
            for (let z = 0; z < CHUNK_SIZE; z++) {
                const blockType = chunk[x][y][z];
                if (blockType === 'air') continue;

                const color = new THREE.Color(blockColors[blockType]);
                const CUBE_FACES = [
                    { dir: [ 1, 0, 0], corners: [[1,1,0],[1,0,0],[1,1,1],[1,0,1]] }, { dir: [-1, 0, 0], corners: [[0,1,1],[0,0,1],[0,1,0],[0,0,0]] },
                    { dir: [ 0, 1, 0], corners: [[0,1,1],[1,1,1],[0,1,0],[1,1,0]] }, { dir: [ 0,-1, 0], corners: [[0,0,0],[1,0,0],[0,0,1],[1,0,1]] },
                    { dir: [ 0, 0, 1], corners: [[1,1,1],[0,1,1],[1,0,1],[0,0,1]] }, { dir: [ 0, 0,-1], corners: [[0,1,0],[1,1,0],[0,0,0],[1,0,0]] },
                ];

                for (const { dir, corners } of CUBE_FACES) {
                    const neighbor = chunk[x + dir[0]]?.[y + dir[1]]?.[z + dir[2]] || 'air';
                    if (neighbor === 'air') {
                        const [c1, c2, c3, c4] = corners.map(c => [x + c[0], y + c[1], z + c[2]]);
                        for (const vert of [c1, c2, c4, c4, c2, c3]) {
                            positions.push(...vert);
                            normals.push(...dir);
                            colors.push(color.r, color.g, color.b);
                        }
                    }
                }
            }
        }
    }

    if (positions.length === 0) return null;

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    
    const mesh = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ vertexColors: true }));
    mesh.position.set(cx * CHUNK_SIZE, 0, cz * CHUNK_SIZE);
    return mesh;
}

// --- PLAYER CONTROLLER ---
class PlayerController {
    onGround = false;
    constructor(public pos: THREE.Vector3, public velocity: THREE.Vector3, public world: World) {}
    
    update(keys: { [key: string]: boolean }, camera: THREE.Camera, delta: number) {
        this.velocity.y -= GRAVITY * delta;
        const moveDir = new THREE.Vector3((keys['KeyD']?1:0)-(keys['KeyA']?1:0), 0, (keys['KeyS']?1:0)-(keys['KeyW']?1:0));
        moveDir.normalize().applyEuler(new THREE.Euler(0, camera.rotation.y, 0, 'YXZ'));
        this.velocity.x = moveDir.x * MOVE_SPEED;
        this.velocity.z = moveDir.z * MOVE_SPEED;
        if (keys['Space'] && this.onGround) this.velocity.y = Math.sqrt(2 * 1.2 * GRAVITY);

        this.pos.x += this.velocity.x * delta; this.resolveCollisions('x');
        this.pos.y += this.velocity.y * delta; this.resolveCollisions('y');
        this.pos.z += this.velocity.z * delta; this.resolveCollisions('z');

        camera.position.copy(this.pos).add(new THREE.Vector3(0, PLAYER_HEIGHT / 2, 0));
    }

    private resolveCollisions(axis: 'x' | 'y' | 'z') {
        const playerBox = new THREE.Box3().setFromCenterAndSize(this.pos, new THREE.Vector3(0.6, PLAYER_HEIGHT, 0.6));
        this.onGround = false;

        for (let x = Math.floor(playerBox.min.x); x < playerBox.max.x; x++)
        for (let y = Math.floor(playerBox.min.y); y < playerBox.max.y; y++)
        for (let z = Math.floor(playerBox.min.z); z < playerBox.max.z; z++) {
            if (this.world.getBlock(x, y, z) !== 'air') {
                if (axis === 'y') {
                    if (this.velocity.y > 0) this.pos.y = y - PLAYER_HEIGHT; else { this.pos.y = y + 1; this.onGround = true; }
                    this.velocity.y = 0;
                } else if (axis === 'x') {
                    if (this.velocity.x > 0) this.pos.x = x - 0.3; else this.pos.x = x + 1 + 0.3;
                    this.velocity.x = 0;
                } else if (axis === 'z') {
                    if (this.velocity.z > 0) this.pos.z = z - 0.3; else this.pos.z = z + 1 + 0.3;
                    this.velocity.z = 0;
                }
            }
        }
    }
}

const HappyBuilderGame: React.FC = () => {
    const mountRef = useRef<HTMLDivElement>(null);
    const gameRef = useRef<any>(null);
    // ✅ The isPaused state is now the single source of truth for the game loop.
    const [isPaused, setIsPaused] = useState(true);

    // ✅ This function now explicitly starts the game.
    const startGame = () => {
        setIsPaused(false);
        gameRef.current?.renderer.domElement.requestPointerLock();
    };

    // ✅ This useEffect runs only ONCE to set up the entire game.
    useEffect(() => {
        const mount = mountRef.current!;
        const scene = new THREE.Scene();
        scene.background = new THREE.Color('#87CEEB');
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        mount.appendChild(renderer.domElement);

        scene.add(new THREE.AmbientLight(0xffffff, 0.7));
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(50, 50, 50);
        scene.add(dirLight);

        const world = new World();
        const playerController = new PlayerController(new THREE.Vector3(8, 45, 8), new THREE.Vector3(), world);
        const keysPressed: { [key: string]: boolean } = {};
        const chunkMeshes = new Map<string, THREE.Mesh>();
        gameRef.current = { scene, camera, renderer, world, playerController, keysPressed, chunkMeshes, clock: new THREE.Clock() };

        const handleKey = (e: KeyboardEvent) => { keysPressed[e.code] = e.type === 'keydown'; };
        const onMouseMove = (e: MouseEvent) => { if (!isPaused) { camera.rotation.y -= e.movementX*0.002; camera.rotation.x -= e.movementY*0.002; camera.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, camera.rotation.x)); }};
        
        window.addEventListener('keydown', handleKey);
        window.addEventListener('keyup', handleKey);
        document.addEventListener('mousemove', onMouseMove);
        
        let animationId: number;
        const animate = () => {
            animationId = requestAnimationFrame(animate);
            // ✅ The game loop is now controlled by the simple "isPaused" state.
            if (isPaused || !gameRef.current) return;
            
            const { clock, playerController, scene, renderer, world, chunkMeshes } = gameRef.current;
            const delta = Math.min(0.1, clock.getDelta());
            playerController.update(keysPressed, camera, delta);

            const cx = Math.floor(playerController.pos.x / CHUNK_SIZE);
            const cz = Math.floor(playerController.pos.z / CHUNK_SIZE);
            for (let x = cx - RENDER_DISTANCE; x <= cx + RENDER_DISTANCE; x++) {
                for (let z = cz - RENDER_DISTANCE; z <= cz + RENDER_DISTANCE; z++) {
                    const key = `${x},${z}`;
                    if (!chunkMeshes.has(key)) {
                        const chunkData = world.getChunk(x, z);
                        const mesh = generateChunkMesh(chunkData!, x, z);
                        if (mesh) {
                            chunkMeshes.set(key, mesh);
                            scene.add(mesh);
                        }
                    }
                }
            }
            renderer.render(scene, camera);
        };
        animate();

        return () => {
            cancelAnimationFrame(animationId);
            mount.removeChild(renderer.domElement);
            window.removeEventListener('keydown', handleKey);
            window.removeEventListener('keyup', handleKey);
            document.removeEventListener('mousemove', onMouseMove);
        };
    }, []); // Empty dependency array ensures this setup runs only ONCE.

    // ✅ This separate effect handles pausing the game if the user exits pointer lock.
    useEffect(() => {
        const onPointerLockChange = () => {
            if (document.pointerLockElement !== gameRef.current?.renderer.domElement) {
                setIsPaused(true);
            }
        };
        document.addEventListener('pointerlockchange', onPointerLockChange);
        return () => document.removeEventListener('pointerlockchange', onPointerLockChange);
    }, []); // This also runs only once.

    return (
        <div ref={mountRef} style={{ width: '100vw', height: '100vh', cursor: isPaused ? 'default' : 'none' }}>
            {isPaused && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: '#fff', padding: 32, borderRadius: 16, textAlign: 'center' }}>
                        <h1>Voxel Game</h1>
                        <p>Game Paused</p>
                        <button onClick={startGame} style={{ fontSize: 20, padding: '12px 32px', cursor: 'pointer', background: '#4caf50', color: 'white', border: 'none', borderRadius: 8 }}>
                            ▶️ Resume Game
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HappyBuilderGame; 