import React, { useState, useLayoutEffect, useRef, useMemo } from 'react';
import { useUser } from '../contexts/UserContext';
// Use the globally loaded GSAP from CDN
declare const gsap: any;
import { Gamepad2, BarChart, Users, Star, Brain, Sparkles, Trophy, Target, FileText, CheckSquare, TrendingUp, Award, Zap, Crown, Target as TargetIcon, Brain as BrainIcon, Heart, Activity } from 'lucide-react';

import { Link } from 'react-router-dom';
import CrossroadFunGame from '../components/games/CrossroadFunGame';
import MemorySequenceGame from '../components/games/MemorySequenceGame';
import StarbloomAdventureGame from '../components/games/StarbloomAdventureGame';
import InhibitionGame from '../components/games/InhibitionGame';
import BerryBlasterGame from '../components/games/BerryBlasterGame';
import PatternMatchingGame from '../components/games/PatternMatchingGame';
import CountingAdventureGame from '../components/games/CountingAdventureGame';
import FuzzlingAdvancedGame from '../components/games/FuzzlingAdvancedGame';
import LetterHuntGame from '../components/games/LetterHuntGame';
import MountainClimberGame from '../components/games/MountainClimberGame';
import StackerGame from '../components/games/StackerGame';
import HappyBuilderGame from '../components/games/HappyBuilderGame';
import FuzzlingGame from '../components/games/FuzzlingGame';
import TheCubeGame from '../components/games/TheCubeGame';
import AIGame from '../components/AIGame';
import GameInfoModal, { GameInfo } from '../components/GameInfoModal';
import GameWrapper from '../components/GameWrapper';

import PlasmaBall from '../components/PlasmaBall';
import PlasmaBackground from '../components/PlasmaBackground';
// Import your other components like GameModal and ALL your game components
// import StackerGame from '../components/games/StackerGame';

