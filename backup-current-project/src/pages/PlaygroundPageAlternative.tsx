import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '../contexts/UserContext';
import { 
  Brain, 
  Trophy, 
  Star, 
  Users, 
  BarChart3, 
  Settings, 
  LogOut, 
  Play,
  TrendingUp,
  BookOpen,
  Heart,
  User,
  Gamepad2,
  Target,
  Zap,
  Puzzle,
  Music,
  Palette,
  Mountain,
  Leaf,
  Building,
  Car,
  Crosshair,
  FileText
} from 'lucide-react';
import GameInfoModal from '../components/GameInfoModal';
import './PlaygroundPage.css';

// Import all game components
import InhibitionGame from '../components/games/InhibitionGame';
import CountingAdventureGame from '../components/games/CountingAdventureGame';
import LetterHuntGame from '../components/games/LetterHuntGame';
import PatternMatchingGame from '../components/games/PatternMatchingGame';
import MemorySequenceGame from '../components/games/MemorySequenceGame';
import StackerGame from '../components/games/StackerGame';
import HappyBuilderGame from '../components/games/HappyBuilderGame';
import CrossroadFunGame from '../components/games/CrossroadFunGame';
import BerryBlasterGame from '../components/games/BerryBlasterGame';
import FuzzlingGame from '../components/games/FuzzlingGame';
import FuzzlingAdvancedGame from '../components/games/FuzzlingAdvancedGame';
import MountainClimberGame from '../components/games/MountainClimberGame';
import StarbloomAdventureGame from '../components/games/StarbloomAdventureGame';

interface GameInfo {
  id: string;
  title: string;
  category: string;
  description: string;
  skills: string[];
  difficulty: string;
  duration: string;
  ageRange: string;
  image: string;
  features: string[];
  instructions: string;
  icon: React.ComponentType<any>;
}

