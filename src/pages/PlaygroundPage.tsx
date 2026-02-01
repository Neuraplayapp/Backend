import React, { useState, useLayoutEffect, useRef, useMemo, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import { useTheme } from '../contexts/ThemeContext';
import { isRegistrationEnabled } from '../config/features';
import { dataCollectionService } from '../services/DataCollectionService';
// Use the globally loaded GSAP from CDN
declare const gsap: any;
import { Gamepad2, BarChart, Users, Star, Brain, Sparkles, Trophy, Target, FileText, CheckSquare, TrendingUp, Award, Zap, Crown, Target as TargetIcon, Brain as BrainIcon, Heart, Activity } from 'lucide-react';

import { Link } from 'react-router-dom';
import CrossroadFunGame from '../components/games/CrossroadFunGame';
import MemorySequenceGame from '../components/games/MemorySequenceGame';
import MagicStorytellerGame from '../components/games/MagicStorytellerGame';
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
import PlaygroundModalReveal, { GameInfo } from '../components/PlaygroundModalReveal';
import GameWrapper from '../components/GameWrapper';
import PlasmaBall from '../components/PlasmaBall';

import PlasmaBackground from '../components/PlasmaBackground';
// Import your other components like GameModal and ALL your game components
// import StackerGame from '../components/games/StackerGame';

const PlaygroundPage: React.FC = () => {
    const { user } = useUser();
    const { isDarkMode } = useTheme();
    const [mainView, setMainView] = useState('play');
    const [playCategory, setPlayCategory] = useState('All');
    const [isTaskManagerOpen, setIsTaskManagerOpen] = useState(false);
    const [selectedGame, setSelectedGame] = useState<string | null>(null);
    const [infoGame, setInfoGame] = useState<GameInfo | null>(null);
    const [showInfoModal, setShowInfoModal] = useState(false);
    const [revealedCards, setRevealedCards] = useState<Set<string>>(new Set());

    const contentRef = useRef<HTMLDivElement>(null);

    // 🗄️ DATABASE INTEGRATION: Log playground page visit
    useEffect(() => {
        dataCollectionService.logNavigation('playground', location.pathname).catch(error => {
            console.error('Failed to log playground navigation:', error);
        });
    }, []);

    const games = useMemo(() => [
        // Games with specific images first
        { id: 'crossroad-fun', title: 'Crossroad Fun', category: 'Logic', icon: <Gamepad2 />, color: 'from-blue-400 to-blue-700', image: '/assets/images/crosswalk.png' },
        { id: 'the-cube', title: 'The Cube', category: 'Logic', icon: <Trophy />, color: 'from-indigo-600 to-purple-600', image: '/assets/images/Thecube.png' },
        { id: 'memory-sequence', title: 'Memory Galaxy', category: 'Memory', icon: <Star />, color: 'from-blue-500 to-cyan-500', image: '/assets/images/Neuraplaybrain.png' },
        { id: 'magic-storyteller', title: 'Magic Storyteller', category: 'Story', icon: <Sparkles />, color: 'from-purple-500 to-pink-500', image: '/assets/images/Mascot.png' },
        { id: 'inhibition', title: 'Stop & Go Adventure', category: 'Focus', icon: <Target />, color: 'from-emerald-500 to-green-500', image: '/assets/images/Neuraplaybrain.png' },
        { id: 'berry-blaster', title: 'Berry Blaster', category: 'Focus', icon: <Gamepad2 />, color: 'from-indigo-500 to-blue-500', image: '/assets/images/Alfiya.png' },
        { id: 'pattern-matching', title: 'Pattern Detective', category: 'Logic', icon: <Brain />, color: 'from-purple-500 to-violet-500', image: '/assets/images/Neuraplaybrain.png' },
        { id: 'counting-adventure', title: 'Number Quest', category: 'Logic', icon: <Trophy />, color: 'from-orange-500 to-amber-500', image: '/assets/images/Mascot.png' },
        { id: 'fuzzling-advanced', title: "Fuzzling's Playpen", category: 'Logic', icon: <Sparkles />, color: 'from-pink-500 to-rose-500', image: '/assets/images/Neuraplaybrain.png' },
        { id: 'letter-hunt', title: 'Letter Safari', category: 'Language', icon: <FileText />, color: 'from-fuchsia-500 to-pink-500', image: '/assets/images/Alfiya.png' },
        { id: 'ai-story-creator', title: 'AI Story Creator', category: 'Creativity', icon: <Sparkles />, color: 'from-sky-500 to-indigo-500', image: '/assets/images/Neuraplaybrain.png' },
        { id: 'happy-builder', title: 'Happy Builder', category: 'Creativity', icon: <Trophy />, color: 'from-yellow-500 to-lime-500', image: '/assets/images/Mascot.png' },
    ], []);

    const gameCategories = useMemo(() => ['All', ...Array.from(new Set(games.map(g => g.category)))], [games]);
    const filteredGames = useMemo(() => playCategory === 'All' ? games : games.filter(g => g.category === playCategory), [games, playCategory]);

    // Trigger card reveal animations when games change
    useEffect(() => {
        if (filteredGames.length > 0) {
            // Animate cards with staggered delays
            filteredGames.forEach((game, index) => {
                setTimeout(() => {
                    setRevealedCards(prev => new Set([...prev, game.id]));
                }, index * 100);
            });
        }
    }, [filteredGames]);

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
            ageRange: '6-12',
            image: '/assets/images/crosswalk.png',
            features: ['Traffic simulation', 'Increasing difficulty', 'Score tracking'],
            instructions: 'Wait for the traffic to clear, then quickly cross the road. Be careful of oncoming vehicles!',
        },
            'magic-storyteller': {
      id: 'magic-storyteller',
            title: 'Magic Storyteller',
            category: 'Story',
            description: 'Premium AI-powered storytelling adventure with personalized narratives and comprehensive neuropsychological assessment.',
            skills: ['Executive Function', 'Working Memory', 'Social Cognition', 'Theory of Mind', 'Emotional Regulation'],
            difficulty: 'Easy',
            duration: '5-8 min',
            ageRange: '4-10',
            image: '/assets/images/Mascot.png',
            features: ['AI-powered storytelling', 'Character creation', 'Neuropsychological assessment', 'Text-to-speech narration'],
            instructions: 'Create your character and embark on a personalized magical adventure where your choices shape the story and reveal cognitive insights!',
        },
        'inhibition': {
            id: 'inhibition',
            title: 'Stop & Go Adventure',
            category: 'Focus',
            description: 'Train your impulse control and attention with this engaging stop-go game.',
            skills: ['Inhibitory Control', 'Attention', 'Response Inhibition'],
            difficulty: 'Medium',
            duration: '4-7 min',
            ageRange: '5-12',
            image: '/assets/images/Neuraplaybrain.png',
            features: ['Color-coded responses', 'Speed challenges', 'Progress tracking'],
            instructions: 'Press the button when you see green, but stop when you see red. Be quick but accurate!',
        },
        'berry-blaster': {
            id: 'berry-blaster',
            title: 'Berry Blaster',
            category: 'Focus',
            description: 'Blast berries in this fast-paced focus and reaction game.',
            skills: ['Visual Attention', 'Reaction Time', 'Hand-Eye Coordination'],
            difficulty: 'Easy',
            duration: '3-5 min',
            ageRange: '4-10',
            image: '/assets/images/Alfiya.png',
            features: ['Colorful graphics', 'Increasing speed', 'Score system'],
            instructions: 'Click on berries as they appear. The faster you click, the higher your score!',
        },
        'pattern-matching': {
            id: 'pattern-matching',
            title: 'Pattern Detective',
            category: 'Logic',
            description: 'Solve pattern puzzles and develop logical thinking skills.',
            skills: ['Pattern Recognition', 'Logical Reasoning', 'Problem Solving'],
            difficulty: 'Medium',
            duration: '5-10 min',
            ageRange: '6-12',
            image: '/assets/images/Neuraplaybrain.png',
            features: ['Multiple pattern types', 'Progressive difficulty', 'Hint system'],
            instructions: 'Find the pattern in the sequence and predict what comes next.',
        },
        'counting-adventure': {
            id: 'counting-adventure',
            title: 'Number Quest',
            category: 'Logic',
            description: 'Embark on a mathematical adventure with counting and number recognition.',
            skills: ['Number Recognition', 'Counting', 'Mathematical Thinking'],
            difficulty: 'Easy',
            duration: '4-8 min',
            ageRange: '4-8',
            image: '/assets/images/Mascot.png',
            features: ['Number animations', 'Progressive difficulty', 'Visual feedback'],
            instructions: 'Count the objects and select the correct number.',
        },
        'fuzzling-advanced': {
            id: 'fuzzling-advanced',
            title: "Fuzzling's Playpen",
            category: 'Logic',
            description: 'Advanced puzzle solving with Fuzzling the friendly monster.',
            skills: ['Problem Solving', 'Spatial Reasoning', 'Logical Thinking'],
            difficulty: 'Hard',
            duration: '8-15 min',
            ageRange: '8-14',
            image: '/assets/images/Neuraplaybrain.png',
            features: ['Complex puzzles', 'Multiple solutions', 'Hint system'],
            instructions: 'Help Fuzzling solve complex puzzles by thinking logically and creatively.',
        },
        'letter-hunt': {
            id: 'letter-hunt',
            title: 'Letter Safari',
            category: 'Language',
            description: 'Hunt for letters and develop early literacy skills.',
            skills: ['Letter Recognition', 'Visual Scanning', 'Language Development'],
            difficulty: 'Easy',
            duration: '3-6 min',
            ageRange: '4-8',
            image: '/assets/images/Alfiya.png',
            features: ['Letter animations', 'Sound effects', 'Progress tracking'],
            instructions: 'Find and click on the target letter as quickly as you can.',
        },
        'ai-story-creator': {
            id: 'ai-story-creator',
            title: 'AI Story Creator',
            category: 'Creativity',
            description: 'Create amazing stories with the help of AI.',
            skills: ['Creativity', 'Language Skills', 'Imagination'],
            difficulty: 'Easy',
            duration: '5-15 min',
            ageRange: '6-12',
            image: '/assets/images/Neuraplaybrain.png',
            features: ['AI-powered stories', 'Custom characters', 'Interactive elements'],
            instructions: 'Describe your story idea and watch AI create a unique adventure for you.',
        },
        'happy-builder': {
            id: 'happy-builder',
            title: 'Happy Builder',
            category: 'Creativity',
            description: 'Build and create in this creative construction game.',
            skills: ['Creativity', 'Spatial Reasoning', 'Planning'],
            difficulty: 'Easy',
            duration: '5-10 min',
            ageRange: '4-10',
            image: '/assets/images/Mascot.png',
            features: ['Building blocks', 'Creative freedom', 'Save creations'],
            instructions: 'Use the building blocks to create whatever you imagine.',
        },
        'the-cube': {
            id: 'the-cube',
            title: 'The Cube',
            category: 'Logic',
            description: 'Solve 3D cube puzzles and develop spatial reasoning.',
            skills: ['Spatial Reasoning', '3D Visualization', 'Problem Solving'],
            difficulty: 'Hard',
            duration: '10-20 min',
            ageRange: '8-14',
            image: '/assets/images/Thecube.png',
            features: ['3D graphics', 'Multiple levels', 'Hint system'],
            instructions: 'Rotate the cube to solve the puzzle and unlock new levels.',
        },
    };

    const glassPanelStyle = isDarkMode 
        ? "bg-white/10 backdrop-blur-md border border-white/20" 
        : "bg-white/80 backdrop-blur-md border border-purple-200/50";

    const handlePlayGame = () => {
        if (infoGame) {
            setSelectedGame(infoGame.id);
            setShowInfoModal(false);
            setMainView('game');
        }
    };

    const handleGameClose = () => {
        setSelectedGame(null);
        setMainView('play');
    };

    const handleGameSelect = (gameId: string) => {
        setSelectedGame(gameId);
        
        // 🗄️ DATABASE INTEGRATION: Log game selection
        dataCollectionService.logNavigation('game_selection', `playground/${gameId}`).catch((error: any) => {
            console.error('Failed to log game selection:', error);
        });
    };

    const handleCategoryChange = (category: string) => {
        setPlayCategory(category);
        
        // 🗄️ DATABASE INTEGRATION: Log category change
        dataCollectionService.logNavigation('category_change', `playground/${category}`).catch((error: any) => {
            console.error('Failed to log category change:', error);
        });
    };

    const renderGameComponent = (gameId: string) => {
        switch (gameId) {
            case 'crossroad-fun':
                return <CrossroadFunGame onClose={handleGameClose} />;
            case 'memory-sequence':
                return <MemorySequenceGame onClose={handleGameClose} />;
                    case 'magic-storyteller':
            return <MagicStorytellerGame onClose={handleGameClose} />;
            case 'inhibition':
                return <InhibitionGame onClose={handleGameClose} />;
            case 'berry-blaster':
                return <BerryBlasterGame />;
            case 'pattern-matching':
                return <PatternMatchingGame onClose={handleGameClose} />;
            case 'counting-adventure':
                return <CountingAdventureGame onClose={handleGameClose} />;
            case 'fuzzling-advanced':
                return <FuzzlingAdvancedGame onClose={handleGameClose} />;
            case 'letter-hunt':
                return <LetterHuntGame onClose={handleGameClose} />;
            case 'mountain-climber':
                return <MountainClimberGame onClose={handleGameClose} />;
            case 'stacker':
                return <StackerGame onClose={handleGameClose} onGameEnd={() => {}} />;
            case 'happy-builder':
                return <HappyBuilderGame />;
            case 'fuzzling':
                return <FuzzlingGame onClose={handleGameClose} />;
            case 'the-cube':
                return <TheCubeGame onClose={handleGameClose} />;
            case 'ai-story-creator':
                return <AIGame onClose={handleGameClose} />;
            default:
                return <div className="text-white text-center p-8">Game not found: {gameId}</div>;
        }
    };

    const renderGameGrid = () => (
        <>
            <div className="flex justify-between items-center mb-6">
                <div className="flex gap-2">
                    {gameCategories.map(category => (
                        <button
                            key={category}
                            onClick={() => handleCategoryChange(category)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                playCategory === category
                                    ? 'bg-violet-600 text-white'
                                    : isDarkMode 
                                        ? 'bg-white/10 text-slate-300 hover:bg-white/20'
                                        : 'bg-white/60 text-gray-700 hover:bg-white/80'
                            }`}
                        >
                            {category}
                        </button>
                    ))}
                </div>
                <h2 className={`text-2xl font-bold mb-4 ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>Category: {playCategory}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredGames.map((game, index) => {
                    const isRevealed = revealedCards.has(game.id);
                    
                    return (
                        <div
                            key={game.id}
                            className={`${glassPanelStyle} rounded-2xl overflow-hidden cursor-pointer group w-full h-full transition-all duration-500 transform ${
                                isRevealed 
                                    ? 'opacity-100 scale-100 translate-y-0' 
                                    : 'opacity-0 scale-95 translate-y-4'
                            }`}
                            style={{ transitionDelay: `${index * 100}ms` }}
                            onClick={() => {
                                const gameInfo = gameDetails[game.id];
                                if (gameInfo) {
                                    setInfoGame(gameInfo);
                                    setShowInfoModal(true);
                                    handleGameSelect(game.id);
                                } else {
                                    console.warn(`No game details found for: ${game.id}`);
                                }
                            }}
                        >
                            {game.image ? (
                                <div className="relative h-36 overflow-hidden">
                                    <img 
                                        src={game.image} 
                                        alt={`${game.title} Game`}
                                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                    />
                                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors"></div>
                                    <div className="absolute top-3 right-3 bg-black/50 rounded-lg px-2 py-1">
                                        <span className="text-xs font-medium text-white">{game.category}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className={`h-36 bg-gradient-to-br ${game.color} flex items-center justify-center text-white text-5xl transition-transform duration-300 group-hover:scale-110`}>
                                    {game.icon}
                                </div>
                            )}
                            <div className="p-5">
                                <h3 className={`font-bold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{game.title}</h3>
                            </div>
                        </div>
                    );
                })}
            </div>
        </>
    );



    const renderProfile = () => (
        <div className="space-y-6">
            {/* User Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className={`${glassPanelStyle} p-4 rounded-xl text-center`}>
                    <div className="w-12 h-12 mx-auto mb-2 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center">
                        <Crown className="w-6 h-6 text-black" />
                    </div>
                    <div className="text-2xl font-bold text-yellow-400">{user?.profile.rank || 'New Learner'}</div>
                    <div className="text-sm text-slate-400">Current Rank</div>
                </div>
                <div className={`${glassPanelStyle} p-4 rounded-xl text-center`}>
                    <div className="w-12 h-12 mx-auto mb-2 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-full flex items-center justify-center">
                        <Zap className="w-6 h-6 text-black" />
                    </div>
                    <div className="text-2xl font-bold text-blue-400">{user?.profile.xp || 0}</div>
                    <div className="text-sm text-slate-400">Experience Points</div>
                </div>
                <div className={`${glassPanelStyle} p-4 rounded-xl text-center`}>
                    <div className="w-12 h-12 mx-auto mb-2 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                        <Star className="w-6 h-6 text-black" />
                    </div>
                    <div className="text-2xl font-bold text-yellow-400">{user?.profile.stars || 0}</div>
                    <div className="text-sm text-slate-400">Stars Earned</div>
                </div>
                <div className={`${glassPanelStyle} p-4 rounded-xl text-center`}>
                    <div className="w-12 h-12 mx-auto mb-2 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
                        <TrendingUp className="w-6 h-6 text-black" />
                    </div>
                    <div className="text-2xl font-bold text-green-400">{user?.profile.xpToNextLevel || 100}</div>
                    <div className="text-sm text-slate-400">XP to Next Level</div>
                </div>
            </div>

            {/* Game Progress */}
            <div className={`${glassPanelStyle} p-6 rounded-2xl`}>
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Award className="w-5 h-5 text-violet-400" />
                    Game Progress
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(user?.profile.gameProgress || {}).map(([gameId, progress]) => {
                        const game = games.find(g => g.id === gameId);
                        if (!game) return null;
                        
                        return (
                            <div key={gameId} className="p-4 bg-gradient-to-r from-violet-500/20 to-purple-500/20 border border-violet-400/30 rounded-xl">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className={`w-8 h-8 bg-gradient-to-br ${game.color} rounded-full flex items-center justify-center text-white`}>
                                        {game.icon}
                                    </div>
                                    <h4 className="font-semibold text-white">{game.title}</h4>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="text-center">
                                        <div className="text-violet-400 font-bold">{progress.level || 0}</div>
                                        <div className="text-slate-400">Level</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-green-400 font-bold">{progress.timesPlayed || 0}</div>
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
                                <div className="bg-green-400 h-2 rounded-full" style={{ width: `${Math.min((user?.profile.gameProgress?.['memory-sequence']?.level || 0) * 20, 100)}%` }}></div>
                            </div>
                            <span className="text-xs text-green-400 font-bold">
                                {Math.min((user?.profile.gameProgress?.['memory-sequence']?.level || 0) * 20, 100)}%
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
                                <div className="bg-blue-400 h-2 rounded-full" style={{ width: `${Math.min((user?.profile.gameProgress?.['inhibition']?.level || 0) * 20, 100)}%` }}></div>
                            </div>
                            <span className="text-xs text-blue-400 font-bold">
                                {Math.min((user?.profile.gameProgress?.['inhibition']?.level || 0) * 20, 100)}%
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
                                <div className="bg-purple-400 h-2 rounded-full" style={{ width: `${Math.min((user?.profile.gameProgress?.['pattern-matching']?.level || 0) * 20, 100)}%` }}></div>
                            </div>
                            <span className="text-xs text-purple-400 font-bold">
                                {Math.min((user?.profile.gameProgress?.['pattern-matching']?.level || 0) * 20, 100)}%
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
                                <div className="bg-orange-400 h-2 rounded-full" style={{ width: `${Math.min((user?.profile.gameProgress?.['counting-adventure']?.level || 0) * 20, 100)}%` }}></div>
                            </div>
                            <span className="text-xs text-orange-400 font-bold">
                                {Math.min((user?.profile.gameProgress?.['counting-adventure']?.level || 0) * 20, 100)}%
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    // Add user authentication check
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

    return (
        <div className={`min-h-screen text-slate-200 pt-24 pb-12 relative ${
            isDarkMode 
                ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900' 
                : 'bg-gradient-to-br from-purple-100 via-violet-200 to-indigo-100'
        }`}>
            
            <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                    <h1 className={`text-5xl md:text-6xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>The Playground</h1>
                    <p className={`text-xl mt-2 ${isDarkMode ? 'text-violet-300' : 'text-violet-600'}`}>Your learning adventure starts here, {user?.username}.</p>
                </div>
                <div className="flex flex-col lg:flex-row gap-4">
                    <aside className="lg:w-48 flex-shrink-0">
                        <div className="sticky top-32">
                            <nav className={`${glassPanelStyle} p-3 rounded-xl space-y-1`}>
                                {gameCategories.map(cat => (
                                    <button key={cat} onClick={() => handleCategoryChange(cat)} className={`w-full text-left p-2 rounded-lg font-semibold transition-all text-sm ${
                                    playCategory === cat 
                                        ? isDarkMode ? 'bg-white/20 text-white' : 'bg-violet-600 text-white'
                                        : isDarkMode 
                                            ? 'hover:bg-white/10 text-slate-300' 
                                            : 'hover:bg-white/60 text-gray-700'
                                }`}>{cat}</button>
                                ))}
                            </nav>
                        </div>
                    </aside>
                    <main className="flex-1">
                        <div className={`${glassPanelStyle} p-2 flex items-center mb-4 rounded-xl`}>
                            {['play', 'profile', 'social'].map(view => (
                                <button key={view} onClick={() => setMainView(view)} className={`flex-1 py-2 rounded-lg font-bold capitalize transition-colors flex items-center justify-center gap-2 ${
                                    mainView === view 
                                        ? isDarkMode ? 'bg-white/20 text-white' : 'bg-violet-600 text-white'
                                        : isDarkMode 
                                            ? 'text-violet-300 hover:text-white' 
                                            : 'text-violet-600 hover:text-violet-800'
                                }`}>
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
                            {mainView === 'social' && <div className={`p-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}><h2 className="text-3xl font-bold">Social & Friends</h2></div>}
                            {mainView === 'game' && selectedGame && (
                                <div className="relative">
                                    <button
                                        onClick={handleGameClose}
                                        className="absolute top-2 right-2 z-10 bg-white/20 hover:bg-white/30 text-white p-2 rounded-full transition-colors"
                                    >
                                        ✕
                                    </button>
                                    <GameWrapper gameId={selectedGame} onClose={handleGameClose}>
                                        {renderGameComponent(selectedGame)}
                                    </GameWrapper>
                                </div>
                            )}
                        </div>
                    </main>
                </div>
            </div>
            <PlaygroundModalReveal
                game={infoGame}
                isOpen={showInfoModal}
                onClose={() => setShowInfoModal(false)}
                onPlay={handlePlayGame}
            />

        </div>
    );
};

export default PlaygroundPage;