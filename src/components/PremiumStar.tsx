import React from 'react';

interface PremiumStarProps {
  size?: number;
  className?: string;
}

const PremiumStar: React.FC<PremiumStarProps> = ({ size = 48, className = '' }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 48 48" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <radialGradient id="starCore" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff9c4" />
          <stop offset="40%" stopColor="#fff59d" />
          <stop offset="70%" stopColor="#ffeb3b" />
          <stop offset="100%" stopColor="#fdd835" />
        </radialGradient>
        <radialGradient id="starGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fffde7" />
          <stop offset="60%" stopColor="#fff8e1" />
          <stop offset="100%" stopColor="#fff3e0" />
        </radialGradient>
        <filter id="starShadow" x="-20" y="-20" width="88" height="88" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#f57f17" floodOpacity="0.3" />
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#ffd600" floodOpacity="0.4" />
        </filter>
        <filter id="starGlow" x="-10" y="-10" width="68" height="68" filterUnits="userSpaceOnUse">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge> 
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      {/* Outer glow */}
      <circle cx="24" cy="24" r="22" fill="url(#starGlow)" opacity="0.6" filter="url(#starGlow)"/>
      
      {/* Main star */}
      <polygon 
        points="24,4 29.5,17.5 44,18 33.5,27.5 37,42 24,34 11,42 14.5,27.5 4,18 18.5,17.5" 
        fill="url(#starCore)" 
        stroke="#f57f17" 
        strokeWidth="1.5"
        filter="url(#starShadow)"
      />
      
      {/* Inner highlight */}
      <polygon 
        points="24,8 27.5,17 38,17.5 30.5,24.5 33,36 24,30 15,36 17.5,24.5 10,17.5 20.5,17" 
        fill="#fffde7" 
        opacity="0.8"
      />
      
      {/* Sparkle effects */}
      <circle cx="20" cy="12" r="1" fill="#fff" opacity="0.9"/>
      <circle cx="28" cy="10" r="0.8" fill="#fff" opacity="0.7"/>
      <circle cx="36" cy="20" r="0.6" fill="#fff" opacity="0.6"/>
      <circle cx="38" cy="28" r="0.7" fill="#fff" opacity="0.8"/>
      <circle cx="32" cy="36" r="0.5" fill="#fff" opacity="0.6"/>
      <circle cx="16" cy="38" r="0.8" fill="#fff" opacity="0.7"/>
      <circle cx="10" cy="30" r="0.6" fill="#fff" opacity="0.6"/>
      <circle cx="12" cy="20" r="0.7" fill="#fff" opacity="0.8"/>
    </svg>
  );
};

export default PremiumStar; 