import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { recordGameSession } from '../../utils/analyticsService';
import PremiumStar from '../PremiumStar';
import { useUser } from '../../contexts/UserContext';
import { Star, Trophy } from 'lucide-react';

interface FuzzlingAdvancedGameProps {
  onClose: () => void;
}

interface GameState {
  score: number;
  joy: number;
  level: number;
  gameOver: boolean;
  showLevelUp: boolean;
  showGameOver: boolean;
  eventWarning: string;
  showEventWarning: boolean;
  nextBerryTier: number;
}

interface MetaState {
  stardust: number;
  talents: {
    biggerPlaypen: boolean;
    cozyStart: boolean;
    affinityAttunement: boolean;
  };
  cosmetics: {
    availableColors: Record<string, { unlocked: boolean; cost: number }>;
    selectedColor: string;
  };
  selectedFuzzling: 'sunny' | 'dusty';
  musicEnabled: boolean;
}

interface Berry {
  x: number;
  y: number;
  vx: number;
  vy: number;
  tier: number;
  affinity: string;
  color: string;
  radius: number;
  scoreValue: number;
  id: string;
  mass: number; // Added mass property
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
}

const SCALE = 1;
const GRAVITY = 0.5;
const FRICTION = 0.98;
const BOUNCE = 0.7;
const JOY_PER_LEVEL = [0, 10, 25, 45, 70, 100, 150, 210, 300];

const BERRIES = [
  { tier: 0, radius: 15, affinity: 'sun', color: '#ff5555', score: 1 },
  { tier: 1, radius: 20, affinity: 'earth', color: '#50fa7b', score: 3 },
  { tier: 2, radius: 28, affinity: 'moon', color: '#bd93f9', score: 6 },
  // Recode berry 3 to match berry 2 except for radius
  { tier: 3, radius: 35, affinity: 'moon', color: '#bd93f9', score: 6 },
  { tier: 4, radius: 45, affinity: 'earth', color: '#f1fa8c', score: 15 },
  { tier: 5, radius: 58, affinity: 'moon', color: '#8be9fd', score: 21 },
];

