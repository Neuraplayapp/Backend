import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { useUser } from '../../contexts/UserContext';
import { Star, Trophy } from 'lucide-react';

// --- CONSTANTS ---
const CHUNK_SIZE: number = 16;
const WORLD_HEIGHT = 64;
const RENDER_DISTANCE = 4; // Chunks
const PLAYER_HEIGHT = 1.6;
const GRAVITY = 30.0;
const JUMP_HEIGHT = 1.2;
const MOVE_SPEED = 5.0;
const SPRINT_MULTIPLIER = 2.0;
const MAX_HEALTH = 100;
const MAX_STAMINA = 100;

const BLOCK_TYPES = [
  'grass', 'dirt', 'stone', 'leaves', 'wood', 'air',
] as const;
type BlockType = typeof BLOCK_TYPES[number];
const blockColors: Record<BlockType, string> = {
  grass: '#4caf50',
  dirt: '#8d5524',
  stone: '#888',
  leaves: '#388e3c',
  wood: '#a0522d',
  air: 'transparent',
};
const blockIds: Record<BlockType, number> = {
  grass: 0, dirt: 1, stone: 2, leaves: 3, wood: 4, air: 5
};
const idToBlock: BlockType[] = ['grass', 'dirt', 'stone', 'leaves', 'wood', 'air'];

// --- WORKER-BACKED WORLD ---
class World {
  private chunks = new Map<string, number[][][]>();
  private worker: Worker;
  private pending = new Map<string, ((chunk: number[][][]) => void)[]>();
  constructor() {
    this.worker = new Worker('/chunkWorker.js');
    this.worker.onmessage = this.handleWorkerMessage.bind(this);
  }
  getChunkKey(cx: number, cz: number) { return `${cx},${cz}`; }
  getChunk(cx: number, cz: number, callback: (chunk: number[][][]) => void) {
    const key = this.getChunkKey(cx, cz);
    if (this.chunks.has(key)) {
      callback(this.chunks.get(key)!);
      return;
    }
    if (!this.pending.has(key)) {
      this.pending.set(key, []);
      this.worker.postMessage({ type: 'generate', payload: { cx, cz } });
    }
    this.pending.get(key)!.push(callback);
  }
  handleWorkerMessage(e: MessageEvent) {
    const { type, payload } = e.data;
    if (type === 'generated') {
      const { cx, cz, chunkData } = payload;
      const key = this.getChunkKey(cx, cz);
      this.chunks.set(key, chunkData);
      const callbacks = this.pending.get(key) || [];
      callbacks.forEach(cb => cb(chunkData));
      this.pending.delete(key);
    }
  }
  getBlock(x: number, y: number, z: number): number {
    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    const chunk = this.chunks.get(this.getChunkKey(cx, cz));
    if (!chunk) return 5; // Air
    const lx = x - cx * CHUNK_SIZE;
    const lz = z - cz * CHUNK_SIZE;
    return (lx >= 0 && lx < CHUNK_SIZE && y >= 0 && y < WORLD_HEIGHT && lz >= 0 && lz < CHUNK_SIZE) ? chunk[lx][y][lz] : 5;
  }
  setBlock(x: number, y: number, z: number, blockId: number, scene: THREE.Scene, chunkMeshes: Map<string, THREE.Mesh[]>) {
    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    const key = this.getChunkKey(cx, cz);
    const chunk = this.chunks.get(key);
    if (!chunk) return;
    const lx = x - cx * CHUNK_SIZE;
    const lz = z - cz * CHUNK_SIZE;
    if (lx < 0 || lx >= CHUNK_SIZE || y < 0 || y >= WORLD_HEIGHT || lz < 0 || lz >= CHUNK_SIZE) return;
    chunk[lx][y][lz] = blockId;
    const oldMeshes = chunkMeshes.get(key) || [];
    oldMeshes.forEach(mesh => {
      scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    });
    chunkMeshes.delete(key);
    this.getChunk(cx, cz, chunkData => {
      const meshes = createChunkMesh(chunkData, cx, cz);
      chunkMeshes.set(key, meshes);
      meshes.forEach(mesh => scene.add(mesh));
    });
  }
  terminate() {
    this.worker.terminate();
  }
}