const PlaygroundPageAlternative: React.FC = () => {
  const { user } = useUser();
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [infoGame, setInfoGame] = useState<GameInfo | null>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [activeNavItem, setActiveNavItem] = useState('discover');
  const [currentView, setCurrentView] = useState<'discover' | 'trending' | 'album' | 'playlist' | 'favorites'>('discover');

  const gameComponents: { [key: string]: React.ComponentType<any> } = {
    'inhibition': InhibitionGame,
    'counting-adventure': CountingAdventureGame,
    'letter-hunt': LetterHuntGame,
    'pattern-matching': PatternMatchingGame,
    'memory-sequence': MemorySequenceGame,
    'stacker': StackerGame,
    'happy-builder': HappyBuilderGame,
    'crossroad-fun': CrossroadFunGame,
    'berry-blaster': BerryBlasterGame,
    'fuzzling': FuzzlingGame,
    'fuzzling-advanced': FuzzlingAdvancedGame,
    'mountain-climber': MountainClimberGame,
    'starbloom-adventure': StarbloomAdventureGame,
  };

  const gameDetails: { [key: string]: GameInfo } = {
    'inhibition': {
      id: 'inhibition',
      title: 'Stop & Go Adventure',
      category: 'Cognitive Control',
      description: 'Master impulse control by responding correctly to stop and go signals.',
      skills: ['Inhibition Control', 'Attention', 'Reaction Time'],
      difficulty: 'Medium',
      duration: '2-3 minutes',
      ageRange: '6-12 years',
      image: '/assets/images/inhibition-game.jpg',
      features: ['Progressive difficulty', 'Real-time feedback', 'Performance tracking'],
      instructions: 'Click "Go" when you see the green signal, but STOP when you see the red signal!',
      icon: Brain
    },
    'counting-adventure': {
      id: 'counting-adventure',
      title: 'Number Quest',
      category: 'Mathematics',
      description: 'Embark on a counting adventure with fun emojis and numbers.',
      skills: ['Counting', 'Number Recognition', 'Visual Processing'],
      difficulty: 'Easy',
      duration: '3-4 minutes',
      ageRange: '4-8 years',
      image: '/assets/images/counting-game.jpg',
      features: ['Visual counting', 'Emoji themes', 'Progressive levels'],
      instructions: 'Count the emojis and click the correct number!',
      icon: Target
    },
    'letter-hunt': {
      id: 'letter-hunt',
      title: 'Letter Safari',
      category: 'Language',
      description: 'Find hidden letters in a grid of mixed characters.',
      skills: ['Letter Recognition', 'Visual Scanning', 'Attention'],
      difficulty: 'Medium',
      duration: '2-3 minutes',
      ageRange: '5-10 years',
      image: '/assets/images/letter-game.jpg',
      features: ['Letter recognition', 'Visual scanning', 'Speed challenges'],
      instructions: 'Find all the target letters in the grid!',
      icon: FileText
    },
    'pattern-matching': {
      id: 'pattern-matching',
      title: 'Pattern Detective',
      category: 'Logic',
      description: 'Identify and complete patterns with colorful shapes.',
      skills: ['Pattern Recognition', 'Logic', 'Visual Processing'],
      difficulty: 'Hard',
      duration: '4-5 minutes',
      ageRange: '7-12 years',
      image: '/assets/images/pattern-game.jpg',
      features: ['Pattern recognition', 'Logic puzzles', 'Visual patterns'],
      instructions: 'Complete the pattern by selecting the correct shape!',
      icon: Puzzle
    },
    'memory-sequence': {
      id: 'memory-sequence',
      title: 'Memory Galaxy',
      category: 'Memory',
      description: 'Remember and repeat sequences of lights and sounds.',
      skills: ['Memory', 'Sequencing', 'Auditory Processing'],
      difficulty: 'Medium',
      duration: '3-4 minutes',
      ageRange: '6-12 years',
      image: '/assets/images/memory-game.jpg',
      features: ['Memory training', 'Sequence recall', 'Progressive difficulty'],
      instructions: 'Watch the sequence and repeat it back!',
      icon: Brain
    },
    'stacker': {
      id: 'stacker',
      title: 'Block Stacker',
      category: 'Motor Skills',
      description: 'Stack blocks with perfect timing and precision.',
      skills: ['Motor Control', 'Timing', 'Spatial Awareness'],
      difficulty: 'Hard',
      duration: '2-3 minutes',
      ageRange: '8-15 years',
      image: '/assets/images/stacker-game.jpg',
      features: ['Precision timing', 'Spatial awareness', 'Motor control'],
      instructions: 'Click when the moving block aligns with the stack!',
      icon: Building
    },
    'happy-builder': {
      id: 'happy-builder',
      title: 'Happy Builder',
      category: 'Creativity',
      description: 'Build and explore in a 3D world with blocks.',
      skills: ['Creativity', 'Spatial Reasoning', 'Problem Solving'],
      difficulty: 'Easy',
      duration: '10-15 minutes',
      ageRange: '6-12 years',
      image: '/assets/images/builder-game.jpg',
      features: ['3D building', 'Creative expression', 'Open world'],
      instructions: 'Use WASD to move and click to place blocks!',
      icon: Building
    },
    'crossroad-fun': {
      id: 'crossroad-fun',
      title: 'Crossroad Fun',
      category: 'Strategy',
      description: 'Navigate through traffic and reach your destination safely.',
      skills: ['Strategy', 'Planning', 'Risk Assessment'],
      difficulty: 'Medium',
      duration: '3-4 minutes',
      ageRange: '7-12 years',
      image: '/assets/images/crossroad-game.jpg',
      features: ['Traffic navigation', 'Strategy planning', 'Safety awareness'],
      instructions: 'Navigate through traffic to reach the other side!',
      icon: Car
    },
    'berry-blaster': {
      id: 'berry-blaster',
      title: 'Berry Blaster',
      category: 'Action',
      description: 'Blast falling berries with precise aim and timing.',
      skills: ['Aiming', 'Reaction Time', 'Hand-Eye Coordination'],
      difficulty: 'Medium',
      duration: '2-3 minutes',
      ageRange: '8-15 years',
      image: '/assets/images/berry-game.jpg',
      features: ['Precise aiming', 'Fast reactions', 'Score tracking'],
      instructions: 'Click to shoot and blast the falling berries!',
      icon: Crosshair
    },
    'fuzzling': {
      id: 'fuzzling',
      title: 'Fuzzling Adventure',
      category: 'Puzzle',
      description: 'Help Fuzzling collect berries and solve puzzles.',
      skills: ['Problem Solving', 'Strategy', 'Pattern Recognition'],
      difficulty: 'Easy',
      duration: '5-6 minutes',
      ageRange: '5-10 years',
      image: '/assets/images/fuzzling-game.jpg',
      features: ['Puzzle solving', 'Berry collection', 'Character interaction'],
      instructions: 'Help Fuzzling collect berries and solve puzzles!',
      icon: Leaf
    },
    'fuzzling-advanced': {
      id: 'fuzzling-advanced',
      title: 'Fuzzling\'s Playpen',
      category: 'Advanced Puzzle',
      description: 'Advanced puzzle challenges with Fuzzling and friends.',
      skills: ['Advanced Problem Solving', 'Strategy', 'Critical Thinking'],
      difficulty: 'Hard',
      duration: '8-10 minutes',
      ageRange: '8-15 years',
      image: '/assets/images/fuzzling-advanced-game.jpg',
      features: ['Advanced puzzles', 'Multiple characters', 'Complex strategies'],
      instructions: 'Solve advanced puzzles with Fuzzling and friends!',
      icon: Zap
    },
    'mountain-climber': {
      id: 'mountain-climber',
      title: 'Mountain Climber',
      category: 'Physics',
      description: 'Climb mountains using physics and strategy.',
      skills: ['Physics Understanding', 'Strategy', 'Problem Solving'],
      difficulty: 'Hard',
      duration: '5-7 minutes',
      ageRange: '10-15 years',
      image: '/assets/images/mountain-game.jpg',
      features: ['Physics simulation', 'Strategy planning', 'Level progression'],
      instructions: 'Use physics to climb mountains and reach the top!',
      icon: Mountain
    },
    'starbloom-adventure': {
      id: 'starbloom-adventure',
      title: 'Starbloom Forest',
      category: 'Story',
      description: 'Embark on an interactive story adventure in the magical forest.',
      skills: ['Reading Comprehension', 'Decision Making', 'Empathy'],
      difficulty: 'Medium',
      duration: '10-15 minutes',
      ageRange: '8-12 years',
      image: '/assets/images/starbloom-game.jpg',
      features: ['Interactive story', 'Decision making', 'Character development'],
      instructions: 'Make choices and explore the magical Starbloom Forest!',
      icon: Leaf
    }
  };

  const handlePlayGame = () => {
    if (infoGame) {
      setSelectedGame(infoGame.id);
      setShowInfoModal(false);
    }
  };

  const handleGameClose = () => setSelectedGame(null);

  const handleNavClick = (navItem: string) => {
    setActiveNavItem(navItem);
    setCurrentView(navItem as any);
  };

  const renderGameGrid = () => {
    if (!selectedGame) return null;

    const GameComponent = gameComponents[selectedGame];
    if (!GameComponent) return null;

    return (
      <div className="game-overlay">
        <GameComponent onClose={handleGameClose} />
      </div>
    );
  };

  const renderProfile = () => {
    if (!user) return null;

    return (
      <div className="profile-section">
        <div className="user-info">
          <img
            src={user.profile.avatar || "https://github.com/ecemgo/mini-samples-great-tricks/assets/13468728/37e5ccfa-f9ee-458b-afa2-dcd85b495e4e"}
            alt="user" />
          <p>{user.username}</p>
        </div>
        <div className="user-stats">
          <div className="stat-item">
            <Trophy className="stat-icon" />
            <span>Rank: {user.profile.rank}</span>
          </div>
          <div className="stat-item">
            <Star className="stat-icon" />
            <span>XP: {user.profile.xp}</span>
          </div>
          <div className="stat-item">
            <Star className="stat-icon" />
            <span>Stars: {user.profile.stars}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderPopularGames = () => {
    const popularGames = Object.values(gameDetails).slice(0, 5);
    
    return (
      <div className="slider-container">
        <h1>Popular Games</h1>
        <div className="swiper">
          <div className="swiper-wrapper">
            {popularGames.map((game) => (
              <div key={game.id} className="swiper-slide">
                <img src={game.image} alt={game.title} />
                <div className="slide-overlay">
                  <h2>{game.title}</h2>
                  <button onClick={() => {
                    setInfoGame(game);
                    setShowInfoModal(true);
                  }}>
                    Play Now <Play className="play-icon" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="swiper-pagination"></div>
        </div>
      </div>
    );
  };

  const renderLeaderboard = () => {
    const leaderboardUsers = [
      { name: "Alex Chen", rank: "Master Learner", avatar: "https://github.com/ecemgo/mini-samples-great-tricks/assets/13468728/c8feaa0f-6ae7-4c69-bb7d-4a11de76b4f5" },
      { name: "Sarah Kim", rank: "Superhero Learner", avatar: "https://github.com/ecemgo/mini-samples-great-tricks/assets/13468728/bf80314e-5a02-4702-bb64-eae8c113c417" },
      { name: "Mike Johnson", rank: "Distinguished Learner", avatar: "https://github.com/ecemgo/mini-samples-great-tricks/assets/13468728/e4576af8-0e84-4343-8f90-7a01acb9c8b7" },
      { name: "Emma Wilson", rank: "Master Learner", avatar: "https://github.com/ecemgo/mini-samples-great-tricks/assets/13468728/d8eb2888-1e74-4117-82d7-833ad29e3cc1" },
      { name: "David Lee", rank: "Superhero Learner", avatar: "https://github.com/ecemgo/mini-samples-great-tricks/assets/13468728/f23adc16-11d7-41dc-af6a-191e03a81603" },
      { name: "Lisa Park", rank: "Distinguished Learner", avatar: "https://github.com/ecemgo/mini-samples-great-tricks/assets/13468728/f511c102-3217-4bea-bede-8be23b969bd8" },
      { name: "Tom Brown", rank: "Master Learner", avatar: "https://github.com/ecemgo/mini-samples-great-tricks/assets/13468728/9a8bd237-b525-43e6-a37c-daaac39db8ce" },
      { name: "Anna Davis", rank: "Superhero Learner", avatar: "https://github.com/ecemgo/mini-samples-great-tricks/assets/13468728/99452c85-26f4-4ccd-b439-7d1bd3875634" }
    ];

    return (
      <div className="artists">
        <h1>Top Learners</h1>
        <div className="artist-container containers">
          {leaderboardUsers.map((user, index) => (
            <div key={index} className="artist" onClick={() => {
              // Navigate to user profile (placeholder)
              console.log(`Viewing ${user.name}'s profile`);
            }}>
              <div className="artist-img-container">
                <img src={user.avatar} alt={user.name} />
              </div>
              <p>{user.name}</p>
              <span className="rank-badge">{user.rank}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderGameCategories = () => {
    const categories = [
      { name: "Cognitive Games", icon: Brain, count: 5 },
      { name: "Math Games", icon: Target, count: 3 },
      { name: "Language Games", icon: FileText, count: 2 },
      { name: "Creative Games", icon: Palette, count: 4 },
      { name: "Strategy Games", icon: Puzzle, count: 3 }
    ];

    return (
      <div className="albums">
        <h1>Game Categories</h1>
        <div className="album-container containers">
          {categories.map((category, index) => (
            <div key={index} className="album">
              <div className="album-frame">
                <category.icon className="category-icon" />
              </div>
              <div>
                <h2>{category.name}</h2>
                <p>{category.count} games</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderUserStats = () => {
    if (!user) return null;

    const gameStats = Object.entries(user.profile.gameProgress).map(([gameId, progress]) => ({
      gameId,
      ...progress,
      title: gameDetails[gameId]?.title || gameId
    })).slice(0, 8);

    return (
      <div className="recommended-songs">
        <h1>Your Progress</h1>
        <div className="song-container">
          {gameStats.map((stat, index) => (
            <div key={index} className="song" onClick={() => {
              const game = gameDetails[stat.gameId];
              if (game) {
                setInfoGame(game);
                setShowInfoModal(true);
              }
            }}>
              <div className="song-img">
                <img src={gameDetails[stat.gameId]?.image || "/assets/images/placeholder.jpg"} alt="" />
                <div className="overlay">
                  <Play className="play-icon" />
                </div>
              </div>
              <div className="song-title">
                <h2>{stat.title}</h2>
                <p>Level {stat.level}</p>
              </div>
              <span>{stat.stars}★</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderMusicPlayer = () => {
    return (
      <div className="music-player">
        <div className="album-cover">
          <img src={user?.profile.avatar || "https://github.com/ecemgo/mini-samples-great-tricks/assets/13468728/398875d0-9b9e-494a-8906-210aa3f777e0"} id="rotatingImage" alt="" />
          <span className="point"></span>
        </div>

        <h2>{user?.username || "Player"}</h2>
        <p>{user?.profile.rank || "New Learner"}</p>

        <div className="progress-container">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${(user?.profile.xp || 0) / 1000 * 100}%` }}></div>
          </div>
          <span className="progress-text">{user?.profile.xp || 0} / 1000 XP</span>
        </div>

        <div className="controls">
          <button className="backward">
            <Trophy className="control-icon" />
          </button>
          <button className="play-pause-btn">
            <Star className="control-icon" />
          </button>
          <button className="forward">
            <BarChart3 className="control-icon" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="playground-container">
      <main>
        <nav className="main-menu">
          <div>
            {renderProfile()}
            <ul>
              <li className={`nav-item ${activeNavItem === 'discover' ? 'active' : ''}`}>
                <a href="#" onClick={() => handleNavClick('discover')}>
                  <Brain className="nav-icon" />
                  <span className="nav-text">Discover</span>
                </a>
              </li>

              <li className={`nav-item ${activeNavItem === 'trending' ? 'active' : ''}`}>
                <a href="#" onClick={() => handleNavClick('trending')}>
                  <TrendingUp className="nav-icon" />
                  <span className="nav-text">Trending</span>
                </a>
              </li>

              <li className={`nav-item ${activeNavItem === 'album' ? 'active' : ''}`}>
                <a href="#" onClick={() => handleNavClick('album')}>
                  <BookOpen className="nav-icon" />
                  <span className="nav-text">Categories</span>
                </a>
              </li>

              <li className={`nav-item ${activeNavItem === 'playlist' ? 'active' : ''}`}>
                <a href="#" onClick={() => handleNavClick('playlist')}>
                  <Gamepad2 className="nav-icon" />
                  <span className="nav-text">Games</span>
                </a>
              </li>

              <li className={`nav-item ${activeNavItem === 'favorites' ? 'active' : ''}`}>
                <a href="#" onClick={() => handleNavClick('favorites')}>
                  <Heart className="nav-icon" />
                  <span className="nav-text">Favorites</span>
                </a>
              </li>
            </ul>
          </div>

          <ul>
            <li className="nav-item">
              <a href="#">
                <User className="nav-icon" />
                <span className="nav-text">Profile</span>
              </a>
            </li>

            <li className="nav-item">
              <a href="#">
                <Settings className="nav-icon" />
                <span className="nav-text">Settings</span>
              </a>
            </li>

            <li className="nav-item">
              <a href="#">
                <LogOut className="nav-icon" />
                <span className="nav-text">Logout</span>
              </a>
            </li>
          </ul>
        </nav>

        <section className="content">
          <div className="left-content">
            <AnimatePresence mode="wait">
              {currentView === 'discover' && (
                <motion.div
                  key="discover"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  {renderPopularGames()}
                  {renderLeaderboard()}
                  {renderGameCategories()}
                </motion.div>
              )}

              {currentView === 'trending' && (
                <motion.div
                  key="trending"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="trending-section">
                    <h1>Trending Games</h1>
                    <div className="trending-games">
                      {Object.values(gameDetails).slice(0, 6).map((game) => (
                        <div key={game.id} className="trending-game" onClick={() => {
                          setInfoGame(game);
                          setShowInfoModal(true);
                        }}>
                          <img src={game.image} alt={game.title} />
                          <div className="game-info">
                            <h3>{game.title}</h3>
                            <p>{game.category}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {currentView === 'album' && (
                <motion.div
                  key="album"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  {renderGameCategories()}
                </motion.div>
              )}

              {currentView === 'playlist' && (
                <motion.div
                  key="playlist"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="games-grid">
                    <h1>All Games</h1>
                    <div className="games-container">
                      {Object.values(gameDetails).map((game) => (
                        <div key={game.id} className="game-card" onClick={() => {
                          setInfoGame(game);
                          setShowInfoModal(true);
                        }}>
                          <img src={game.image} alt={game.title} />
                          <div className="game-card-info">
                            <h3>{game.title}</h3>
                            <p>{game.category}</p>
                            <div className="game-stats">
                              <span>Level {user?.profile.gameProgress[game.id]?.level || 1}</span>
                              <span>{user?.profile.gameProgress[game.id]?.stars || 0}★</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {currentView === 'favorites' && (
                <motion.div
                  key="favorites"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="favorites-section">
                    <h1>Your Favorites</h1>
                    <div className="favorites-container">
                      {Object.values(gameDetails).slice(0, 4).map((game) => (
                        <div key={game.id} className="favorite-game" onClick={() => {
                          setInfoGame(game);
                          setShowInfoModal(true);
                        }}>
                          <img src={game.image} alt={game.title} />
                          <div className="favorite-game-info">
                            <h3>{game.title}</h3>
                            <p>{game.category}</p>
                            <Heart className="favorite-icon" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="right-content">
            {renderUserStats()}
            {renderMusicPlayer()}
          </div>
        </section>
      </main>

      {renderGameGrid()}

      <GameInfoModal
        game={infoGame}
        isOpen={showInfoModal}
        onClose={() => setShowInfoModal(false)}
        onPlay={handlePlayGame}
      />
    </div>
  );
};

export default PlaygroundPageAlternative; 