import React, { useState, useEffect } from 'react';
import { useUser } from '../../contexts/UserContext';
import { Volume2, VolumeX, RotateCcw, Play, Square, Brain, Heart, Star, Trophy, Music, Music2, Sparkles, ArrowRight, User, Palette, Heart as HeartIcon } from 'lucide-react';
import GameModal from '../GameModal';

interface Choice {
  text: string;
  nextScene: number;
  prompt: string;
  scaffold?: string;
  moral?: string;
  neuropsychologicalConcept?: string;
}

interface GameSession {
  choices: Array<{
    scene: number;
    choice: string;
    moral: string;
    concept: string;
    timestamp: Date;
  }>;
  totalScenes: number;
  completedAt?: Date;
}

interface StoryState {
  currentLocation: string;
  characters: string[];
  ongoingPlot: string;
  previousChoices: string[];
  sceneContext: string;
}

interface DynamicScene {
  text: string;
  neuropsychologicalConcept: string;
  choices: Choice[];
  backgroundPrompt: string;
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

interface StarbloomAdventureGameProps {
  onClose?: () => void;
}

const StarbloomAdventureGame: React.FC<StarbloomAdventureGameProps> = ({ onClose }) => {
  const { user, setUser } = useUser();
  const [currentScene, setCurrentScene] = useState(0);
  const [gameSession, setGameSession] = useState<GameSession>({
    choices: [],
    totalScenes: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [currentImage, setCurrentImage] = useState<string>('');
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [completionMessage, setCompletionMessage] = useState('');
  const [dynamicBackground, setDynamicBackground] = useState<string>('');
  const [currentSceneText, setCurrentSceneText] = useState('');
  const [generatedChoices, setGeneratedChoices] = useState<Choice[]>([]);
  const [storyState, setStoryState] = useState<StoryState>({
    currentLocation: 'Starbloom Forest',
    characters: ['You'],
    ongoingPlot: 'beginning your magical adventure',
    previousChoices: [],
    sceneContext: 'A magical forest filled with glowing crystals and ancient trees'
  });
  const [avatarCreated, setAvatarCreated] = useState(false);
  const [playerAvatar, setPlayerAvatar] = useState({
    name: '',
    appearance: '',
    personality: ''
  });

  // Audio element for background music
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  // Neuropsychological concepts for randomization
  const neuropsychologicalConcepts = [
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

  // Initialize game with dynamic content
  useEffect(() => {
    if (currentScene === 0 && !avatarCreated) {
      // Show avatar creation first
      return;
    } else if (currentScene === 0 && avatarCreated) {
      initializeGame();
    }
  }, [avatarCreated]);

  const initializeGame = async () => {
    setIsLoading(true);
    
    // Set initial content immediately
    setCurrentSceneText('Welcome to the Starbloom Forest! Your magical adventure begins...');
    
    try {
      // Generate initial scene with AI (optional)
      const initialScene = await generateDynamicScene(0);
      setCurrentSceneText(initialScene.text);
      setGeneratedChoices(initialScene.choices);
      
      // Generate initial background image (optional)
      const backgroundImage = await generateImage(initialScene.backgroundPrompt);
      if (backgroundImage) {
        setCurrentImage(backgroundImage);
      }
      
      // Generate dynamic background for the game (optional)
      const cosmicBackground = await generateImage('cosmic star field with nebula, deep space, ethereal atmosphere, 4k, detailed');
      if (cosmicBackground) {
        setDynamicBackground(cosmicBackground);
      }
      
      // Start background music
      startBackgroundMusic();
    } catch (error) {
      console.error('Error initializing game:', error);
      // Keep the fallback content that was set above
    } finally {
      setIsLoading(false);
    }
  };

  const updateStoryState = (choice: Choice): void => {
    setStoryState(prev => {
      const newCharacters = [...prev.characters];
      const newPreviousChoices = [...prev.previousChoices, choice.text];
      
      // Extract location changes from choice
      let newLocation = prev.currentLocation;
      let newPlot = prev.ongoingPlot;
      
      if (choice.text.toLowerCase().includes('castle')) {
        newLocation = 'Ancient Castle';
        newPlot = 'exploring the mysterious castle';
      } else if (choice.text.toLowerCase().includes('cave')) {
        newLocation = 'Crystal Cave';
        newPlot = 'venturing into the crystal cave';
      } else if (choice.text.toLowerCase().includes('garden')) {
        newLocation = 'Hidden Garden';
        newPlot = 'discovering the hidden garden';
      } else if (choice.text.toLowerCase().includes('river')) {
        newLocation = 'Crystal River';
        newPlot = 'following the crystal river';
      } else if (choice.text.toLowerCase().includes('tree')) {
        newLocation = 'Ancient Tree';
        newPlot = 'climbing the ancient tree';
      }
      
      // Extract new characters from choice
      if (choice.text.toLowerCase().includes('dragon')) {
        if (!newCharacters.includes('Dragon')) newCharacters.push('Dragon');
      }
      if (choice.text.toLowerCase().includes('fairy')) {
        if (!newCharacters.includes('Fairy')) newCharacters.push('Fairy');
      }
      if (choice.text.toLowerCase().includes('wizard')) {
        if (!newCharacters.includes('Wizard')) newCharacters.push('Wizard');
      }
      if (choice.text.toLowerCase().includes('creature')) {
        if (!newCharacters.includes('Mysterious Creature')) newCharacters.push('Mysterious Creature');
      }
      
      return {
        currentLocation: newLocation,
        characters: newCharacters,
        ongoingPlot: newPlot,
        previousChoices: newPreviousChoices,
        sceneContext: `${newLocation} with ${newCharacters.join(', ')} - ${newPlot}`
      };
    });
  };

  const enforceStoryContinuity = (sceneText: string): string => {
    // Ensure the scene text mentions the current location
    if (!sceneText.toLowerCase().includes(storyState.currentLocation.toLowerCase())) {
      sceneText = `In the ${storyState.currentLocation}, ${sceneText}`;
    }
    
    // Ensure all current characters are mentioned
    const missingCharacters = storyState.characters.filter(char => 
      !sceneText.toLowerCase().includes(char.toLowerCase())
    );
    
    if (missingCharacters.length > 0) {
      sceneText += ` ${missingCharacters.join(', ')} are present.`;
    }
    
    return sceneText;
  };

  const enforceChoiceContinuity = (choiceText: string): string => {
    // Ensure choice mentions the current location
    if (!choiceText.toLowerCase().includes(storyState.currentLocation.toLowerCase())) {
      choiceText = `In the ${storyState.currentLocation}, ${choiceText}`;
    }
    
    // Ensure choice involves current characters
    const missingCharacters = storyState.characters.filter(char => 
      !choiceText.toLowerCase().includes(char.toLowerCase())
    );
    
    if (missingCharacters.length > 0) {
      choiceText += ` with ${missingCharacters.join(', ')}`;
    }
    
    return choiceText;
  };

  const createAvatar = async (name: string, appearance: string, personality: string) => {
    setIsLoading(true);
    
    try {
      // Generate avatar image
      const avatarPrompt = `fantasy character portrait, ${appearance}, ${personality} personality, magical forest background, detailed, 4k`;
      const avatarImage = await generateImage(avatarPrompt);
      
      setPlayerAvatar({
        name,
        appearance,
        personality
      });
      
      // Update story state with avatar
      setStoryState(prev => ({
        ...prev,
        characters: [name, ...prev.characters.filter(c => c !== 'You')],
        ongoingPlot: `${name} beginning their magical adventure in the Starbloom Forest`
      }));
      
      setAvatarCreated(true);
      setCurrentImage(avatarImage);
      setCurrentSceneText(`${name} stands ready at the edge of the Starbloom Forest, ${appearance}. With a ${personality} personality, they prepare to embark on a magical journey...`);
      
    } catch (error) {
      console.error('Error creating avatar:', error);
      // Fallback
      setPlayerAvatar({ name, appearance, personality });
      setAvatarCreated(true);
    } finally {
      setIsLoading(false);
    }
  };

  const generateSceneFromChoice = async (userChoice: Choice, sceneIndex: number): Promise<DynamicScene> => {
    const randomConcept = neuropsychologicalConcepts[Math.floor(Math.random() * neuropsychologicalConcepts.length)];
    
    // DIRECT continuation from user's choice - no storyState dependency
    const directContinuationPrompt = `The user just chose: "${userChoice.text}"

Create a scene that is a DIRECT RESULT of this choice. The scene should:

1. START with what happened when the user chose "${userChoice.text}"
2. Take place in the current location
3. Include the current characters
4. Focus on: ${randomConcept}

EXAMPLE:
- User chose: "go to party"
- Scene: "At the party in the forest, you and your companions..."
- User chose: "chase a bee" 
- Scene: "You got distracted chasing a bee away from the party..."

DO NOT create new scenarios. Continue directly from the user's choice.`;

    try {
      const response = await fetch('/.netlify/functions/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_type: 'story',
          input_data: directContinuationPrompt
        })
      });

      const data = await response.json();
      // Handle different response formats
      let sceneText = data.response || data.data || data[0]?.generated_text || 'A magical adventure unfolds...';
      
      // Validate and enforce story continuity
      sceneText = enforceStoryContinuity(sceneText);

      // Generate contextual choices based on the scene content
      const contextualChoices = await generateContextualChoices(sceneText, randomConcept, sceneIndex);

      return {
        text: sceneText,
        neuropsychologicalConcept: randomConcept,
        choices: contextualChoices,
        backgroundPrompt: `${storyState.currentLocation}, ${playerAvatar.name} ${userChoice.text}, fantasy scene, magical atmosphere, detailed, 4k`
      };
    } catch (error) {
      console.error('Error generating scene:', error);
      return getFallbackScene(sceneIndex, randomConcept);
    }
  };

  const generateDynamicScene = async (sceneIndex: number): Promise<DynamicScene> => {
    const randomConcept = neuropsychologicalConcepts[Math.floor(Math.random() * neuropsychologicalConcepts.length)];
    
    // Get the user's last choice to continue from it
    const lastChoice = storyState.previousChoices[storyState.previousChoices.length - 1];
    
    // STRICT continuation prompt - AI MUST continue from the user's choice
    const continuationPrompt = `Continue the story from the user's last choice: "${lastChoice}"

STORY CONTEXT:
- Current Location: ${storyState.currentLocation}
- Characters Present: ${storyState.characters.join(', ')}
- Ongoing Plot: ${storyState.ongoingPlot}
- User's Last Choice: "${lastChoice}"

SCENE REQUIREMENTS:
1. The scene MUST be a direct result of the user choosing: "${lastChoice}"
2. Location: ${storyState.currentLocation}
3. Characters present: ${storyState.characters.join(', ')}
4. Focus on: ${randomConcept}

EXAMPLE FLOW:
- User chose: "go to party"
- Scene should be: "At the party in the forest, you and your companions..."
- User chose: "chase a bee"
- Scene should be: "You got distracted chasing a bee away from the party..."

DO NOT create new scenarios. Continue directly from the user's choice.`;

    try {
      const response = await fetch('/.netlify/functions/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_type: 'story',
          input_data: continuationPrompt
        })
      });

