import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { recordGameSession } from '../../utils/analyticsService';

interface FuzzlingGameProps {
  onClose: () => void;
}

// Global variables for the game instance
let world: any, particleSystem: any, canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D;
let Box2D: any;
const SCALE = 30; // 30 pixels = 1 meter in Box2D

const FuzzlingGame: React.FC<FuzzlingGameProps> = ({ onClose }) => {
  const [currentView, setCurrentView] = useState<'main-menu' | 'game' | 'post-game'>('main-menu');
  const [gameState, setGameState] = useState({
    score: 0,
    joy: 0,
    level: 1,
    gameOver: false,
    showLevelUp: false,
    showGameOver: false
  });
  const [metaState, setMetaState] = useState({
    stardust: 0,
    talents: {
      biggerPlaypen: false,
      cozyStart: false,
      affinityAttunement: false,
    },
    cosmetics: {
      availableColors: {
        '#ff5555': { unlocked: true, cost: 0 }, // Default Red
        '#8be9fd': { unlocked: false, cost: 50 }, // Cyan
        '#50fa7b': { unlocked: false, cost: 50 }, // Green
        '#f1fa8c': { unlocked: false, cost: 50 }, // Yellow
        '#bd93f9': { unlocked: false, cost: 50 }, // Purple
        '#ffb86c': { unlocked: false, cost: 50 }, // Orange
      },
      selectedColor: '#ff5555',
    },
    selectedFuzzling: 'sunny',
    musicEnabled: true,
  });
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationIdRef = useRef<number>(0);
  const { user, addXP, addStars, updateGameProgress, recordGameSession } = useUser();

  const JOY_PER_LEVEL = [0, 10, 25, 45, 70, 100, 150, 210, 300];

  // Load saved progress
  useEffect(() => {
    const savedData = localStorage.getItem('fuzzlingAdvancedSave_v2');
    if (savedData) {
      const parsed = JSON.parse(savedData);
      setMetaState(prev => ({
        ...prev,
        stardust: parsed.stardust || 0,
        talents: { ...prev.talents, ...parsed.talents },
        cosmetics: { ...prev.cosmetics, ...parsed.cosmetics },
      }));
    }
  }, []);

  const saveProgress = () => {
    localStorage.setItem('fuzzlingAdvancedSave_v2', JSON.stringify({
      stardust: metaState.stardust,
      talents: metaState.talents,
      cosmetics: metaState.cosmetics,
    }));
  };

  const purchaseTalent = (talentName: string, cost: number) => {
    if (metaState.stardust >= cost && !metaState.talents[talentName as keyof typeof metaState.talents]) {
      setMetaState(prev => ({
        ...prev,
        stardust: prev.stardust - cost,
        talents: { ...prev.talents, [talentName]: true }
      }));
      saveProgress();
    }
  };

  const purchaseColor = (color: string, cost: number) => {
    if (metaState.stardust >= cost && !(metaState.cosmetics.availableColors as any)[color].unlocked) {
      setMetaState(prev => ({
        ...prev,
        stardust: prev.stardust - cost,
        cosmetics: {
          ...prev.cosmetics,
          availableColors: {
            ...(prev.cosmetics.availableColors as any),
            [color]: { ...(prev.cosmetics.availableColors as any)[color], unlocked: true }
          }
        }
      }));
      saveProgress();
    }
  };

  const selectColor = (color: string) => {
    if ((metaState.cosmetics.availableColors as any)[color].unlocked) {
      setMetaState(prev => ({
        ...prev,
        cosmetics: { ...prev.cosmetics, selectedColor: color }
      }));
      saveProgress();
    }
  };

  // Replace dynamic script loading with ES module import
  const launchGame = async (targetElement: HTMLElement) => {
    try {
      console.log('Attempting to initialize Box2D');
      if (!Box2D) {
        Box2D = await Box2DFactory();
        console.log('Box2D loaded:', Box2D);
      }
      initializeGame(targetElement);
    } catch (e) {
      console.error('Box2D initialization error:', e);
    }
  };

  const initializeGame = (targetElement: HTMLElement) => {
    try {
      console.log('Initializing game in container:', targetElement);
      const {
        b2World, b2Vec2, b2BodyDef, b2_dynamicBody, b2PolygonShape,
        b2ParticleSystemDef, b2ParticleGroupDef, b2CircleShape,
        b2_waterParticle, b2_viscousParticle, b2_powderParticle
      } = Box2D;

      // Clear the container and create canvas
      targetElement.innerHTML = '';
      canvas = document.createElement('canvas');
      ctx = canvas.getContext('2d')!;
      targetElement.appendChild(canvas);
      console.log('Canvas created and appended:', canvas);

      // Set canvas size with talent consideration
      const containerRect = targetElement.getBoundingClientRect();
      const gameWidth = containerRect.width * (metaState.talents.biggerPlaypen ? 1.05 : 1);
      canvas.width = gameWidth;
      canvas.height = containerRect.height;

      // World Setup
      const gravity = new b2Vec2(0, 10);
      world = new b2World(gravity);

      // Create Static Boundaries
      const bd = new b2BodyDef();
      const ground = world.CreateBody(bd);
      const wallShape = new b2PolygonShape();
      
      // Floor
      wallShape.SetAsBox(canvas.width / 2 / SCALE, 2);
      ground.CreateFixture(wallShape, 0);
      ground.SetTransform(new b2Vec2(canvas.width / 2 / SCALE, canvas.height / SCALE), 0);
      
      // Left Wall
      wallShape.SetAsBox(1, canvas.height / 2 / SCALE);
      ground.CreateFixture(wallShape, 0);
      ground.SetTransform(new b2Vec2(0, canvas.height / 2 / SCALE), 0);
      
      // Right Wall
      wallShape.SetAsBox(1, canvas.height / 2 / SCALE);
      ground.CreateFixture(wallShape, 0);
      ground.SetTransform(new b2Vec2(canvas.width / SCALE, canvas.height / 2 / SCALE), 0);

      // ADVANCED PHYSICS: FLUID SYSTEM
      const psd = new b2ParticleSystemDef();
      psd.radius = 0.15; // Particle radius in meters
      psd.dampingStrength = 0.2;
      particleSystem = world.CreateParticleSystem(psd);
      
      // Create a blob of water
      const waterShape = new b2PolygonShape();
      waterShape.SetAsBox(6, 4, new b2Vec2(canvas.width / 2 / SCALE, 5), 0);
      const pgd = new b2ParticleGroupDef();
      pgd.shape = waterShape;
      pgd.flags = b2_waterParticle; // This makes it behave like water
      particleSystem.CreateParticleGroup(pgd);

      // Game state
      let localGameState = {
        score: metaState.talents.cozyStart ? 50 : 0,
        joy: 0,
        level: 1,
        gameOver: false,
        nextBerryTier: 0,
        canDrop: true,
        passives: [],
        abilities: {}
      };

      const BERRIES = [
        { tier: 0, radius: 15, affinity: 'sun', color: '#ff5555', score: 1 },
        { tier: 1, radius: 20, affinity: 'earth', color: '#50fa7b', score: 3 },
        { tier: 2, radius: 28, affinity: 'moon', color: '#bd93f9', score: 6 },
        { tier: 3, radius: 35, affinity: 'sun', color: '#ffb86c', score: 10 },
        { tier: 4, radius: 45, affinity: 'earth', color: '#f1fa8c', score: 15 },
        { tier: 5, radius: 58, affinity: 'moon', color: '#8be9fd', score: 21 },
      ];

      const DANGER_ZONE_Y = 150;

      const checkLevelUp = () => {
        const joyNeeded = JOY_PER_LEVEL[localGameState.level] || JOY_PER_LEVEL[JOY_PER_LEVEL.length - 1];
        if (localGameState.joy >= joyNeeded) {
          localGameState.joy -= joyNeeded;
          localGameState.level++;
          setGameState(prev => ({ ...prev, level: localGameState.level, showLevelUp: true }));
          setTimeout(() => {
            setGameState(prev => ({ ...prev, showLevelUp: false }));
          }, 2000);
        }
      };

      // Core Game Functions
      let currentBerry: any = null;
      let previewBerry: any = null;
      let bodiesToDestroy: any[] = [];

      function createBerry(x: number, y: number, tier: number, isStatic = false, overrideColor = null) {
        const berryData = BERRIES[tier];
        const bd = new b2BodyDef();
        if (!isStatic) bd.set_type(b2_dynamicBody);
        bd.set_position(new b2Vec2(x / SCALE, y / SCALE));
        const body = world.CreateBody(bd);

        const shape = new b2CircleShape();
        shape.set_m_radius(berryData.radius / SCALE);
        const fixture = body.CreateFixture(shape, 1.0);
        
        // Apply dusty fuzzling effect
        if (metaState.selectedFuzzling === 'dusty') {
          fixture.SetFriction(0.1);
        }
        
        // Attach custom properties
        body.userData = {
          type: 'berry',
          tier: tier,
          affinity: berryData.affinity,
          color: overrideColor || berryData.color,
          radius: berryData.radius,
          scoreValue: berryData.score
        };
        
        return body;
      }

      function spawnNextBerry() {
        if (localGameState.gameOver) return;
        
        // Affinity Attunement Talent Logic
        if (metaState.talents.affinityAttunement && Math.random() < 0.33) {
          const preferredAffinity = metaState.selectedFuzzling === 'sunny' ? 'sun' : 'earth';
          const affinityBerries = BERRIES.filter(b => b.affinity === preferredAffinity && b.tier < 3);
          const berryData = affinityBerries[Math.floor(Math.random() * affinityBerries.length)];
          localGameState.nextBerryTier = BERRIES.indexOf(berryData);
        } else {
          localGameState.nextBerryTier = Math.floor(Math.random() * 3);
        }
        
        previewBerry = createBerry(canvas.width / 2, 70, localGameState.nextBerryTier, true, metaState.cosmetics.selectedColor);
      }

      function dropBerry(x: number) {
        if (!localGameState.canDrop || localGameState.gameOver) return;
        localGameState.canDrop = false;

        if (previewBerry) {
          world.DestroyBody(previewBerry);
        }
        
        currentBerry = createBerry(x, 70, localGameState.nextBerryTier);
        previewBerry = null;

        setTimeout(() => {
          localGameState.canDrop = true;
          spawnNextBerry();
        }, 500);
      }

      // ADVANCED PHYSICS: EXPLOSION FUNCTION
      function createExplosion(x: number, y: number, radius: number, strength: number) {
        const explosionCenter = new b2Vec2(x / SCALE, y / SCALE);
        
        // Apply impulse to rigid bodies
        for (let body = world.GetBodyList(); body.a; body = body.GetNext()) {
          if (body.GetType() === b2_dynamicBody) {
            const bodyPos = body.GetPosition();
            const distanceVec = new b2Vec2(bodyPos.x - explosionCenter.x, bodyPos.y - explosionCenter.y);
            const distance = distanceVec.Length();

            if (distance < radius) {
              distanceVec.Normalize();
              distanceVec.set_x(distanceVec.x * strength * (1 - distance / radius));
              distanceVec.set_y(distanceVec.y * strength * (1 - distance / radius));
              body.ApplyLinearImpulse(distanceVec, bodyPos, true);
            }
          }
        }
      }

      function createFluidSplash(x: number, y: number, color: string) {
        const { b2ParticleGroupDef, b2CircleShape, b2Vec2, b2_viscousParticle } = Box2D;
        const shape = new b2CircleShape();
        shape.set_m_radius(1.5);
        // Only pass a b2Vec2 to set_m_p, not color
        shape.set_m_p(new Box2D.b2Vec2(x / SCALE, y / SCALE));
        
        const pgd = new b2ParticleGroupDef();
        pgd.shape = shape;
        pgd.flags = b2_viscousParticle;
        const group = particleSystem.CreateParticleGroup(pgd);
        
        setTimeout(() => particleSystem.DestroyParticleGroup(group), 1500);
      }

      // Collision Detection (simplified for Box2D)
      function checkCollisions() {
        const berries: any[] = [];
        
        // Collect all berries
        for (let body = world.GetBodyList(); body.a; body = body.GetNext()) {
          if (body.userData && body.userData.type === 'berry' && !body.isStatic) {
            berries.push(body);
          }
        }

        // Check for collisions between same-tier berries
        for (let i = 0; i < berries.length; i++) {
          for (let j = i + 1; j < berries.length; j++) {
            const berryA = berries[i];
            const berryB = berries[j];
            
            if (berryA.userData.tier === berryB.userData.tier && berryA.userData.affinity === berryB.userData.affinity) {
              const posA = berryA.GetPosition();
              const posB = berryB.GetPosition();
              const distance = Math.sqrt(
                Math.pow(posA.x - posB.x, 2) + Math.pow(posA.y - posB.y, 2)
              );
              
              const combinedRadius = (berryA.userData.radius + berryB.userData.radius) / SCALE;
              
              if (distance < combinedRadius * 0.8) { // Collision threshold
                const nextTier = berryA.userData.tier + 1;
                if (nextTier < BERRIES.length) {
                  // Remove both berries
                  bodiesToDestroy.push(berryA, berryB);

                  // Create the new, bigger berry at the midpoint
                  const newBerry = createBerry(
                    (posA.x + posB.x) / 2 * SCALE,
                    (posA.y + posB.y) / 2 * SCALE,
                    nextTier
                  );

                  // Update Score and Joy
                  let joyGained = BERRIES[nextTier].score;
                  if (metaState.selectedFuzzling === 'sunny') joyGained *= 1.1;
                  localGameState.joy += joyGained;
                  localGameState.score += joyGained;
                  setGameState({
                    score: localGameState.score,
                    joy: localGameState.joy,
                    level: localGameState.level,
                    gameOver: localGameState.gameOver,
                    showLevelUp: gameState.showLevelUp,
                    showGameOver: gameState.showGameOver
                  });
                  checkLevelUp();
                  
                  // Create explosion effect for higher tiers
                  if (nextTier >= 3) {
                    createFluidSplash(
                      (posA.x + posB.x) / 2 * SCALE,
                      (posA.y + posB.y) / 2 * SCALE,
                      berryA.userData.color
                    );
                  }
                }
              }
            }
            // Cross-Affinity Combo: Sun + Moon = Eclipse
            else if ((berryA.userData.affinity === 'sun' && berryB.userData.affinity === 'moon') || 
                     (berryA.userData.affinity === 'moon' && berryB.userData.affinity === 'sun')) {
              const posA = berryA.GetPosition();
              const posB = berryB.GetPosition();
              const midX = (posA.x + posB.x) / 2 * SCALE;
              const midY = (posA.y + posB.y) / 2 * SCALE;
              createExplosion(midX, midY, 10, -30);
              localGameState.score += 5;
              setGameState({
                score: localGameState.score,
                joy: localGameState.joy,
                level: localGameState.level,
                gameOver: localGameState.gameOver,
                showLevelUp: gameState.showLevelUp,
                showGameOver: gameState.showGameOver
              });
              bodiesToDestroy.push(berryA, berryB);
            }
          }
        }
      }

      // Game Over Logic
      function checkGameOver() {
        if (localGameState.gameOver) return;
        
        for (let body = world.GetBodyList(); body.a; body = body.GetNext()) {
          if (body.userData && body.userData.type === 'berry' && !body.isStatic) {
            const pos = body.GetPosition();
            const velocity = body.GetLinearVelocity();
            
            if (pos.y * SCALE < DANGER_ZONE_Y && Math.abs(velocity.y) < 0.1) {
              localGameState.gameOver = true;
              setGameState(prev => ({ ...prev, gameOver: true, showGameOver: true }));
              break;
            }
          }
        }
      }

      // Input Handling
      canvas.addEventListener('mousemove', (event) => {
        if (previewBerry && localGameState.canDrop) {
          const rect = canvas.getBoundingClientRect();
          let mouseX = event.clientX - rect.left;
          const berryRadius = BERRIES[localGameState.nextBerryTier].radius;
          mouseX = Math.max(mouseX, berryRadius);
          mouseX = Math.min(mouseX, canvas.width - berryRadius);
          
          previewBerry.SetTransform(new b2Vec2(mouseX / SCALE, 70 / SCALE), 0);
        }
      });

      canvas.addEventListener('click', (event) => {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        dropBerry(x);
      });

      // Right-click for explosion
      canvas.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        createExplosion(x, y, 8, 30);
      });

      // Render Loop
      function render() {
        // Step the physics world
        world.Step(1 / 60, 3, 3);
        
        // Check collisions and game over
        checkCollisions();
        checkGameOver();
        
        // Destroy bodies marked for destruction
        bodiesToDestroy.forEach(body => world.DestroyBody(body));
        bodiesToDestroy = [];
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Render rigid bodies
        ctx.strokeStyle = 'white';
        for (let body = world.GetBodyList(); body.a; body = body.GetNext()) {
          if (body.userData && body.userData.type === 'berry') {
            const pos = body.GetPosition();
            const angle = body.GetAngle();
            ctx.save();
            ctx.translate(pos.x * SCALE, pos.y * SCALE);
            ctx.rotate(angle);
            
            for (let fixture = body.GetFixtureList(); fixture.a; fixture = fixture.GetNext()) {
              const shape = fixture.GetShape();
              if (shape instanceof b2CircleShape) {
                ctx.beginPath();
                ctx.arc(0, 0, shape.get_m_radius() * SCALE, 0, 2 * Math.PI);
                ctx.fillStyle = body.userData.color;
                ctx.fill();
                ctx.stroke();
              }
            }
            ctx.restore();
          }
        }

        // Render particles (fluids)
        if (particleSystem) {
          const particles = particleSystem.GetPositionBuffer();
          ctx.fillStyle = `rgba(0, 150, 255, 0.7)`; // Water color
          for (let i = 0; i < particles.length; i += 2) {
            ctx.beginPath();
            ctx.arc(particles[i] * SCALE, particles[i+1] * SCALE, 0.15 * SCALE, 0, 2 * Math.PI);
            ctx.fill();
          }
        }
        
        requestAnimationFrame(render);
      }
      console.log('Starting render loop');
      spawnNextBerry();
      render();
      console.log('Advanced Fuzzling Game with Box2D Launched!');
    } catch (error) {
      console.error('Game initialization error:', error);
    }
  };

  const shutdownGame = () => {
    if (world) {
      // Clean up Box2D world
      for (let body = world.GetBodyList(); body.a; body = body.GetNext()) {
        world.DestroyBody(body);
      }
    }
    if (canvas) {
      canvas.remove();
    }
    console.log("Advanced Fuzzling Game with Box2D Shutdown.");
  };

  const startGame = () => {
    setCurrentView('game');
    if (gameContainerRef.current) {
      launchGame(gameContainerRef.current);
    }
  };

  const endGame = (score: number) => {
    const stardustEarned = Math.floor(score / 10);
    setMetaState(prev => ({ ...prev, stardust: prev.stardust + stardustEarned }));
    
    // Use standardized analytics function
    recordGameSession('fuzzling', {
      score: score,
      level: gameState.level,
      starsEarned: Math.floor(score / 50),
      xpEarned: score + (gameState.level * 5),
      success: score > 0
    });
    
    saveProgress();
    setCurrentView('post-game');
  };

  const returnToMainMenu = () => {
    setCurrentView('main-menu');
    setGameState({
      score: 0,
      joy: 0,
      level: 1,
      gameOver: false,
      showLevelUp: false,
      showGameOver: false
    });
  };

  useEffect(() => {
    console.log('Current view:', currentView);
    if (currentView === 'game' && gameContainerRef.current) {
      console.log('Launching game, container ref:', gameContainerRef.current);
      launchGame(gameContainerRef.current);
    }

    return () => {
      if (currentView === 'game') {
        console.log('Shutting down game');
        shutdownGame();
      }
    };
  }, [currentView]);

  // Main Menu View
  if (currentView === 'main-menu') {
    return (
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 w-full max-w-4xl max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-400 to-purple-600 text-white p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold mb-2">Fuzzling's Advanced Playpen</h2>
              <p className="text-white/90">Drop berries and watch them merge with advanced physics!</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Main Menu Content */}
        <div className="p-6 bg-gradient-to-br from-slate-800 to-slate-900 text-white">
          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold text-yellow-400 mb-2">Stardust: {metaState.stardust}</h3>
          </div>

          {/* Talent Tree Section */}
          <div className="mb-6">
            <h3 className="text-xl font-bold mb-4 text-cyan-400">Talent Tree</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-700 p-4 rounded-lg">
                <h4 className="font-bold">Bigger Playpen</h4>
                <p className="text-sm text-gray-300">Cost: 100 Stardust</p>
                <button 
                  onClick={() => purchaseTalent('biggerPlaypen', 100)}
                  disabled={metaState.talents.biggerPlaypen || metaState.stardust < 100}
                  className="mt-2 w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-600 disabled:cursor-not-allowed px-4 py-2 rounded"
                >
                  {metaState.talents.biggerPlaypen ? 'Purchased' : 'Purchase'}
                </button>
              </div>
              <div className="bg-slate-700 p-4 rounded-lg">
                <h4 className="font-bold">Cozy Start</h4>
                <p className="text-sm text-gray-300">Cost: 250 Stardust</p>
                <button 
                  onClick={() => purchaseTalent('cozyStart', 250)}
                  disabled={metaState.talents.cozyStart || metaState.stardust < 250}
                  className="mt-2 w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-600 disabled:cursor-not-allowed px-4 py-2 rounded"
                >
                  {metaState.talents.cozyStart ? 'Purchased' : 'Purchase'}
                </button>
              </div>
              <div className="bg-slate-700 p-4 rounded-lg">
                <h4 className="font-bold">Affinity Attunement</h4>
                <p className="text-sm text-gray-300">Cost: 400 Stardust</p>
                <button 
                  onClick={() => purchaseTalent('affinityAttunement', 400)}
                  disabled={metaState.talents.affinityAttunement || metaState.stardust < 400}
                  className="mt-2 w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-600 disabled:cursor-not-allowed px-4 py-2 rounded"
                >
                  {metaState.talents.affinityAttunement ? 'Purchased' : 'Purchase'}
                </button>
              </div>
            </div>
          </div>

          {/* Cosmetics Section */}
          <div className="mb-6">
            <h3 className="text-xl font-bold mb-4 text-purple-400">Fuzzling Colors</h3>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              {Object.entries(metaState.cosmetics.availableColors).map(([color, data]) => (
                <div key={color} className="text-center">
                  <div 
                    className={`w-12 h-12 rounded-full mx-auto cursor-pointer transition-all ${
                      data.unlocked ? 'hover:scale-110' : 'grayscale opacity-50'
                    } ${metaState.cosmetics.selectedColor === color ? 'ring-4 ring-white' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => data.unlocked ? selectColor(color) : purchaseColor(color, data.cost)}
                    title={data.unlocked ? 'Select Color' : `Unlock for ${data.cost} Stardust`}
                  />
                  {!data.unlocked && (
                    <p className="text-xs mt-1">{data.cost}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Fuzzling Selection */}
          <div className="mb-6">
            <h3 className="text-xl font-bold mb-4 text-green-400">Choose your Fuzzling:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div 
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  metaState.selectedFuzzling === 'sunny' 
                    ? 'border-green-400 bg-green-900/20' 
                    : 'border-gray-600 hover:border-green-400'
                }`}
                onClick={() => setMetaState(prev => ({ ...prev, selectedFuzzling: 'sunny' }))}
              >
                <h4 className="font-bold">Sunny Fuzzling</h4>
                <p className="text-sm text-gray-300">+10% Joy Gain</p>
              </div>
              <div 
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  metaState.selectedFuzzling === 'dusty' 
                    ? 'border-green-400 bg-green-900/20' 
                    : 'border-gray-600 hover:border-green-400'
                }`}
                onClick={() => setMetaState(prev => ({ ...prev, selectedFuzzling: 'dusty' }))}
              >
                <h4 className="font-bold">Dusty Fuzzling</h4>
                <p className="text-sm text-gray-300">Berries are slipperier</p>
              </div>
            </div>
          </div>

          <button 
            onClick={startGame}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold py-4 px-8 rounded-lg transition-all duration-300 transform hover:scale-105"
          >
            Start Game
          </button>
        </div>
      </div>
    );
  }

  // Post Game View
  if (currentView === 'post-game') {
    return (
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 w-full max-w-4xl max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-400 to-purple-600 text-white p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold mb-2">Naptime!</h2>
              <p className="text-white/90">Game Over</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Post Game Content */}
        <div className="p-6 bg-gradient-to-br from-slate-800 to-slate-900 text-white text-center">
          <h3 className="text-3xl font-bold mb-4">Final Joy: {gameState.score}</h3>
          <h3 className="text-2xl font-bold mb-6 text-yellow-400">
            Stardust Earned: {Math.floor(gameState.score / 10)}
          </h3>
          
          <div className="space-y-4">
            <button 
              onClick={returnToMainMenu}
              className="w-full bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white font-bold py-4 px-8 rounded-lg transition-all duration-300 transform hover:scale-105"
            >
              Play Again
            </button>
            <button 
              onClick={onClose}
              className="w-full bg-gray-500 hover:bg-gray-600 text-white font-bold py-4 px-8 rounded-lg transition-all duration-300"
            >
              Close Game
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Game View
  return (
    <div className="bg-white rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 w-full max-w-4xl max-h-[90vh]">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-400 to-purple-600 text-white p-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold mb-2">Fuzzling's Advanced Playpen</h2>
            <p className="text-white/90">Drop berries and watch them merge with advanced physics!</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => endGame(gameState.score)}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Game UI */}
      <div className="bg-slate-800 p-4">
        <div className="flex items-center justify-between text-white">
          <div className="text-2xl font-bold">Joy: {gameState.score}</div>
          <div className="text-lg">Level {gameState.level}</div>
        </div>
        <div className="mt-2 bg-slate-700 rounded-full h-4 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-pink-500 to-purple-500 h-full rounded-full transition-all duration-300"
            style={{ 
              width: `${Math.min((gameState.joy / (JOY_PER_LEVEL[gameState.level] || JOY_PER_LEVEL[JOY_PER_LEVEL.length - 1])) * 100, 100)}%` 
            }}
          />
        </div>
        <div className="mt-2 text-white text-sm">
          <p>💡 Left-click to drop berries, Right-click for explosions!</p>
        </div>
      </div>

      {/* Game Container */}
      <div 
        ref={gameContainerRef}
        className="w-full h-[600px] bg-gradient-to-b from-yellow-100 to-orange-100"
        style={{ minHeight: '600px' }}
      />

      {/* Level Up Modal */}
      {gameState.showLevelUp && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
            <h3 className="text-2xl font-bold text-center mb-4">🎉 Level Up!</h3>
            <p className="text-center mb-6">You've reached level {gameState.level}!</p>
            <div className="space-y-3">
              <button 
                onClick={() => setGameState(prev => ({ ...prev, showLevelUp: false }))}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold py-3 px-6 rounded-lg hover:from-pink-600 hover:to-purple-700 transition-all duration-300"
              >
                Continue Playing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game Over Modal */}
      {gameState.showGameOver && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
            <h3 className="text-2xl font-bold text-center mb-4">😴 Naptime!</h3>
            <p className="text-center mb-6">Final Joy: {gameState.score}</p>
            <div className="space-y-3">
              <button 
                onClick={() => {
                  setGameState({
                    score: 0,
                    joy: 0,
                    level: 1,
                    gameOver: false,
                    showLevelUp: false,
                    showGameOver: false
                  });
                  shutdownGame();
                  if (gameContainerRef.current) {
                    launchGame(gameContainerRef.current);
                  }
                }}
                className="w-full bg-gradient-to-r from-green-500 to-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:from-green-600 hover:to-blue-700 transition-all duration-300"
              >
                Play Again
              </button>
              <button 
                onClick={() => endGame(gameState.score)}
                className="w-full bg-gray-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-gray-600 transition-all duration-300"
              >
                Close Game
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FuzzlingGame; 