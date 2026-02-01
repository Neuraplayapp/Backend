import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import Box2DFactory from 'box2d-wasm';

// --- Types and Interfaces ---
interface MountainClimberProps {
  onClose: () => void;
}

interface GameState {
  level: number;
  maxHeight: number;
  goalHeight: number;
  levelComplete: boolean;
  gameWon: boolean;
  eventWarning: string;
}

interface MetaState {
  currency: number;
  talents: {
    increasedGrip: boolean;
    denserCores: boolean;
    lavaShield: boolean;
  };
}

interface Ball {
  id: string;
  body: any; // Box2D Body
  tier: number;
  radius: number;
  color: string;
}

// --- Constants ---
const SCALE = 30; // 30 pixels = 1 meter in Box2D

const BALL_SPECS = [
  { tier: 0, radius: 0.25, color: '#ff5555', density: 1.0 }, // 7.5px radius
  { tier: 1, radius: 0.35, color: '#50fa7b', density: 1.1 }, // 10.5px
  { tier: 2, radius: 0.5, color: '#bd93f9', density: 1.2 }, // 15px
  { tier: 3, radius: 0.7, color: '#f1fa8c', density: 1.3 }, // 21px
  { tier: 4, radius: 0.9, color: '#8be9fd', density: 1.4 }, // 27px
  { tier: 5, radius: 1.2, color: '#ff6e6e', density: 1.5 }, // 36px
];

const LEVELS = [
  { level: 1, goalHeight: 350, mountainSteepness: 0.5 },
  { level: 2, goalHeight: 450, mountainSteepness: 0.7 },
  { level: 3, goalHeight: 550, mountainSteepness: 0.9 },
];

const TALENT_COSTS = {
  increasedGrip: 150,
  denserCores: 200,
  lavaShield: 300,
};

// --- Main Component ---
let Box2D: any;

