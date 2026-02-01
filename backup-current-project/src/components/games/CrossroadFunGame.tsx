import React, { useEffect, useRef, useState } from 'react';
// @ts-ignore
import * as THREE from 'three';
import { useUser } from '../../contexts/UserContext';
import { Star, Trophy } from 'lucide-react';

const minTileIndex = -8;
const maxTileIndex = 8;
const tilesPerRow = maxTileIndex - minTileIndex + 1;
const tileSize = 42;

function Camera() {
  const size = 300;
  const viewRatio = window.innerWidth / window.innerHeight;
  const width = viewRatio < 1 ? size : size * viewRatio;
  const height = viewRatio < 1 ? size / viewRatio : size;

  const camera = new THREE.OrthographicCamera(
    width / -2,
    width / 2,
    height / 2,
    height / -2,
    100,
    900
  );
  camera.up.set(0, 0, 1);
  camera.position.set(300, -300, 300);
  camera.lookAt(0, 0, 0);
  return camera;
}

function Texture(width: number, height: number, rects: any[]) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d')!;
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.fillStyle = 'rgba(0,0,0,0.6)';
  rects.forEach((rect) => {
    context.fillRect(rect.x, rect.y, rect.w, rect.h);
  });
  return new THREE.CanvasTexture(canvas);
}

const carFrontTexture = Texture(40, 80, [{ x: 0, y: 10, w: 30, h: 60 }]);
const carBackTexture = Texture(40, 80, [{ x: 10, y: 10, w: 30, h: 60 }]);
const carRightSideTexture = Texture(110, 40, [
  { x: 10, y: 0, w: 50, h: 30 },
  { x: 70, y: 0, w: 30, h: 30 },
]);
const carLeftSideTexture = Texture(110, 40, [
  { x: 10, y: 10, w: 50, h: 30 },
  { x: 70, y: 10, w: 30, h: 30 },
]);

const truckFrontTexture = Texture(30, 30, [
  { x: 5, y: 0, w: 10, h: 30 },
]);
const truckRightSideTexture = Texture(25, 30, [
  { x: 15, y: 5, w: 10, h: 10 },
]);
const truckLeftSideTexture = Texture(25, 30, [
  { x: 15, y: 15, w: 10, h: 10 },
]);

function Car(initialTileIndex: number, direction: boolean, color: number) {
  const car = new THREE.Group();
  car.position.x = initialTileIndex * tileSize;
  if (!direction) car.rotation.z = Math.PI;

  const main = new THREE.Mesh(
    new THREE.BoxGeometry(60, 30, 15),
    new THREE.MeshLambertMaterial({ color, flatShading: true })
  );
  main.position.z = 12;
  main.castShadow = true;
  main.receiveShadow = true;
  car.add(main);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(33, 24, 12), [
    new THREE.MeshPhongMaterial({ color: 0xcccccc, flatShading: true, map: carBackTexture }),
    new THREE.MeshPhongMaterial({ color: 0xcccccc, flatShading: true, map: carFrontTexture }),
    new THREE.MeshPhongMaterial({ color: 0xcccccc, flatShading: true, map: carRightSideTexture }),
    new THREE.MeshPhongMaterial({ color: 0xcccccc, flatShading: true, map: carLeftSideTexture }),
    new THREE.MeshPhongMaterial({ color: 0xcccccc, flatShading: true }),
    new THREE.MeshPhongMaterial({ color: 0xcccccc, flatShading: true }),
  ]);
  cabin.position.x = -6;
  cabin.position.z = 25.5;
  cabin.castShadow = true;
  cabin.receiveShadow = true;
  car.add(cabin);

  const frontWheel = Wheel(18);
  car.add(frontWheel);
  const backWheel = Wheel(-18);
  car.add(backWheel);
  return car;
}

function DirectionalLight() {
  const dirLight = new THREE.DirectionalLight();
  dirLight.position.set(-100, -100, 200);
  dirLight.up.set(0, 0, 1);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  dirLight.shadow.camera.up.set(0, 0, 1);
  dirLight.shadow.camera.left = -400;
  dirLight.shadow.camera.right = 400;
  dirLight.shadow.camera.top = 400;
  dirLight.shadow.camera.bottom = -400;
  dirLight.shadow.camera.near = 50;
  dirLight.shadow.camera.far = 400;
  return dirLight;
}