function createChunkMesh(chunk: number[][][], cx: number, cz: number): THREE.Mesh[] {
  // Use the same greedyMeshWithAO logic as the worker, but in TS/Three.js
  // For simplicity, just create a box for each visible block face
  // (You can optimize this further by porting the worker's mesh logic)
  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const getBlock = (x: number, y: number, z: number) => {
    if (y < 0 || y >= WORLD_HEIGHT) return 5;
    if (x < 0 || x >= CHUNK_SIZE || z < 0 || z >= CHUNK_SIZE) return 2;
    return chunk[x][y][z];
  };
  const blockColorsArr = [ [0.29, 0.69, 0.31], [0.55, 0.33, 0.14], [0.53, 0.53, 0.53], [0.5, 0.5, 0.5], [0.62, 0.32, 0.17], [0,0,0] ];
  for (let y = 0; y < WORLD_HEIGHT; y++) {
    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        const blockType = getBlock(x, y, z);
        if (blockType === 5) continue;
        for (let dir = 0; dir < 6; dir++) {
          const dx = [1, -1, 0, 0, 0, 0][dir];
          const dy = [0, 0, 1, -1, 0, 0][dir];
          const dz = [0, 0, 0, 0, 1, -1][dir];
          const neighborType = getBlock(x + dx, y + dy, z + dz);
          if (neighborType !== 5) continue;
          const faceVerts = [
            [x, y, z],
            [x + (dx === 1 ? 1 : 0), y + (dy === 1 ? 1 : 0), z + (dz === 1 ? 1 : 0)],
            [x + ((dx === 1 || dz === 1) ? 1 : 0), y + ((dy === 1 || dz === 1) ? 1 : 0), z + ((dz === 1 || dx === 1) ? 1 : 0)],
            [x + (dz === 1 ? 1 : 0), y + (dz === 1 ? 1 : 0), z + (dz === 1 ? 1 : 0)]
          ];
          const indices = [[0, 1, 2], [0, 2, 3]];
          for (const tri of indices) {
            for (const idx of tri) {
              const vert = faceVerts[idx];
              positions.push(vert[0] + cx * CHUNK_SIZE, vert[1], vert[2] + cz * CHUNK_SIZE);
              normals.push(dx, dy, dz);
              colors.push(...blockColorsArr[blockType]);
            }
          }
        }
      }
    }
  }
  if (positions.length === 0) return [];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const material = new THREE.MeshLambertMaterial({ vertexColors: true });
  return [new THREE.Mesh(geometry, material)];
}

// --- Player/Physics Decoupling and X/Z Collision ---
class PlayerController {
  constructor(public pos: THREE.Vector3, public velocity: THREE.Vector3, public world: World) {}
  update(keysPressed: { [key: string]: boolean }, camera: THREE.PerspectiveCamera, delta: number, staminaRef: any) {
    this.velocity.y -= GRAVITY * delta; // Apply gravity every frame
    // Movement
    const moveDirection = new THREE.Vector3();
    if (keysPressed['KeyW']) moveDirection.z = -1;
    if (keysPressed['KeyS']) moveDirection.z = 1;
    if (keysPressed['KeyA']) moveDirection.x = -1;
    if (keysPressed['KeyD']) moveDirection.x = 1;
    moveDirection.normalize().applyEuler(camera.rotation);
    let speed = MOVE_SPEED;
    if (staminaRef.current > 0) {
      speed *= SPRINT_MULTIPLIER;
      staminaRef.current = Math.max(0, staminaRef.current - 40 * delta);
    } else {
      staminaRef.current = Math.min(MAX_STAMINA, staminaRef.current + 20 * delta);
    }
    this.velocity.x = moveDirection.x * speed;
    this.velocity.z = moveDirection.z * speed;
    this.pos.x += this.velocity.x * delta;
    this.pos.y += this.velocity.y * delta;
    this.pos.z += this.velocity.z * delta;
    // Y collision (ground)
    const playerFeetY = Math.floor(this.pos.y - PLAYER_HEIGHT);
    const playerFeetX = Math.floor(this.pos.x);
    const playerFeetZ = Math.floor(this.pos.z);
    const groundBlock = this.world.getBlock(playerFeetX, playerFeetY, playerFeetZ);
    if (groundBlock !== 5) {
      if (this.velocity.y < 0) {
        this.pos.y = playerFeetY + 1 + PLAYER_HEIGHT;
        this.velocity.y = 0;
      }
    }
  }
}

