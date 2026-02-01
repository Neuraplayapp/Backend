import React, { useState, useEffect } from 'react';
import PlasmaBackground from './PlasmaBackground';

interface PlasmaBackgroundWithFallbackProps {
  className?: string;
}

const PlasmaBackgroundWithFallback: React.FC<PlasmaBackgroundWithFallbackProps> = ({ 
  className = '' 
}) => {
  const [isPlasmaLoaded, setIsPlasmaLoaded] = useState(false);

  useEffect(() => {
    // Give PlasmaBackground a moment to initialize
    const timer = setTimeout(() => {
      setIsPlasmaLoaded(true);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`relative ${className}`}>
      {/* CSS Fallback - shows immediately */}
      <div 
        className="absolute inset-0 animate-pulse"
        style={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
          backgroundSize: '400% 400%',
          animation: 'gradientShift 8s ease infinite'
        }}
      />
      
      {/* PlasmaBackground - loads with fade-in */}
      <div className={`absolute inset-0 transition-opacity duration-1000 ${
        isPlasmaLoaded ? 'opacity-100' : 'opacity-0'
      }`}>
        <PlasmaBackground className="absolute inset-0" />
      </div>
      
      <style jsx>{`
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  );
};

export default PlasmaBackgroundWithFallback; 