function Grass(rowIndex: number) {
  const grass = new THREE.Group();
  grass.position.y = rowIndex * tileSize;
  const createSection = (color: number) =>
    new THREE.Mesh(
      new THREE.BoxGeometry(tilesPerRow * tileSize, tileSize, 3),
      new THREE.MeshLambertMaterial({ color })
    );
  const middle = createSection(0xbaf455);
  middle.receiveShadow = true;
  grass.add(middle);
  const left = createSection(0x99c846);
  left.position.x = -tilesPerRow * tileSize;
  grass.add(left);
  const right = createSection(0x99c846);
  right.position.x = tilesPerRow * tileSize;
  grass.add(right);
  return grass;
}

function Road(rowIndex: number) {
  const road = new THREE.Group();
  road.position.y = rowIndex * tileSize;
  const createSection = (color: number) =>
    new THREE.Mesh(
      new THREE.PlaneGeometry(tilesPerRow * tileSize, tileSize),
      new THREE.MeshLambertMaterial({ color })
    );
  const middle = createSection(0x454a59);
  middle.receiveShadow = true;
  road.add(middle);
  const left = createSection(0x393d49);
  left.position.x = -tilesPerRow * tileSize;
  road.add(left);
  const right = createSection(0x393d49);
  right.position.x = tilesPerRow * tileSize;
  road.add(right);
  return road;
}

function Tree(tileIndex: number, height: number) {
  const tree = new THREE.Group();
  tree.position.x = tileIndex * tileSize;
  const trunk = new THREE.Mesh(
    new THREE.BoxGeometry(15, 15, 20),
    new THREE.MeshLambertMaterial({ color: 0x4d2926, flatShading: true })
  );
  trunk.position.z = 10;
  tree.add(trunk);
  const crown = new THREE.Mesh(
    new THREE.BoxGeometry(30, 30, height),
    new THREE.MeshLambertMaterial({ color: 0x7aa21d, flatShading: true })
  );
  crown.position.z = height / 2 + 20;
  crown.castShadow = true;
  crown.receiveShadow = true;
  tree.add(crown);
  return tree;
}

function Truck(initialTileIndex: number, direction: boolean, color: number) {
  const truck = new THREE.Group();
  truck.position.x = initialTileIndex * tileSize;
  if (!direction) truck.rotation.z = Math.PI;
  const cargo = new THREE.Mesh(
    new THREE.BoxGeometry(70, 35, 35),
    new THREE.MeshLambertMaterial({ color: 0xb4c6fc, flatShading: true })
  );
  cargo.position.x = -15;
  cargo.position.z = 25;
  cargo.castShadow = true;
  cargo.receiveShadow = true;
  truck.add(cargo);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(30, 30, 30), [
    new THREE.MeshLambertMaterial({ color, flatShading: true, map: truckFrontTexture }),
    new THREE.MeshLambertMaterial({ color, flatShading: true }),
    new THREE.MeshLambertMaterial({ color, flatShading: true, map: truckLeftSideTexture }),
    new THREE.MeshLambertMaterial({ color, flatShading: true, map: truckRightSideTexture }),
    new THREE.MeshPhongMaterial({ color, flatShading: true }),
    new THREE.MeshPhongMaterial({ color, flatShading: true }),
  ]);
  cabin.position.x = 35;
  cabin.position.z = 20;
  cabin.castShadow = true;
  cabin.receiveShadow = true;
  truck.add(cabin);
  const frontWheel = Wheel(37);
  truck.add(frontWheel);
  const middleWheel = Wheel(5);
  truck.add(middleWheel);
  const backWheel = Wheel(-35);
  truck.add(backWheel);
  return truck;
}