const PlaygroundPage: React.FC = () => {
    const { user } = useUser();
    const [mainView, setMainView] = useState('play');
    const [playCategory, setPlayCategory] = useState('All');
    const [isTaskManagerOpen, setIsTaskManagerOpen] = useState(false);
    const [selectedGame, setSelectedGame] = useState<string | null>(null);
    const [infoGame, setInfoGame] = useState<GameInfo | null>(null);
    const [showInfoModal, setShowInfoModal] = useState(false);

    const contentRef = useRef<HTMLDivElement>(null);

    const games = useMemo(() => [
        { id: 'memory-sequence', title: 'Memory Galaxy', category: 'Memory', icon: <Star />, color: 'from-blue-500 to-cyan-500' },
        { id: 'starbloom-adventure', title: 'Starbloom Forest', category: 'Memory', icon: <Brain />, color: 'from-green-500 to-teal-500' },
        { id: 'inhibition', title: 'Stop & Go Adventure', category: 'Focus', icon: <Target />, color: 'from-emerald-500 to-green-500' },
        { id: 'berry-blaster', title: 'Berry Blaster', category: 'Focus', icon: <Gamepad2 />, color: 'from-indigo-500 to-blue-500' },
        // { id: 'stacker-game', title: 'Block Stacker', category: 'Focus', icon: <Target />, color: 'from-red-500 to-orange-500' },
        { id: 'pattern-matching', title: 'Pattern Detective', category: 'Logic', icon: <Brain />, color: 'from-purple-500 to-violet-500' },
        { id: 'counting-adventure', title: 'Number Quest', category: 'Logic', icon: <Trophy />, color: 'from-orange-500 to-amber-500' },
        { id: 'fuzzling-advanced', title: "Fuzzling's Playpen", category: 'Logic', icon: <Sparkles />, color: 'from-pink-500 to-rose-500' },
        { id: 'letter-hunt', title: 'Letter Safari', category: 'Language', icon: <FileText />, color: 'from-fuchsia-500 to-pink-500' },
        { id: 'ai-story-creator', title: 'AI Story Creator', category: 'Creativity', icon: <Sparkles />, color: 'from-sky-500 to-indigo-500' },
        { id: 'happy-builder', title: 'Happy Builder', category: 'Creativity', icon: <Trophy />, color: 'from-yellow-500 to-lime-500' },
        { id: 'the-cube', title: 'The Cube', category: 'Logic', icon: <Trophy />, color: 'from-indigo-600 to-purple-600' },
        { id: 'crossroad-fun', title: 'Crossroad Fun', category: 'Logic', icon: <Gamepad2 />, color: 'from-blue-400 to-blue-700' },
    ], []);

    const gameCategories = useMemo(() => ['All', ...Array.from(new Set(games.map(g => g.category)))], [games]);
    const filteredGames = useMemo(() => playCategory === 'All' ? games : games.filter(g => g.category === playCategory), [games, playCategory]);

    const gameDetails: Record<string, GameInfo> = {
        'memory-sequence': {
            id: 'memory-sequence',
            title: 'Memory Galaxy',
            category: 'Memory',
            description: 'Navigate through space while remembering sequences and patterns.',
            skills: ['Working Memory', 'Sequential Processing'],
            difficulty: 'Medium',
            duration: '3-6 min',
            ageRange: '6-12',
            image: '/assets/images/Neuraplaybrain.png',
            features: ['Space theme', 'Progressive difficulty', 'Leaderboard'],
            instructions: 'Repeat the sequence of colors as they appear. Each round adds a new color.',
        },
        'crossroad-fun': {
            id: 'crossroad-fun',
            title: 'Crossroad Fun',
            category: 'Logic',
            description: 'Dodge traffic and cross the road safely in this fast-paced logic game.',
            skills: ['Attention Control', 'Motor Skills', 'Planning'],
            difficulty: 'Medium',
            duration: '3-7 min',
            ageRange: '7-14',
            image: '/assets/images/police.jpg',
            features: ['3D graphics', 'High score tracking', 'Multiple controls'],
            instructions: 'Use arrow keys or WASD to move. Avoid cars and reach the other side!',
        },
        'starbloom-adventure': {
            id: 'starbloom-adventure',
            title: 'Starbloom Forest',
            category: 'Memory',
            description: 'Navigate through a magical forest while remembering patterns and sequences.',
            skills: ['Working Memory', 'Spatial Awareness'],
            difficulty: 'Easy',
            duration: '3-6 min',
            ageRange: '6-12',
            image: '/assets/images/Neuraplaybrain.png',
            features: ['Magical environment', 'Pattern recognition', 'Progressive levels'],
            instructions: 'Follow the glowing path and remember the sequence of flowers you encounter.',
        },
        'inhibition': {
            id: 'inhibition',
            title: 'Stop & Go Adventure',
            category: 'Focus',
            description: 'Test your impulse control and reaction time in this engaging game.',
            skills: ['Inhibitory Control', 'Reaction Time', 'Attention'],
            difficulty: 'Medium',
            duration: '2-4 min',
            ageRange: '7-14',
            image: '/assets/images/Mascot.png',
            features: ['Color-coded signals', 'Speed tracking', 'Focus training'],
            instructions: 'Press the button only when the light turns green. Resist the urge to press on red!',
        },
        'berry-blaster': {
            id: 'berry-blaster',
            title: 'Berry Blaster',
            category: 'Focus',
            description: 'Blast berries while avoiding obstacles in this fast-paced focus game.',
            skills: ['Visual Attention', 'Hand-Eye Coordination'],
            difficulty: 'Medium',
            duration: '3-5 min',
            ageRange: '8-15',
            image: '/assets/images/neuraplaybanner1.png',
            features: ['Dynamic targets', 'Obstacle avoidance', 'Score multiplier'],
            instructions: 'Aim and shoot at the berries while avoiding the obstacles that appear.',
        },
        'pattern-matching': {
            id: 'pattern-matching',
            title: 'Pattern Detective',
            category: 'Logic',
            description: 'Solve pattern puzzles and unlock the secrets of logical thinking.',
            skills: ['Pattern Recognition', 'Logical Reasoning'],
            difficulty: 'Hard',
            duration: '4-8 min',
            ageRange: '9-16',
            image: '/assets/images/Neuraplaybrain.png',
            features: ['Multiple pattern types', 'Logic puzzles', 'Brain training'],
            instructions: 'Identify the pattern and predict what comes next in the sequence.',
        },
        'counting-adventure': {
            id: 'counting-adventure',
            title: 'Number Quest',
            category: 'Logic',
            description: 'Embark on a mathematical adventure with counting and number recognition.',
            skills: ['Numerical Processing', 'Counting Skills'],
            difficulty: 'Easy',
            duration: '2-5 min',
            ageRange: '5-10',
            image: '/assets/images/Mascot.png',
            features: ['Number recognition', 'Counting practice', 'Visual math'],
            instructions: 'Count the objects and select the correct number from the options.',
        },
        'fuzzling-advanced': {
            id: 'fuzzling-advanced',
            title: "Fuzzling's Playpen",
            category: 'Logic',
            description: 'Advanced puzzle solving with the adorable Fuzzling character.',
            skills: ['Problem Solving', 'Critical Thinking'],
            difficulty: 'Hard',
            duration: '5-10 min',
            ageRange: '10-16',
            image: '/assets/images/neuraplaybanner1.png',
            features: ['Complex puzzles', 'Character interaction', 'Multiple solutions'],
            instructions: 'Help Fuzzling solve puzzles by thinking creatively and logically.',
        },
        'letter-hunt': {
            id: 'letter-hunt',
            title: 'Letter Safari',
            category: 'Language',
            description: 'Hunt for letters in a jungle adventure while learning the alphabet.',
            skills: ['Letter Recognition', 'Visual Scanning'],
            difficulty: 'Easy',
            duration: '2-4 min',
            ageRange: '4-8',
            image: '/assets/images/Neuraplaybrain.png',
            features: ['Jungle theme', 'Letter recognition', 'Visual scanning'],
            instructions: 'Find and click on the letters hidden throughout the jungle scene.',
        },
        'mountain-climber': {
            id: 'mountain-climber',
            title: 'Mountain Climber',
            category: 'Motor Skills',
            description: 'Climb mountains while developing coordination and motor skills.',
            skills: ['Motor Coordination', 'Balance'],
            difficulty: 'Medium',
            duration: '3-6 min',
            ageRange: '6-12',
            image: '/assets/images/Mascot.png',
            features: ['Mountain climbing', 'Coordination training', 'Progressive difficulty'],
            instructions: 'Use precise movements to climb the mountain without falling.',
        },
        'stacker': {
            id: 'stacker',
            title: 'Block Stacker',
            category: 'Motor Skills',
            description: 'Stack blocks carefully to build the tallest tower possible.',
            skills: ['Fine Motor Skills', 'Spatial Awareness'],
            difficulty: 'Medium',
            duration: '2-5 min',
            ageRange: '5-10',
            image: '/assets/images/police.jpg',
            features: ['Block stacking', 'Tower building', 'Precision training'],
            instructions: 'Stack blocks one by one to build the tallest tower without it falling.',
        },
        'happy-builder': {
            id: 'happy-builder',
            title: 'Happy Builder',
            category: 'Creativity',
            description: 'Build and create in this open-ended construction game.',
            skills: ['Creativity', 'Spatial Reasoning'],
            difficulty: 'Easy',
            duration: '5-15 min',
            ageRange: '6-12',
            image: '/assets/images/neuraplaybanner1.png',
            features: ['Open-ended building', 'Creative expression', 'Multiple materials'],
            instructions: 'Use different materials to build whatever you can imagine!',
        },
        'fuzzling': {
            id: 'fuzzling',
            title: 'Fuzzling Adventure',
            category: 'Logic',
            description: 'Help the adorable Fuzzling solve puzzles and navigate challenges.',
            skills: ['Problem Solving', 'Logical Thinking'],
            difficulty: 'Medium',
            duration: '4-8 min',
            ageRange: '7-12',
            image: '/assets/images/Neuraplaybrain.png',
            features: ['Character-driven', 'Puzzle solving', 'Adventure elements'],
            instructions: 'Help Fuzzling solve puzzles and overcome obstacles in this adventure.',
        },
        'ai-story-creator': {
            id: 'ai-story-creator',
            title: 'AI Story Creator',
            category: 'Creativity',
            description: 'Create magical stories with the help of AI and bring them to life with images.',
            skills: ['Creativity', 'Language Development', 'Imagination'],
            difficulty: 'Easy',
            duration: '5-10 min',
            ageRange: '6-14',
            image: '/assets/images/Neuraplaybrain.png',
            features: ['AI-powered story generation', 'Image creation', 'Voice narration'],
            instructions: 'Enter a story idea and watch AI create a magical story with images and narration for you!',
        },
        'the-cube': {
            id: 'the-cube',
            title: 'The Cube',
            category: 'Logic',
            description: 'Solve the classic 3D Rubik\'s Cube puzzle with smooth 3D graphics and intuitive controls.',
            skills: ['Spatial Reasoning', 'Problem Solving', 'Pattern Recognition'],
            difficulty: 'Hard',
            duration: '5-30 min',
            ageRange: '8-16',
            image: '/assets/images/Thecube.png',
            features: ['3D graphics', 'Multiple cube sizes', 'Timer and statistics', 'Customizable themes'],
            instructions: 'Drag to rotate the cube, use settings to change size and theme. Double tap to start!',
        }
    };

    const handlePlayGame = () => {
        if (infoGame) {
            setSelectedGame(infoGame.id);
            setShowInfoModal(false);
        }
    };

    const handleGameClose = () => setSelectedGame(null);



    useLayoutEffect(() => {
        if (contentRef.current) {
            gsap.fromTo(contentRef.current, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out', delay: 0.1 });
        }
    }, [mainView, playCategory]);

    if (!user) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 text-white flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-6">
            <div className="flex items-center justify-center mb-8">
              <img 
                src="/assets/images/Mascot.png" 
                alt="NeuraPlay Mascot" 
                className="w-32 h-32 object-contain"
              />
            </div>
            <h1 className="text-3xl font-bold mb-4">Welcome to NeuraPlay!</h1>
            <p className="text-lg text-gray-300 mb-8">
              Please log in to access the playground and start your learning adventure.
            </p>
            <div className="space-y-4">
              <Link 
                to="/forum-registration" 
                className="inline-block w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold px-8 py-4 rounded-full hover:from-violet-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                Create Account
              </Link>
              <Link 
                to="/login" 
                className="inline-block w-full bg-transparent border-2 border-white/20 text-white font-bold px-8 py-4 rounded-full hover:bg-white/10 transition-all duration-300"
              >
                Log In
              </Link>
            </div>
            <p className="text-sm text-gray-400 mt-6">
              Join thousands of learners discovering the joy of cognitive development!
            </p>
          </div>
        </div>
      );
    }

    const glassPanelStyle = "bg-black/20 border border-white/10 backdrop-blur-md";

    const renderGameGrid = () => (
        selectedGame ? (
            <GameWrapper 
                gameId={selectedGame} 
                onClose={handleGameClose}
                showVolumeSlider={true}
                showGameControls={true}
                volume={0.7}
                onVolumeChange={(volume) => {
                    // Handle volume change for all games
                    console.log('Volume changed to:', volume);
                }}
                showSkipControls={selectedGame === 'starbloom-adventure'}
                onSkipBack={() => {
                    // Handle skip back for story games
                    console.log('Skip back');
                }}
                onSkipForward={() => {
                    // Handle skip forward for story games
                    console.log('Skip forward');
                }}
            >
                {selectedGame === 'memory-sequence' && <MemorySequenceGame onClose={handleGameClose} />}
                {selectedGame === 'starbloom-adventure' && <StarbloomAdventureGame onClose={handleGameClose} />}
                {selectedGame === 'inhibition' && <InhibitionGame onClose={handleGameClose} />}
                {selectedGame === 'berry-blaster' && <BerryBlasterGame onRequestFullscreen={() => {}} />}
                {selectedGame === 'pattern-matching' && <PatternMatchingGame onClose={handleGameClose} />}
                {selectedGame === 'counting-adventure' && <CountingAdventureGame onClose={handleGameClose} />}
                {selectedGame === 'fuzzling-advanced' && <FuzzlingAdvancedGame onClose={handleGameClose} />}
                {selectedGame === 'letter-hunt' && <LetterHuntGame onClose={handleGameClose} />}
                {selectedGame === 'mountain-climber' && <MountainClimberGame onClose={handleGameClose} />}
                {selectedGame === 'stacker' && <StackerGame onGameEnd={() => {}} onClose={handleGameClose} />}
                {selectedGame === 'happy-builder' && <HappyBuilderGame />}
                {selectedGame === 'fuzzling' && <FuzzlingGame onClose={handleGameClose} />}
                {selectedGame === 'crossroad-fun' && <CrossroadFunGame onClose={handleGameClose} />}
                {selectedGame === 'the-cube' && <TheCubeGame onClose={handleGameClose} />}
                {selectedGame === 'ai-story-creator' && <AIGame onClose={handleGameClose} />}
                {/* Add more mappings as you add more games */}
                {/* Fallback if not implemented */}
                {![
                  'memory-sequence','starbloom-adventure','inhibition','berry-blaster','pattern-matching','counting-adventure','fuzzling-advanced','letter-hunt','mountain-climber','stacker','happy-builder','fuzzling','crossroad-fun','the-cube','ai-story-creator'
                ].includes(selectedGame) && (
                  <div className="text-white text-xl">This game is not yet implemented.</div>
                )}
            </GameWrapper>
        ) : (
            <>
                <h2 className="text-2xl font-bold text-slate-100 mb-4">Category: {playCategory}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredGames.map(game => {
                        // Special handling for the cube game to use image instead of gradient
                        const isCubeGame = game.id === 'the-cube';
                        
                        return (
                            <div
                                key={game.id}
                                className={`${glassPanelStyle} rounded-2xl overflow-hidden cursor-pointer group`}
                                onClick={() => {
                                    setInfoGame(gameDetails[game.id]);
                                    setShowInfoModal(true);
                                }}
                            >
                                {isCubeGame ? (
                                    <div className="relative h-36 overflow-hidden">
                                        <img 
                                            src="/assets/images/Thecube.png" 
                                            alt="The Cube Game"
                                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                        />
                                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors"></div>
                                        <div className="absolute top-3 right-3 bg-black/50 rounded-lg px-2 py-1">
                                            <span className="text-xs font-medium text-white">3D Puzzle</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className={`h-36 bg-gradient-to-br ${game.color} flex items-center justify-center text-white text-5xl transition-transform duration-300 group-hover:scale-110`}>
                                        {game.icon}
                                    </div>
                                )}
                                <div className="p-5">
                                    <h3 className="font-bold text-lg text-white">{game.title}</h3>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </>
        )
    );



    const renderProfile = () => (
        <div className="space-y-6">
            {/* User Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className={`${glassPanelStyle} p-4 rounded-xl text-center`}>
                    <div className="w-12 h-12 mx-auto mb-2 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center">
                        <Crown className="w-6 h-6 text-black" />
                    </div>
                    <div className="text-2xl font-bold text-yellow-400">{user.profile.rank}</div>
                    <div className="text-sm text-slate-400">Current Rank</div>
                </div>
                <div className={`${glassPanelStyle} p-4 rounded-xl text-center`}>
                    <div className="w-12 h-12 mx-auto mb-2 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-full flex items-center justify-center">
                        <Zap className="w-6 h-6 text-black" />
                    </div>
                    <div className="text-2xl font-bold text-blue-400">{user.profile.xp}</div>
                    <div className="text-sm text-slate-400">Experience Points</div>
                </div>
                <div className={`${glassPanelStyle} p-4 rounded-xl text-center`}>
                    <div className="w-12 h-12 mx-auto mb-2 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                        <Star className="w-6 h-6 text-black" />
                    </div>
                    <div className="text-2xl font-bold text-yellow-400">{user.profile.stars}</div>
                    <div className="text-sm text-slate-400">Stars Earned</div>
                </div>
                <div className={`${glassPanelStyle} p-4 rounded-xl text-center`}>
                    <div className="w-12 h-12 mx-auto mb-2 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
                        <Gamepad2 className="w-6 h-6 text-black" />
                    </div>
                    <div className="text-2xl font-bold text-green-400">{Object.keys(user.profile.gameProgress).length}</div>
                    <div className="text-sm text-slate-400">Games Played</div>
                </div>
            </div>

            {/* AI Assessment Tool */}
            <div className={`${glassPanelStyle} p-6 rounded-2xl`}>
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center">
                        <BrainIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white">AI Learning Assessment</h3>
                        <p className="text-slate-400">Get personalized insights about your learning progress</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Link
                        to="/ai-report"
                        className="p-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-400/30 rounded-xl hover:from-purple-500/30 hover:to-pink-500/30 transition-all group"
                    >
                        <div className="flex items-center gap-3">
                            <FileText className="w-6 h-6 text-purple-400 group-hover:text-purple-300" />
                            <div>
                                <h4 className="font-semibold text-white">Generate AI Report</h4>
                                <p className="text-sm text-slate-400">Comprehensive learning analysis</p>
                            </div>
                        </div>
                    </Link>
                    <div className="p-4 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-400/30 rounded-xl">
                        <div className="flex items-center gap-3">
                            <TrendingUp className="w-6 h-6 text-blue-400" />
                            <div>
                                <h4 className="font-semibold text-white">Progress Analytics</h4>
                                <p className="text-sm text-slate-400">Real-time performance tracking</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Plasma Icon Info */}
            <div className={`${glassPanelStyle} p-6 rounded-2xl`}>
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white">Plasma Icon</h3>
                        <p className="text-slate-400">Look for the floating plasma icon around the playground!</p>
                    </div>
                </div>
                <div className="p-4 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-400/30 rounded-xl">
                    <div className="flex items-center gap-3">
                        <Sparkles className="w-6 h-6 text-indigo-400" />
                        <div>
                            <h4 className="font-semibold text-white">Interactive Plasma Animation</h4>
                            <p className="text-sm text-slate-400">Click the floating plasma icon to see achievement modals</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Game Progress Grid */}
            <div className={`${glassPanelStyle} p-6 rounded-2xl`}>
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-violet-400" />
                    Game Progress & Assessment
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {games.map(game => {
                        const progress = user.profile.gameProgress[game.id] || { level: 0, stars: 0, bestScore: 0, timesPlayed: 0 };
                        return (
                            <div key={game.id} className="p-4 bg-white/5 rounded-xl border border-white/10">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className={`w-8 h-8 bg-gradient-to-br ${game.color} rounded-lg flex items-center justify-center`}>
                                        {game.icon}
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-white">{game.title}</h4>
                                        <p className="text-xs text-slate-400">{game.category}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div className="text-center">
                                        <div className="text-yellow-400 font-bold">{progress.level}</div>
                                        <div className="text-slate-400">Level</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-yellow-400 font-bold">{progress.stars}</div>
                                        <div className="text-slate-400">Stars</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-blue-400 font-bold">{progress.bestScore}</div>
                                        <div className="text-slate-400">Best Score</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-green-400 font-bold">{progress.timesPlayed}</div>
                                        <div className="text-slate-400">Plays</div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Cognitive Skills Assessment */}
            <div className={`${glassPanelStyle} p-6 rounded-2xl`}>
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <TargetIcon className="w-5 h-5 text-green-400" />
                    Cognitive Skills Assessment
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-400/30 rounded-xl">
                        <div className="flex items-center gap-3 mb-2">
                            <Brain className="w-5 h-5 text-green-400" />
                            <h4 className="font-semibold text-white">Memory Skills</h4>
                        </div>
                        <p className="text-sm text-slate-400 mb-3">Based on Memory Galaxy & Starbloom Forest performance</p>
                        <div className="flex items-center gap-2">
                            <div className="flex-1 bg-white/10 rounded-full h-2">
                                <div className="bg-green-400 h-2 rounded-full" style={{ width: `${Math.min((user.profile.gameProgress['memory-sequence']?.level || 0) * 20, 100)}%` }}></div>
                            </div>
                            <span className="text-xs text-green-400 font-bold">
                                {Math.min((user.profile.gameProgress['memory-sequence']?.level || 0) * 20, 100)}%
                            </span>
                        </div>
                    </div>
                    <div className="p-4 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-400/30 rounded-xl">
                        <div className="flex items-center gap-3 mb-2">
                            <Target className="w-5 h-5 text-blue-400" />
                            <h4 className="font-semibold text-white">Focus & Control</h4>
                        </div>
                        <p className="text-sm text-slate-400 mb-3">Based on Stop & Go Adventure performance</p>
                        <div className="flex items-center gap-2">
                            <div className="flex-1 bg-white/10 rounded-full h-2">
                                <div className="bg-blue-400 h-2 rounded-full" style={{ width: `${Math.min((user.profile.gameProgress['inhibition']?.level || 0) * 20, 100)}%` }}></div>
                            </div>
                            <span className="text-xs text-blue-400 font-bold">
                                {Math.min((user.profile.gameProgress['inhibition']?.level || 0) * 20, 100)}%
                            </span>
                        </div>
                    </div>
                    <div className="p-4 bg-gradient-to-r from-purple-500/20 to-violet-500/20 border border-purple-400/30 rounded-xl">
                        <div className="flex items-center gap-3 mb-2">
                            <Brain className="w-5 h-5 text-purple-400" />
                            <h4 className="font-semibold text-white">Logic & Patterns</h4>
                        </div>
                        <p className="text-sm text-slate-400 mb-3">Based on Pattern Detective performance</p>
                        <div className="flex items-center gap-2">
                            <div className="flex-1 bg-white/10 rounded-full h-2">
                                <div className="bg-purple-400 h-2 rounded-full" style={{ width: `${Math.min((user.profile.gameProgress['pattern-matching']?.level || 0) * 20, 100)}%` }}></div>
                            </div>
                            <span className="text-xs text-purple-400 font-bold">
                                {Math.min((user.profile.gameProgress['pattern-matching']?.level || 0) * 20, 100)}%
                            </span>
                        </div>
                    </div>
                    <div className="p-4 bg-gradient-to-r from-orange-500/20 to-amber-500/20 border border-orange-400/30 rounded-xl">
                        <div className="flex items-center gap-3 mb-2">
                            <Trophy className="w-5 h-5 text-orange-400" />
                            <h4 className="font-semibold text-white">Numerical Skills</h4>
                        </div>
                        <p className="text-sm text-slate-400 mb-3">Based on Number Quest performance</p>
                        <div className="flex items-center gap-2">
                            <div className="flex-1 bg-white/10 rounded-full h-2">
                                <div className="bg-orange-400 h-2 rounded-full" style={{ width: `${Math.min((user.profile.gameProgress['counting-adventure']?.level || 0) * 20, 100)}%` }}></div>
                            </div>
                            <span className="text-xs text-orange-400 font-bold">
                                {Math.min((user.profile.gameProgress['counting-adventure']?.level || 0) * 20, 100)}%
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen text-slate-200 pt-24 pb-12 relative">
            {/* Plasma Background */}
            <PlasmaBackground />
            
            {/* Plasma Ball in Bottom Left */}
            <div className="plasma-ball-bottom-left">
                <PlasmaBall 
                    size={150} 
                    className="plasma-ball-interactive"
                />
            </div>
            
            <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                    <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-white">The Playground</h1>
                    <p className="text-xl text-violet-300 mt-2">Your learning adventure starts here, {user.username}.</p>
                </div>
                <div className="flex flex-col lg:flex-row gap-4">
                    <aside className="lg:w-48 flex-shrink-0">
                        <div className="sticky top-32">
                            <nav className={`${glassPanelStyle} p-3 rounded-xl space-y-1`}>
                                {gameCategories.map(cat => (
                                    <button key={cat} onClick={() => setPlayCategory(cat)} className={`w-full text-left p-2 rounded-lg font-semibold transition-all text-sm ${playCategory === cat ? 'bg-white/20 text-white' : 'hover:bg-white/10 text-slate-300'}`}>{cat}</button>
                                ))}
                            </nav>
                        </div>
                    </aside>
                    <main className="flex-1">
                        <div className={`${glassPanelStyle} p-2 flex items-center mb-4 rounded-xl`}>
                            {['play', 'profile', 'social'].map(view => (
                                <button key={view} onClick={() => setMainView(view)} className={`flex-1 py-2 rounded-lg font-bold capitalize transition-colors flex items-center justify-center gap-2 ${mainView === view ? 'bg-white/20 text-white' : 'text-violet-300 hover:text-white'}`}>
                                    {view === 'play' && <Gamepad2 size={18}/>}
                                    {view === 'profile' && <BarChart size={18}/>}
                                    {view === 'social' && <Users size={18}/>}
                                    {view}
                                </button>
                            ))}
                        </div>
                        <div ref={contentRef} className={`${glassPanelStyle} p-4 min-h-[500px] rounded-2xl overflow-hidden`}>
                            {mainView === 'play' && renderGameGrid()}
                            {mainView === 'profile' && renderProfile()}
                            {mainView === 'social' && <div className="p-4 text-white"><h2 className="text-3xl font-bold">Social & Friends</h2></div>}
                        </div>
                    </main>
                </div>
            </div>
            <GameInfoModal
                game={infoGame}
                isOpen={showInfoModal}
                onClose={() => setShowInfoModal(false)}
                onPlay={handlePlayGame}
            />

        </div>
    );
};

export default PlaygroundPage;