const FuzzlingAdvancedGame: React.FC<FuzzlingAdvancedGameProps> = ({ onClose }) => {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Add audio refs for splash and game over
  const splashAudioRef = useRef<HTMLAudioElement | null>(null);
  const gameOverAudioRef = useRef<HTMLAudioElement | null>(null);
  // Add audio ref for explosion sound
  const explosionAudioRef = useRef<HTMLAudioElement | null>(null);

  // Add ref to remember last mouse X position
  const lastMouseXRef = useRef<number | null>(null);

  const [currentView, setCurrentView] = useState<'main-menu' | 'game' | 'post-game'>('main-menu');
  const [gameError, setGameError] = useState<string | null>(null);
  const { user, addXP, addStars, updateGameProgress, recordGameSession } = useUser();
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    joy: 0,
    level: 1,
    gameOver: false,
    showLevelUp: false,
    showGameOver: false,
    eventWarning: '',
    showEventWarning: false,
    nextBerryTier: 0,
  });

  const [metaState, setMetaState] = useState<MetaState>({
    stardust: 0,
    talents: {
      biggerPlaypen: false,
      cozyStart: false,
      affinityAttunement: false,
    },
    cosmetics: {
      availableColors: {
        '#ff5555': { unlocked: true, cost: 0 },
        '#8be9fd': { unlocked: false, cost: 50 },
        '#50fa7b': { unlocked: false, cost: 50 },
        '#f1fa8c': { unlocked: false, cost: 50 },
        '#bd93f9': { unlocked: false, cost: 50 },
        '#ffb86c': { unlocked: false, cost: 50 },
      },
      selectedColor: '#ff5555',
    },
    selectedFuzzling: 'sunny',
    musicEnabled: true,
  });

  // Add state for current music track
  const musicTracks = [
    { name: 'Natural Vibes', src: '/assets/music/Natural Vibes.mp3' },
    { name: 'And Just Like That', src: '/assets/music/And Just Like That.mp3' },
  ];
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const currentTrack = musicTracks[currentTrackIndex];

  // Add state for volume
  const [musicVolume, setMusicVolume] = useState(0.3);
  // Update audio element volume when changed
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = musicVolume;
    }
  }, [musicVolume, currentTrackIndex]);

  // Show/hide volume slider
  const [showVolume, setShowVolume] = useState(false);

  // Function to select music track from dropdown
  const selectMusicTrack = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const idx = parseInt(e.target.value, 10);
    setCurrentTrackIndex(idx);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.load();
      if (metaState.musicEnabled) {
        audioRef.current.play();
      }
    }
  };

  // Game state refs for performance
  const berriesRef = useRef<Berry[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const previewBerryRef = useRef<Berry | null>(null);
  const canDropRef = useRef(true);
  const localGameStateRef = useRef({
    score: metaState.talents.cozyStart ? 50 : 0,
    joy: 0,
    level: 1,
    gameOver: false,
  });

  // Merge timer state
  const [mergeTimer, setMergeTimer] = useState(30);
  const [mergesThisSession, setMergesThisSession] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  // Add a gameSessionId state to force re-initialization
  const [gameSessionId, setGameSessionId] = useState(0);

  // Load saved progress
  useEffect(() => {
    const savedData = localStorage.getItem('fuzzlingAdvancedSave_v2');
    if (savedData) {
      try {
      const parsed = JSON.parse(savedData);
      setMetaState(prev => ({
        ...prev,
        stardust: parsed.stardust || 0,
          talents: { ...prev.talents, ...(parsed.talents || {}) },
          cosmetics: { ...prev.cosmetics, ...(parsed.cosmetics || {}) },
        }));
      } catch (error) {
        console.error('Failed to load saved data:', error);
      }
    }
  }, []);

  // Save progress
  const saveProgress = useCallback(() => {
    localStorage.setItem('fuzzlingAdvancedSave_v2', JSON.stringify({
      stardust: metaState.stardust,
      talents: metaState.talents,
      cosmetics: metaState.cosmetics,
    }));
  }, [metaState]);

  // Game setup
  useEffect(() => {
    if (currentView !== 'game') return;

    let destroyed = false;
    let canvas: HTMLCanvasElement | null = null;
    let ctx: CanvasRenderingContext2D | null = null;

    const setup = async () => {
      try {
        console.log('Setting up simplified game...');
        
        // Canvas setup
        console.log('Creating canvas...');
        canvas = document.createElement('canvas');
        canvas.width = gameContainerRef.current!.clientWidth || 800;
        canvas.height = gameContainerRef.current!.clientHeight || 600;
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.zIndex = '10';
        canvas.style.backgroundColor = '#1a1a1a';
        ctx = canvas.getContext('2d')!;
        canvasRef.current = canvas;
        ctxRef.current = ctx;
        gameContainerRef.current!.appendChild(canvas);
        console.log('Canvas created with dimensions:', canvas.width, 'x', canvas.height);
        
        // Test canvas rendering
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(10, 10, 50, 50);
        console.log('Test rectangle drawn on canvas');

        // Initialize game state
        berriesRef.current = [];
        particlesRef.current = [];
        previewBerryRef.current = null;
        canDropRef.current = true;
        localGameStateRef.current = {
          score: metaState.talents.cozyStart ? 50 : 0,
          joy: 0,
          level: 1,
          gameOver: false,
        };

        // Spawn first berry at center or last mouse X
        spawnNextBerry();

        // Event handlers
        const handleMouseMove = (e: MouseEvent) => {
          if (previewBerryRef.current && canDropRef.current && canvas) {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            lastMouseXRef.current = x;
            previewBerryRef.current.x = x;
          }
        };

        const handleClick = (e: MouseEvent) => {
          console.log('Mouse click detected');
          if (canvas) {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            lastMouseXRef.current = x;
            dropBerry(x);
          }
        };

        const handleRightClick = (e: MouseEvent) => {
          e.preventDefault();
          if (canvas) {
          const rect = canvas.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
            createExplosion(x, y, 8, 30);
            if (explosionAudioRef.current) {
              explosionAudioRef.current.currentTime = 0;
              explosionAudioRef.current.play();
            }
          }
        };

        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('click', handleClick);
        canvas.addEventListener('contextmenu', handleRightClick);
        console.log('Event listeners added');

        // Start render loop
        render();
        console.log('=== SETUP COMPLETE ===');
        console.log('Simplified game initialized successfully');

      } catch (error) {
        console.error('Game initialization error:', error);
        setGameError('Game initialization failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
    };

    // Physics functions
    const createBerry = (x: number, y: number, tier: number, isStatic = false, overrideColor = null): Berry => {
      const berryData = BERRIES[tier];
      // Mass proportional to area (pi * r^2), but we can drop the pi for relative scaling
      let mass = berryData.radius * berryData.radius;
      // Override berry 3's mass to match berry 2
      if (tier === 3) {
        mass = BERRIES[2].radius * BERRIES[2].radius;
      }
      return {
        x: x,
        y: y,
        vx: 0,
        vy: 0,
        tier: tier,
        affinity: berryData.affinity,
        color: overrideColor || berryData.color,
        radius: berryData.radius,
        scoreValue: berryData.score,
        id: Math.random().toString(36).substr(2, 9),
        mass: mass, // Set mass
      };
    };

    const spawnNextBerry = () => {
      // Use last mouse X if available, else center
      let x = lastMouseXRef.current ?? (canvasRef.current ? canvasRef.current.width / 2 : 400);
      // Clamp to play area
      const minX = BERRIES[gameState.nextBerryTier].radius;
      const maxX = (canvasRef.current ? canvasRef.current.width : 800) - BERRIES[gameState.nextBerryTier].radius;
      x = Math.max(minX, Math.min(maxX, x));
      const tier = gameState.nextBerryTier;
      previewBerryRef.current = createBerry(
        x,
        70,
        tier,
        true,
        metaState.cosmetics.selectedColor
      );
      console.log('Preview berry created:', previewBerryRef.current);
    };

    const dropBerry = (x: number) => {
      console.log('Dropping berry at x:', x);
      if (!canDropRef.current) return;
      canDropRef.current = false;

      if (previewBerryRef.current) {
        const berry = createBerry(x, 70, gameState.nextBerryTier);
        berriesRef.current.push(berry);
        previewBerryRef.current = null;
        console.log('Berry dropped:', berry);
      }

      setTimeout(() => {
        canDropRef.current = true;
        spawnNextBerry();
      }, 500);
    };

    // Explosion: easier to trigger
    const createExplosion = (x: number, y: number, radius = 60, strength = 30) => {
      // Increased radius by 50% and elliptical effect
      const baseRadius = radius * 1.5;
      const adjustedStrength = strength * 15;
      berriesRef.current.forEach(berry => {
        const dx = berry.x - x;
        const dy = berry.y - y;
        // Elliptical explosion: scale x and y radii by 1.5
        const rx = baseRadius;
        const ry = baseRadius;
        // Regression line: treat explosion as elliptical along y = x
        const normDx = dx / rx;
        const normDy = dy / ry;
        const distance = Math.sqrt(normDx * normDx + normDy * normDy);
        if (distance < 1) {
          let force = adjustedStrength * (1 - distance);
          const massScale = 1 / Math.pow(berry.mass, 0.15);
          force = Math.max(force * massScale, 50);
          // Reduce vertical force by 50%
          berry.vy -= Math.abs(force * 1.25); // was 2.5
          berry.vx += (dx / (Math.sqrt(dx * dx + dy * dy) + 1e-6)) * force * 0.7;
        }
      });
    };

    const createFluidSplash = (x: number, y: number, color: string) => {
      // Play splash sound
      if (splashAudioRef.current) {
        splashAudioRef.current.currentTime = 0;
        splashAudioRef.current.play();
      }
      for (let i = 0; i < 20; i++) {
        const angle = (Math.PI * 2 * i) / 20;
        const speed = 2 + Math.random() * 3;
        particlesRef.current.push({
          x: x,
          y: y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 60,
          maxLife: 60,
          color: 'rgba(56,189,248,0.4)', // transparent blue
        });
      }
    };

    const checkCollisions = () => {
      const berries = berriesRef.current;
      let foundCollision = true;
      while (foundCollision) {
        foundCollision = false;
        for (let i = 0; i < berries.length; i++) {
          for (let j = i + 1; j < berries.length; j++) {
            const berryA = berries[i];
            const berryB = berries[j];
            const dx = berryB.x - berryA.x;
            const dy = berryB.y - berryA.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const combinedRadius = berryA.radius + berryB.radius;
            // Debug log for every collision check
            console.log(`Checking: i=${i} (T${berryA.tier}, ${berryA.affinity}) vs j=${j} (T${berryB.tier}, ${berryB.affinity}), distance=${distance.toFixed(2)}, threshold=${(combinedRadius * 0.8).toFixed(2)}`);
            // Only merge if both are the same tier AND affinity
            if (berryA.tier === berryB.tier && berryA.affinity === berryB.affinity) {
              if (distance < combinedRadius * 0.8) {
                const nextTier = berryA.tier + 1;
                if (nextTier < BERRIES.length) {
                  // Debug log for merge
                  console.log(`Merging berries: T${berryA.tier} + T${berryB.tier} (affinity: ${berryA.affinity}) -> T${nextTier}`);
                  // Remove original berries (always remove higher index first)
                  if (i > j) {
                    console.log(`Removing indices ${i} and ${j}`);
                    berries.splice(i, 1);
                    berries.splice(j, 1);
                  } else {
                    console.log(`Removing indices ${j} and ${i}`);
                    berries.splice(j, 1);
                    berries.splice(i, 1);
                  }
                  // Create merged berry
                  const newBerry = createBerry(
                    (berryA.x + berryB.x) / 2,
                    (berryA.y + berryB.y) / 2,
                    nextTier
                  );
                  berries.push(newBerry);
                  let joyGained = BERRIES[nextTier].score;
                  if (metaState.selectedFuzzling === 'sunny') joyGained *= 1.1;
                  localGameStateRef.current.joy += joyGained;
                  localGameStateRef.current.score += joyGained;
                  setGameState(prev => ({
                    ...prev,
                    score: localGameStateRef.current.score,
                    joy: localGameStateRef.current.joy,
                  }));
                  createFluidSplash(
                    (berryA.x + berryB.x) / 2,
                    (berryA.y + berryB.y) / 2,
                    berryA.color
                  );
                  // Check level up
                  const joyNeeded = JOY_PER_LEVEL[localGameStateRef.current.level] || JOY_PER_LEVEL[JOY_PER_LEVEL.length - 1];
                  if (localGameStateRef.current.joy >= joyNeeded) {
                    localGameStateRef.current.joy -= joyNeeded;
                    localGameStateRef.current.level++;
                    setGameState(prev => ({ ...prev, level: localGameStateRef.current.level, showLevelUp: true }));
                    setTimeout(() => {
                      setGameState(prev => ({ ...prev, showLevelUp: false }));
                    }, 2000);
                  }
                  onMerge();
                  const stardustEarned = joyToStardust(localGameStateRef.current.joy);
                  if (stardustEarned > 0) {
                    setMetaState(prev => ({ ...prev, stardust: prev.stardust + stardustEarned }));
                    localGameStateRef.current.joy -= stardustEarned * 10;
                    saveProgress();
                  }
                  foundCollision = true;
                  break;
                }
              }
            } else if (
              (berryA.affinity === 'sun' && berryB.affinity === 'moon') ||
              (berryA.affinity === 'moon' && berryB.affinity === 'sun')
            ) {
              if (distance < combinedRadius * 0.8) {
                createExplosion((berryA.x + berryB.x) / 2, (berryA.y + berryB.y) / 2, 10, -30);
                localGameStateRef.current.score += 5;
                setGameState(prev => ({ ...prev, score: localGameStateRef.current.score }));
                berries.splice(j, 1);
                berries.splice(i, 1);
                foundCollision = true;
                break;
              }
            } else {
              // If a merge is about to happen for different tiers, log an error
              if (distance < combinedRadius * 0.8 && (berryA.tier !== berryB.tier)) {
                console.error(`ERROR: Attempted merge between different tiers! i=${i} (T${berryA.tier}, ${berryA.affinity}) vs j=${j} (T${berryB.tier}, ${berryB.affinity})`);
              }
            }
          }
          if (foundCollision) break;
        }
      }
    };

    const updatePhysics = () => {
      const berries = berriesRef.current;
      const particles = particlesRef.current;
      
      // Update berries
      berries.forEach(berry => {
        berry.vy += GRAVITY;
        berry.x += berry.vx;
        berry.y += berry.vy;
        
        // Apply friction
        berry.vx *= FRICTION;
        berry.vy *= FRICTION;
        
        // Bounce off walls
        if (berry.x - berry.radius < 0) {
          berry.x = berry.radius;
          berry.vx *= -BOUNCE;
        }
        if (berry.x + berry.radius > canvas!.width) {
          berry.x = canvas!.width - berry.radius;
          berry.vx *= -BOUNCE;
        }
        // Bounce off ground
        const groundHeight = 40;
        const groundY = canvas!.height - groundHeight;
        if (berry.y + berry.radius > groundY) {
          berry.y = groundY - berry.radius;
          if (Math.abs(berry.vy) > 1) {
            berry.vy *= -BOUNCE;
          } else {
            berry.vy = 0;
          }
        }
      });
      
      // Update particles
      particles.forEach((particle, index) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += GRAVITY * 0.5;
        particle.life--;
        
        if (particle.life <= 0) {
          particles.splice(index, 1);
        }
      });
    };

    const render = () => {
      if (destroyed || !ctx || !canvas) return;
      
      console.log('Render function called');
      
      // Update physics
      updatePhysics();
      checkCollisions();
      
      // Clear canvas and draw background
      // Draw a vertical gradient background
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, '#fdf6e3'); // light top
      gradient.addColorStop(1, '#fbc2a4'); // warm bottom
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw ground
      const groundHeight = 40;
      ctx.fillStyle = '#e0b97d'; // sand-like color
      ctx.fillRect(0, canvas.height - groundHeight, canvas.width, groundHeight);
      ctx.strokeStyle = '#bfa76a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, canvas.height - groundHeight);
      ctx.lineTo(canvas.width, canvas.height - groundHeight);
      ctx.stroke();

      // Draw berries
      berriesRef.current.forEach(berry => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(berry.x, berry.y, berry.radius, 0, 2 * Math.PI);
        ctx.shadowColor = berry.color;
        ctx.shadowBlur = 10;
        ctx.fillStyle = berry.color;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#fff';
        ctx.stroke();
        ctx.restore();
      });

      // Draw preview berry
      if (previewBerryRef.current) {
        ctx.save();
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.arc(previewBerryRef.current.x, previewBerryRef.current.y, previewBerryRef.current.radius, 0, 2 * Math.PI);
        ctx.shadowColor = previewBerryRef.current.color;
        ctx.shadowBlur = 10;
        ctx.fillStyle = previewBerryRef.current.color;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#fff';
        ctx.stroke();
        ctx.restore();
      }

      // Draw particles (fluid splash)
      particlesRef.current.forEach(particle => {
        const alpha = particle.life / particle.maxLife;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, 6, 0, 2 * Math.PI);
        ctx.fillStyle = particle.color;
        ctx.shadowColor = particle.color;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.restore();
      });

      // Debug: Draw a test circle in the center
      // ctx.fillStyle = '#00ff00';
      // ctx.beginPath();
      // ctx.arc(canvas.width / 2, canvas.height / 2, 20, 0, 2 * Math.PI);
      // ctx.fill();
      console.log('Debug circle drawn at center');
      console.log('Rendered', berriesRef.current.length, 'berries and', particlesRef.current.length, 'particles');
      
      requestAnimationFrame(render);
    };

    console.log('Calling setup function...');
    setup().catch(error => {
      console.error('Setup failed:', error);
      setGameError('Game initialization failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    });

    return () => {
      destroyed = true;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (canvas && canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
      console.log('Game cleanup completed');
    };
  }, [currentView, gameSessionId, gameState.nextBerryTier, metaState.talents.cozyStart, metaState.selectedFuzzling, metaState.cosmetics.selectedColor]);

  // Game control functions
  const startGame = () => setCurrentView('game');
  const returnToMainMenu = () => setCurrentView('main-menu');

  // Meta-progression functions
  const purchaseTalent = useCallback((talentName: string, cost: number) => {
    if (metaState.stardust >= cost && !metaState.talents[talentName as keyof typeof metaState.talents]) {
      setMetaState(prev => ({
        ...prev,
        stardust: prev.stardust - cost,
        talents: { ...prev.talents, [talentName]: true }
      }));
      saveProgress();
    }
  }, [metaState.stardust, metaState.talents, saveProgress]);

  const purchaseColor = useCallback((color: string, cost: number) => {
    if (metaState.stardust >= cost && !metaState.cosmetics.availableColors[color].unlocked) {
      setMetaState(prev => ({
        ...prev,
        stardust: prev.stardust - cost,
        cosmetics: {
          ...prev.cosmetics,
          availableColors: {
            ...prev.cosmetics.availableColors,
            [color]: { ...prev.cosmetics.availableColors[color], unlocked: true }
          }
        }
      }));
      saveProgress();
    }
  }, [metaState.stardust, metaState.cosmetics.availableColors, saveProgress]);

  const selectColor = useCallback((color: string) => {
    if (metaState.cosmetics.availableColors[color].unlocked) {
      setMetaState(prev => ({
        ...prev,
        cosmetics: { ...prev.cosmetics, selectedColor: color }
      }));
      saveProgress();
    }
  }, [metaState.cosmetics.availableColors, saveProgress]);

  const selectFuzzling = useCallback((type: 'sunny' | 'dusty') => {
    setMetaState(prev => ({ ...prev, selectedFuzzling: type }));
    saveProgress();
  }, [saveProgress]);

  // Score/Joy/Stardust conversion
  const joyToStardust = (joy: number) => Math.floor(joy / 10);
  const endGame = () => {
    // Convert all remaining joy to stardust at game end
    const stardustEarned = joyToStardust(localGameStateRef.current.joy + localGameStateRef.current.score);
    setMetaState(prev => ({ ...prev, stardust: prev.stardust + stardustEarned }));
    
    // Use standardized analytics function
    const totalScore = localGameStateRef.current.score + localGameStateRef.current.joy;
    recordGameSession('fuzzling-advanced', {
      score: totalScore,
      level: localGameStateRef.current.level,
      starsEarned: Math.floor(totalScore / 100),
      xpEarned: totalScore + (localGameStateRef.current.level * 10),
      success: totalScore > 0
    });
    
    saveProgress();
    setCurrentView('post-game');
  };

  // Merge timer logic
  useEffect(() => {
    if (currentView !== 'game' || gameOver) return;
    if (mergeTimer <= 0) {
      setGameOver(true);
      // Play game over sound
      if (gameOverAudioRef.current) {
        gameOverAudioRef.current.currentTime = 0;
        gameOverAudioRef.current.play();
      }
      return;
    }
    const timer = setTimeout(() => setMergeTimer(t => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [mergeTimer, currentView, gameOver]);
  // On each merge, extend timer and increment merges
  const onMerge = () => {
    setMergeTimer(t => t + 2); // 2 seconds per merge
    setMergesThisSession(m => m + 1);
  };
  // In merge logic, call onMerge() after a successful merge

  // Music: start automatically when entering game or pressing restart
  useEffect(() => {
    if (currentView === 'game' && audioRef.current) {
      audioRef.current.volume = musicVolume;
      audioRef.current.currentTime = 0;
      audioRef.current.play();
    }
  }, [currentView, musicVolume]);

  // Only play game over music when game over is triggered
  useEffect(() => {
    if (gameOver && gameOverAudioRef.current) {
      gameOverAudioRef.current.currentTime = 0;
      gameOverAudioRef.current.play();
    }
  }, [gameOver]);

  // Rain and wind burst effect state
  const [raining, setRaining] = useState(false);
  const [wind, setWind] = useState<{active: boolean, strength: number}>({active: false, strength: 0});
  const rainTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const windTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Rain and wind burst logic (interval)
  useEffect(() => {
    if (currentView !== 'game' || gameOver) return;
    const interval = setInterval(() => {
      // Randomly decide if rain, wind, or both happen
      const rainHappens = Math.random() < 0.5;
      const windHappens = Math.random() < 0.5;
      if (rainHappens) {
        setRaining(true);
        if (rainTimeoutRef.current) clearTimeout(rainTimeoutRef.current);
        rainTimeoutRef.current = setTimeout(() => setRaining(false), 7000); // 7 second burst
      }
      if (windHappens) {
        let strength = (Math.random() - 0.5) * 8;
        // If wind only (no rain), make it 30% stronger and show wind particles
        if (windHappens && !rainHappens) {
          strength *= 1.3;
          // Spawn wind particles for the duration of the wind burst
          const windParticleCount = 24;
          for (let i = 0; i < windParticleCount; i++) {
            const y = Math.random() * (canvasRef.current?.height || 600);
            const x = strength > 0 ? -20 : (canvasRef.current?.width || 800) + 20;
            const vx = strength > 0 ? Math.abs(strength) * 2 : -Math.abs(strength) * 2;
            particlesRef.current.push({
              x,
              y,
              vx,
              vy: (Math.random() - 0.5) * 0.5,
              life: 70,
              maxLife: 70,
              color: 'rgba(255,255,255,0.7)',
            });
          }
        }
        setWind({active: true, strength});
        if (windTimeoutRef.current) clearTimeout(windTimeoutRef.current);
        windTimeoutRef.current = setTimeout(() => setWind({active: false, strength: 0}), 7000); // 7 second burst
      }
    }, 7000);
    return () => { clearInterval(interval); };
  }, [currentView, gameOver]);

  // Rain and wind burst effect application (frame loop)
  useEffect(() => {
    if (currentView !== 'game' || gameOver) return;
    let rainFrame: number | null = null;
    let windFrame: NodeJS.Timeout | null = null;
    function rainLoop() {
      if (raining) {
        for (let i = 0; i < 2; i++) {
          const x = Math.random() * (canvasRef.current?.width || 800);
          const y = -10;
          const speed = 2 + Math.random() * 2;
          particlesRef.current.push({
            x,
            y,
            vx: 0,
            vy: speed,
            life: 60,
            maxLife: 60,
            color: '#38bdf8',
          });
        }
        // Make balls slip in different directions while raining
        berriesRef.current.forEach(berry => {
          berry.vx += (Math.random() - 0.5) * 0.8;
        });
        rainFrame = requestAnimationFrame(rainLoop);
      }
    }
    function windLoop() {
      if (wind.active) {
        berriesRef.current.forEach(berry => {
          berry.vx += wind.strength * 0.1;
        });
        windFrame = setTimeout(windLoop, 100);
      }
    }
    if (raining) rainLoop();
    if (wind.active) windLoop();
    return () => {
      if (rainFrame) cancelAnimationFrame(rainFrame);
      if (windFrame) clearTimeout(windFrame);
    };
  }, [currentView, gameOver, raining, wind.active, wind.strength]);
  // Clean up rain/wind timers on game end or view change
  useEffect(() => {
    return () => {
      if (rainTimeoutRef.current) clearTimeout(rainTimeoutRef.current);
      if (windTimeoutRef.current) clearTimeout(windTimeoutRef.current);
    };
  }, [currentView, gameOver]);

  // At the top of the main menu, add a premium star SVG for stardust
  const PlushyStar = () => <PremiumStar size={48} />;

  // Main menu tabs state
  const [mainMenuTab, setMainMenuTab] = useState<'play' | 'shop'>('play');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-2xl w-4/5 h-4/5 relative flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 bg-gray-700 rounded-t-lg">
          <h2 className="text-4xl font-extrabold text-cyan-300 drop-shadow-[0_0_16px_#22d3ee] tracking-wide pl-2" style={{ textShadow: '0 0 16px #22d3ee, 0 0 4px #ffe066, 0 0 2px #fff' }}>
            Fuzzling's <span className="text-yellow-300">Advanced Playpen</span>
          </h2>
          <div className="flex items-center space-x-2">
            <button onClick={onClose} className="p-2 text-white hover:bg-gray-600 rounded">
              <X size={20} />
            </button>
          </div>
        </div>
        {/* Game Container */}
        <div className="relative flex-1 overflow-hidden min-h-[400px]">
          {/* Debug info */}
          <div className="absolute top-2 left-2 text-white text-xs z-30">
            View: {currentView} | Error: {gameError ? 'Yes' : 'No'}
            <br />Music: {currentTrack.name}
          </div>
          {/* Error Display */}
          {gameError && (
            <div className="absolute inset-0 bg-gray-800 bg-opacity-90 flex items-center justify-center z-20">
              <div className="bg-gray-700 p-8 rounded-lg text-center max-w-md">
                <h3 className="text-xl font-bold text-red-400 mb-4">Game Error</h3>
                <p className="text-white mb-6">{gameError}</p>
                <button onClick={returnToMainMenu} className="px-6 py-3 bg-pink-500 text-white font-bold rounded-lg hover:bg-pink-600 transition-colors">
                  Return to Menu
                </button>
              </div>
            </div>
          )}
          {/* Main Menu */}
          {currentView === 'main-menu' && !gameError && (
            <div className={`absolute inset-0 flex flex-col items-center justify-start bg-gray-800 bg-opacity-90 z-10 ${isFullscreen ? 'max-w-3xl max-h-[98vh]' : 'max-w-xl max-h-[80vh]'} mx-auto my-8 rounded-3xl shadow-2xl p-6 overflow-y-auto`}> 
              <div className="flex flex-col items-center w-full">
                <div className="flex flex-row items-center gap-3 mb-2">
                  <PlushyStar />
                  <span className="text-3xl font-extrabold text-yellow-400 drop-shadow-lg">{`Stardust: ${metaState.stardust}`}</span>
                </div>
                <div className="flex flex-row gap-4 mb-6">
                  <button className={`px-6 py-2 rounded-full text-lg font-bold shadow-md transition-all duration-200 border-2 ${mainMenuTab === 'play' ? 'bg-pink-400 text-white border-pink-600 scale-105' : 'bg-gray-200 text-gray-700 border-gray-400 hover:bg-pink-100'}`} onClick={() => setMainMenuTab('play')}>Play</button>
                  <button className={`px-6 py-2 rounded-full text-lg font-bold shadow-md transition-all duration-200 border-2 ${mainMenuTab === 'shop' ? 'bg-blue-400 text-white border-blue-600 scale-105' : 'bg-gray-200 text-gray-700 border-gray-400 hover:bg-blue-100'}`} onClick={() => setMainMenuTab('shop')}>Shop</button>
                </div>
                {mainMenuTab === 'play' && (
                  <div className="flex flex-col items-center w-full gap-6">
                    <button className="w-full px-8 py-4 rounded-full bg-green-400 hover:bg-green-500 text-white text-2xl font-extrabold shadow-lg transition-all duration-200 border-4 border-green-600 drop-shadow-lg mb-4" onClick={startGame}>Start Game</button>
                    <div className="w-full flex flex-col items-center gap-4 p-6 bg-white bg-opacity-80 rounded-2xl shadow-inner">
                      <h3 className="text-2xl font-bold text-cyan-500 mb-2">Choose your Fuzzling:</h3>
                      <div className="flex flex-row gap-6">
                        <button className={`px-6 py-3 rounded-2xl font-bold text-lg shadow-md border-2 ${metaState.selectedFuzzling === 'sunny' ? 'bg-yellow-200 border-yellow-400 scale-105' : 'bg-gray-100 border-gray-300 hover:bg-yellow-100'}`} onClick={() => selectFuzzling('sunny')}>Sunny Fuzzling<br /><span className="text-green-700 text-base font-normal">+10% Joy Gain</span></button>
                        <button className={`px-6 py-3 rounded-2xl font-bold text-lg shadow-md border-2 ${metaState.selectedFuzzling === 'dusty' ? 'bg-purple-200 border-purple-400 scale-105' : 'bg-gray-100 border-gray-300 hover:bg-purple-100'}`} onClick={() => selectFuzzling('dusty')}>Dusty Fuzzling<br /><span className="text-purple-700 text-base font-normal">Berries are slipperier</span></button>
                      </div>
                    </div>
                  </div>
                )}
                {mainMenuTab === 'shop' && (
                  <div className="flex flex-col items-center w-full gap-6">
                    <div className="w-full flex flex-col md:flex-row gap-6">
                      <div className="flex-1 p-6 bg-white bg-opacity-90 rounded-2xl shadow-inner plushy-talent">
                        <h3 className="text-xl font-bold text-cyan-500 mb-4">Talent Tree</h3>
                        <div className="space-y-3">
                          <div className="bg-gray-100 p-4 rounded-xl shadow plushy-talent">
                            <div className="font-bold">Bigger Playpen</div>
                            <div className="text-sm text-gray-500">Cost: 100 Stardust</div>
                            <button onClick={() => purchaseTalent('biggerPlaypen', 100)} disabled={metaState.talents.biggerPlaypen || metaState.stardust < 100} className="mt-2 px-4 py-2 bg-orange-400 text-white rounded hover:bg-orange-500 disabled:bg-gray-400 disabled:cursor-not-allowed font-bold shadow plushy-btn">
                              {metaState.talents.biggerPlaypen ? 'Purchased' : 'Purchase'}
                            </button>
                          </div>
                          <div className="bg-gray-100 p-4 rounded-xl shadow plushy-talent">
                            <div className="font-bold">Cozy Start</div>
                            <div className="text-sm text-gray-500">Cost: 250 Stardust</div>
                            <button onClick={() => purchaseTalent('cozyStart', 250)} disabled={metaState.talents.cozyStart || metaState.stardust < 250} className="mt-2 px-4 py-2 bg-orange-400 text-white rounded hover:bg-orange-500 disabled:bg-gray-400 disabled:cursor-not-allowed font-bold shadow plushy-btn">
                              {metaState.talents.cozyStart ? 'Purchased' : 'Purchase'}
                            </button>
                          </div>
                          <div className="bg-gray-100 p-4 rounded-xl shadow plushy-talent">
                            <div className="font-bold">Affinity Attunement</div>
                            <div className="text-sm text-gray-500">Cost: 400 Stardust</div>
                            <button onClick={() => purchaseTalent('affinityAttunement', 400)} disabled={metaState.talents.affinityAttunement || metaState.stardust < 400} className="mt-2 px-4 py-2 bg-orange-400 text-white rounded hover:bg-orange-500 disabled:bg-gray-400 disabled:cursor-not-allowed font-bold shadow plushy-btn">
                              {metaState.talents.affinityAttunement ? 'Purchased' : 'Purchase'}
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="flex-1 p-6 bg-white bg-opacity-90 rounded-2xl shadow-inner plushy-colors">
                        <h3 className="text-xl font-bold text-cyan-500 mb-4">Fuzzling Colors</h3>
                        <p className="text-sm text-gray-500 mb-3">Unlock new colors for 50 Stardust each.</p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(metaState.cosmetics.availableColors).map(([color, data]) => (
                            <button key={color} onClick={() => purchaseColor(color, 50)} disabled={data.unlocked || metaState.stardust < 50} className={`w-8 h-8 rounded-full border-4 ${data.unlocked ? 'border-yellow-400' : 'border-gray-300'} shadow plushy-btn`} style={{ background: color }} title={data.unlocked ? 'Unlocked' : 'Locked'}></button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          {/* Post Game Screen */}
          {currentView === 'post-game' && (
            <div className="absolute inset-0 bg-gray-800 bg-opacity-90 flex items-center justify-center z-10">
              <div className="bg-gray-700 p-8 rounded-lg text-center">
                <h2 className="text-3xl font-bold text-cyan-400 mb-4">Naptime!</h2>
                <h3 className="text-xl text-white mb-2">Final Joy: {gameState.score}</h3>
                <h3 className="text-xl text-yellow-400 mb-6">Stardust Earned: {Math.floor(gameState.score / 10)}</h3>
                <button onClick={returnToMainMenu} className="px-6 py-3 bg-pink-500 text-white font-bold rounded-lg hover:bg-pink-600 transition-colors">
                  Play Again
                </button>
              </div>
            </div>
          )}
          {/* In-Game UI */}
          {currentView === 'game' && (
            <>
              <div className="absolute top-2 right-2 z-30">
                <div className="rounded-xl px-4 py-2 bg-gray-900 bg-opacity-90 shadow-xl flex flex-col gap-1 items-end border-2 border-cyan-500" style={{ minWidth: 140, fontSize: '0.95rem' }}>
                  <div className="font-extrabold" style={{
                    color: '#06b6d4',
                    textShadow: '0 0 4px #06b6d4, 0 0 1px #fff',
                    WebkitTextStroke: '1px #fff',
                    textStroke: '1px #fff',
                  }}>
                    Score: <span style={{ color: '#fbbf24' }}>{Number(gameState.score).toFixed(1)}</span>
                  </div>
                  <div className="font-bold" style={{
                    color: '#fbbf24',
                    textShadow: '0 0 4px #fbbf24, 0 0 1px #fff',
                    WebkitTextStroke: '1px #fff',
                    textStroke: '1px #fff',
                  }}>
                    Stardust: <span style={{ color: '#fde68a' }}>{Math.round(metaState.stardust)}</span>
                  </div>
                  <div className="font-bold" style={{
                    color: '#22c55e',
                    textShadow: '0 0 4px #22c55e, 0 0 1px #fff',
                    WebkitTextStroke: '1px #fff',
                    textStroke: '1px #fff',
                  }}>
                    Joy: <span style={{ color: '#bbf7d0' }}>{Number(gameState.joy).toFixed(1)}</span>
                  </div>
                  <div className="font-bold" style={{
                    color: '#ec4899',
                    textShadow: '0 0 4px #ec4899, 0 0 1px #fff',
                    WebkitTextStroke: '1px #fff',
                    textStroke: '1px #fff',
                  }}>
                    Time Left: <span style={{ color: '#f9a8d4' }}>{Math.round(mergeTimer)}s</span>
                  </div>
                  <div className="font-bold mt-1" style={{
                    color: '#22d3ee',
                    textShadow: '0 0 2px #22d3ee, 0 0 1px #fff',
                    WebkitTextStroke: '0.5px #fff',
                    textStroke: '0.5px #fff',
                    fontSize: '0.85em',
                  }}>
                    Every 10 Joy = 1 Stardust (awarded at game end)
                  </div>
                </div>
              </div>
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-5 text-white text-2xl font-bold">
                Joy: {gameState.score}
              </div>
              {gameState.showEventWarning && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 text-red-500 text-4xl font-bold animate-pulse">
                  {gameState.eventWarning}
                </div>
              )}
              {gameOver && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-70 z-50">
                  <div className="text-4xl font-bold text-red-400 mb-8">Game Over</div>
                  <div className="flex flex-row gap-6">
                    <button
                      className="px-8 py-4 rounded-full bg-green-400 hover:bg-green-500 text-white text-2xl font-extrabold shadow-lg transition-all duration-200 border-4 border-green-600 drop-shadow-lg"
                      style={{ boxShadow: '0 8px 24px 0 rgba(34,197,94,0.3), 0 1.5px 0 0 #166534' }}
                      onClick={() => {
                        setCurrentView('game');
                        setGameOver(false);
                        setMergeTimer(30);
                        setMergesThisSession(0);
                        setGameState({
                          score: 0,
                          joy: 0,
                          level: 1,
                          gameOver: false,
                          showLevelUp: false,
                          showGameOver: false,
                          eventWarning: '',
                          showEventWarning: false,
                          nextBerryTier: 0,
                        });
                        // Re-initialize refs
                        if (berriesRef.current) berriesRef.current = [];
                        if (particlesRef.current) particlesRef.current = [];
                        if (previewBerryRef.current) previewBerryRef.current = null;
                        if (canDropRef.current !== undefined) canDropRef.current = true;
                        localGameStateRef.current = {
                          score: metaState.talents.cozyStart ? 50 : 0,
                          joy: 0,
                          level: 1,
                          gameOver: false,
                        };
                        // Remove and re-add canvas to fully reset
                        if (gameContainerRef.current) {
                          const canvas = gameContainerRef.current.querySelector('canvas');
                          if (canvas) canvas.remove();
                        }
                        setGameSessionId(id => id + 1);
                      }}
                    >
                      Restart
                    </button>
                    <button
                      className="px-8 py-4 rounded-full bg-blue-400 hover:bg-blue-500 text-white text-2xl font-extrabold shadow-lg transition-all duration-200 border-4 border-blue-600 drop-shadow-lg"
                      style={{ boxShadow: '0 8px 24px 0 rgba(59,130,246,0.3), 0 1.5px 0 0 #1e40af' }}
                      onClick={() => {
                        setCurrentView('main-menu');
                        setGameOver(false);
                      }}
                    >
                      Main Menu
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
          {/* Game Canvas Container */}
          <div ref={gameContainerRef} className="w-full h-full bg-gray-900" />
        </div>
        {/* Audio Elements */}
        <audio ref={audioRef} loop preload="auto">
          <source src={currentTrack.src} type="audio/mpeg" />
        </audio>
        <audio ref={splashAudioRef} preload="auto">
          <source src="/assets/music/water-splash-102492.mp3" type="audio/mpeg" />
        </audio>
        <audio ref={gameOverAudioRef} preload="auto">
          <source src="/assets/music/game-over-38511.mp3" type="audio/mpeg" />
        </audio>
        <audio ref={explosionAudioRef} src="/assets/music/pixel-explosion-319166.mp3" preload="auto" />
      </div>
    </div>
  );
};

export default FuzzlingAdvancedGame; 