function Wheel(x: number) {
  const wheel = new THREE.Mesh(
    new THREE.BoxGeometry(12, 33, 12),
    new THREE.MeshLambertMaterial({ color: 0x333333, flatShading: true })
  );
  wheel.position.x = x;
  wheel.position.z = 6;
  return wheel;
}

function Player() {
  const player = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(15, 15, 20),
    new THREE.MeshLambertMaterial({ color: 'white', flatShading: true })
  );
  body.position.z = 10;
  body.castShadow = true;
  body.receiveShadow = true;
  player.add(body);
  const cap = new THREE.Mesh(
    new THREE.BoxGeometry(2, 4, 2),
    new THREE.MeshLambertMaterial({ color: 0xf0619a, flatShading: true })
  );
  cap.position.z = 21;
  cap.castShadow = true;
  cap.receiveShadow = true;
  player.add(cap);
  const playerContainer = new THREE.Group();
  playerContainer.add(player);
  return playerContainer;
}

const CrossroadFunGame: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { user, addXP, addStars, updateGameProgress, recordGameSession } = useUser();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [hasPlayedGameOverSound, setHasPlayedGameOverSound] = useState(false);
  const [hasPlayedHighScoreSound, setHasPlayedHighScoreSound] = useState(false);
  
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const playerRef = useRef<THREE.Group | null>(null);
  const mapRef = useRef<THREE.Group | null>(null);
  const metadataRef = useRef<any[]>([]);
  const positionRef = useRef({ currentRow: 0, currentTile: 0 });
  const movesQueueRef = useRef<string[]>([]);
  const moveClockRef = useRef<THREE.Clock | null>(null);
  const clockRef = useRef<THREE.Clock | null>(null);
  const animationIdRef = useRef<number | null>(null);
  
  // Audio refs
  const gameOverSoundRef = useRef<HTMLAudioElement | null>(null);
  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null);
  const jumpSoundRef = useRef<HTMLAudioElement | null>(null);
  const highScoreSoundRef = useRef<HTMLAudioElement | null>(null);

  // Load high score from localStorage on component mount
  useEffect(() => {
    const savedHighScore = localStorage.getItem('crossroad-fun-highscore');
    if (savedHighScore) {
      setHighScore(parseInt(savedHighScore, 10));
    }
  }, []);

  // Save high score when score changes
  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('crossroad-fun-highscore', score.toString());
    }
  }, [score, highScore]);

  // Initialize audio
  useEffect(() => {
    // Create game over sound
    gameOverSoundRef.current = new Audio('/assets/music/game-over-38511.mp3');
    gameOverSoundRef.current.volume = 0.35; // 0.5 - 30%
    gameOverSoundRef.current.loop = false;
    
    // Create background music
    backgroundMusicRef.current = new Audio('/assets/music/And Just Like That.mp3');
    backgroundMusicRef.current.volume = 0.21; // 0.3 - 30%
    backgroundMusicRef.current.loop = true;
    
    // Create jump sound
    jumpSoundRef.current = new Audio('/assets/music/funnyjump.mp3');
    jumpSoundRef.current.volume = 0.48; // 0.4 + 20%
    
    // Create high score sound
    highScoreSoundRef.current = new Audio('/assets/music/cute-character-wee-3-188163.mp3');
    highScoreSoundRef.current.volume = 0.7;
    
    // Start background music
    backgroundMusicRef.current.play().catch(() => {
      // Ignore autoplay restrictions
    });

    return () => {
      if (gameOverSoundRef.current) {
        gameOverSoundRef.current.pause();
        gameOverSoundRef.current = null;
      }
      if (backgroundMusicRef.current) {
        backgroundMusicRef.current.pause();
        backgroundMusicRef.current = null;
      }
      if (jumpSoundRef.current) {
        jumpSoundRef.current.pause();
        jumpSoundRef.current = null;
      }
      if (highScoreSoundRef.current) {
        highScoreSoundRef.current.pause();
        highScoreSoundRef.current = null;
      }
    };
  }, []);

  // Mute/unmute all sounds
  useEffect(() => {
    if (gameOverSoundRef.current) gameOverSoundRef.current.muted = false; // Changed to false as per new_code
    if (backgroundMusicRef.current) backgroundMusicRef.current.muted = false; // Changed to false as per new_code
    if (jumpSoundRef.current) jumpSoundRef.current.muted = false; // Changed to false as per new_code
    if (highScoreSoundRef.current) highScoreSoundRef.current.muted = false; // Changed to false as per new_code
  }, []); // Removed isMuted from dependency array

  // Play high score sound when a new high score is achieved
  useEffect(() => {
    if (gameOver && finalScore >= highScore && finalScore > 0) {
      if (highScoreSoundRef.current) {
        highScoreSoundRef.current.currentTime = 0;
        highScoreSoundRef.current.play().catch(() => {});
      }
    }
  }, [gameOver, finalScore, highScore]);

  // Game state functions
  const randomElement = (array: any[]) => {
    return array[Math.floor(Math.random() * array.length)];
  };

  const generateForesMetadata = () => {
    const occupiedTiles = new Set();
    const trees = Array.from({ length: 4 }, () => {
      let tileIndex;
      do {
        tileIndex = THREE.MathUtils.randInt(minTileIndex, maxTileIndex);
      } while (occupiedTiles.has(tileIndex));
      occupiedTiles.add(tileIndex);
      const height = randomElement([20, 45, 60]);
      return { tileIndex, height };
    });
    return { type: "forest", trees };
  };

  const generateCarLaneMetadata = () => {
    const direction = randomElement([true, false]);
    const speed = randomElement([125, 156, 188]);
    const occupiedTiles = new Set();
    const vehicles = Array.from({ length: 3 }, () => {
      let initialTileIndex;
      do {
        initialTileIndex = THREE.MathUtils.randInt(minTileIndex, maxTileIndex);
      } while (occupiedTiles.has(initialTileIndex));
      occupiedTiles.add(initialTileIndex - 1);
      occupiedTiles.add(initialTileIndex);
      occupiedTiles.add(initialTileIndex + 1);
      const color = randomElement([0xa52523, 0xbdb638, 0x78b14b]);
      return { initialTileIndex, color };
    });
    return { type: "car", direction, speed, vehicles };
  };

  const generateTruckLaneMetadata = () => {
    const direction = randomElement([true, false]);
    const speed = randomElement([125, 156, 188]);
    const occupiedTiles = new Set();
    const vehicles = Array.from({ length: 2 }, () => {
      let initialTileIndex;
      do {
        initialTileIndex = THREE.MathUtils.randInt(minTileIndex, maxTileIndex);
      } while (occupiedTiles.has(initialTileIndex));
      occupiedTiles.add(initialTileIndex - 2);
      occupiedTiles.add(initialTileIndex - 1);
      occupiedTiles.add(initialTileIndex);
      occupiedTiles.add(initialTileIndex + 1);
      occupiedTiles.add(initialTileIndex + 2);
      const color = randomElement([0xa52523, 0xbdb638, 0x78b14b]);
      return { initialTileIndex, color };
    });
    return { type: "truck", direction, speed, vehicles };
  };

  const generateRow = () => {
    const type = randomElement(["car", "truck", "forest"]);
    if (type === "car") return generateCarLaneMetadata();
    if (type === "truck") return generateTruckLaneMetadata();
    return generateForesMetadata();
  };

  const generateRows = (amount: number) => {
    const rows = [];
    for (let i = 0; i < amount; i++) {
      const rowData = generateRow();
      rows.push(rowData);
    }
    return rows;
  };

  const addRows = () => {
    const newMetadata = generateRows(20);
    const startIndex = metadataRef.current.length;
    metadataRef.current.push(...newMetadata);

    newMetadata.forEach((rowData, index) => {
      const rowIndex = startIndex + index + 1;

      if (rowData.type === "forest") {
        const row = Grass(rowIndex);
        rowData.trees.forEach(({ tileIndex, height }: any) => {
          const three = Tree(tileIndex, height);
          row.add(three);
        });
        mapRef.current?.add(row);
      }

      if (rowData.type === "car") {
        const row = Road(rowIndex);
        rowData.vehicles.forEach((vehicle: any) => {
          const car = Car(vehicle.initialTileIndex, rowData.direction, vehicle.color);
          vehicle.ref = car;
          row.add(car);
        });
        mapRef.current?.add(row);
      }

      if (rowData.type === "truck") {
        const row = Road(rowIndex);
        rowData.vehicles.forEach((vehicle: any) => {
          const truck = Truck(vehicle.initialTileIndex, rowData.direction, vehicle.color);
          vehicle.ref = truck;
          row.add(truck);
        });
        mapRef.current?.add(row);
      }
    });
  };

  const initializeMap = () => {
    metadataRef.current.length = 0;
    if (mapRef.current) {
      mapRef.current.remove(...mapRef.current.children);
    }

    for (let rowIndex = 0; rowIndex > -10; rowIndex--) {
      const grass = Grass(rowIndex);
      mapRef.current?.add(grass);
    }
    addRows();
  };

  const initializePlayer = () => {
    if (playerRef.current) {
      playerRef.current.position.x = 0;
      playerRef.current.position.y = 0;
      if (playerRef.current.children[0]) {
        playerRef.current.children[0].position.z = 0;
      }
    }
    positionRef.current.currentRow = 0;
    positionRef.current.currentTile = 0;
    movesQueueRef.current.length = 0;
  };

  const calculateFinalPosition = (currentPosition: any, moves: string[]) => {
    return moves.reduce((position, direction) => {
      if (direction === "forward")
        return { rowIndex: position.rowIndex + 1, tileIndex: position.tileIndex };
      if (direction === "backward")
        return { rowIndex: position.rowIndex - 1, tileIndex: position.tileIndex };
      if (direction === "left")
        return { rowIndex: position.rowIndex, tileIndex: position.tileIndex - 1 };
      if (direction === "right")
        return { rowIndex: position.rowIndex, tileIndex: position.tileIndex + 1 };
      return position;
    }, currentPosition);
  };

  const endsUpInValidPosition = (currentPosition: any, moves: string[]) => {
    const finalPosition = calculateFinalPosition(currentPosition, moves);

    if (
      finalPosition.rowIndex === -1 ||
      finalPosition.tileIndex === minTileIndex - 1 ||
      finalPosition.tileIndex === maxTileIndex + 1
    ) {
      return false;
    }

    const finalRow = metadataRef.current[finalPosition.rowIndex - 1];
    if (
      finalRow &&
      finalRow.type === "forest" &&
      finalRow.trees.some((tree: any) => tree.tileIndex === finalPosition.tileIndex)
    ) {
      return false;
    }

    return true;
  };

  const queueMove = (direction: string) => {
    const isValidMove = endsUpInValidPosition(
      {
        rowIndex: positionRef.current.currentRow,
        tileIndex: positionRef.current.currentTile,
      },
      [...movesQueueRef.current, direction]
    );

    if (!isValidMove) return;
    movesQueueRef.current.push(direction);
  };

  const stepCompleted = () => {
    const direction = movesQueueRef.current.shift();
    if (!direction) return;

    if (direction === "forward") positionRef.current.currentRow += 1;
    if (direction === "backward") positionRef.current.currentRow -= 1;
    if (direction === "left") positionRef.current.currentTile -= 1;
    if (direction === "right") positionRef.current.currentTile += 1;

    if (positionRef.current.currentRow > metadataRef.current.length - 10) {
      addRows();
    }

    setScore(positionRef.current.currentRow);
  };

  const animatePlayer = () => {
    if (!movesQueueRef.current.length) return;

    if (!moveClockRef.current?.running) moveClockRef.current?.start();

    const stepTime = 0.2;
    const progress = Math.min(1, (moveClockRef.current?.getElapsedTime() || 0) / stepTime);

    setPosition(progress);
    setRotation(progress);

    if (progress >= 1) {
      stepCompleted();
      moveClockRef.current?.stop();
    }
  };

  const setPosition = (progress: number) => {
    if (!playerRef.current) return;

    const startX = positionRef.current.currentTile * tileSize;
    const startY = positionRef.current.currentRow * tileSize;
    let endX = startX;
    let endY = startY;

    if (movesQueueRef.current[0] === "left") endX -= tileSize;
    if (movesQueueRef.current[0] === "right") endX += tileSize;
    if (movesQueueRef.current[0] === "forward") endY += tileSize;
    if (movesQueueRef.current[0] === "backward") endY -= tileSize;

    playerRef.current.position.x = THREE.MathUtils.lerp(startX, endX, progress);
    playerRef.current.position.y = THREE.MathUtils.lerp(startY, endY, progress);
    if (playerRef.current.children[0]) {
      playerRef.current.children[0].position.z = Math.sin(progress * Math.PI) * 8;
    }
  };

  const setRotation = (progress: number) => {
    if (!playerRef.current?.children[0]) return;

    let endRotation = 0;
    if (movesQueueRef.current[0] === "forward") endRotation = 0;
    if (movesQueueRef.current[0] === "left") endRotation = Math.PI / 2;
    if (movesQueueRef.current[0] === "right") endRotation = -Math.PI / 2;
    if (movesQueueRef.current[0] === "backward") endRotation = Math.PI;

    playerRef.current.children[0].rotation.z = THREE.MathUtils.lerp(
      playerRef.current.children[0].rotation.z,
      endRotation,
      progress
    );
  };

  const animateVehicles = () => {
    const delta = clockRef.current?.getDelta() || 0;

    metadataRef.current.forEach((rowData) => {
      if (rowData.type === "car" || rowData.type === "truck") {
        const beginningOfRow = (minTileIndex - 2) * tileSize;
        const endOfRow = (maxTileIndex + 2) * tileSize;

        rowData.vehicles.forEach(({ ref }: any) => {
          if (!ref) return;

          if (rowData.direction) {
            ref.position.x =
              ref.position.x > endOfRow
                ? beginningOfRow
                : ref.position.x + rowData.speed * delta;
          } else {
            ref.position.x =
              ref.position.x < beginningOfRow
                ? endOfRow
                : ref.position.x - rowData.speed * delta;
          }
        });
      }
    });
  };

  const hitTest = () => {
    const row = metadataRef.current[positionRef.current.currentRow - 1];
    if (!row) return;

    if (row.type === "car" || row.type === "truck") {
      const playerBoundingBox = new THREE.Box3();
      playerBoundingBox.setFromObject(playerRef.current!);

      row.vehicles.forEach(({ ref }: any) => {
        if (!ref) return;

        const vehicleBoundingBox = new THREE.Box3();
        vehicleBoundingBox.setFromObject(ref);

        if (playerBoundingBox.intersectsBox(vehicleBoundingBox) && !hasPlayedGameOverSound) {
          // Play game over sound immediately and only once
          if (gameOverSoundRef.current) {
            gameOverSoundRef.current.currentTime = 0;
            gameOverSoundRef.current.loop = false;
            gameOverSoundRef.current.play().catch(() => {});
          }

          // Play high score sound if new high score and not already played
          if (score >= highScore && score > 0 && highScoreSoundRef.current && !hasPlayedHighScoreSound) {
            highScoreSoundRef.current.pause(); // Stop any previous play
            highScoreSoundRef.current.currentTime = 0;
            highScoreSoundRef.current.play().catch(() => {});
            setHasPlayedHighScoreSound(true);
          }

          setHasPlayedGameOverSound(true);
          setFinalScore(score);
          setGameOver(true);
          // Stop background music
          if (backgroundMusicRef.current) {
            backgroundMusicRef.current.pause();
          }
        }
      });
    }
  };

  const initializeGame = () => {
    initializePlayer();
    initializeMap();
    setScore(0);
    setGameOver(false);
    setFinalScore(0);
    setHasPlayedGameOverSound(false);
    setHasPlayedHighScoreSound(false);
    
    // Restart background music
    if (backgroundMusicRef.current) {
      backgroundMusicRef.current.currentTime = 0;
      backgroundMusicRef.current.play().catch(() => {});
    }
  };

  const playJumpSound = () => {
    if (jumpSoundRef.current) {
      jumpSoundRef.current.currentTime = 0;
      jumpSoundRef.current.play().catch(() => {});
    }
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (gameOver) return;
    
    // Arrow keys
    if (event.key === "ArrowUp") {
      event.preventDefault();
      playJumpSound();
      queueMove("forward");
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      playJumpSound();
      queueMove("backward");
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      playJumpSound();
      queueMove("left");
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      playJumpSound();
      queueMove("right");
    }
    // WASD keys
    else if (event.key === "w" || event.key === "W") {
      event.preventDefault();
      playJumpSound();
      queueMove("forward");
    } else if (event.key === "s" || event.key === "S") {
      event.preventDefault();
      playJumpSound();
      queueMove("backward");
    } else if (event.key === "a" || event.key === "A") {
      event.preventDefault();
      playJumpSound();
      queueMove("left");
    } else if (event.key === "d" || event.key === "D") {
      event.preventDefault();
      playJumpSound();
      queueMove("right");
    }
  };

  const handleButtonClick = (direction: string) => {
    if (gameOver) return;
    queueMove(direction);
  };

  const animate = () => {
    animateVehicles();
    animatePlayer();
    hitTest();

    if (rendererRef.current && cameraRef.current && sceneRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }
    animationIdRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (!canvasRef.current) return;

    // Initialize Three.js
    sceneRef.current = new THREE.Scene();
    rendererRef.current = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      canvas: canvasRef.current,
    });
    rendererRef.current.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // Get the container dimensions
    const container = canvasRef.current.parentElement;
    const containerWidth = container?.clientWidth || window.innerWidth;
    const containerHeight = container?.clientHeight || window.innerHeight;
    
    rendererRef.current.setSize(containerWidth, containerHeight);
    rendererRef.current.shadowMap.enabled = true;

    // Create game objects
    playerRef.current = Player();
    mapRef.current = new THREE.Group();
    moveClockRef.current = new THREE.Clock(false);
    clockRef.current = new THREE.Clock();

    // Add to scene
    sceneRef.current.add(playerRef.current);
    sceneRef.current.add(mapRef.current);

    // Add lighting
    const ambientLight = new THREE.AmbientLight();
    sceneRef.current.add(ambientLight);

    const dirLight = DirectionalLight();
    dirLight.target = playerRef.current;
    playerRef.current.add(dirLight);

    cameraRef.current = Camera();
    playerRef.current.add(cameraRef.current);

    // Initialize game
    initializeGame();

    // Start animation loop
    animate();

    // Add event listeners
    window.addEventListener('keydown', handleKeyDown);

    // Handle resize
    const handleResize = () => {
      if (rendererRef.current && container) {
        const newWidth = container.clientWidth;
        const newHeight = container.clientHeight;
        rendererRef.current.setSize(newWidth, newHeight);
      }
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, []);

  const endGame = () => {
    setGameOver(true);
    
    // Use standardized analytics function
    recordGameSession('crossroad-fun', {
      score: score,
      level: positionRef.current.currentRow, // Assuming level is current row
      starsEarned: Math.floor(score / 100),
      xpEarned: score + (positionRef.current.currentRow * 10), // Simple XP calculation
      success: score > 0
    });
  };

  return (
    <div className="relative w-full h-full min-h-[500px] bg-gradient-to-br from-violet-900 to-blue-900 flex flex-col items-center justify-center overflow-hidden">
      {/* Crosswalk Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20"
        style={{
          backgroundImage: 'url(/assets/images/crosswalk.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          pointerEvents: 'none'
        }}
      />
      
      <canvas 
        ref={canvasRef} 
        className="game w-full h-full relative z-10" 
        style={{ 
          minHeight: 400, 
          minWidth: 400, 
          background: 'transparent',
          display: 'block'
        }} 
      />
      
      {/* Score and High Score */}
      <div className="absolute top-2 left-2 text-white font-mono z-10">
        <div className="text-xl font-bold">Score: {score}</div>
        <div className="text-sm text-yellow-300">High Score: {highScore}</div>
      </div>
    </div>
  );
};

export default CrossroadFunGame; 