      const data = await response.json();
      // Handle different response formats
      let sceneText = data.response || data.data || data[0]?.generated_text || 'A magical adventure unfolds...';
      
      // Validate and enforce story continuity
      sceneText = enforceStoryContinuity(sceneText);

      // Generate contextual choices based on the scene content
      const contextualChoices = await generateContextualChoices(sceneText, randomConcept, sceneIndex);

      return {
        text: sceneText,
        neuropsychologicalConcept: randomConcept,
        choices: contextualChoices,
        backgroundPrompt: `${storyState.currentLocation}, ${storyState.characters.join(', ')}, fantasy scene, magical atmosphere, ${sceneText.substring(0, 50)}...`
      };
    } catch (error) {
      console.error('Error generating scene:', error);
      return getFallbackScene(sceneIndex, randomConcept);
    }
  };

  const generateContextualChoices = async (sceneText: string, concept: string, sceneIndex: number): Promise<Choice[]> => {
    try {
      // STRICT choice generation that enforces story continuity
      const strictChoicePrompt = `Based on this scene: "${sceneText}"

CRITICAL STORY RULES - CHOICES MUST FOLLOW:
- LOCATION: All choices MUST take place in "${storyState.currentLocation}"
- CHARACTERS: All choices MUST involve: ${storyState.characters.join(', ')}
- PLOT: Continue: "${storyState.ongoingPlot}"

Create 3 specific choices that:
1. HAPPEN IN ${storyState.currentLocation} - DO NOT CHANGE LOCATION
2. INVOLVE ALL characters: ${storyState.characters.join(', ')}
3. CONTINUE the plot: ${storyState.ongoingPlot}
4. Are short and actionable
5. Maintain story consistency

Format: ["choice1", "choice2", "choice3"]`;

      const response = await fetch('/.netlify/functions/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_type: 'text',
          input_data: strictChoicePrompt
        })
      });

      const data = await response.json();
      const responseText = data.response || data.data || data[0]?.generated_text || '';
      
      // Try to parse JSON from response
      try {
        const jsonMatch = responseText.match(/\[.*\]/);
        if (jsonMatch) {
          const parsedChoices = JSON.parse(jsonMatch[0]);
          return parsedChoices.map((choiceText: string, index: number) => ({
            text: enforceChoiceContinuity(choiceText),
            nextScene: sceneIndex + 1,
            prompt: `Continue the story in ${storyState.currentLocation} with ${storyState.characters.join(', ')} - ${choiceText}`,
            moral: getMoralFromChoice(choiceText),
            neuropsychologicalConcept: concept
          }));
        }
      } catch (e) {
        console.error('Failed to parse choices JSON:', e);
      }

      // Fallback choices that maintain story continuity
      return generateFallbackChoices(sceneText, concept, sceneIndex);
    } catch (error) {
      console.error('Error generating contextual choices:', error);
      return generateFallbackChoices(sceneText, concept, sceneIndex);
    }
  };

  const extractKeyElements = (sceneText: string): string[] => {
    const elements = [];
    
    // Extract characters/creatures
    if (sceneText.includes('forest') || sceneText.includes('tree')) elements.push('forest');
    if (sceneText.includes('creature') || sceneText.includes('animal')) elements.push('creature');
    if (sceneText.includes('magic') || sceneText.includes('spell')) elements.push('magic');
    if (sceneText.includes('path') || sceneText.includes('road')) elements.push('path');
    if (sceneText.includes('light') || sceneText.includes('glow')) elements.push('light');
    if (sceneText.includes('sound') || sceneText.includes('voice')) elements.push('sound');
    if (sceneText.includes('help') || sceneText.includes('save')) elements.push('help');
    if (sceneText.includes('explore') || sceneText.includes('search')) elements.push('explore');
    
    return elements.length > 0 ? elements : ['adventure', 'choice'];
  };

  const getMoralFromChoice = (choiceText: string): string => {
    const lowerChoice = choiceText.toLowerCase();
    
    if (lowerChoice.includes('help') || lowerChoice.includes('save') || lowerChoice.includes('protect')) {
      return 'Empathy and Cooperation';
    } else if (lowerChoice.includes('think') || lowerChoice.includes('plan') || lowerChoice.includes('strategy')) {
      return 'Strategic Thinking';
    } else if (lowerChoice.includes('heart') || lowerChoice.includes('feel') || lowerChoice.includes('trust')) {
      return 'Emotional Intelligence';
    } else if (lowerChoice.includes('explore') || lowerChoice.includes('discover') || lowerChoice.includes('learn')) {
      return 'Curiosity and Learning';
    } else if (lowerChoice.includes('fight') || lowerChoice.includes('defend') || lowerChoice.includes('brave')) {
      return 'Courage and Determination';
    } else {
      return 'Decision Making';
    }
  };

  const generateFallbackChoices = (sceneText: string, concept: string, sceneIndex: number): Choice[] => {
    const choices = [];
    
    // Generate choices based on current story state - STRICT location adherence
    if (storyState.currentLocation.includes('Forest')) {
      choices.push({
        text: `Explore deeper into the ${storyState.currentLocation} with ${storyState.characters.join(', ')}`,
        nextScene: sceneIndex + 1,
        prompt: `Continue exploring the ${storyState.currentLocation}`,
        moral: 'Curiosity and Learning',
        neuropsychologicalConcept: concept
      });
    }
    
    if (storyState.currentLocation.includes('Castle')) {
      choices.push({
        text: `Investigate the mysterious rooms of the ${storyState.currentLocation} with ${storyState.characters.join(', ')}`,
        nextScene: sceneIndex + 1,
        prompt: `Continue investigating the ${storyState.currentLocation}`,
        moral: 'Strategic Thinking',
        neuropsychologicalConcept: concept
      });
    }
    
    if (storyState.currentLocation.includes('Cave')) {
      choices.push({
        text: `Venture deeper into the ${storyState.currentLocation} with ${storyState.characters.join(', ')}`,
        nextScene: sceneIndex + 1,
        prompt: `Continue exploring the ${storyState.currentLocation}`,
        moral: 'Courage and Determination',
        neuropsychologicalConcept: concept
      });
    }
    
    if (storyState.currentLocation.includes('Garden')) {
      choices.push({
        text: `Discover more secrets in the ${storyState.currentLocation} with ${storyState.characters.join(', ')}`,
        nextScene: sceneIndex + 1,
        prompt: `Continue exploring the ${storyState.currentLocation}`,
        moral: 'Curiosity and Learning',
        neuropsychologicalConcept: concept
      });
    }
    
    if (storyState.currentLocation.includes('River')) {
      choices.push({
        text: `Follow the ${storyState.currentLocation} with ${storyState.characters.join(', ')}`,
        nextScene: sceneIndex + 1,
        prompt: `Continue following the ${storyState.currentLocation}`,
        moral: 'Determination and Focus',
        neuropsychologicalConcept: concept
      });
    }
    
    if (storyState.currentLocation.includes('Tree')) {
      choices.push({
        text: `Climb higher in the ${storyState.currentLocation} with ${storyState.characters.join(', ')}`,
        nextScene: sceneIndex + 1,
        prompt: `Continue climbing the ${storyState.currentLocation}`,
        moral: 'Courage and Determination',
        neuropsychologicalConcept: concept
      });
    }
    
    // Add character-specific choices
    if (storyState.characters.includes('Dragon')) {
      choices.push({
        text: `Communicate with the Dragon in the ${storyState.currentLocation}`,
        nextScene: sceneIndex + 1,
        prompt: `Continue interacting with the Dragon in the ${storyState.currentLocation}`,
        moral: 'Empathy and Cooperation',
        neuropsychologicalConcept: concept
      });
    }
    
    if (storyState.characters.includes('Fairy')) {
      choices.push({
        text: `Ask the Fairy for guidance in the ${storyState.currentLocation}`,
        nextScene: sceneIndex + 1,
        prompt: `Continue seeking the Fairy's help in the ${storyState.currentLocation}`,
        moral: 'Humility and Learning',
        neuropsychologicalConcept: concept
      });
    }
    
    if (storyState.characters.includes('Wizard')) {
      choices.push({
        text: `Learn from the Wizard in the ${storyState.currentLocation}`,
        nextScene: sceneIndex + 1,
        prompt: `Continue learning from the Wizard in the ${storyState.currentLocation}`,
        moral: 'Wisdom and Learning',
        neuropsychologicalConcept: concept
      });
    }
    
    // Add default choices if we don't have enough - ALWAYS include location and characters
    while (choices.length < 3) {
      const defaultChoices = [
        { text: `Think carefully about your next move in the ${storyState.currentLocation} with ${storyState.characters.join(', ')}`, moral: 'Strategic Thinking' },
        { text: `Follow your instincts in the ${storyState.currentLocation} with ${storyState.characters.join(', ')}`, moral: 'Emotional Intelligence' },
        { text: `Ask for guidance from your companions in the ${storyState.currentLocation}`, moral: 'Humility and Learning' }
      ];
      
      const choice = defaultChoices[choices.length];
      choices.push({
        text: choice.text,
        nextScene: sceneIndex + 1,
        prompt: `Continue with ${choice.text}`,
        moral: choice.moral,
        neuropsychologicalConcept: concept
      });
    }
    
    return choices;
  };

  const getFallbackScene = (sceneIndex: number, concept: string): DynamicScene => {
    const scenes = [
      `You discover a glowing crystal in the ${storyState.currentLocation}...`,
      `A mysterious door appears in the ${storyState.currentLocation}...`,
      `Starlight guides you through the ${storyState.currentLocation}...`,
      `Whispers of the wind reveal a secret path in the ${storyState.currentLocation}...`,
      `Moonbeams create a bridge across the ${storyState.currentLocation}...`
    ];
    
    return {
      text: scenes[sceneIndex % scenes.length],
      neuropsychologicalConcept: concept,
      choices: generateFallbackChoices(scenes[sceneIndex % scenes.length], concept, sceneIndex),
      backgroundPrompt: `${storyState.currentLocation}, ${storyState.characters.join(', ')}, fantasy scene, magical atmosphere, glowing crystals`
    };
  };

  const generateImage = async (prompt: string): Promise<string> => {
    try {
      console.log('Generating image for prompt:', prompt);
      const response = await fetch('/.netlify/functions/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_type: 'image',
          input_data: prompt
        })
      });

      if (!response.ok) {
        console.error('Image generation failed:', response.status);
        return '';
      }

      const data = await response.json();
      console.log('Image generation response:', data);
      
      // The API returns base64 image data, not image_url
      if (data.data) {
        return `data:image/jpeg;base64,${data.data}`;
      }
      return '';
    } catch (error) {
      console.error('Error generating image:', error);
      return '';
    }
  };

  const startBackgroundMusic = () => {
    if (audioRef.current) {
      audioRef.current.src = '/assets/music/and-just-like-that.mp3';
      audioRef.current.loop = true;
      audioRef.current.volume = 0.3;
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

  const handleChoice = async (choice: Choice) => {
    setIsLoading(true);
    
    // Update story state based on the choice
    updateStoryState(choice);
    
    // Record the choice
    const newChoice = {
      scene: currentScene,
      choice: choice.text,
      moral: choice.moral || '',
      concept: choice.neuropsychologicalConcept || '',
      timestamp: new Date()
    };
    
    setGameSession(prev => ({
      ...prev,
      choices: [...prev.choices, newChoice],
      totalScenes: prev.totalScenes + 1
    }));

    // Generate next scene with the user's choice directly
    const nextScene = await generateSceneFromChoice(choice, currentScene + 1);
    setCurrentSceneText(nextScene.text);
    setGeneratedChoices(nextScene.choices);
    
    // Generate new image for the choice with story context
    const newImage = await generateImage(nextScene.backgroundPrompt);
    setCurrentImage(newImage);
    
    setCurrentScene(currentScene + 1);
    setIsLoading(false);
  };

  const generateCompletionMessage = async () => {
    const choiceSummary = gameSession.choices.map(choice => 
      `${choice.choice} (${choice.moral})`
    ).join(', ');

    const prompt = `Based on these choices: ${choiceSummary}
    
    Final Story State:
    - Location: ${storyState.currentLocation}
    - Characters: ${storyState.characters.join(', ')}
    - Plot: ${storyState.ongoingPlot}
    
    Write a brief, encouraging completion message (2-3 sentences) that celebrates their journey and highlights their strengths.`;

    try {
      const response = await fetch('/.netlify/functions/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_type: 'text',
          input_data: prompt
        })
      });

      const data = await response.json();
      return data.response || 'Congratulations on completing your magical adventure! Your choices showed great wisdom and heart.';
    } catch (error) {
      console.error('Error generating completion message:', error);
      return 'Congratulations on completing your magical adventure! Your choices showed great wisdom and heart.';
    }
  };

  const completeGame = async () => {
    setIsLoading(true);
    
    // Generate personalized completion message
    const message = await generateCompletionMessage();
    setCompletionMessage(message);
    
    // Save to existing assessment system
    const gameData = {
      gameType: 'StarbloomAdventure',
      choices: gameSession.choices,
      totalScenes: gameSession.totalScenes,
      completedAt: new Date(),
      assessment: {
        moralChoices: gameSession.choices.map(c => c.moral),
        concepts: gameSession.choices.map(c => c.neuropsychologicalConcept),
        completionMessage: message,
        finalStoryState: storyState
      }
    };

    // Update user progress with STAR and RANK system
    const starsEarned = Math.min(gameSession.choices.length * 2, 10); // Max 10 stars
    const rankProgress = Math.min(gameSession.choices.length * 5, 100); // Progress toward next rank

    // Use standardized analytics function
    recordGameSession('starbloom-adventure', {
      score: gameSession.choices.length,
      level: Math.floor(gameSession.choices.length / 5) + 1,
      starsEarned: starsEarned,
      xpEarned: gameSession.choices.length * 15,
      success: true
    });

    // Update additional game data
    if (user) {
      const updatedUser = {
        ...user,
        profile: {
          ...user.profile,
          gameProgress: {
            ...user.profile.gameProgress,
            starbloomAdventure: gameData
          },
          rank: {
            ...user.profile.rank,
            progress: (user.profile.rank?.progress || 0) + rankProgress
          }
        }
      };
      setUser(updatedUser);
    }

    setGameCompleted(true);
    setIsLoading(false);
  };

  if (gameCompleted) {
  return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900" 
           style={{ backgroundImage: `url(${dynamicBackground})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <div className="bg-white/95 backdrop-blur-md rounded-3xl p-10 max-w-3xl text-center shadow-2xl border border-white/20">
          <div className="mb-8">
            <div className="w-20 h-20 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trophy className="w-10 h-10 text-white" />
        </div>
            <h2 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
              Adventure Complete
            </h2>
      </div>
      
          <div className="prose prose-lg mx-auto text-gray-700 mb-8">
            <p className="text-xl leading-relaxed font-medium">{completionMessage}</p>
          </div>
          
          <div className="flex justify-center space-x-6">
            <button
              onClick={() => window.location.reload()}
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl hover:from-purple-700 hover:to-pink-700 transition-all duration-300 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Begin New Journey
            </button>
          </div>
          </div>
      </div>
    );
  }

  if (!avatarCreated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
        <div className="bg-white/95 backdrop-blur-md rounded-3xl p-10 max-w-2xl w-full shadow-2xl border-2 border-gray-200">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
              Create Your Character
            </h1>
            <p className="text-gray-800 text-lg font-bold">
              Design your hero for the Starbloom Forest Adventure
            </p>
          </div>

          <AvatarCreationForm onCreateAvatar={createAvatar} isLoading={isLoading} />
        </div>
      </div>
    );
  }

  return (
    <GameModal
      isOpen={true}
      onClose={() => window.history.back()}
      title="Starbloom Forest Adventure"
      subtitle="Magical Journey of Discovery"
      gameIcon={<Sparkles className="w-5 h-5" />}
      showProgress={true}
      progressValue={(currentScene / 5) * 100}
      progressLabel="Adventure Progress"
      showMusicControl={true}
      isMusicPlaying={isMusicPlaying}
      onToggleMusic={toggleMusic}
      maxWidth="max-w-8xl"
      maxHeight="max-h-[98vh]"
    >
      {/* Audio element for background music */}
      <audio ref={audioRef} preload="auto" />
      
      {/* Game content */}
      <div className="w-full h-full relative overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900" 
           style={{ backgroundImage: `url(${dynamicBackground})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <div className="container mx-auto px-4 py-8 max-w-[1800px] h-full">
          <div className="max-w-[1600px] mx-auto h-full flex flex-col">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-4 drop-shadow-2xl">
                Starbloom Forest Adventure
              </h1>
              <p className="text-white text-lg md:text-2xl drop-shadow-lg font-bold">
                Embark on a journey of discovery and choice
              </p>
            </div>
            
            {/* Game area */}
            <div className="flex-1 grid lg:grid-cols-2 gap-8 items-start">
              {/* Image area */}
              <div className="relative">
                {currentImage ? (
                  <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-white/20">
                    <img 
                      src={currentImage} 
                      alt="Adventure scene" 
                      className="w-full h-[500px] object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  </div>
                ) : (
                  <div className="w-full h-[500px] bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-3xl shadow-2xl border border-white/20 flex items-center justify-center backdrop-blur-sm">
                    <div className="text-center">
                      <div className="text-6xl mb-4 opacity-60">🌲</div>
                      <p className="text-white/80 font-medium text-xl">Enchanted Forest</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Story and choices */}
              <div className="bg-white/95 backdrop-blur-md rounded-3xl p-8 shadow-2xl border-2 border-gray-200 flex flex-col justify-between">
                {isLoading ? (
                  <div className="text-center py-16">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent mx-auto mb-6"></div>
                    <p className="text-gray-600 text-xl font-medium">Crafting your adventure...</p>
                  </div>
                ) : (
                  <>
                    <div className="mb-8">
                      <div className="flex items-center mb-4">
                        <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mr-3">
                          <span className="text-white font-bold text-sm">{currentScene + 1}</span>
                        </div>
                        <h3 className="text-2xl font-extrabold text-gray-900 uppercase tracking-wide">
                          Scene {currentScene + 1}
                        </h3>
                      </div>
                      <div className="prose prose-lg leading-relaxed">
                        <p className="text-lg font-bold bg-white/95 backdrop-blur-sm p-6 rounded-xl border-2 border-gray-200 shadow-lg text-gray-900">
                          {currentSceneText || 'Welcome to the Starbloom Forest! Your magical adventure begins...'}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      {currentScene < 5 ? (
                        (generatedChoices.length > 0 ? generatedChoices : [
                          { text: 'Help others first', nextScene: currentScene + 1, prompt: 'Continue helping others', moral: 'Empathy', neuropsychologicalConcept: 'Dynamic Concept' },
                          { text: 'Think carefully', nextScene: currentScene + 1, prompt: 'Continue with planning', moral: 'Strategy', neuropsychologicalConcept: 'Dynamic Concept' },
                          { text: 'Follow your heart', nextScene: currentScene + 1, prompt: 'Continue with emotion', moral: 'Emotional Intelligence', neuropsychologicalConcept: 'Dynamic Concept' }
                        ]).map((choice, index) => (
                          <button
                            key={index}
                            onClick={() => handleChoice(choice)}
                            className="w-full p-6 text-left bg-white hover:bg-purple-50 rounded-2xl border-2 border-gray-200 hover:border-purple-400 transition-all duration-300 font-bold text-gray-900 group shadow-lg hover:shadow-xl transform hover:scale-105 text-lg"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-lg font-bold">{choice.text}</span>
                              <ArrowRight className="w-6 h-6 text-purple-600 group-hover:text-purple-700 transition-colors duration-300" />
                            </div>
                          </button>
                        ))
                      ) : (
                        <button
                          onClick={completeGame}
                          className="w-full p-6 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-bold text-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 border-2 border-green-500"
                        >
                          Complete Your Journey
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </GameModal>
  );
};

export default StarbloomAdventureGame; 