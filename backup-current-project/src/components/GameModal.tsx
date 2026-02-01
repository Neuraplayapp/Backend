import React, { useState, useEffect, useRef } from 'react';
import { X, Maximize2, Minimize2, RotateCcw, Settings, Trophy, Brain, Target, Volume2, VolumeX, Volume1, Volume, Speaker, Play, Pause, SkipBack, SkipForward, ChevronRight } from 'lucide-react';

interface GameModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  gameIcon?: React.ReactNode;
  showProgress?: boolean;
  progressValue?: number;
  progressLabel?: string;
  showControls?: boolean;
  onReset?: () => void;
  onSettings?: () => void;
  showMusicControl?: boolean;
  isMusicPlaying?: boolean;
  onToggleMusic?: () => void;
  className?: string;
  maxWidth?: string;
  maxHeight?: string;
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
  // Fullscreen props
  isFullscreen?: boolean;
  onFullscreenToggle?: () => void;
}

const GameModal: React.FC<GameModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  gameIcon,
  showProgress = false,
  progressValue = 0,
  progressLabel = 'Progress',
  showControls = false,
  onReset,
  onSettings,
  showMusicControl = false,
  isMusicPlaying = false,
  onToggleMusic,
  className = '',
  maxWidth = 'max-w-7xl',
  maxHeight = 'max-h-[95vh]',
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
  onSkipForward,
  // Fullscreen props
  isFullscreen: externalIsFullscreen,
  onFullscreenToggle: externalOnFullscreenToggle
}) => {
  const [internalIsFullscreen, setInternalIsFullscreen] = useState(false);
  const [showVolumeControl, setShowVolumeControl] = useState(false);
  const [localVolume, setLocalVolume] = useState(volume);
  const [showControlsModal, setShowControlsModal] = useState(false);
  const volumeSliderRef = useRef<HTMLDivElement>(null);

  // Use external fullscreen state if provided, otherwise use internal
  const isFullscreen = externalIsFullscreen !== undefined ? externalIsFullscreen : internalIsFullscreen;
  const setIsFullscreen = externalOnFullscreenToggle || (() => setInternalIsFullscreen(!internalIsFullscreen));

  // Handle fullscreen toggle
  const toggleFullscreen = () => {
    if (externalOnFullscreenToggle) {
      externalOnFullscreenToggle();
    } else {
      setInternalIsFullscreen(!internalIsFullscreen);
    }
  };

  // Listen for F11 key for fullscreen
  useEffect(() => {
    const handleF11 = (e: KeyboardEvent) => {
      if (e.key === 'F11') {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleF11);
      return () => document.removeEventListener('keydown', handleF11);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isFullscreen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, isFullscreen, onClose]);

  // Handle volume changes
  useEffect(() => {
    setLocalVolume(volume);
  }, [volume]);

  const handleVolumeChange = (newVolume: number) => {
    setLocalVolume(newVolume);
    onVolumeChange?.(newVolume);
  };

  const getVolumeIcon = () => {
    if (localVolume === 0) return <VolumeX className="w-5 h-5" />;
    if (localVolume < 0.3) return <Volume className="w-5 h-5" />;
    if (localVolume < 0.7) return <Volume1 className="w-5 h-5" />;
    return <Volume2 className="w-5 h-5" />;
  };

  const handleVolumeClick = () => {
    if (localVolume > 0) {
      handleVolumeChange(0);
    } else {
      handleVolumeChange(0.7);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 ${
      isFullscreen 
        ? 'bg-black' 
        : 'bg-black bg-opacity-90 backdrop-blur-sm'
    }`}>
      {/* Main Game Container - No Header */}
      <div 
        className={`relative transition-all duration-300 ${
          isFullscreen 
            ? 'w-screen h-screen m-0 p-0' 
            : `w-full h-full ${maxWidth} ${maxHeight}`
        } ${className}`}
      >
        {/* Collapsible Arrow on Left Border */}
        <div className={`absolute left-0 top-1/2 transform -translate-y-1/2 z-60 transition-all duration-300 ${
          isFullscreen ? 'left-8' : 'left-0'
        }`}>
          <button
            onClick={() => setShowControlsModal(!showControlsModal)}
            className="bg-black bg-opacity-90 backdrop-blur-sm rounded-r-2xl p-3 shadow-2xl border border-white/10 hover:bg-opacity-95 transition-all duration-200 group"
            title="Game Controls"
          >
            <ChevronRight className={`w-6 h-6 text-white transition-transform duration-300 ${showControlsModal ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Animated Controls Modal */}
        <div className={`fixed left-0 top-0 h-full z-70 transition-all duration-500 ease-in-out ${
          showControlsModal ? 'translate-x-0' : '-translate-x-full'
        }`}>
          <div className="bg-black bg-opacity-95 backdrop-blur-sm h-full w-80 p-6 shadow-2xl border-r border-white/10">
            <div className="flex flex-col gap-6 h-full">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Game Controls</h3>
                <button
                  onClick={() => setShowControlsModal(false)}
                  className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Progress Display */}
              {showProgress && (
                <div className="bg-white bg-opacity-20 px-4 py-3 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Target className="w-4 h-4 text-white" />
                    <span className="text-sm font-medium text-white">{progressLabel}</span>
                  </div>
                  <div className="w-full bg-white bg-opacity-20 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-blue-400 to-purple-400 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progressValue}%` }}
                    ></div>
                  </div>
                  <div className="text-center text-sm text-white mt-1">{progressValue.toFixed(1)}%</div>
                </div>
              )}

              {/* Game Controls */}
              {showGameControls && (
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-white">Game Controls</h4>
                  
                  {/* Skip Controls */}
                  {showSkipControls && (
                    <div className="flex gap-2">
                      {onSkipBack && (
                        <button
                          onClick={onSkipBack}
                          className="flex-1 p-3 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-colors text-white flex items-center justify-center gap-2"
                          title="Previous"
                        >
                          <SkipBack className="w-4 h-4" />
                          <span className="text-sm">Previous</span>
                        </button>
                      )}
                      {onSkipForward && (
                        <button
                          onClick={onSkipForward}
                          className="flex-1 p-3 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-colors text-white flex items-center justify-center gap-2"
                          title="Next"
                        >
                          <span className="text-sm">Next</span>
                          <SkipForward className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Pause/Resume */}
                  {onPause && onResume && (
                    <button
                      onClick={isPaused ? onResume : onPause}
                      className="w-full p-3 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-colors text-white flex items-center justify-center gap-2"
                      title={isPaused ? 'Resume' : 'Pause'}
                    >
                      {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                      <span className="text-sm">{isPaused ? 'Resume' : 'Pause'}</span>
                    </button>
                  )}

                  {/* Game Controls */}
                  {showControls && (
                    <div className="space-y-2">
                      {onReset && (
                        <button
                          onClick={onReset}
                          className="w-full p-3 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-colors text-white flex items-center justify-center gap-2"
                          title="Reset Game"
                        >
                          <RotateCcw className="w-4 h-4" />
                          <span className="text-sm">Reset Game</span>
                        </button>
                      )}
                      
                      {onSettings && (
                        <button
                          onClick={onSettings}
                          className="w-full p-3 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-colors text-white flex items-center justify-center gap-2"
                          title="Game Settings"
                        >
                          <Settings className="w-4 h-4" />
                          <span className="text-sm">Settings</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Audio Controls */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-white">Audio</h4>
                
                {/* Volume Control */}
                {showVolumeSlider && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white">Volume</span>
                      <button
                        onClick={handleVolumeClick}
                        className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors text-white"
                        title="Toggle Volume"
                      >
                        {getVolumeIcon()}
                      </button>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={localVolume}
                      onChange={(e) => handleVolumeChange(Number(e.target.value))}
                      className="w-full h-2 bg-white bg-opacity-20 rounded-lg appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, white ${localVolume * 100}%, rgba(255,255,255,0.2) ${localVolume * 100}%)`
                      }}
                    />
                  </div>
                )}

                {/* Music Control */}
                {showMusicControl && onToggleMusic && (
                  <button
                    onClick={onToggleMusic}
                    className="w-full p-3 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-colors text-white flex items-center justify-center gap-2"
                    title={isMusicPlaying ? 'Mute Music' : 'Play Music'}
                  >
                    {isMusicPlaying ? <Speaker className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    <span className="text-sm">{isMusicPlaying ? 'Mute Music' : 'Play Music'}</span>
                  </button>
                )}
              </div>

              {/* Fullscreen and Close */}
              <div className="mt-auto space-y-2">
                <button
                  onClick={toggleFullscreen}
                  className="w-full p-3 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-colors text-white flex items-center justify-center gap-2"
                  title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  <span className="text-sm">{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
                </button>
                
                <button
                  onClick={onClose}
                  className="w-full p-3 bg-red-500 bg-opacity-80 hover:bg-opacity-100 rounded-lg transition-colors text-white flex items-center justify-center gap-2"
                  title="Close Game"
                >
                  <X className="w-4 h-4" />
                  <span className="text-sm">Close Game</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Game Content - Full Height */}
        <div className="w-full h-full">
          {children}
        </div>

        {/* Floating Instructions - Bottom Right */}
        {!isFullscreen && (
          <div className="fixed bottom-4 right-4 bg-black bg-opacity-75 backdrop-blur-sm text-white p-3 rounded-lg border border-white/10 text-xs">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Maximize2 className="w-4 h-4" />
                <span>F11 for fullscreen</span>
              </div>
              <div className="flex items-center space-x-2">
                <X className="w-4 h-4" />
                <span>ESC to close</span>
              </div>
              {showVolumeSlider && (
                <div className="flex items-center space-x-2">
                  <Volume2 className="w-4 h-4" />
                  <span>Hover for volume</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameModal;