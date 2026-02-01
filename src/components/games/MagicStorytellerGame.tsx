import React, { useState, useEffect, useCallback } from 'react';
import { useUser } from '../../contexts/UserContext';
import { Volume2, VolumeX, RotateCcw, Play, Square, Brain, Sparkles, ArrowRight, User, Palette, Heart as HeartIcon, Speaker, Pause } from 'lucide-react';
import GameModal from '../GameModal';

// Import services
import { aiService } from '../../services/AIService';


// The comprehensive 41 neuropsychological concepts
const NEUROPSYCHOLOGICAL_CONCEPTS = [
  'Working Memory', 'Executive Function', 'Attention Control', 'Cognitive Flexibility',
  'Inhibitory Control', 'Planning', 'Problem Solving', 'Decision Making',
  'Emotional Regulation', 'Social Cognition', 'Theory of Mind', 'Metacognition',
  'Processing Speed', 'Visual Processing', 'Auditory Processing', 'Spatial Reasoning',
  'Verbal Memory', 'Visual Memory', 'Sequential Processing', 'Simultaneous Processing',
  'Fluid Reasoning', 'Crystallized Intelligence', 'Processing Efficiency', 'Cognitive Load',
  'Mental Set', 'Cognitive Bias', 'Heuristic Processing', 'Automatic Processing',
  'Controlled Processing', 'Divided Attention', 'Sustained Attention', 'Selective Attention',
  'Response Inhibition', 'Task Switching', 'Goal Setting', 'Self-Monitoring',
  'Error Detection', 'Feedback Processing', 'Adaptive Behavior', 'Cognitive Strategy',
  'Motor Skills'
];

interface Choice {
  text: string;
  cognitive_focus: string;
}

interface StoryState {
  story: string;
  imagePrompt: string;
  imageUrl?: string;
  choices: Choice[];
  isEnding: boolean;
}

interface HistoryItem {
  story: string;
  choice: string;
  cognitive_focus?: string;
  timestamp: Date;
}

interface GameSession {
  choices: Array<{
    scene: number;
    choice: string;
    cognitive_focus: string;
    neuropsychologicalConcept: string;
    timestamp: Date;
  }>;
  totalScenes: number;
  completedAt?: Date;
}

interface AvatarCreationFormProps {
  onCreateAvatar: (name: string, appearance: string, personality: string) => void;
  isLoading: boolean;
}

const AvatarCreationForm: React.FC<AvatarCreationFormProps> = ({ onCreateAvatar, isLoading }) => {
  const [name, setName] = useState('');
  const [appearance, setAppearance] = useState('');
  const [personality, setPersonality] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && appearance && personality) {
      onCreateAvatar(name, appearance, personality);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">
          <User className="inline w-4 h-4 mr-2" />
          Character Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none font-bold text-gray-900 bg-white"
          placeholder="Enter your character's name..."
          required
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">
          <Palette className="inline w-4 h-4 mr-2" />
          Appearance
        </label>
        <input
          type="text"
          value={appearance}
          onChange={(e) => setAppearance(e.target.value)}
          className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none font-bold text-gray-900 bg-white"
          placeholder="Describe your character's appearance..."
          required
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">
          <HeartIcon className="inline w-4 h-4 mr-2" />
          Personality
        </label>
        <input
          type="text"
          value={personality}
          onChange={(e) => setPersonality(e.target.value)}
          className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none font-bold text-gray-900 bg-white"
          placeholder="Describe your character's personality..."
          required
        />
      </div>

      <button
        type="submit"
        disabled={isLoading || !name || !appearance || !personality}
        className="w-full p-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed border-2 border-purple-500"
      >
        {isLoading ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent mr-3"></div>
            Creating Your Character...
          </div>
        ) : (
          'Create Character'
        )}
      </button>
    </form>
  );
};

interface LoadingSpinnerProps {
  message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message = "The storyteller is thinking..." }) => (
  <div className="flex flex-col items-center justify-center gap-4 py-8">
    <svg 
      className="animate-spin h-12 w-12 text-purple-600" 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24"
    >
      <circle 
        className="opacity-25" 
        cx="12" 
        cy="12" 
        r="10" 
        stroke="currentColor" 
        strokeWidth="4"
      ></circle>
      <path 
        className="opacity-75" 
        fill="currentColor" 
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
    <p className="text-lg font-semibold text-slate-700">{message}</p>
  </div>
);

interface StoryDisplayProps {
  text: string;
  onSpeak: () => void;
  isSpeaking: boolean;
}