const MountainClimber: React.FC<MountainClimberProps> = ({ onClose }) => {
  const { user, addXP, addStars, updateGameProgress, recordGameSession } = useUser();
  
  // --- Refs ---
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const box2dRef = useRef<any>(null); // To hold the Box2D WASM module
  const worldRef = useRef<any>(null); // To hold the Box2D world instance
  const ballsRef = useRef<Map<string, Ball>>(new Map());
  const toDestroyRef = useRef<any[]>([]);
  const lastMouseXRef = useRef<number | null>(null);
  
  // --- State ---
  const [view, setView] = useState<'main-menu' | 'game'>('main-menu');
  const [gameError, setGameError] = useState<string | null>(null);
  const [box2dLoaded, setBox2dLoaded] = useState(false);
  const [box2dError, setBox2dError] = useState<string | null>(null);
  
  const [gameState, setGameState] = useState<GameState>({
    level: 1,
    maxHeight: 0,
    goalHeight: LEVELS[0].goalHeight,
    levelComplete: false,
    gameWon: false,
    eventWarning: '',
  });

  const [metaState, setMetaState] = useState<MetaState>({
    currency: 0,
    talents: {
      increasedGrip: false,
      denserCores: false,
      lavaShield: false,
    },
  });

  const [previewBall, setPreviewBall] = useState<{ x: number; radius: number, color: string } | null>(null);
  const nextBallTier = useRef(0);
  const canDrop = useRef(true);

  // --- Utility & Game Logic Callbacks ---
  const saveProgress = useCallback(() => {
    localStorage.setItem('mountainClimberSave', JSON.stringify(metaState));
  }, [metaState]);

  useEffect(() => {
    const savedData = localStorage.getItem('mountainClimberSave');
    if (savedData) {
      try {
        setMetaState(JSON.parse(savedData));
      } catch (e) {
        console.error("Failed to parse saved data", e);
      }
    }
  }, []);

  // Replace Box2D loading logic with async import and explicit locateFile
  const initBox2D = useCallback(async () => {
    if (box2dLoaded) return;
    try {
      if (!Box2D) {
        Box2D = await Box2DFactory({
          locateFile: (file: string) => `/${file}`
        });
      }
      box2dRef.current = Box2D;
      setBox2dLoaded(true);
      setBox2dError(null);
    } catch (err) {
      setBox2dError('Failed to load Box2D WASM.');
      setGameError('Failed to load Box2D WASM.');
    }
  }, [box2dLoaded]);

  useEffect(() => {
    initBox2D();
  }, [initBox2D]);
  
  // --- Game Setup ---
  useEffect(() => {
    if (view !== 'game' || !box2dLoaded || !gameContainerRef.current) return;

    const container = gameContainerRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    container.innerHTML = '';
    container.appendChild(canvas);
    canvasRef.current = canvas;
    const ctx = canvas.getContext('2d')!;

    const { b2World, b2Vec2, b2BodyDef, b2PolygonShape, b2CircleShape } = box2dRef.current;

    // Create World
    const gravity = new b2Vec2(0, 10);
    const world = new b2World(gravity);
    worldRef.current = world;
    
    const cw = canvas.width;
    const ch = canvas.height;
    
    // Create Mountain/Walls
    const createStaticWall = (x: number, y: number, width: number, height: number) => {
      const bd = new b2BodyDef();
      bd.set_type(box2dRef.current.b2_staticBody);
      bd.set_position(new b2Vec2(x / SCALE, y / SCALE));
      const body = world.CreateBody(bd);
      const shape = new b2PolygonShape();
      shape.SetAsBox(width / 2 / SCALE, height / 2 / SCALE);
      body.CreateFixture(shape, 0.0);
    };

    const levelConf = LEVELS[gameState.level - 1];
    
    // Floor
    createStaticWall(cw / 2, ch, cw, 20);
    // Left Wall
    createStaticWall(0, ch / 2, 20, ch);
    // Mountain on the right
    const mountainBodyDef = new b2BodyDef();
    const mountainBody = world.CreateBody(mountainBodyDef);
    const mountainShape = new b2PolygonShape();
    const vertices = [
        new b2Vec2(cw / SCALE, ch / SCALE),
        new b2Vec2(cw / SCALE, 0),
        new b2Vec2((cw - (ch * levelConf.mountainSteepness)) / SCALE, ch / SCALE),
    ];
    mountainShape.Set(vertices, vertices.length);
    const fixture = mountainBody.CreateFixture(mountainShape, 0.0);
    const friction = metaState.talents.increasedGrip ? 0.9 : 0.4;
    fixture.SetFriction(friction);

    // --- Remove b2ContactListener and use manual collision detection ---
    // --- Collision/Merge Logic ---
    function checkCollisions() {
      const balls = Array.from(ballsRef.current.values());
      for (let i = 0; i < balls.length; i++) {
        for (let j = i + 1; j < balls.length; j++) {
          const ballA = balls[i];
          const ballB = balls[j];
          if (ballA.tier === ballB.tier && ballA.tier < BALL_SPECS.length - 1) {
            const posA = ballA.body.GetPosition();
            const posB = ballB.body.GetPosition();
            const dx = posA.get_x() - posB.get_x();
            const dy = posA.get_y() - posB.get_y();
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < ballA.radius + ballB.radius) {
              mergeBalls(ballA, ballB);
              return; // Only merge one pair per frame to avoid double merges
            }
          }
        }
      }
    }
    
    const resetGameState = () => {
        ballsRef.current.forEach(ball => toDestroyRef.current.push(ball.body));
        ballsRef.current.clear();
        setGameState(prev => ({
            ...prev,
            maxHeight: 0,
            goalHeight: LEVELS[prev.level - 1]?.goalHeight ?? 0,
            levelComplete: false,
            eventWarning: '',
        }));
        spawnNextBall();
    };

    resetGameState();

    // Game loop
    const gameLoop = () => {
        // Destroy queued bodies
        toDestroyRef.current.forEach(body => {
            if (worldRef.current.IsLocked && worldRef.current.IsLocked()) return; // Failsafe
            worldRef.current.DestroyBody(body);
        });
        toDestroyRef.current = [];

        // Step physics world
        world.Step(1 / 60, 8, 3);

        // --- Call manual collision detection ---
        checkCollisions();
        
        let currentMaxHeight = 0;
        for (const ball of ballsRef.current.values()) {
            const pos = ball.body.GetPosition();
            const y = ch - (pos.get_y() * SCALE - ball.radius * SCALE);
            if (y > currentMaxHeight) {
                currentMaxHeight = y;
            }
        }
        
        setGameState(prev => {
            if (currentMaxHeight > prev.goalHeight && !prev.levelComplete) {
                const currencyGain = 100 * prev.level;
                setMetaState(ms => ({ ...ms, currency: ms.currency + currencyGain }));
                saveProgress();
                return { ...prev, maxHeight: currentMaxHeight, levelComplete: true, eventWarning: 'LEVEL COMPLETE!' };
            }
            return { ...prev, maxHeight: currentMaxHeight };
        });

        // Render
        ctx.clearRect(0, 0, cw, ch);
        draw(ctx, world, cw, ch);
        
        animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      worldRef.current = null;
      container.innerHTML = '';
      ballsRef.current.clear();
      toDestroyRef.current = [];
    };

  }, [view, box2dLoaded, gameState.level, metaState.talents]);

  // --- Ball Management ---
  const spawnNextBall = () => {
    canDrop.current = true;
    nextBallTier.current = Math.floor(Math.random() * 3); // Spawn one of first 3 tiers
    const spec = BALL_SPECS[nextBallTier.current];
    const x = lastMouseXRef.current ?? canvasRef.current!.width / 2;
    setPreviewBall({ x, radius: spec.radius * SCALE, color: spec.color });
  };
  
  const dropBall = (x: number) => {
    if (!canDrop.current || !worldRef.current || !canvasRef.current) return;
    canDrop.current = false;
    setPreviewBall(null);

    const tier = nextBallTier.current;
    const spec = BALL_SPECS[tier];
    const radius = spec.radius;
    const dropX = x / SCALE;
    const dropY = (radius * SCALE * 2) / SCALE;

    const { b2BodyDef, b2CircleShape } = box2dRef.current;
    
    const bd = new b2BodyDef();
    bd.set_type(box2dRef.current.b2_dynamicBody);
    bd.set_position(new box2dRef.current.b2Vec2(dropX, dropY));
    const body = worldRef.current.CreateBody(bd);

    const shape = new b2CircleShape();
    shape.set_m_radius(radius);

    const fixtureDef = body.CreateFixture(shape, 1.0);
    const density = metaState.talents.denserCores ? spec.density * 1.5 : spec.density;
    fixtureDef.SetDensity(density);
    const friction = metaState.talents.increasedGrip ? 0.9 : 0.4;
    fixtureDef.SetFriction(friction);
    fixtureDef.SetRestitution(0.1); // Low bounce
    body.ResetMassData();

    const id = `ball_${Date.now()}_${Math.random()}`;
    const ballData: Ball = { id, body, tier, radius, color: spec.color };
    body.userData = ballData;
    ballsRef.current.set(id, ballData);

    setTimeout(spawnNextBall, 500);
  };
  
  const mergeBalls = (ballA: Ball, ballB: Ball) => {
    if (!ballsRef.current.has(ballA.id) || !ballsRef.current.has(ballB.id)) return;
    
    const nextTier = ballA.tier + 1;
    if (nextTier >= BALL_SPECS.length) return;
    
    const posA = ballA.body.GetPosition();
    const posB = ballB.body.GetPosition();
    const midX = (posA.get_x() + posB.get_x()) / 2;
    const midY = (posA.get_y() + posB.get_y()) / 2;
    
    // Remove old balls
    toDestroyRef.current.push(ballA.body, ballB.body);
    ballsRef.current.delete(ballA.id);
    ballsRef.current.delete(ballB.id);
    
    // Create new ball
    const spec = BALL_SPECS[nextTier];
    const { b2BodyDef, b2CircleShape } = box2dRef.current;
    
    const bd = new b2BodyDef();
    bd.set_type(box2dRef.current.b2_dynamicBody);
    bd.set_position(new box2dRef.current.b2Vec2(midX, midY));
    const body = worldRef.current.CreateBody(bd);

    const shape = new b2CircleShape();
    shape.set_m_radius(spec.radius);
    
    const fixtureDef = body.CreateFixture(shape, 1.0);
    const density = metaState.talents.denserCores ? spec.density * 1.5 : spec.density;
    fixtureDef.SetDensity(density);
    const friction = metaState.talents.increasedGrip ? 0.9 : 0.4;
    fixtureDef.SetFriction(friction);
    fixtureDef.SetRestitution(0.1);
    body.ResetMassData();
    
    const id = `ball_${Date.now()}_${Math.random()}`;
    const newBallData: Ball = { id, body, tier: nextTier, radius: spec.radius, color: spec.color };
    body.userData = newBallData;
    ballsRef.current.set(id, newBallData);
  };

  // --- Obstacle Events ---
  useEffect(() => {
    if (view !== 'game') return;

    const applyWind = () => {
      if (!worldRef.current || ballsRef.current.size === 0) return;
      setGameState(p => ({ ...p, eventWarning: 'WIND GUST!' }));
      const windForce = new box2dRef.current.b2Vec2(-10, 0); // Wind from the right
      ballsRef.current.forEach(ball => {
          ball.body.ApplyForceToCenter(windForce, true);
      });
      setTimeout(() => setGameState(p => ({ ...p, eventWarning: '' })), 2000);
    };

    const triggerLava = () => {
        if (!worldRef.current || ballsRef.current.size === 0) return;
        setGameState(p => ({...p, eventWarning: 'LAVA ERUPTION!'}));
        
        setTimeout(() => {
            if (!worldRef.current) return;
            const explosionCenter = new box2dRef.current.b2Vec2(canvasRef.current!.width / 2 / SCALE, canvasRef.current!.height / SCALE);
            const blastRadius = 8; // in meters

            ballsRef.current.forEach(ball => {
                const pos = ball.body.GetPosition();
                const distVec = new box2dRef.current.b2Vec2(pos.get_x() - explosionCenter.get_x(), pos.get_y() - explosionCenter.get_y());
                const distance = distVec.Length();

                if (distance < blastRadius) {
                    if (metaState.talents.lavaShield && Math.random() < 0.5) {
                        // Survived! But still gets pushed
                    } else {
                        toDestroyRef.current.push(ball.body);
                        ballsRef.current.delete(ball.id);
                    }
                    
                    const impulseMag = 50 * (1 - (distance / blastRadius));
                    distVec.Normalize();
                    const impulse = new box2dRef.current.b2Vec2(distVec.get_x() * impulseMag, distVec.get_y() * impulseMag);
                    ball.body.ApplyLinearImpulse(impulse, pos, true);
                }
            });
            setGameState(p => ({ ...p, eventWarning: ''}));
        }, 1500);
    };

    const windInterval = setInterval(applyWind, 15000); // Every 15 seconds
    const lavaInterval = setInterval(triggerLava, 25000); // Every 25 seconds

    return () => {
      clearInterval(windInterval);
      clearInterval(lavaInterval);
    };
  }, [view, metaState.talents.lavaShield]);
  
  // --- Drawing ---
  const draw = (ctx: CanvasRenderingContext2D, world: any, cw: number, ch: number) => {
    ctx.fillStyle = '#2d3748';
    ctx.fillRect(0, 0, cw, ch);
    
    // Draw all bodies
    for (let body = world.GetBodyList(); body.a; body = body.GetNext()) {
      const pos = body.GetPosition();
      const angle = body.GetAngle();
      const fixture = body.GetFixtureList();
      if (!fixture) continue;
      const shape = fixture.GetShape();
      const type = shape.GetType();
      const userData = body.userData as Ball;

      ctx.save();
      ctx.translate(pos.get_x() * SCALE, pos.get_y() * SCALE);
      ctx.rotate(angle);

      if (userData) { // It's a ball
        ctx.beginPath();
        ctx.arc(0, 0, userData.radius * SCALE, 0, 2 * Math.PI);
        ctx.fillStyle = userData.color;
        ctx.fill();
      } else { // It's a wall/mountain
        ctx.fillStyle = '#4a5568';
        const vertices = [];
        for (let i = 0; i < shape.get_m_count(); i++) {
          const vert = shape.GetVertex(i);
          vertices.push({ x: vert.get_x() * SCALE, y: vert.get_y() * SCALE });
        }
        ctx.beginPath();
        ctx.moveTo(vertices[0].x, vertices[0].y);
        for (let i = 1; i < vertices.length; i++) {
          ctx.lineTo(vertices[i].x, vertices[i].y);
        }
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
    
    // Draw UI
    drawUI(ctx, cw, ch);
    
    // Draw Preview Ball
    if (previewBall) {
        ctx.beginPath();
        ctx.arc(previewBall.x, previewBall.radius * 1.5, previewBall.radius, 0, 2 * Math.PI);
        ctx.fillStyle = previewBall.color;
        ctx.globalAlpha = 0.5;
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }
  };

  const drawUI = (ctx: CanvasRenderingContext2D, cw: number, ch: number) => {
    // Height Meter
    const meterX = cw - 30;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(meterX - 10, 0, 40, ch);
    
    const goalY = ch - gameState.goalHeight;
    ctx.strokeStyle = '#f6e05e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(meterX - 5, goalY);
    ctx.lineTo(meterX + 15, goalY);
    ctx.stroke();

    const currentY = ch - gameState.maxHeight;
    ctx.fillStyle = '#68d391';
    ctx.fillRect(meterX, currentY, 10, gameState.maxHeight);

    // Event Warnings
    if (gameState.eventWarning) {
        ctx.font = 'bold 48px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = gameState.levelComplete ? '#68d391' : '#f56565';
        ctx.fillText(gameState.eventWarning, cw / 2, ch / 2 - 50);
    }
  };

  // --- Handlers ---
  const handleStartGame = (level = 1) => {
    setGameState({
      level: level,
      maxHeight: 0,
      goalHeight: LEVELS[level - 1].goalHeight,
      levelComplete: false,
      gameWon: false,
      eventWarning: '',
    });
    setView('game');
  };

  const handleNextLevel = () => {
    const nextLevel = gameState.level + 1;
    if (nextLevel <= LEVELS.length) {
      setGameState(prev => ({
        ...prev,
        level: nextLevel,
        goalHeight: LEVELS[nextLevel - 1].goalHeight,
        levelComplete: false,
        eventWarning: ''
      }));
      
      // Use standardized analytics function for level completion
      recordGameSession('mountain-climber', {
        score: gameState.maxHeight,
        level: gameState.level,
        starsEarned: 2,
        xpEarned: gameState.level * 20,
        success: true
      });
    } else {
      // Game completed
      setGameState(prev => ({ ...prev, gameWon: true }));
      
      // Use standardized analytics function for game completion
      recordGameSession('mountain-climber', {
        score: gameState.maxHeight,
        level: LEVELS.length,
        starsEarned: 5,
        xpEarned: 100,
        success: true
      });
    }
  };
  
  const handlePurchaseTalent = (talent: keyof MetaState['talents']) => {
    const cost = TALENT_COSTS[talent];
    if (metaState.currency >= cost && !metaState.talents[talent]) {
      setMetaState(prev => ({
        ...prev,
        currency: prev.currency - cost,
        talents: { ...prev.talents, [talent]: true },
      }));
      saveProgress();
    }
  };

  // Canvas mouse handlers
  useEffect(() => {
    if (view !== 'game') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      lastMouseXRef.current = x;
      setPreviewBall(p => p ? { ...p, x } : null);
    };
    
    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      dropBall(x);
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('click', handleClick);

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('click', handleClick);
    };

  }, [view, previewBall]);


  // --- Render ---
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`bg-gray-800 rounded-lg shadow-2xl w-full h-full relative flex flex-col`}>
        {/* Header */}
        <div className="flex justify-between items-center p-2 bg-gray-700 rounded-t-lg">
          <h2 className="text-2xl font-bold text-cyan-300">Mountain Climber</h2>
          <div className="flex items-center space-x-2">
            <button onClick={onClose} className="p-2 text-white hover:bg-gray-600 rounded">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Game Container */}
        <div className="relative flex-1 bg-gray-900 overflow-hidden">
          {view === 'main-menu' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-white p-8">
              <h1 className="text-5xl font-bold mb-4">Mountain Climber</h1>
              <div className="bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-md">
                <div className="flex items-center justify-center mb-4">
                  <Star className="text-yellow-400 mr-2" />
                  <span className="text-2xl font-bold text-yellow-400">Currency: {metaState.currency}</span>
                </div>
                <h3 className="text-xl font-semibold mb-3 text-center">Upgrades</h3>
                <div className="space-y-2">
                  {(Object.keys(TALENT_COSTS) as Array<keyof typeof TALENT_COSTS>).map(talent => (
                    <button key={talent}
                      onClick={() => handlePurchaseTalent(talent)}
                      disabled={metaState.talents[talent] || metaState.currency < TALENT_COSTS[talent]}
                      className="w-full text-left p-3 bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors flex justify-between items-center"
                    >
                      <span>
                        {talent.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        <span className="text-sm text-gray-400 ml-2">({TALENT_COSTS[talent]} currency)</span>
                      </span>
                      {metaState.talents[talent] && <span className="text-green-400 font-bold">OWNED</span>}
                    </button>
                  ))}
                </div>
                <button onClick={() => handleStartGame(1)} className="mt-6 w-full px-8 py-4 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 transition-colors text-2xl">
                  {box2dLoaded ? 'Start Game' : 'Loading Physics...'}
                </button>
              </div>
            </div>
          )}

          {view === 'game' && (
            <>
              <div ref={gameContainerRef} className="w-full h-full" />
              {(gameState.levelComplete || gameState.gameWon) && (
                <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center z-20">
                    <div className="bg-gray-800 p-8 rounded-lg text-white text-center">
                        <h2 className="text-4xl font-bold mb-4">{gameState.gameWon ? 'YOU WON!' : 'Level Complete!'}</h2>
                        <p className="mb-6">{gameState.gameWon ? 'You have conquered all the mountains!' : `You earned ${100 * gameState.level} currency!`}</p>
                        {gameState.gameWon ? (
                             <button onClick={() => setView('main-menu')} className="px-6 py-3 bg-blue-500 font-bold rounded-lg">Back to Menu</button>
                        ) : (
                            <button onClick={handleNextLevel} className="px-6 py-3 bg-green-500 font-bold rounded-lg">Next Level</button>
                        )}
                    </div>
                </div>
              )}
            </>
          )}

          {gameError && (
             <div className="absolute inset-0 bg-red-900 bg-opacity-90 flex items-center justify-center z-30 text-white p-4 text-center">
                <div>
                    <h2 className="text-2xl font-bold mb-2">An Error Occurred</h2>
                    <p>{gameError}</p>
                    <button onClick={() => { setGameError(null); setView('main-menu'); }} className="mt-4 px-4 py-2 bg-gray-600 rounded">Go to Menu</button>
                </div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MountainClimber; 