// --- Improved Safe Spawn and Patch Logic ---
const getSafeSpawn = (world: World, centerX = 8, centerZ = 8, radius = 24) => {
  let bestY = 0, bestX = centerX, bestZ = centerZ;
  let found = false;
  for (let x = centerX - radius; x <= centerX + radius; x++) {
    for (let z = centerZ - radius; z <= centerZ + radius; z++) {
      let y = WORLD_HEIGHT - 1;
      for (; y > 0; y--) {
        if (world.getBlock(x, y, z) !== 5) {
          found = true;
          if (y > bestY) {
            bestY = y;
            bestX = x;
            bestZ = z;
          }
          break;
        }
      }
    }
  }
  if (!found) {
    // Force create a large, flat patch at the center (16x16)
    const patchY = 34;
    world.getChunk(0, 0, (chunk: number[][][]) => {
      for (let y = patchY - 3; y <= patchY; y++) {
        if (y < 0 || y >= WORLD_HEIGHT) continue;
        for (let x = centerX - 8; x <= centerX + 7; x++) {
          for (let z = centerZ - 8; z <= centerZ + 7; z++) {
            const xx = x;
            const zz = z;
            // Ensure positive indices for chunk
            const lx = ((xx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
            const lz = ((zz % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
            if (y >= 0 && y < WORLD_HEIGHT) {
              if (!Array.isArray(chunk[lx])) chunk[lx] = [];
              if (!Array.isArray(chunk[lx][y])) chunk[lx][y] = [];
              (chunk[lx][y] as number[])[lz] = y === patchY ? 0 : 1;
            }
          }
        }
      }
    });
    return [centerX, patchY + PLAYER_HEIGHT, centerZ];
  }
  return [bestX, bestY + PLAYER_HEIGHT, bestZ];
};

const HappyBuilderGame: React.FC = () => {
  const { user, addXP, addStars, updateGameProgress, recordGameSession } = useUser();
  const [blocksPlaced, setBlocksPlaced] = useState(0);
  const [gameSession, setGameSession] = useState({
    startTime: Date.now(),
    blocksPlaced: 0,
    structuresBuilt: 0
  });
  const mountRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<any>(null); // Holds all game state
  const healthRef = useRef(MAX_HEALTH);
  const staminaRef = useRef(MAX_STAMINA);
  const [selectedBlock, setSelectedBlock] = useState<BlockType>('dirt');
  const [showMenu, setShowMenu] = useState(true);

  const respawn = useCallback(() => {
    if (!gameRef.current) return;
    const { playerPos, playerVelocity, spawnPoint } = gameRef.current;
    playerPos.copy(spawnPoint);
    playerVelocity.set(0, 0, 0);
    healthRef.current = MAX_HEALTH;
    staminaRef.current = MAX_STAMINA;
    setShowMenu(false);
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    // --- Three.js setup ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#87ceeb');
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    mount.appendChild(renderer.domElement);
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(50, 50, 50);
    scene.add(dirLight);
    // --- Game State ---
    const world = new World();
    const [spawnX, spawnY, spawnZ] = getSafeSpawn(world);
    const spawnPoint = new THREE.Vector3(spawnX, spawnY, spawnZ);
    const playerPos = new THREE.Vector3(spawnX, spawnY, spawnZ);
    const playerVelocity = new THREE.Vector3(0, 0, 0);
    const playerController = new PlayerController(playerPos, playerVelocity, world);
    camera.position.copy(playerPos);
    const keysPressed: { [key: string]: boolean } = {};
    const chunkMeshes = new Map<string, THREE.Mesh[]>();
    gameRef.current = {
      scene, camera, renderer, world, playerPos, playerVelocity,
      playerController, keysPressed, chunkMeshes, spawnPoint, clock: new THREE.Clock()
    };
    // --- Event Listeners ---
    const onMouseMove = (event: MouseEvent) => {
      if (document.pointerLockElement === renderer.domElement) {
        camera.rotation.y -= event.movementX * 0.002;
        camera.rotation.x -= event.movementY * 0.002;
        camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x));
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => { keysPressed[e.code] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keysPressed[e.code] = false; };
    const onMouseClick = (e: MouseEvent) => {
      if (showMenu || document.pointerLockElement !== renderer.domElement) return;
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
      const direction = raycaster.ray.direction;
      const origin = camera.position.clone();
      for (let dist = 0; dist < 5; dist += 0.1) {
        const point = origin.clone().addScaledVector(direction, dist);
        const x = Math.floor(point.x);
        const y = Math.floor(point.y);
        const z = Math.floor(point.z);
        const blockId = world.getBlock(x, y, z);
        if (blockId !== 5) {
          if (e.button === 0) { // Left click: break block
            world.setBlock(x, y, z, 5, scene, chunkMeshes);
          } else if (e.button === 2) { // Right click: place block
            const normal = new THREE.Vector3(
              Math.round(direction.x),
              Math.round(direction.y),
              Math.round(direction.z)
            );
            const placeX = x - normal.x;
            const placeY = y - normal.y;
            const placeZ = z - normal.z;
            if (world.getBlock(placeX, placeY, placeZ) === 5 &&
                placeY < WORLD_HEIGHT - 1 &&
                Math.abs(placeX - playerPos.x) > 0.3 &&
                Math.abs(placeZ - playerPos.z) > 0.3 &&
                placeY < playerPos.y - PLAYER_HEIGHT + 0.1) {
              world.setBlock(placeX, placeY, placeZ, blockIds[selectedBlock], scene, chunkMeshes);
            }
          }
          break;
        }
      }
    };
    const onCanvasClick = () => {
      if (!showMenu) renderer.domElement.requestPointerLock();
    };
    document.addEventListener('mousemove', onMouseMove);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    renderer.domElement.addEventListener('click', onCanvasClick);
    renderer.domElement.addEventListener('mousedown', onMouseClick);
    // --- Chunk Management ---
    const updateChunks = () => {
      const { playerPos, world, chunkMeshes, scene } = gameRef.current;
      const cx = Math.floor(playerPos.x / CHUNK_SIZE);
      const cz = Math.floor(playerPos.z / CHUNK_SIZE);
      for (let dx = -RENDER_DISTANCE; dx <= RENDER_DISTANCE; dx++) {
        for (let dz = -RENDER_DISTANCE; dz <= RENDER_DISTANCE; dz++) {
          const key = `${cx + dx},${cz + dz}`;
          if (!chunkMeshes.has(key)) {
            world.getChunk(cx + dx, cz + dz, (chunkData: number[][][]) => {
              const meshes = createChunkMesh(chunkData, cx + dx, cz + dz);
              chunkMeshes.set(key, meshes);
              meshes.forEach(mesh => scene.add(mesh));
            });
          }
        }
      }
      for (const [key, meshes] of chunkMeshes.entries()) {
        const [x, z] = key.split(',').map(Number);
        if (Math.abs(x - cx) > RENDER_DISTANCE + 1 || Math.abs(z - cz) > RENDER_DISTANCE + 1) {
          meshes.forEach((mesh: THREE.Mesh) => {
            scene.remove(mesh);
            mesh.geometry.dispose();
            (mesh.material as THREE.Material).dispose();
          });
          chunkMeshes.delete(key);
        }
      }
    };
    // --- Main Game Loop ---
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      if (showMenu || !gameRef.current) return;
      const { clock, playerController, camera, renderer } = gameRef.current;
      const delta = Math.min(clock.getDelta(), 0.1);
      playerController.update(keysPressed, camera, delta, staminaRef);
      camera.position.copy(playerController.pos);
      updateChunks();
      renderer.render(scene, camera);
    };
    animate();
    // --- Cleanup ---
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('click', onCanvasClick);
      renderer.domElement.removeEventListener('mousedown', onMouseClick);
      mount.removeChild(renderer.domElement);
      world.terminate();
    };
  }, [showMenu, selectedBlock]);

  useEffect(() => {
    const handleResize = () => {
      if (gameRef.current) {
        const { renderer, camera } = gameRef.current;
        const width = window.innerWidth;
        const height = window.innerHeight;
        renderer.setSize(width, height);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const enterFullscreen = () => {
    if (mountRef.current && mountRef.current.requestFullscreen) {
      mountRef.current.requestFullscreen();
    }
  };

  const endGameSession = () => {
    const sessionDuration = Date.now() - gameSession.startTime;
    const minutesPlayed = Math.round(sessionDuration / 60000);
    
    // Calculate rewards based on building activity
    const structuresBuilt = Math.floor(blocksPlaced / 20); // Every 20 blocks = 1 structure
    const starsEarned = Math.floor(blocksPlaced / 10); // Every 10 blocks = 1 star
    const xpEarned = blocksPlaced * 2 + structuresBuilt * 10;
    
    // Use standardized analytics function
    recordGameSession('happy-builder', {
      score: blocksPlaced,
      level: Math.floor(blocksPlaced / 50) + 1,
      starsEarned: starsEarned,
      xpEarned: xpEarned,
      playTime: minutesPlayed,
      success: blocksPlaced > 0
    });
  };

  return (
    <div ref={mountRef} style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <div style={{
        position: 'absolute', top: '50%', left: '50%', width: 10, height: 10, background: '#fff', border: '2px solid #000', transform: 'translate(-50%, -50%)', zIndex: 5
      }} />
      {showMenu && (
        <div style={{
          position: 'absolute', left: 0, top: 0, width: '100vw', height: '100vh', background: '#222c', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ background: '#fff', padding: 32, borderRadius: 16, boxShadow: '0 4px 32px #0004', minWidth: 320, textAlign: 'center' }}>
            <h1 style={{ fontSize: 32, marginBottom: 16 }}>Happy Builder</h1>
            <button onClick={respawn} style={{ fontSize: 20, padding: '12px 32px', borderRadius: 8, background: '#4caf50', color: '#fff', border: 'none', marginBottom: 16, cursor: 'pointer' }}>Start/Respawn</button>
            <br />
            <button onClick={() => setShowMenu(false)} style={{ fontSize: 18, padding: '8px 24px', borderRadius: 8, background: '#2196f3', color: '#fff', border: 'none', cursor: 'pointer' }}>Resume</button>
          </div>
        </div>
      )}
      <div style={{
        position: 'absolute', left: 20, top: 20, width: 200, height: 20, background: '#3336', borderRadius: 8, border: '1px solid #222',
      }}>
        <div style={{
          width: `${healthRef.current / MAX_HEALTH * 100}%`, height: '100%', background: '#e53935', borderRadius: 8, transition: 'width 0.2s',
        }} />
        <span style={{ position: 'absolute', left: 8, top: 0, color: '#fff', fontWeight: 'bold', fontSize: 14 }}>Health</span>
      </div>
      <div style={{
        position: 'absolute', left: 20, top: 48, width: 200, height: 20, background: '#3336', borderRadius: 8, border: '1px solid #222',
      }}>
        <div style={{
          width: `${staminaRef.current / MAX_STAMINA * 100}%`, height: '100%', background: '#fbc02d', borderRadius: 8, transition: 'width 0.2s',
        }} />
        <span style={{ position: 'absolute', left: 8, top: 0, color: '#fff', fontWeight: 'bold', fontSize: 14 }}>Stamina</span>
      </div>
      <div style={{
        position: 'absolute', left: '50%', bottom: 32, transform: 'translateX(-50%)', display: 'flex', gap: 8, background: '#222a', borderRadius: 12, padding: 8, zIndex: 5,
      }}>
        {(['grass', 'dirt', 'stone', 'wood', 'leaves'] as BlockType[]).map((block, idx) => (
          <div
            key={block}
            onClick={() => setSelectedBlock(block)}
            style={{
              width: 36, height: 36, borderRadius: 6, border: selectedBlock === block ? '3px solid #fff' : '2px solid #888', background: blockColors[block], display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}
            title={block}
          >
            <span style={{ color: '#fff', fontWeight: 'bold', textShadow: '0 1px 2px #0008' }}>{idx + 1}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HappyBuilderGame; 