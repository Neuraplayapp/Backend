import React, { useRef, useEffect, useState } from 'react';
import { useUser } from '../../contexts/UserContext';
import { Star, Trophy } from 'lucide-react';

// Berry Blaster Game React Component
const BerryBlasterGame: React.FC<{ onRequestFullscreen?: () => void }> = ({ onRequestFullscreen }) => {
  const { user, addXP, addStars, updateGameProgress, recordGameSession } = useUser();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const shootAudioRef = useRef<HTMLAudioElement | null>(null);
  const explosionAudioRef = useRef<HTMLAudioElement | null>(null);
  const gameOverAudioRef = useRef<HTMLAudioElement | null>(null);

  const [score, setScore] = useState(0);
  const [wave, setWave] = useState(1);
  const [showMenu, setShowMenu] = useState(true); // Main menu page
  const [showGameOver, setShowGameOver] = useState(false);
  const [modalScore, setModalScore] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  // --- Upgrades ---
  const [doubleFire, setDoubleFire] = useState(false);
  const [tripleFire, setTripleFire] = useState(false);
  const [continuousFire, setContinuousFire] = useState(false);
  const [fireRate, setFireRate] = useState(180); // ms between shots
  const [isFiring, setIsFiring] = useState(false);
  const fireIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [upgradeError, setUpgradeError] = useState('');
  // --- Timer for wave progression ---
  const [gameTime, setGameTime] = useState(0);
  const gameTimerRef = useRef<NodeJS.Timeout | null>(null);
  // --- Menu page state ---
  const [menuPage, setMenuPage] = useState<'main' | 'shop'>('main');

  // Game objects
  const animationId = useRef<number | null>(null);
  const spawnInterval = useRef<NodeJS.Timeout | null>(null);
  const projectiles = useRef<any[]>([]);
  const enemies = useRef<any[]>([]);
  const particles = useRef<any[]>([]);

  // Player (Turret)
  const player = useRef({
    x: 0,
    y: 0,
    radius: 20,
    color: 'hsl(200, 50%, 50%)',
  });

  // --- Resize canvas for larger game area ---
  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (canvas && container) {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      player.current.x = canvas.width / 2;
      player.current.y = canvas.height - 40; // Always 40px above the bottom
    }
  };

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  // --- Classes for Game Objects ---
  class Projectile {
    x: number; y: number; radius: number; color: string; velocity: {x: number, y: number};
    constructor(x: number, y: number, radius: number, color: string, velocity: {x: number, y: number}) {
      this.x = x; this.y = y; this.radius = radius; this.color = color; this.velocity = velocity;
    }
    draw(ctx: CanvasRenderingContext2D) {
      ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
      ctx.fillStyle = this.color; ctx.fill();
    }
    update(ctx: CanvasRenderingContext2D) {
      this.draw(ctx); this.x += this.velocity.x; this.y += this.velocity.y;
    }
  }
  class Enemy {
    x: number; y: number; radius: number; color: string; velocity: {x: number, y: number}; health: number; initialRadius: number;
    constructor(x: number, y: number, radius: number, color: string, velocity: {x: number, y: number}, health: number) {
      this.x = x; this.y = y; this.radius = radius; this.color = color; this.velocity = velocity; this.health = health; this.initialRadius = radius;
    }
    draw(ctx: CanvasRenderingContext2D) {
      ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
      ctx.save(); ctx.shadowColor = this.color; ctx.shadowBlur = 15;
      ctx.fillStyle = this.color; ctx.fill(); ctx.restore();
    }
    update(ctx: CanvasRenderingContext2D) {
      this.draw(ctx); this.y += this.velocity.y;
    }
  }
  const friction = 0.99;
  class Particle {
    x: number; y: number; radius: number; color: string; velocity: {x: number, y: number}; alpha: number;
    constructor(x: number, y: number, radius: number, color: string, velocity: {x: number, y: number}) {
      this.x = x; this.y = y; this.radius = radius; this.color = color; this.velocity = velocity; this.alpha = 1;
    }
    draw(ctx: CanvasRenderingContext2D) {
      ctx.save(); ctx.globalAlpha = this.alpha;
      ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
      ctx.fillStyle = this.color; ctx.fill(); ctx.restore();
    }
    update(ctx: CanvasRenderingContext2D) {
      this.draw(ctx);
      this.velocity.x *= friction; this.velocity.y *= friction;
      this.x += this.velocity.x; this.y += this.velocity.y;
      this.alpha -= 0.01;
    }
  }

  // --- Game Logic ---
  function init() {
    setScore(0); setWave(1); setGameTime(0);
    projectiles.current = [];
    enemies.current = [];
    particles.current = [];
    setModalScore(0);
    if (spawnInterval.current) clearInterval(spawnInterval.current);
    if (gameTimerRef.current) clearInterval(gameTimerRef.current);
  }

  // --- Wave progression by time ---
  useEffect(() => {
    if (!isRunning) return;
    gameTimerRef.current = setInterval(() => {
      setGameTime(t => t + 1);
    }, 1000);
    return () => { if (gameTimerRef.current) clearInterval(gameTimerRef.current); };
  }, [isRunning]);

  useEffect(() => {
    if (!isRunning) return;
    // Wave 2 at 10s, 3 at 20s, 4 at 30s, etc.
    if (gameTime === 10) { setWave(2); spawnEnemies(2); }
    if (gameTime === 20) { setWave(3); spawnEnemies(3); }
    if (gameTime === 30) { setWave(4); spawnEnemies(4); }
    // Add more if needed
  }, [gameTime, isRunning]);

  function spawnEnemies(waveNum: number) {
    if (spawnInterval.current) clearInterval(spawnInterval.current);
    spawnInterval.current = setInterval(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const radius = Math.random() * (30 - 10) + 10;
      const x = Math.random() * canvas.width;
      const y = -radius;
      const color = `hsl(${Math.random() * 360}, 70%, 60%)`;
      // Increase speed by 10% per wave
      const baseSpeed = 0.5 + waveNum * 0.1;
      const speed = baseSpeed * Math.pow(1.1, waveNum - 1);
      const velocity = { x: 0, y: speed };
      const health = Math.ceil(radius / 10);
      enemies.current.push(new Enemy(x, y, radius, color, velocity, health));
    }, 1200 - waveNum * 50);
  }

  function checkWaveCompletion() {
    if (enemies.current.length === 0) {
      setWave(w => w + 1);
      spawnEnemies(wave + 1);
    }
  }

  function animate() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    animationId.current = requestAnimationFrame(animate);
    ctx.fillStyle = 'rgba(10, 10, 20, 0.2)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Draw Player Turret Base
    ctx.beginPath();
    ctx.arc(player.current.x, player.current.y, player.current.radius, 0, Math.PI, true);
    ctx.fillStyle = player.current.color;
    ctx.fill();
    // Particles
    particles.current.forEach((particle, index) => {
      if (particle.alpha <= 0) {
        particles.current.splice(index, 1);
      } else {
        particle.update(ctx);
      }
    });
    // Projectiles
    projectiles.current.forEach((projectile, index) => {
      projectile.update(ctx);
      if (
        projectile.x + projectile.radius < 0 ||
        projectile.x - projectile.radius > canvas.width ||
        projectile.y + projectile.radius < 0 ||
        projectile.y - projectile.radius > canvas.height
      ) {
        setTimeout(() => {
          projectiles.current.splice(index, 1);
        }, 0);
      }
    });
    // Enemies
    enemies.current.forEach((enemy, enemyIndex) => {
      enemy.update(ctx);
      // Game Over condition
      if (enemy.y - enemy.radius > canvas.height) {
        if (animationId.current) cancelAnimationFrame(animationId.current);
        if (spawnInterval.current) clearInterval(spawnInterval.current);
        handleGameOver();
      }
      // Collision detection
      projectiles.current.forEach((projectile, projectileIndex) => {
        const dist = Math.hypot(projectile.x - enemy.x, projectile.y - enemy.y);
        if (dist - enemy.radius - projectile.radius < 1) {
          // Create explosion particles
          for (let i = 0; i < enemy.radius * 0.5; i++) {
            particles.current.push(new Particle(
              projectile.x,
              projectile.y,
              Math.random() * 3,
              enemy.color,
              {
                x: (Math.random() - 0.5) * (Math.random() * 6),
                y: (Math.random() - 0.5) * (Math.random() * 6)
              }
            ));
          }
          // Handle enemy getting hit
          if (enemy.radius - 5 > 5) {
            setScore(s => s + 50);
            // Damage shrink effect (no gsap, just shrink)
            enemy.radius -= 5;
            setTimeout(() => {
              projectiles.current.splice(projectileIndex, 1);
            }, 0);
          } else {
            setScore(s => s + 150);
            setTimeout(() => {
              enemies.current.splice(enemyIndex, 1);
              projectiles.current.splice(projectileIndex, 1);
              checkWaveCompletion();
            }, 0);
          }
          // Play explosion sound
          if (explosionAudioRef.current) { explosionAudioRef.current.currentTime = 0; explosionAudioRef.current.play(); }
        }
      });
    });
  }

  // --- Upgrades ---
  const handleUpgrade = (type: 'double' | 'triple' | 'continuous') => {
    if (type === 'double') {
      if (doubleFire) return;
      if (score >= 500) {
        setScore(s => s - 500);
        setDoubleFire(true);
        setTripleFire(false);
        setContinuousFire(false);
        setUpgradeError('');
      } else {
        setUpgradeError('Not enough score!');
      }
    } else if (type === 'triple') {
      if (tripleFire) return;
      if (score >= 2000) {
        setScore(s => s - 2000);
        setTripleFire(true);
        setDoubleFire(false);
        setContinuousFire(false);
        setUpgradeError('');
      } else {
        setUpgradeError('Not enough score!');
      }
    } else if (type === 'continuous') {
      if (continuousFire) return;
      if (score >= 3000) {
        setScore(s => s - 3000);
        setContinuousFire(true);
        setDoubleFire(false);
        setTripleFire(false);
        setUpgradeError('');
      } else {
        setUpgradeError('Not enough score!');
      }
    }
  };

  // --- Firing logic ---
  function fireProjectiles(angle: number) {
    const speed = 8;
    // Single shot
    projectiles.current.push(new Projectile(
      player.current.x,
      player.current.y,
      5,
      '#FFFFFF',
      { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed }
    ));
    // Double fire: 2 projectiles, 12deg spread
    if (doubleFire && !tripleFire && !continuousFire) {
      const spread = 12 * Math.PI / 180;
      [angle - spread, angle + spread].forEach(a => {
        projectiles.current.push(new Projectile(
          player.current.x,
          player.current.y,
          5,
          '#FFFFFF',
          { x: Math.cos(a) * speed, y: Math.sin(a) * speed }
        ));
      });
    }
    // Triple fire: 3 projectiles, -12, 0, +12 deg
    if (tripleFire && !continuousFire) {
      const spread = 12 * Math.PI / 180;
      [angle - spread, angle, angle + spread].forEach(a => {
        projectiles.current.push(new Projectile(
          player.current.x,
          player.current.y,
          5,
          '#FFFFFF',
          { x: Math.cos(a) * speed, y: Math.sin(a) * speed }
        ));
      });
    }
    // Continuous fire: use triple if purchased, else single
    if (continuousFire) {
      const spread = 12 * Math.PI / 180;
      [angle - spread, angle, angle + spread].forEach(a => {
        projectiles.current.push(new Projectile(
          player.current.x,
          player.current.y,
          5,
          '#FFFFFF',
          { x: Math.cos(a) * speed, y: Math.sin(a) * speed }
        ));
      });
    }
    if (shootAudioRef.current) { shootAudioRef.current.currentTime = 0; shootAudioRef.current.play(); }
  }

  // --- Mouse event logic for continuous fire ---
  useEffect(() => {
    if (!isRunning) return;
    function handleMouseDown(event: MouseEvent) {
      if (!continuousFire) return;
      setIsFiring(true);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const angle = Math.atan2(
        event.clientY - rect.top - player.current.y,
        event.clientX - rect.left - player.current.x
      );
      fireProjectiles(angle);
      fireIntervalRef.current = setInterval(() => {
        fireProjectiles(angle);
      }, fireRate);
    }
    function handleMouseUp() {
      setIsFiring(false);
      if (fireIntervalRef.current) clearInterval(fireIntervalRef.current);
    }
    if (continuousFire) {
      window.addEventListener('mousedown', handleMouseDown);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('mouseleave', handleMouseUp);
    }
    return () => {
      if (continuousFire) {
        window.removeEventListener('mousedown', handleMouseDown);
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('mouseleave', handleMouseUp);
        if (fireIntervalRef.current) clearInterval(fireIntervalRef.current);
      }
    };
  }, [isRunning, continuousFire, fireRate]);

  // --- Single/double/triple fire on click (if not continuous) ---
  useEffect(() => {
    if (!isRunning) return;
    function handleClick(event: MouseEvent) {
      if (continuousFire) return; // handled by mousedown
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const angle = Math.atan2(
        event.clientY - rect.top - player.current.y,
        event.clientX - rect.left - player.current.x
      );
      fireProjectiles(angle);
    }
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [isRunning, doubleFire, tripleFire, continuousFire]);

  // --- Game Over Handler ---
  function handleGameOver() {
    setShowGameOver(true);
    setIsRunning(false);
    setModalScore(score);
    
    // Use standardized analytics function
    recordGameSession('berry-blaster', {
      score: score,
      level: wave,
      starsEarned: Math.floor(score / 100),
      xpEarned: score + (wave * 5),
      success: score > 0
    });
    
    // Play local game over sound
    const audio = new Audio('/assets/music/game-over-38511.mp3');
    audio.play();
  }

  // --- Modal Button Handlers ---
  const handleStartGame = () => {
    init();
    setShowMenu(false);
    setShowGameOver(false);
    setIsRunning(true);
    setGameState('playing');
    animate();
    spawnEnemies(1);
  };
  const handleReturnToMenu = () => {
    setShowMenu(true);
    setShowGameOver(false);
    setIsRunning(false);
    setModalScore(score);
    setMenuPage('main');
  };

  // --- Render ---
  return (
    <div ref={containerRef} className="relative w-full h-full">
      <canvas ref={canvasRef} className="block cursor-crosshair w-full h-full" />
      {/* UI Overlay - only show when game is running */}
      {!showMenu && !showGameOver && (
        <div className="absolute inset-0 p-6 flex justify-between items-start pointer-events-none">
          <div className="bg-black/50 text-white p-4 rounded-xl shadow-lg border-2 border-white/30">
            <h2 className="font-bangers text-4xl text-yellow-300 tracking-wider">SCORE</h2>
            <p className="font-bangers text-5xl text-white text-center">{score}</p>
          </div>
          <div className="bg-black/50 text-white p-4 rounded-xl shadow-lg border-2 border-white/30">
            <h2 className="font-bangers text-4xl text-green-300 tracking-wider">WAVE</h2>
            <p className="font-bangers text-5xl text-white text-center">{wave}</p>
          </div>
        </div>
      )}
      {/* Main Menu and Shop UI */}
      {showMenu && menuPage === 'main' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-40 text-center text-white p-4">
          <div className="w-full max-w-xl mx-auto flex flex-col items-center justify-center">
            <h1 className="font-bangers text-7xl md:text-8xl tracking-widest mb-2" style={{ textShadow: '0 0 20px #fff' }}>BERRY BLASTER</h1>
            <p className="text-3xl font-bold my-2">Score: {modalScore}</p>
            <div className="flex flex-col gap-4 w-full mt-6">
              <button onClick={handleStartGame} className="game-ui-button font-bangers text-4xl bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white px-10 py-4 rounded-full shadow-lg border-4 border-white/50 pointer-events-auto w-full">Start Game</button>
              <button onClick={() => setMenuPage('shop')} className="game-ui-button font-bangers text-3xl bg-gradient-to-r from-purple-400 to-pink-500 hover:from-purple-500 hover:to-pink-600 text-white px-8 py-3 rounded-full shadow-lg border-4 border-white/50 pointer-events-auto w-full">Shop</button>
            </div>
          </div>
        </div>
      )}
      {showMenu && menuPage === 'shop' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/95 z-50 text-center text-white p-4">
          <div className="w-full max-w-lg mx-auto flex flex-col items-center justify-center bg-black/80 rounded-2xl p-8 shadow-2xl border-2 border-white/20">
            <h2 className="font-bangers text-5xl mb-4">Shop</h2>
            <div className="mb-6 w-full flex flex-col items-center gap-4">
              <button
                onClick={() => handleUpgrade('double')}
                disabled={doubleFire || tripleFire || continuousFire}
                className={`px-8 py-4 rounded-lg text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 shadow-lg border-2 border-white/30 w-full ${doubleFire || tripleFire || continuousFire ? 'opacity-50 cursor-not-allowed' : 'hover:from-purple-500 hover:to-pink-600'}`}
              >
                {doubleFire ? 'Double Fire (Owned)' : 'Double Fire (500 Score)'}
              </button>
              <button
                onClick={() => handleUpgrade('triple')}
                disabled={tripleFire || continuousFire}
                className={`px-8 py-4 rounded-lg text-2xl font-bold bg-gradient-to-r from-yellow-400 to-red-500 shadow-lg border-2 border-white/30 w-full ${tripleFire || continuousFire ? 'opacity-50 cursor-not-allowed' : 'hover:from-yellow-500 hover:to-red-600'}`}
              >
                {tripleFire ? 'Triple Fire (Owned)' : 'Triple Fire (2000 Score)'}
              </button>
              <button
                onClick={() => handleUpgrade('continuous')}
                disabled={continuousFire}
                className={`px-8 py-4 rounded-lg text-2xl font-bold bg-gradient-to-r from-blue-400 to-green-500 shadow-lg border-2 border-white/30 w-full ${continuousFire ? 'opacity-50 cursor-not-allowed' : 'hover:from-blue-500 hover:to-green-600'}`}
              >
                {continuousFire ? 'Continuous Fire (Owned)' : 'Continuous Fire (3000 Score)'}
              </button>
              {upgradeError && <div className="text-red-400 font-bold mt-2">{upgradeError}</div>}
            </div>
            <button onClick={() => setMenuPage('main')} className="game-ui-button font-bangers text-2xl bg-gradient-to-r from-gray-400 to-gray-700 hover:from-gray-500 hover:to-gray-800 text-white px-8 py-3 rounded-full shadow-lg border-4 border-white/50 pointer-events-auto w-full">Back to Menu</button>
          </div>
        </div>
      )}
      {/* Game Over Overlay */}
      {showGameOver && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-40 text-center text-white">
          <h1 className="font-bangers text-7xl md:text-8xl tracking-widest mb-4" style={{ textShadow: '0 0 20px #fff' }}>Game Over</h1>
          <p className="text-4xl font-bold my-4">Score: {modalScore}</p>
          <div className="flex flex-col gap-4 mt-4">
            <button onClick={handleStartGame} className="game-ui-button font-bangers text-4xl bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white px-10 py-4 rounded-full shadow-lg border-4 border-white/50 pointer-events-auto">Restart Game</button>
            <button onClick={handleReturnToMenu} className="game-ui-button font-bangers text-3xl bg-gradient-to-r from-purple-400 to-pink-500 hover:from-purple-500 hover:to-pink-600 text-white px-8 py-3 rounded-full shadow-lg border-4 border-white/50 pointer-events-auto">Main Menu</button>
          </div>
        </div>
      )}
      {/* Audio Elements */}
      <audio ref={shootAudioRef} src="/assets/music/laser-shoot.wav" preload="auto" />
      <audio ref={explosionAudioRef} src="/assets/music/explosion.wav" preload="auto" />
    </div>
  );
};

export default BerryBlasterGame; 