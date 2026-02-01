import React, { useState, useRef, useEffect } from 'react';

interface VideoPlayerProps {
  src: string;
  className?: string;
  style?: React.CSSProperties;
  onEnded?: () => void;
  onError?: () => void;
  onCanPlay?: () => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  className = '',
  style = {},
  onEnded,
  onError,
  onCanPlay
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [canPlay, setCanPlay] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handlePlay = async () => {
    if (videoRef.current) {
      try {
        await videoRef.current.play();
      } catch (err) {
        console.log('Video play failed:', err);
        // Show user-friendly error message
        setHasError(true);
      }
    }
  };

  const handleError = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    console.error('Video failed to load:', e);
    setHasError(true);
    setIsLoading(false);
    onError?.();
  };

  const handleLoadStart = () => {
    setIsLoading(true);
    setHasError(false);
    console.log('Video loading started');
  };

  const handleCanPlay = () => {
    setIsLoading(false);
    setCanPlay(true);
    console.log('Video can play');
    onCanPlay?.();
  };

  const handleEnded = () => {
    onEnded?.();
  };

  const retryVideo = () => {
    setHasError(false);
    setIsLoading(true);
    setCanPlay(false);
    if (videoRef.current) {
      videoRef.current.load();
    }
  };

  if (hasError) {
    return (
      <div 
        className={`w-full h-full bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center cursor-pointer ${className}`}
        style={style}
        onClick={retryVideo}
      >
        <div className="text-center text-white">
          <div className="text-6xl mb-4">🎬</div>
          <h3 className="text-xl font-bold mb-2">Video Unavailable</h3>
          <p className="text-sm opacity-80">Click to try again</p>
          <div className="mt-4 text-xs opacity-60">
            <p>Possible issues:</p>
            <ul className="mt-1 space-y-1">
              <li>• Browser doesn't support MP4 codec</li>
              <li>• Slow internet connection</li>
              <li>• File size too large</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} style={style}>
      {isLoading && (
        <div className="absolute inset-0 bg-gray-900 rounded-2xl flex items-center justify-center z-10">
          <div className="text-center text-white">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <p className="text-sm">Loading video...</p>
          </div>
        </div>
      )}
      
      <video 
        ref={videoRef}
        src={src}
        playsInline 
        controls
        preload="metadata"
        className="w-full h-full object-cover rounded-2xl" 
        style={{ objectPosition: 'center 20%' }}
        onClick={handlePlay}
        onError={handleError}
        onLoadStart={handleLoadStart}
        onCanPlay={handleCanPlay}
        onEnded={handleEnded}
        // Add additional attributes for better compatibility
        muted={false}
        loop={false}
        crossOrigin="anonymous"
      />
    </div>
  );
};

export default VideoPlayer; 