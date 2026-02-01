import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, SkipForward } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface GlassVideoPlayerProps {
  src: string;
  title: string;
  description: string;
  secondarySrc?: string;
  secondaryTitle?: string;
  secondaryDescription?: string;
  className?: string;
  // Quality variants - if provided, will be used for adaptive streaming
  qualityVariants?: {
    high?: string;
    medium?: string;
    low?: string;
  };
  secondaryQualityVariants?: {
    high?: string;
    medium?: string;
    low?: string;
  };
}

interface ConnectionInfo {
  effectiveType: string;
  downlink: number;
  rtt: number;
}

const GlassVideoPlayer: React.FC<GlassVideoPlayerProps> = ({ 
  src, 
  title, 
  description, 
  secondarySrc,
  secondaryTitle,
  secondaryDescription,
  className = "",
  qualityVariants,
  secondaryQualityVariants
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [controlsTimeout, setControlsTimeout] = useState<NodeJS.Timeout | null>(null);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [currentQuality, setCurrentQuality] = useState<string>('auto');
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo | null>(null);
  const [loadProgress, setLoadProgress] = useState(0);
  const retryCount = useRef(0);
  const maxRetries = 3;
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { isDarkMode } = useTheme();

  // Detect connection quality and set optimal video settings
  const detectConnectionQuality = useCallback(() => {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    
    if (connection) {
      const info: ConnectionInfo = {
        effectiveType: connection.effectiveType || 'unknown',
        downlink: connection.downlink || 0,
        rtt: connection.rtt || 0
      };
      setConnectionInfo(info);
      
      // Determine optimal quality based on connection
      let quality = 'high';
      if (info.effectiveType === 'slow-2g' || info.effectiveType === '2g' || info.downlink < 1) {
        quality = 'low';
      } else if (info.effectiveType === '3g' || info.downlink < 5) {
        quality = 'medium';
      }
      
      setCurrentQuality(quality);
      return quality;
    }
    
    // Fallback: detect based on user agent and other indicators
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const quality = isMobile ? 'medium' : 'high';
    setCurrentQuality(quality);
    return quality;
  }, []);

  // Get optimal video source based on quality
  const getOptimalVideoSource = useCallback(() => {
    const currentVariants = currentVideoIndex === 0 ? qualityVariants : secondaryQualityVariants;
    const currentSrc = currentVideoIndex === 0 ? src : (secondarySrc || src);
    
    if (currentVariants) {
      const quality = currentQuality;
      // Try to get the requested quality, fall back through the chain
      const requestedSource = currentVariants[quality as keyof typeof currentVariants];
      const mediumSource = currentVariants.medium;
      const lowSource = currentVariants.low;
      
      // Return the first available source in preference order
      return requestedSource || mediumSource || lowSource || currentSrc;
    }
    return currentSrc;
  }, [src, secondarySrc, qualityVariants, secondaryQualityVariants, currentQuality, currentVideoIndex]);

  // Check if a video source exists
  const checkVideoSource = useCallback(async (videoSrc: string): Promise<boolean> => {
    try {
      const response = await fetch(videoSrc, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  }, []);

  // Get fallback video source if main source fails
  const getFallbackVideoSource = useCallback(async () => {
    const currentSrc = currentVideoIndex === 0 ? src : (secondarySrc || src);
    const currentVariants = currentVideoIndex === 0 ? qualityVariants : secondaryQualityVariants;
    
    // If no quality variants, just return the main source
    if (!currentVariants) {
      return currentSrc;
    }
    
    // Try sources in order: low -> medium -> high -> original
    const sources = [
      currentVariants.low,
      currentVariants.medium, 
      currentVariants.high,
      currentSrc
    ].filter(Boolean);
    
    for (const source of sources) {
      if (source && await checkVideoSource(source)) {
        return source;
      }
    }
    
    // Final fallback to original source
    return currentSrc;
  }, [src, secondarySrc, qualityVariants, secondaryQualityVariants, currentVideoIndex, checkVideoSource]);

  // Optimize video element for current connection
  const optimizeVideoElement = useCallback(() => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const connection = (navigator as any).connection;
    const isSlowConnection = connection?.effectiveType === 'slow-2g' || 
                           connection?.effectiveType === '2g' || 
                           connection?.downlink < 1;
    const isMediumConnection = connection?.effectiveType === '3g' || 
                              (connection?.downlink >= 1 && connection?.downlink < 5);

    // Set preload strategy based on connection speed
    if (isSlowConnection) {
      video.preload = 'none';  // Don't preload on very slow connections
    } else if (isMediumConnection) {
      video.preload = 'metadata';  // Only preload metadata on medium connections
    } else {
      video.preload = 'metadata';  // Conservative approach for fast connections too
    }

    // Mobile optimizations
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
      video.setAttribute('playsinline', 'true');
      video.setAttribute('webkit-playsinline', 'true');
      // Disable picture-in-picture on mobile to prevent issues
      video.setAttribute('disablepictureinpicture', 'true');
    }

    // Additional optimizations for better compatibility
    video.setAttribute('crossorigin', 'anonymous');
    video.muted = isMuted;
    video.loop = false;
    
    // Set buffer size based on connection quality
    if (isSlowConnection) {
      // Smaller buffer for slow connections
      video.setAttribute('x-webkit-airplay', 'allow');
    }
  }, [isMuted]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handlePlay = () => {
      setIsVideoPlaying(true);
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsVideoPlaying(false);
      setIsPlaying(false);
      setShowControls(true);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setIsVideoPlaying(false);
      setCurrentTime(0);
      
      // If there's a secondary video, switch to it
      if (secondarySrc && currentVideoIndex === 0) {
        setCurrentVideoIndex(1);
        if (videoRef.current) {
          videoRef.current.src = getOptimalVideoSource();
          videoRef.current.load();
          // Auto-play the second video
          setTimeout(() => {
            if (videoRef.current) {
              videoRef.current.play();
              setIsPlaying(true);
              setIsVideoPlaying(true);
              showControlsTemporarily();
            }
          }, 500);
        }
      } else {
        // Show controls when video ends and no more videos
        setShowControls(true);
      }
    };

    const handleLoadStart = () => {
      setIsLoading(true);
      setHasError(false);
      setLoadProgress(0);
    };

    const handleProgress = () => {
      if (video.buffered.length > 0) {
        const buffered = video.buffered;
        const duration = video.duration;
        const bufferedEnd = buffered.end(buffered.length - 1);
        const progress = (bufferedEnd / duration) * 100;
        setLoadProgress(Math.min(progress, 100));
      }
    };

    const handleCanPlay = () => {
      setIsLoading(false);
      setLoadProgress(100);
    };

    const handleError = async () => {
      if (retryCount.current < maxRetries) {
        retryCount.current++;
        console.log(`Retrying video load (attempt ${retryCount.current}/${maxRetries})`);
        
        // Try fallback sources if available
        try {
          const fallbackSrc = await getFallbackVideoSource();
          if (fallbackSrc && fallbackSrc !== videoRef.current?.src) {
            setHasError(false);
            setIsLoading(true);
            setLoadProgress(0);
            
            if (videoRef.current) {
              videoRef.current.src = fallbackSrc;
              videoRef.current.load();
            }
            return;
          }
        } catch (fallbackError) {
          console.error('Fallback source check failed:', fallbackError);
        }
        
        // Try lower quality if available and we haven't tried fallback
        const currentVariants = currentVideoIndex === 0 ? qualityVariants : secondaryQualityVariants;
        if (currentVariants && currentQuality !== 'low') {
          const newQuality = currentQuality === 'high' ? 'medium' : 'low';
          setCurrentQuality(newQuality);
          setHasError(false);
          setIsLoading(true);
          setLoadProgress(0);
          
          if (videoRef.current) {
            videoRef.current.load();
          }
          return;
        }
      }
      
      setHasError(true);
      setIsLoading(false);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('progress', handleProgress);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('progress', handleProgress);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('error', handleError);
    };
  }, [currentVideoIndex, secondarySrc, getOptimalVideoSource, qualityVariants, secondaryQualityVariants, currentQuality]);

  // Initialize connection detection and video optimization
  useEffect(() => {
    detectConnectionQuality();
    optimizeVideoElement();
  }, [detectConnectionQuality, optimizeVideoElement]);

  // Update video source when quality changes
  useEffect(() => {
    if (videoRef.current) {
      const optimalSrc = getOptimalVideoSource();
      if (videoRef.current.src !== optimalSrc) {
        videoRef.current.src = optimalSrc;
        videoRef.current.load();
      }
    }
  }, [getOptimalVideoSource]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (controlsTimeout) {
        clearTimeout(controlsTimeout);
      }
    };
  }, [controlsTimeout]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isVideoPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
        setIsVideoPlaying(false);
        // Show controls when paused
        setShowControls(true);
      } else {
        videoRef.current.play();
        setIsPlaying(true);
        setIsVideoPlaying(true);
        // Show controls temporarily when starting playback
        showControlsTemporarily();
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
      // Show controls temporarily when changing mute state
      showControlsTemporarily();
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
    // Show controls temporarily when changing fullscreen state
    showControlsTemporarily();
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
    // Show controls temporarily when seeking
    showControlsTemporarily();
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const showControlsTemporarily = () => {
    setShowControls(true);
    
    // Clear existing timeout
    if (controlsTimeout) {
      clearTimeout(controlsTimeout);
    }
    
    // Set new timeout to hide controls after 1.5 seconds
    const timeout = setTimeout(() => {
      if (!isHovered && isVideoPlaying) {
        setShowControls(false);
      }
    }, 1500);
    
    setControlsTimeout(timeout);
  };

  const switchVideo = () => {
    if (!secondarySrc) return;
    
    const newIndex = currentVideoIndex === 0 ? 1 : 0;
    setCurrentVideoIndex(newIndex);
    retryCount.current = 0;
    
    if (videoRef.current) {
      const newSrc = getOptimalVideoSource();
      videoRef.current.src = newSrc;
      videoRef.current.load();
      videoRef.current.currentTime = 0;
      setCurrentTime(0);
      
      // Auto-play the new video
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.play();
          setIsPlaying(true);
          setIsVideoPlaying(true);
          showControlsTemporarily();
        }
      }, 500);
    }
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    setShowControls(true);
    
    // Clear timeout when hovering
    if (controlsTimeout) {
      clearTimeout(controlsTimeout);
      setControlsTimeout(null);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    
    // Start timeout to hide controls
    if (isVideoPlaying) {
      const timeout = setTimeout(() => {
        setShowControls(false);
      }, 1000);
      setControlsTimeout(timeout);
    }
  };

  const retryVideo = () => {
    retryCount.current = 0;
    setHasError(false);
    setIsLoading(true);
    setLoadProgress(0);
    detectConnectionQuality();
    if (videoRef.current) {
      videoRef.current.load();
    }
  };

  if (hasError) {
    return (
      <div 
        className={`relative group rounded-3xl overflow-hidden transition-all duration-500 hover:scale-[1.02] h-full flex flex-col ${
          isDarkMode 
            ? 'bg-black/40 backdrop-blur-xl border-2 border-white/20 shadow-[0_25px_50px_-12px_rgba(255,255,255,0.15)] hover:shadow-[0_35px_70px_-12px_rgba(255,255,255,0.25)]' 
            : 'bg-white/90 backdrop-blur-xl border-2 border-black/10 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] hover:shadow-[0_35px_70px_-12px_rgba(0,0,0,0.25)]'
        } ${className}`}
        onClick={retryVideo}
      >
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <div className="text-6xl mb-4">🎬</div>
            <h3 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Video Temporarily Unavailable
            </h3>
            <p className={`text-sm opacity-80 mb-4 ${isDarkMode ? 'text-white/80' : 'text-gray-600'}`}>
              Click to try again
            </p>
            <div className={`text-xs opacity-70 space-y-1 ${isDarkMode ? 'text-white/70' : 'text-gray-500'}`}>
              <p>Tried {retryCount.current} times</p>
              {connectionInfo && (
                <>
                  <p>Connection: {connectionInfo.effectiveType}</p>
                  {connectionInfo.downlink > 0 && (
                    <p>Speed: {connectionInfo.downlink.toFixed(1)} Mbps</p>
                  )}
                  <p>Current quality: {currentQuality}</p>
                </>
              )}
              <div className="mt-3 text-xs opacity-60">
                <p>Possible solutions:</p>
                <ul className="mt-1 space-y-1 text-left">
                  <li>• Check your internet connection</li>
                  <li>• Try refreshing the page</li>
                  <li>• Switch to a different network</li>
                  {connectionInfo?.downlink && connectionInfo.downlink < 2 && (
                    <li>• Your connection seems slow - try again later</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`relative group rounded-3xl overflow-hidden transition-all duration-500 hover:scale-[1.02] h-full flex flex-col ${
        isDarkMode 
          ? 'bg-black/40 backdrop-blur-xl border-2 border-white/20 shadow-[0_25px_50px_-12px_rgba(255,255,255,0.15)] hover:shadow-[0_35px_70px_-12px_rgba(255,255,255,0.25)]' 
          : 'bg-white/90 backdrop-blur-xl border-2 border-black/10 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] hover:shadow-[0_35px_70px_-12px_rgba(0,0,0,0.25)]'
      } ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Video Container */}
      <div 
        className="relative aspect-video w-full cursor-pointer"
        onClick={showControlsTemporarily}
      >
        <video
          ref={videoRef}
          src={getOptimalVideoSource()}
          className="w-full h-full object-cover rounded-t-3xl"
          playsInline
          muted={isMuted}
        />
        
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-black/60 rounded-t-3xl flex items-center justify-center z-20">
            <div className="text-center text-white">
              <div className="relative mb-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
                {loadProgress > 0 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-bold">{Math.round(loadProgress)}%</span>
                  </div>
                )}
              </div>
              <p className="text-sm mb-2">Loading video...</p>
              {retryCount.current > 0 && (
                <p className="text-xs opacity-80 mb-1">
                  Retry attempt {retryCount.current}/{maxRetries}
                </p>
              )}
              {connectionInfo && (
                <div className="mt-2 text-xs opacity-60">
                  <p>Quality: {currentQuality}</p>
                  <p>Connection: {connectionInfo.effectiveType}</p>
                  {connectionInfo.downlink > 0 && (
                    <p>Speed: {connectionInfo.downlink.toFixed(1)} Mbps</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Overlay Controls */}
        <div className={`absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent transition-opacity duration-300 pointer-events-none ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}>
          
          {/* Play/Pause Button */}
          <button
            onClick={togglePlay}
            className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 p-6 rounded-full transition-all duration-300 pointer-events-auto ${
              isDarkMode 
                ? 'bg-white/20 backdrop-blur-sm border border-white/30 hover:bg-white/30' 
                : 'bg-black/20 backdrop-blur-sm border border-black/30 hover:bg-black/30'
            }`}
          >
            {isVideoPlaying ? (
              <Pause className={`w-8 h-8 ${isDarkMode ? 'text-white' : 'text-black'}`} />
            ) : (
              <Play className={`w-8 h-8 ${isDarkMode ? 'text-white' : 'text-black'}`} />
            )}
          </button>

          {/* Bottom Controls */}
          <div className="absolute bottom-0 left-0 right-0 p-6 pointer-events-auto">
            {/* Progress Bar */}
            <div className="mb-4">
              <input
                type="range"
                min="0"
                max={duration || 0}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-3 bg-white/30 rounded-full appearance-none cursor-pointer slider"
                style={{
                  background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${(currentTime / (duration || 1)) * 100}%, rgba(255,255,255,0.3) ${(currentTime / (duration || 1)) * 100}%, rgba(255,255,255,0.3) 100%)`
                }}
              />
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={togglePlay}
                  className={`p-2 rounded-full transition-all duration-300 ${
                    isDarkMode 
                      ? 'hover:bg-white/20' 
                      : 'hover:bg-black/20'
                  }`}
                >
                  {isVideoPlaying ? (
                    <Pause className={`w-5 h-5 ${isDarkMode ? 'text-white' : 'text-black'}`} />
                  ) : (
                    <Play className={`w-5 h-5 ${isDarkMode ? 'text-white' : 'text-black'}`} />
                  )}
                </button>

                <button
                  onClick={toggleMute}
                  className={`p-2 rounded-full transition-all duration-300 ${
                    isDarkMode 
                      ? 'hover:bg-white/20' 
                      : 'hover:bg-black/20'
                  }`}
                >
                  {isMuted ? (
                    <VolumeX className={`w-5 h-5 ${isDarkMode ? 'text-white' : 'text-black'}`} />
                  ) : (
                    <Volume2 className={`w-5 h-5 ${isDarkMode ? 'text-white' : 'text-black'}`} />
                  )}
                </button>

                {secondarySrc && (
                  <button
                    onClick={switchVideo}
                    className={`p-2 rounded-full transition-all duration-300 ${
                      isDarkMode 
                        ? 'hover:bg-white/20' 
                        : 'hover:bg-black/20'
                    }`}
                    title="Switch video"
                  >
                    <SkipForward className={`w-5 h-5 ${isDarkMode ? 'text-white' : 'text-black'}`} />
                  </button>
                )}

                <span className={`text-sm font-medium ${
                  isDarkMode ? 'text-white/80' : 'text-black/80'
                }`}>
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              <button
                onClick={toggleFullscreen}
                className={`p-2 rounded-full transition-all duration-300 ${
                  isDarkMode 
                    ? 'hover:bg-white/20' 
                    : 'hover:bg-black/20'
                }`}
              >
                {isFullscreen ? (
                  <Minimize className={`w-5 h-5 ${isDarkMode ? 'text-white' : 'text-black'}`} />
                ) : (
                  <Maximize className={`w-5 h-5 ${isDarkMode ? 'text-white' : 'text-black'}`} />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content Info */}
      <div className={`p-6 lg:p-8 flex-1 ${
        isDarkMode 
          ? 'bg-gradient-to-r from-gray-800/80 to-gray-900/80 backdrop-blur-sm' 
          : 'bg-gradient-to-r from-gray-50/80 to-white/80 backdrop-blur-sm'
      }`}>
        <h3 className={`text-xl lg:text-2xl font-bold mb-3 lg:mb-4 ${
          isDarkMode ? 'text-white' : 'text-gray-900'
        }`}>
          {currentVideoIndex === 0 ? title : (secondaryTitle || title)}
        </h3>
        <p className={`text-base lg:text-lg leading-relaxed ${
          isDarkMode ? 'text-white/80' : 'text-gray-700'
        }`}>
          {currentVideoIndex === 0 ? description : (secondaryDescription || description)}
        </p>
        {secondarySrc && (
          <div className={`mt-4 text-sm ${
            isDarkMode ? 'text-white/60' : 'text-gray-500'
          }`}>
            {currentVideoIndex === 0 ? '1 of 2' : '2 of 2'}
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          .slider::-webkit-slider-thumb {
            appearance: none;
            height: 20px;
            width: 20px;
            border-radius: 50%;
            background: #8b5cf6;
            cursor: pointer;
            box-shadow: 0 0 10px rgba(139, 92, 246, 0.5);
          }
          
          .slider::-moz-range-thumb {
            height: 20px;
            width: 20px;
            border-radius: 50%;
            background: #8b5cf6;
            cursor: pointer;
            border: none;
            box-shadow: 0 0 10px rgba(139, 92, 246, 0.5);
          }
        `
      }} />
    </div>
  );
};

export default GlassVideoPlayer; 