const StoryDisplay: React.FC<StoryDisplayProps> = ({ text, onSpeak, isSpeaking }) => {
  return (
    <div className="bg-white/95 backdrop-blur-sm border-2 border-purple-200 rounded-xl p-6 shadow-lg relative">
      <button
        onClick={onSpeak}
        className="absolute top-4 right-4 p-2 bg-purple-100 hover:bg-purple-200 rounded-full transition-colors duration-200"
        title="Read story aloud"
      >
        {isSpeaking ? (
          <Pause className="w-5 h-5 text-purple-600" />
        ) : (
          <Speaker className="w-5 h-5 text-purple-600" />
        )}
      </button>
      <div className="text-left w-full pr-12">
        {text.split('\n').map((paragraph, index) => (
          <p key={index} className="text-slate-800 text-lg md:text-xl leading-relaxed mb-4">
            {paragraph}
          </p>
        ))}
      </div>
    </div>
  );
};

interface ChoiceButtonProps {
  choice: Choice;
  onClick: (choice: Choice) => void;
  disabled: boolean;
}

const ChoiceButton: React.FC<ChoiceButtonProps> = ({ choice, onClick, disabled }) => {
  return (
    <button
      onClick={() => onClick(choice)}
      disabled={disabled}
      className="w-full text-left bg-white/90 backdrop-blur-sm border-2 border-purple-300 rounded-lg p-4 text-slate-800 font-semibold shadow-md transition-all duration-200 ease-in-out hover:bg-purple-50 hover:border-purple-500 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] disabled:transform-none"
    >
      <div className="flex items-center justify-between">
        <span className="text-lg font-bold">{choice.text}</span>
        <ArrowRight className="w-5 h-5 text-purple-600 transition-transform group-hover:translate-x-1" />
      </div>
    </button>
  );
};

interface ImageViewerProps {
  src: string;
  alt: string;
}

const ImageViewer: React.FC<ImageViewerProps> = ({ src, alt }) => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(false);
  }, [src]);

  return (
    <div className="w-full aspect-video bg-slate-200 rounded-lg overflow-hidden shadow-lg transition-all duration-300 border-2 border-purple-200">
      {src ? (
        <img
          src={src}
          alt={alt}
          className={`w-full h-full object-cover transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setIsLoaded(true)}
          key={src}
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-purple-900/20 to-pink-900/20 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4 opacity-60">✨</div>
            <p className="text-slate-600 font-medium text-xl">Magical Scene</p>
          </div>
        </div>
      )}
    </div>
  );
};

interface MagicStorytellerGameProps {
  onClose: () => void;
}

const MagicStorytellerGame: React.FC<MagicStorytellerGameProps> = ({ onClose }) => {
  const { user, setUser, updateAIAssessment } = useUser();
  const [gameState, setGameState] = useState<StoryState | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [avatarCreated, setAvatarCreated] = useState(false);
  const [playerAvatar, setPlayerAvatar] = useState({
    name: '',
    appearance: '',
    personality: ''
  });
  const [gameSession, setGameSession] = useState<GameSession>({
    choices: [],
    totalScenes: 0
  });
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);

  // Audio element for background music
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const startGame = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setHistory([]);
    setIsGameOver(false);
    try {
      const initialGameState = await getNewStoryStep([], "Start the adventure");
      setGameState(initialGameState);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (avatarCreated) {
      startGame();
    }
  }, [avatarCreated, startGame]);

  const createAvatar = async (name: string, appearance: string, personality: string) => {
    setIsLoading(true);
    
    try {
      setPlayerAvatar({
        name,
        appearance,
        personality
      });
      
      setAvatarCreated(true);
      
      // Start background music
      startBackgroundMusic();
      
    } catch (error) {
      console.error('Error creating avatar:', error);
      // Fallback
      setPlayerAvatar({ name, appearance, personality });
      setAvatarCreated(true);
    } finally {
      setIsLoading(false);
    }
  };

  const getRandomNeuropsychConcept = (): string => {
    return NEUROPSYCHOLOGICAL_CONCEPTS[Math.floor(Math.random() * NEUROPSYCHOLOGICAL_CONCEPTS.length)];
  };

  const getNewStoryStep = async (historyItems: HistoryItem[], choiceText: string): Promise<StoryState> => {
    try {
      // Create the system instruction for our Magic Storyteller
      const systemInstruction = `
You are a master storyteller and child development expert creating a dynamic text adventure game. Your goal is to help children develop their cognitive and moral capacities through engaging narratives.

The story should be magical, positive, and empowering. The main character is ${playerAvatar.name || 'a brave child'}, who is ${playerAvatar.appearance || 'a young adventurer'} with a ${playerAvatar.personality || 'kind and curious'} personality.

For each step of the story, you will:
1. Continue the narrative based on the user's previous choice. The story segments should be short, engaging, and appropriate for a child aged 7-10 (about 2-3 paragraphs).
2. Based on the new story segment, create a detailed, visually descriptive prompt for an image generation model. The style should be 'fantasy digital art, vibrant colors, whimsical, storybook illustration'.
3. Present the child with 2 to 3 meaningful choices. Each choice must be designed to subtly exercise a specific cognitive function from our neuropsychological concepts.
4. Determine if the current story segment is a natural conclusion to the adventure.

Your response MUST be in JSON format with this exact structure:
{
  "story": "The next part of the story (2-3 paragraphs)",
  "imagePrompt": "A detailed prompt for image generation in fantasy digital art style",
  "choices": [
    {
      "text": "The text for the choice button",
      "cognitive_focus": "The neuropsychological concept this choice targets"
    }
  ],
  "isEnding": false
}
`;

      // Build context from history
      let contextPrompt = systemInstruction;
      
      if (historyItems.length > 0) {
        contextPrompt += "\n\nPrevious story context:\n";
        historyItems.forEach((item, index) => {
          contextPrompt += `${index + 1}. Story: ${item.story}\n   Player chose: ${item.choice}\n`;
        });
      }
      
      contextPrompt += `\n\nCurrent choice: ${choiceText}`;

      // Use the project's AI service
      const response = await fetch('/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_type: 'chat',
          input_data: {
            messages: [
              { role: 'system', content: systemInstruction },
              { role: 'user', content: contextPrompt }
            ]
          }
        })
      });

      if (!response.ok) {
        throw new Error(`AI API failed: ${response.status}`);
      }

      const result = await response.json();
      const aiResponse = result.response || result.data || result[0]?.generated_text || '';
      
      // Try to parse JSON from the response
      let storyData;
      try {
        // Look for JSON in the response
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          storyData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (parseError) {
        // Fallback story generation
        console.warn('Failed to parse AI response, using fallback:', parseError);
        storyData = generateFallbackStory(choiceText, historyItems.length);
      }

      // Generate image using the project's image generation service
      if (storyData.imagePrompt) {
        try {
          const imageResponse = await fetch('/.netlify/functions/api', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              task_type: 'image',
              input_data: storyData.imagePrompt
            })
          });

          if (imageResponse.ok) {
            const imageData = await imageResponse.json();
            if (imageData.data) {
              storyData.imageUrl = `data:image/jpeg;base64,${imageData.data}`;
            }
          }
        } catch (imageError) {
          console.warn('Image generation failed:', imageError);
        }
      }

      return storyData;
    } catch (error) {
      console.error('Error generating story step:', error);
      return generateFallbackStory(choiceText, history.length);
    }
  };

  const generateFallbackStory = (choice: string, stepNumber: number): StoryState => {
    const concept = getRandomNeuropsychConcept();
    
    const fallbackStories = [
      {
        story: `${playerAvatar.name} finds themselves in a magical forest where the trees whisper ancient secrets. The choice to ${choice.toLowerCase()} leads them to a clearing where mystical creatures gather around a crystal fountain that sparkles with rainbow light.\n\nThe creatures look up as ${playerAvatar.name} approaches, their eyes filled with curiosity and hope. It seems they've been waiting for someone brave enough to help them solve a puzzle that has troubled their forest home for many seasons.`,
        imagePrompt: `fantasy digital art, magical forest clearing, crystal fountain, whimsical creatures, rainbow sparkles, vibrant colors, storybook illustration, ${playerAvatar.appearance} character`,
        choices: [
          { text: "Listen carefully to the creatures' problem", cognitive_focus: "Sustained Attention" },
          { text: "Examine the crystal fountain for clues", cognitive_focus: "Visual Processing" },
          { text: "Ask the creatures about their forest", cognitive_focus: "Social Cognition" }
        ],
        isEnding: false
      },
      {
        story: `Following the path that opened after ${choice.toLowerCase()}, ${playerAvatar.name} discovers a magnificent castle in the clouds. The castle floats gently above a sea of soft, glowing mist, connected to the ground by a bridge made of solidified starlight.\n\nAs they step onto the star-bridge, ${playerAvatar.name} feels a warm tingle of magic flowing through their feet. At the castle entrance, a friendly dragon with scales that shimmer like opals greets them with a gentle smile, explaining that the castle holds three magical rooms, each containing a different adventure.`,
        imagePrompt: `fantasy digital art, floating castle in clouds, starlight bridge, opal-scaled dragon, magical mist, vibrant sky colors, whimsical storybook illustration`,
        choices: [
          { text: "Enter the Room of Echoing Memories", cognitive_focus: "Verbal Memory" },
          { text: "Explore the Chamber of Living Puzzles", cognitive_focus: "Problem Solving" },
          { text: "Visit the Garden of Growing Dreams", cognitive_focus: "Creativity" }
        ],
        isEnding: false
      }
    ];

    return fallbackStories[stepNumber % fallbackStories.length];
  };

  const handleChoice = useCallback(async (choice: Choice) => {
    if (!gameState) return;

    setIsLoading(true);
    setError(null);

    // Record the choice for assessment
    const neuropsychConcept = getRandomNeuropsychConcept();
    const newChoice = {
      scene: history.length,
      choice: choice.text,
      cognitive_focus: choice.cognitive_focus,
      neuropsychologicalConcept: neuropsychConcept,
      timestamp: new Date()
    };

    setGameSession(prev => ({
      ...prev,
      choices: [...prev.choices, newChoice],
      totalScenes: prev.totalScenes + 1
    }));

    const newHistoryItem: HistoryItem = { 
      story: gameState.story, 
      choice: choice.text,
      cognitive_focus: choice.cognitive_focus,
      timestamp: new Date()
    };
    const updatedHistory = [...history, newHistoryItem];
    setHistory(updatedHistory);

    try {
      const nextGameState = await getNewStoryStep(updatedHistory, choice.text);
      setGameState(nextGameState);
      if (nextGameState.isEnding) {
        setIsGameOver(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, [gameState, history]);

  const speakText = async (text: string) => {
    if (isSpeaking) {
      // Stop current speech
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }
      setIsSpeaking(false);
      setCurrentAudio(null);
      return;
    }

    try {
      setIsSpeaking(true);
      
      // Use the project's ElevenLabs TTS service
      const response = await fetch('/api/elevenlabs-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text,
          voiceId: '8LVfoRdkh4zgjr8v5ObE' // Use a child-friendly voice
        })
      });

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        audio.onended = () => {
          setIsSpeaking(false);
          setCurrentAudio(null);
          URL.revokeObjectURL(audioUrl);
        };
        
        audio.onerror = () => {
          setIsSpeaking(false);
          setCurrentAudio(null);
          URL.revokeObjectURL(audioUrl);
        };
        
        setCurrentAudio(audio);
        await audio.play();
      } else {
        throw new Error('TTS service unavailable');
      }
    } catch (error) {
      console.error('Error with text-to-speech:', error);
      setIsSpeaking(false);
      setCurrentAudio(null);
    }
  };

  const startBackgroundMusic = () => {
    if (audioRef.current) {
      audioRef.current.src = '/assets/music/Natural Vibes.mp3';
      audioRef.current.loop = true;
      audioRef.current.volume = 0.2;
      audioRef.current.play().then(() => {
        setIsMusicPlaying(true);
      }).catch(error => {
        console.error('Error playing music:', error);
      });
    }
  };

  const toggleMusic = () => {
    if (audioRef.current) {
      if (isMusicPlaying) {
        audioRef.current.pause();
        setIsMusicPlaying(false);
      } else {
        audioRef.current.play();
        setIsMusicPlaying(true);
      }
    }
  };

  const completeGame = async () => {
    setIsGameOver(true);
    
    // Extract neuropsychological concepts and choice quality data
    const neuropsychConcepts = gameSession.choices.map(c => c.neuropsychologicalConcept);
    const choiceQualityData = gameSession.choices.map(c => {
      // Simple quality assessment based on choice cognitive focus alignment
      return c.cognitive_focus && neuropsychConcepts.includes(c.cognitive_focus);
    });

    // Update AI Assessment with comprehensive data
    try {
      await updateAIAssessment('magic-storyteller', neuropsychConcepts, choiceQualityData);
    } catch (error) {
      console.error('Error updating AI assessment:', error);
    }
    
    // Save assessment data
    const gameData = {
      gameType: 'MagicStoryteller',
      choices: gameSession.choices,
      totalScenes: gameSession.totalScenes,
      completedAt: new Date(),
      assessment: {
        neuropsychologicalConcepts: gameSession.choices.map(c => c.neuropsychologicalConcept),
        cognitiveFocus: gameSession.choices.map(c => c.cognitive_focus),
        playerAvatar: playerAvatar,
        choiceQuality: choiceQualityData
      }
    };

    // Update user progress
    if (user) {
      const updatedUser = {
        ...user,
        profile: {
          ...user.profile,
          gameProgress: {
            ...user.profile.gameProgress,
            magicStoryteller: gameData
          }
        }
      };
      setUser(updatedUser);
    }
  };

  const renderContent = () => {
    if (isLoading && !gameState) {
      return (
        <div className="flex items-center justify-center h-full py-16">
          <LoadingSpinner />
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="text-center p-6">
          <div className="bg-red-100 border-2 border-red-300 rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-2 text-red-800">Oh no, a dragon blocked the path!</h2>
            <p className="mb-4 text-red-700">{error}</p>
            <button
              onClick={startGame}
              className="bg-red-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-600 transition-colors"
            >
              Try Starting a New Adventure
            </button>
          </div>
        </div>
      );
    }

    if (!gameState) {
      return null;
    }

    return (
      <div className={`transition-opacity duration-300 ${isLoading ? 'opacity-50' : 'opacity-100'} h-full flex flex-col max-w-4xl mx-auto`}>
        {/* Image section */}
        <div className="mb-4 flex-shrink-0">
          <div className="max-h-64 overflow-hidden">
            <ImageViewer src={gameState.imageUrl || ''} alt={gameState.imagePrompt || 'Magical scene'} />
          </div>
        </div>

        {/* Story section */}
        <div className="mb-4 flex-1 min-h-0">
          <div className="h-full overflow-auto">
            <StoryDisplay 
              text={gameState.story} 
              onSpeak={() => speakText(gameState.story)}
              isSpeaking={isSpeaking}
            />
          </div>
        </div>

        {/* Choices section */}
        <div className="flex-shrink-0">
          {!isGameOver && (
            <div className="grid grid-cols-1 gap-3">
              {gameState.choices.map((choice, index) => (
                <ChoiceButton
                  key={index}
                  choice={choice}
                  onClick={handleChoice}
                  disabled={isLoading}
                />
              ))}
            </div>
          )}

          {isGameOver && (
             <div className="bg-purple-100 border-2 border-purple-300 rounded-xl p-6 text-center">
               <h2 className="text-2xl font-bold text-purple-800 mb-2">The End</h2>
               <p className="text-slate-700 mb-4">Thank you for playing! You've completed this chapter of your magical adventure.</p>
               <button
                 onClick={startGame}
                 className="bg-purple-600 text-white font-bold py-3 px-6 rounded-full hover:bg-purple-700 transition-transform transform hover:scale-105"
               >
                 Start a New Adventure
               </button>
             </div>
          )}
        </div>
      </div>
    );
  };

  const gameContent = () => {
    if (!avatarCreated) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-purple-50 to-pink-100 p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl p-8 mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
                Create Your Hero
              </h1>
              <p className="text-gray-700 text-lg">
                Design your character for an epic magical adventure
              </p>
            </div>
            <AvatarCreationForm onCreateAvatar={createAvatar} isLoading={isLoading} />
          </div>
        </div>
      );
    }

    return (
      <div className="w-full h-full flex flex-col bg-gradient-to-br from-purple-50 to-pink-100">
        {/* Audio element for background music */}
        <audio ref={audioRef} preload="auto" />
        <div className="flex-1 flex flex-col p-4 overflow-hidden">
          {/* Header */}
          <div className="text-center mb-4">
            <h1 className="text-2xl md:text-3xl font-bold text-purple-800 mb-1">
              ✨ {playerAvatar.name}'s Adventure ✨
            </h1>
          </div>
          {/* Loading overlay */}
          {isLoading && gameState && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10">
              <LoadingSpinner message="Crafting your next chapter..." />
            </div>
          )}
          {/* Main content */}
          <div className="flex-1 relative overflow-auto">
            {renderContent()}
          </div>
        </div>
      </div>
    );
  };

  return (
    <GameModal
      isOpen={true}
      onClose={onClose}
      title="Magic Storyteller"
      subtitle="AI-powered interactive storytelling adventure"
      gameIcon={<Sparkles className="w-5 h-5" />}
      showProgress={false}
      showControls={true}
      onReset={() => {
        setAvatarCreated(false);
        setGameState(null);
        setHistory([]);
        setIsGameOver(false);
      }}
      showMusicControl={true}
      isMusicPlaying={isMusicPlaying}
      onToggleMusic={toggleMusic}
      maxWidth="max-w-7xl"
      maxHeight="max-h-[95vh]"
      showVolumeSlider={true}
      showGameControls={true}
    >
      {gameContent()}
    </GameModal>
  );
};

export default MagicStorytellerGame;