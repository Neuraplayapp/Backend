import React, { useState, useRef } from 'react';
import GameModal from './GameModal';
import { Trophy, Brain, Target, Gamepad2, Sparkles, FileText, Star } from 'lucide-react';

interface GameWrapperProps {
  gameId: string;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  showProgress?: boolean;
  progressValue?: number;
  progressLabel?: string;
  showControls?: boolean;
  onReset?: () => void;
  onSettings?: () => void;
  showMusicControl?: boolean;
  isMusicPlaying?: boolean;
  onToggleMusic?: () => void;
  // New props for enhanced UX
  volume?: number;
  onVolumeChange?: (volume: number) => void;
  showVolumeSlider?: boolean;
  showGameControls?: boolean;
  onPause?: () => void;
  onResume?: () => void;
  isPaused?: boolean;
  showSkipControls?: boolean;
  onSkipBack?: () => void;
  onSkipForward?: () => void;
}

const GameWrapper: React.FC<GameWrapperProps> = ({
  gameId,
  onClose,
  children,
  title,
  subtitle,
  showProgress = false,
  progressValue = 0,
  progressLabel = 'Progress',
  showControls = false,
  onReset,
  onSettings,
  showMusicControl = false,
  isMusicPlaying = false,
  onToggleMusic,
  // New props with defaults
  volume = 0.7,
  onVolumeChange,
  showVolumeSlider = true,
  showGameControls = true,
  onPause,
  onResume,
  isPaused = false,
  showSkipControls = false,
  onSkipBack,
  onSkipForward
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const gameRef = useRef<HTMLDivElement>(null);

  // Handle fullscreen toggle for different game types
  const handleFullscreenToggle = () => {
    setIsFullscreen(!isFullscreen);
    
    // For iframe games, try to make the iframe fullscreen
    if (!isFullscreen && gameRef.current) {
      const iframe = gameRef.current.querySelector('iframe');
      if (iframe) {
        try {
          if (iframe.requestFullscreen) {
            iframe.requestFullscreen();
          } else if ((iframe as any).webkitRequestFullscreen) {
            (iframe as any).webkitRequestFullscreen();
          } else if ((iframe as any).mozRequestFullScreen) {
            (iframe as any).mozRequestFullScreen();
          } else if ((iframe as any).msRequestFullscreen) {
            (iframe as any).msRequestFullscreen();
          }
        } catch (error) {
          console.error('Failed to make iframe fullscreen:', error);
        }
      }
    }
  };
  // Game-specific configurations
  const gameConfigs: Record<string, {
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    maxWidth: string;
    maxHeight: string;
    showVolumeSlider?: boolean;
    showGameControls?: boolean;
    showSkipControls?: boolean;
  }> = {
    'memory-sequence': {
      title: 'Memory Galaxy',
      subtitle: 'Navigate through space while remembering sequences',
      icon: <Brain className="w-5 h-5" />,
      maxWidth: 'max-w-7xl',
      maxHeight: 'max-h-[95vh]',
      showVolumeSlider: true,
      showGameControls: true
    },
    'starbloom-adventure': {
      title: 'Starbloom Forest Adventure',
      subtitle: 'Magical journey of discovery and choice',
      icon: <Sparkles className="w-5 h-5" />,
      maxWidth: 'max-w-8xl',
      maxHeight: 'max-h-[98vh]',
      showVolumeSlider: true,
      showGameControls: true,
      showSkipControls: true
    },
    'inhibition': {
      title: 'Stop & Go Adventure',
      subtitle: 'Test your impulse control and reaction time',
      icon: <Target className="w-5 h-5" />,
      maxWidth: 'max-w-6xl',
      maxHeight: 'max-h-[90vh]',
      showVolumeSlider: true,
      showGameControls: true
    },
    'berry-blaster': {
      title: 'Berry Blaster',
      subtitle: 'Blast berries while avoiding obstacles',
      icon: <Gamepad2 className="w-5 h-5" />,
      maxWidth: 'max-w-6xl',
      maxHeight: 'max-h-[90vh]',
      showVolumeSlider: true,
      showGameControls: true
    },
    'pattern-matching': {
      title: 'Pattern Detective',
      subtitle: 'Solve pattern puzzles and unlock logical thinking',
      icon: <Brain className="w-5 h-5" />,
      maxWidth: 'max-w-7xl',
      maxHeight: 'max-h-[95vh]',
      showVolumeSlider: true,
      showGameControls: true
    },
    'counting-adventure': {
      title: 'Number Quest',
      subtitle: 'Embark on a mathematical adventure',
      icon: <Trophy className="w-5 h-5" />,
      maxWidth: 'max-w-6xl',
      maxHeight: 'max-h-[90vh]',
      showVolumeSlider: true,
      showGameControls: true
    },
    'fuzzling-advanced': {
      title: "Fuzzling's Advanced Playpen",
      subtitle: 'Advanced puzzle solving and logic games',
      icon: <Sparkles className="w-5 h-5" />,
      maxWidth: 'max-w-7xl',
      maxHeight: 'max-h-[95vh]',
      showVolumeSlider: true,
      showGameControls: true
    },
    'letter-hunt': {
      title: 'Letter Safari',
      subtitle: 'Hunt for letters in an exciting adventure',
      icon: <FileText className="w-5 h-5" />,
      maxWidth: 'max-w-6xl',
      maxHeight: 'max-h-[90vh]',
      showVolumeSlider: true,
      showGameControls: true
    },
    'mountain-climber': {
      title: 'Mountain Climber',
      subtitle: 'Climb to new heights in this adventure',
      icon: <Trophy className="w-5 h-5" />,
      maxWidth: 'max-w-6xl',
      maxHeight: 'max-h-[90vh]',
      showVolumeSlider: true,
      showGameControls: true
    },
    'stacker': {
      title: 'Block Stacker',
      subtitle: 'Stack blocks and build your way up',
      icon: <Gamepad2 className="w-5 h-5" />,
      maxWidth: 'max-w-6xl',
      maxHeight: 'max-h-[90vh]',
      showVolumeSlider: true,
      showGameControls: true
    },
    'happy-builder': {
      title: 'Happy Builder',
      subtitle: 'Build and create in this creative game',
      icon: <Trophy className="w-5 h-5" />,
      maxWidth: 'max-w-7xl',
      maxHeight: 'max-h-[95vh]',
      showVolumeSlider: true,
      showGameControls: true
    },
    'fuzzling': {
      title: 'Fuzzling',
      subtitle: 'Puzzle solving and logic challenges',
      icon: <Sparkles className="w-5 h-5" />,
      maxWidth: 'max-w-6xl',
      maxHeight: 'max-h-[90vh]',
      showVolumeSlider: true,
      showGameControls: true
    },
    'crossroad-fun': {
      title: 'Crossroad Fun',
      subtitle: 'Navigate traffic and cross safely',
      icon: <Gamepad2 className="w-5 h-5" />,
      maxWidth: 'max-w-6xl',
      maxHeight: 'max-h-[90vh]',
      showVolumeSlider: true,
      showGameControls: true
    },
    'the-cube': {
      title: 'The Cube',
      subtitle: '3D Rubik\'s Cube Puzzle',
      icon: <Trophy className="w-5 h-5" />,
      maxWidth: 'max-w-8xl',
      maxHeight: 'max-h-[98vh]',
      showVolumeSlider: false,
      showGameControls: true
    },
    'ai-story-creator': {
      title: 'AI Story Creator',
      subtitle: 'Create magical stories with AI',
      icon: <Sparkles className="w-5 h-5" />,
      maxWidth: 'max-w-7xl',
      maxHeight: 'max-h-[95vh]',
      showVolumeSlider: true,
      showGameControls: true
    }
  };

  const config = gameConfigs[gameId] || {
    title: title || 'Game',
    subtitle: subtitle || 'Interactive Learning Game',
    icon: <Gamepad2 className="w-5 h-5" />,
    maxWidth: 'max-w-6xl',
    maxHeight: 'max-h-[90vh]',
    showVolumeSlider: true,
    showGameControls: true
  };

  return (
    <GameModal
      isOpen={true}
      onClose={onClose}
      title={config.title}
      subtitle={config.subtitle}
      gameIcon={config.icon}
      showProgress={showProgress}
      progressValue={progressValue}
      progressLabel={progressLabel}
      showControls={showControls}
      onReset={onReset}
      onSettings={onSettings}
      showMusicControl={showMusicControl}
      isMusicPlaying={isMusicPlaying}
      onToggleMusic={onToggleMusic}
      maxWidth={config.maxWidth}
      maxHeight={config.maxHeight}
      // Enhanced UX props
      volume={volume}
      onVolumeChange={onVolumeChange}
      showVolumeSlider={config.showVolumeSlider ?? showVolumeSlider}
      showGameControls={config.showGameControls ?? showGameControls}
      onPause={onPause}
      onResume={onResume}
      isPaused={isPaused}
      showSkipControls={config.showSkipControls ?? showSkipControls}
      onSkipBack={onSkipBack}
      onSkipForward={onSkipForward}
      // Fullscreen props
      isFullscreen={isFullscreen}
      onFullscreenToggle={handleFullscreenToggle}
    >
      <div ref={gameRef} className="w-full h-full">
        {children}
      </div>
    </GameModal>
  );
};

export default GameWrapper; 