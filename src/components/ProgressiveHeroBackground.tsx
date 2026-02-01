import React, { useState, useEffect } from 'react';
import OptimizedPlasmaBackground from './OptimizedPlasmaBackground';
import FastHeroBackground from './FastHeroBackground';

interface ProgressiveHeroBackgroundProps {
  className?: string;
  enableWebGL?: boolean;
  webGLDelay?: number;
}

const ProgressiveHeroBackground: React.FC<ProgressiveHeroBackgroundProps> = ({ 
  className = '',
  enableWebGL = true,
  webGLDelay = 2000 // Wait 2 seconds before loading WebGL
}) => {
  const [shouldLoadWebGL, setShouldLoadWebGL] = useState(false);
  const [isWebGLLoaded, setIsWebGLLoaded] = useState(false);

  useEffect(() => {
    if (!enableWebGL) return;

    // Start with CSS background, then upgrade to WebGL after delay
    const timer = setTimeout(() => {
      setShouldLoadWebGL(true);
    }, webGLDelay);

    return () => clearTimeout(timer);
  }, [enableWebGL, webGLDelay]);

  const handleWebGLLoaded = () => {
    setIsWebGLLoaded(true);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Fast CSS background - always visible */}
      <FastHeroBackground className="absolute inset-0" />
      
      {/* WebGL background - loads progressively */}
      {shouldLoadWebGL && (
        <div className={`absolute inset-0 transition-opacity duration-1000 ${
          isWebGLLoaded ? 'opacity-100' : 'opacity-0'
        }`}>
          <OptimizedPlasmaBackground 
            className="absolute inset-0"
            onLoad={handleWebGLLoaded}
          />
        </div>
      )}
    </div>
  );
};

export default ProgressiveHeroBackground; 